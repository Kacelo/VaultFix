"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "../prisma";
import type {
  CertType,
  FaultPriority,
  FaultStatus,
  JobStatus,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

/**
 * Supabase owns authentication (sessions, OAuth, OTP); Prisma owns every read
 * and write against the relational schema.
 *
 * IMPORTANT: Prisma connects as the database owner, so Row Level Security does
 * NOT apply to anything in this file. Authorisation is entirely the job of the
 * `requireUser` / `requireRole` / ownership checks below — and Server Functions
 * are reachable by direct POST, not just through our own UI, so every exported
 * function must perform them.
 */

type LineItem = { desc: string; amount: number };

// ─── Auth guards ────────────────────────────────────────────────────────────

/**
 * Session and caller lookups are memoised for the lifetime of a single request
 * with React's `cache`.
 *
 * Rendering one page often calls several of these functions, and each guard
 * used to mean its own round trip to Supabase auth plus its own `users` read —
 * a technician profile paid for three auth calls before this. The session
 * cannot change halfway through a request, so answering every guard in that
 * request from one lookup is both faster and more self-consistent.
 *
 * These are deliberately NOT exported: only async exports are permitted from a
 * "use server" module, and a memoised session reader has no business being a
 * callable endpoint.
 */
const getSessionUserId = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error || !user ? null : user.id;
});

/** The caller's `users` row, or null when signed out / not yet synced. */
const getCallerUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
});

/** Resolves the caller's Supabase auth id, or throws when signed out. */
async function requireUserId() {
  const userId = await getSessionUserId();

  if (!userId) {
    throw new Error("Unauthorized — you must be signed in.");
  }

  return userId;
}

/** Loads the caller's relational row and asserts their role. */
async function requireRole(allowed: Role[]) {
  // Kept ahead of the row lookup so that "signed out" and "signed in but no
  // profile row" stay distinguishable to the caller.
  await requireUserId();

  const user = await getCallerUser();

  if (!user) {
    throw new Error("No profile found for the signed-in account.");
  }

  if (!allowed.includes(user.role)) {
    throw new Error(`Forbidden — requires role ${allowed.join(" or ")}.`);
  }

  return user;
}

/**
 * The caller's electrician profile id, memoised per request. Several reads
 * need it to scope their results — a dashboard that lists both jobs and
 * receipts used to repeat this identical lookup for each.
 */
const getElectricianProfileIdFor = cache(async (userId: string) => {
  const profile = await prisma.electricianProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  return profile?.id ?? null;
});

/** The caller's electrician profile id — throws if they don't have one. */
async function requireElectricianProfileId() {
  const { id } = await requireRole(["ELECTRICIAN", "ADMIN"]);

  const profileId = await getElectricianProfileIdFor(id);

  if (!profileId) {
    throw new Error("No electrician profile found for the signed-in account.");
  }

  return { userId: id, profileId };
}

/** Human-facing reference, e.g. `VF-8A3F21`. */
function makeRef(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

async function originUrl() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

// ─── Registration & session ─────────────────────────────────────────────────

type RegisterProfileInput = {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  role: "CLIENT" | "ELECTRICIAN";
  ntaUid?: string;
  specialisation?: string;
  serviceArea?: string;
};

/**
 * Writes a freshly signed-up auth user into the relational `users` (and, for
 * electricians, `electrician_profiles`) tables. Deliberately unauthenticated:
 * it runs before email confirmation, when the caller has no session yet.
 *
 * Being unauthenticated makes it a public POST endpoint that anyone can call
 * with arbitrary JSON, so nothing it is handed may be taken on trust:
 *
 *   - `role` is checked at runtime. The TypeScript union is erased during
 *     compilation and provided no protection whatsoever — before this check a
 *     caller could pass `role: "ADMIN"` and promote themselves to an
 *     administrator.
 *   - `userId` is proved against Supabase auth, and the supplied email must
 *     match that account, so nobody can mint or clobber a row for an id they
 *     do not own.
 *   - An existing row may only be re-synced by its own signed-in owner, and
 *     its `role` is never rewritten. The unauthenticated path can create, and
 *     never overwrite.
 */
export async function syncUserProfile(input: RegisterProfileInput) {
  if (input.role !== "CLIENT" && input.role !== "ELECTRICIAN") {
    throw new Error("Invalid role.");
  }

  // Proves the caller is syncing a real auth account and knows its address,
  // rather than naming an arbitrary UUID.
  const admin = createAdminClient();
  const { data: authUser, error } = await admin.auth.admin.getUserById(
    input.userId
  );

  if (error || !authUser?.user) {
    throw new Error("No such account — sign up before syncing a profile.");
  }

  const claimedEmail = input.email.trim().toLowerCase();
  if ((authUser.user.email ?? "").trim().toLowerCase() !== claimedEmail) {
    throw new Error("That email does not match this account.");
  }

  const profileFields = {
    ntaUid: input.ntaUid || null,
    specialisation: input.specialisation || null,
    serviceArea: input.serviceArea || null,
  };

  const existing = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  });

  if (existing) {
    const sessionUserId = await getSessionUserId();

    if (sessionUserId !== input.userId) {
      throw new Error("Forbidden — sign in to update your profile.");
    }

    await prisma.user.update({
      where: { id: input.userId },
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone || null,
        // `role` deliberately absent: registration is not where roles change.
        ...(existing.role === "ELECTRICIAN" && {
          // Nested write keeps the existing profile row's id stable: it is the
          // primary key referenced by jobs, reviews and certificates.
          electricianProfile: {
            upsert: { create: profileFields, update: profileFields },
          },
        }),
      },
    });

    return;
  }

  await prisma.user.create({
    data: {
      id: input.userId,
      email: input.email,
      name: input.name,
      phone: input.phone || null,
      role: input.role,
      ...(input.role === "ELECTRICIAN" && {
        electricianProfile: { create: profileFields },
      }),
    },
  });
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await originUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google-sign-in-failed");
  }

  redirect(data.url);
}

export async function signInWithEmail(email: string) {
  const supabase = await createClient();
  const origin = await originUrl();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?error=email-sign-in-failed");
  }

  redirect("/login?success=email-sent");
}

/**
 * Email + password sign-in, shaped for `useActionState`: returns `{ error }`
 * for the form to render, or redirects on success. Errors are deliberately
 * vague — distinguishing "no such user" from "wrong password" would let anyone
 * enumerate which emails have accounts.
 */
export async function signInWithPassword(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter both your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password. Please try again." };
  }

  // Outside the error branch: redirect throws a control-flow exception, so it
  // must not sit inside a try/catch that would swallow it.
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─── Users ──────────────────────────────────────────────────────────────────

/** The signed-in user's row with their electrician profile, or `null`. */
/**
 * The full signed-in user, relations included — what pages need to decide what
 * to render. Memoised per request, and sharing the one session lookup above, so
 * a page and its children can each ask without stacking round trips.
 */
const loadCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { electricianProfile: true, subscription: true },
  });
});

export async function getCurrentUser() {
  return loadCurrentUser();
}

export async function updateUserProfile(input: {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}) {
  const userId = await requireUserId();

  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
  });

  revalidatePath("/dashboard");
  return user;
}

/**
 * Deletes the caller's own account (admins may delete anyone). Removes the
 * relational row first, then the Supabase auth user. Users with jobs, receipts
 * or reviews are blocked by foreign keys — those records must be reassigned or
 * removed before the account can go.
 */
export async function deleteUserAccount(targetUserId: string) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  if (targetUserId !== caller.id && caller.role !== "ADMIN") {
    throw new Error("Forbidden — you can only delete your own account.");
  }

  try {
    await prisma.user.delete({ where: { id: targetUserId } });
  } catch {
    throw new Error(
      "Cannot delete this account while jobs, receipts or reviews still reference it."
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetUserId);

  if (error) {
    throw new Error(`Profile removed but auth user remains: ${error.message}`);
  }

  revalidatePath("/technicians");
}

// ─── Electrician profiles ───────────────────────────────────────────────────

export async function getElectricianProfile(userId: string) {
  await requireUserId();

  return prisma.electricianProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true, phone: true, avatarUrl: true } } },
  });
}

/**
 * NOTE: currently has no callers - `searchElectricians()` with no filters
 * returns the same thing. Kept for now, but it is an unauthenticated endpoint,
 * so deleting it would be the safer choice.
 */
export async function getAllElectricians() {
  return prisma.electricianProfile.findMany({
    // Explicit select, never `include`: this is an unauthenticated endpoint,
    // and the full row carries `ntaUid`, `wiremanLicense` and `userId`. Anything
    // added here is published to the world, so add deliberately.
    select: {
      id: true,
      specialisation: true,
      serviceArea: true,
      calloutFee: true,
      isAvailable: true,
      averageRating: true,
      totalReviews: true,
      ntaVerified: true,
      wiremanVerified: true,
      user: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { averageRating: { sort: "desc", nulls: "last" } },
  });
}

/** Directory search backing /technicians. */
export async function searchElectricians(filters?: {
  serviceArea?: string;
  specialisation?: string;
  onlyAvailable?: boolean;
  onlyVerified?: boolean;
  minRating?: number;
}) {
  return prisma.electricianProfile.findMany({
    where: {
      ...(filters?.serviceArea && {
        serviceArea: { contains: filters.serviceArea, mode: "insensitive" },
      }),
      ...(filters?.specialisation && {
        specialisation: { contains: filters.specialisation, mode: "insensitive" },
      }),
      ...(filters?.onlyAvailable && { isAvailable: true }),
      ...(filters?.onlyVerified && { ntaVerified: true }),
      ...(filters?.minRating !== undefined && {
        averageRating: { gte: filters.minRating },
      }),
    },
    // Explicit select, never `include`: this is an unauthenticated endpoint,
    // and the full row carries `ntaUid`, `wiremanLicense` and `userId`. Anything
    // added here is published to the world, so add deliberately.
    select: {
      id: true,
      specialisation: true,
      serviceArea: true,
      calloutFee: true,
      isAvailable: true,
      averageRating: true,
      totalReviews: true,
      ntaVerified: true,
      wiremanVerified: true,
      user: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { averageRating: { sort: "desc", nulls: "last" } },
  });
}

/**
 * Public profile read backing /technicians/[id]. Unauthenticated on purpose:
 * the directory it is reached from is public, so gating the profile behind a
 * session would break every card's "View Profile" link for visitors.
 *
 * Selects explicitly rather than including the whole user row — email and
 * phone must not be readable by a stranger. Contact details are exchanged by
 * booking, which puts both parties on the same job.
 */
const loadElectricianById = cache(async (id: string) => {
  return prisma.electricianProfile.findUnique({
    where: { id },
    select: {
      id: true,
      specialisation: true,
      serviceArea: true,
      calloutFee: true,
      bio: true,
      isAvailable: true,
      averageRating: true,
      totalReviews: true,
      ntaVerified: true,
      wiremanVerified: true,
      createdAt: true,
      user: { select: { name: true, avatarUrl: true } },
      _count: {
        select: {
          certificates: true,
          // Completed only — pending and cancelled jobs say nothing about a
          // track record.
          jobsAssigned: { where: { status: "COMPLETED" } },
        },
      },
    },
  });
});

export async function getElectricianById(id: string) {
  return loadElectricianById(id);
}

/**
 * Cheap option lists for the directory filters.
 *
 * These used to be derived by loading every electrician row (joined user and
 * all) purely to collect two dropdowns' worth of strings — the directory paid
 * for a second full table read on every filter toggle. `groupBy` does the
 * de-duplication in Postgres and returns only the columns asked for.
 *
 * `total` distinguishes "nobody has registered yet" from "nobody matches these
 * filters", which the empty state words differently.
 */
export async function getDirectoryFilterOptions() {
  const [areas, specialisations, total] = await Promise.all([
    prisma.electricianProfile.groupBy({
      by: ["serviceArea"],
      where: { serviceArea: { not: null } },
      orderBy: { serviceArea: "asc" },
    }),
    prisma.electricianProfile.groupBy({
      by: ["specialisation"],
      where: { specialisation: { not: null } },
      orderBy: { specialisation: "asc" },
    }),
    prisma.electricianProfile.count(),
  ]);

  return {
    areas: areas.map((a) => a.serviceArea!),
    specialisations: specialisations.map((s) => s.specialisation!),
    total,
  };
}

/**
 * Editable profile fields. Deliberately excludes ntaUid and wiremanLicense:
 * those may only be changed through `submitNtaForVerification`, which resets
 * the verified flag. Allowing them here would let a verified electrician swap
 * in a different licence number and keep the verified badge.
 */
export async function updateElectricianProfile(input: {
  specialisation?: string | null;
  serviceArea?: string | null;
  calloutFee?: number | null;
  bio?: string | null;
  isAvailable?: boolean;
}) {
  const { userId } = await requireElectricianProfileId();

  if (input.isAvailable === true) {
    const profile = await prisma.electricianProfile.findUnique({
      where: { userId },
      select: { ntaVerified: true },
    });

    if (!profile?.ntaVerified) {
      throw new Error(
        "Your NTA certification must be verified before you can accept call-outs."
      );
    }
  }

  const profile = await prisma.electricianProfile.update({
    where: { userId },
    data: input,
  });

  revalidatePath("/technicians");
  revalidatePath("/electrician/verification");
  return profile;
}

export async function setElectricianAvailability(isAvailable: boolean) {
  return updateElectricianProfile({ isAvailable });
}

/**
 * An electrician submits (or re-submits) their NTA UID and wireman licence for
 * an administrator to check. Submitting always drops `ntaVerified` back to
 * false and withdraws the electrician from call-outs, because the number an
 * admin approved is no longer the number on file.
 */
export async function submitNtaForVerification(input: {
  ntaUid: string;
  wiremanLicense?: string;
}) {
  const { userId } = await requireElectricianProfileId();

  const ntaUid = input.ntaUid.trim();
  if (!ntaUid) {
    throw new Error("Enter your NTA UID.");
  }

  try {
    const profile = await prisma.electricianProfile.update({
      where: { userId },
      data: {
        ntaUid,
        wiremanLicense: input.wiremanLicense?.trim() || null,
        ntaVerified: false,
        wiremanVerified: false,
        isAvailable: false,
      },
    });

    revalidatePath("/electrician/verification");
    revalidatePath("/technicians");
    return profile;
  } catch (err) {
    // ntaUid is unique across the table.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      throw new Error("That NTA UID is already registered to another account.");
    }
    throw err;
  }
}

/** The caller's own verification state, for the gate screen. */
export async function getMyVerificationStatus() {
  const { userId } = await requireElectricianProfileId();

  return prisma.electricianProfile.findUnique({
    where: { userId },
    select: {
      ntaUid: true,
      ntaVerified: true,
      wiremanLicense: true,
      wiremanVerified: true,
      isAvailable: true,
      specialisation: true,
      serviceArea: true,
    },
  });
}

/** NTA / wireman licence verification — admin only. */
/**
 * The admin verification queue: electricians who have submitted an NTA UID but
 * have not been checked yet.
 *
 * This is the highest-consequence list in the app. An unverified electrician
 * cannot be assigned a job (`createJob`) and cannot mark themselves available
 * (`updateElectricianProfile`), so everyone sitting in this queue is blocked
 * from earning until an admin acts. Oldest submission first, so nobody is
 * left behind a later arrival.
 *
 * ADMIN-only, which is what makes it safe to return the applicant's email.
 */
export async function listPendingVerifications() {
  await requireRole(["ADMIN"]);

  return prisma.electricianProfile.findMany({
    where: { ntaUid: { not: null }, ntaVerified: false },
    select: {
      id: true,
      ntaUid: true,
      wiremanLicense: true,
      wiremanVerified: true,
      specialisation: true,
      serviceArea: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

export async function verifyElectrician(
  profileId: string,
  input: { ntaVerified?: boolean; wiremanVerified?: boolean }
) {
  await requireRole(["ADMIN"]);

  const profile = await prisma.electricianProfile.update({
    where: { id: profileId },
    data: input,
  });

  revalidatePath("/technicians");
  // The admin queue this was actioned from, and the electrician's own view of
  // whether they may now take work.
  revalidatePath("/dashboard");
  revalidatePath("/electrician/verification");
  return profile;
}

// ─── Locations (QR-coded rooms) ─────────────────────────────────────────────

export async function createLocation(input: {
  building: string;
  room: string;
  description?: string;
}) {
  await requireRole(["ADMIN"]);
  const origin = await originUrl();

  // qrUrl embeds the generated id, so the row is created then stamped — in one
  // transaction, so a location never lingers without a scannable URL.
  const location = await prisma.$transaction(async (tx) => {
    const created = await tx.location.create({
      data: {
        building: input.building,
        room: input.room,
        description: input.description || null,
      },
    });

    return tx.location.update({
      where: { id: created.id },
      data: { qrUrl: `${origin}/fault-log/${created.id}` },
    });
  });

  revalidatePath("/admin/qr-codes");
  return location;
}

/** Public — a QR scan resolves the room before the reporter signs in. */
export async function getLocation(locationId: string) {
  return prisma.location.findUnique({ where: { id: locationId } });
}

/**
 * The full location rows, `qrUrl` and internal `description` included — which
 * is why this is ADMIN-only rather than merely signed-in. A session alone used
 * to be enough, so any client could read the very fields
 * `listLocationsForReporting` is careful to withhold. Its only caller is the
 * admin QR screen, whose sibling actions (create/update/delete) all require
 * ADMIN too.
 */
export async function getAllLocations() {
  await requireRole(["ADMIN"]);

  return prisma.location.findMany({
    orderBy: [{ building: "asc" }, { room: "asc" }],
  });
}

/**
 * Public, and deliberately narrower than `getAllLocations`: anyone reporting a
 * fault has to be able to name their room without an account, but they have no
 * business seeing qrUrl or internal descriptions. Returns identifiers only.
 */
export async function listLocationsForReporting() {
  return prisma.location.findMany({
    select: { id: true, building: true, room: true },
    orderBy: [{ building: "asc" }, { room: "asc" }],
  });
}

export async function updateLocation(
  locationId: string,
  input: { building?: string; room?: string; description?: string | null }
) {
  await requireRole(["ADMIN"]);

  const location = await prisma.location.update({
    where: { id: locationId },
    data: input,
  });

  revalidatePath("/admin/qr-codes");
  return location;
}

export async function deleteLocation(locationId: string) {
  await requireRole(["ADMIN"]);

  await prisma.location.delete({ where: { id: locationId } });
  revalidatePath("/admin/qr-codes");
}

// ─── Fault reports ──────────────────────────────────────────────────────────

/**
 * Deliberately public: the QR-code flow lets anyone in a building report a
 * fault without an account. A session, when present, is attributed as the
 * reporter; otherwise only the free-text `reporterName` is stored.
 */
export async function createFaultReport(input: {
  description: string;
  priority?: FaultPriority;
  locationId?: string;
  reporterName?: string;
  photoUrls?: string[];
}) {
  if (!input.description?.trim()) {
    throw new Error("A fault description is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const report = await prisma.faultReport.create({
    data: {
      ref: makeRef("VF"),
      description: input.description.trim(),
      priority: input.priority ?? "MEDIUM",
      locationId: input.locationId || null,
      reporterId: user?.id ?? null,
      reporterName: input.reporterName?.trim() || null,
      photoUrls: input.photoUrls ?? [],
    },
  });

  revalidatePath("/fault-log");
  return report;
}

/** Public lookup by reference — how a reporter tracks a fault they logged. */
export async function getFaultReportByRef(ref: string) {
  return prisma.faultReport.findUnique({
    where: { ref },
    include: { location: true, job: true },
  });
}

export async function getFaultReport(id: string) {
  await requireUserId();

  return prisma.faultReport.findUnique({
    where: { id },
    include: {
      location: true,
      reporter: { select: { id: true, name: true, email: true } },
      job: { include: { electrician: { include: { user: { select: { name: true } } } } } },
    },
  });
}

/**
 * Clients see only their own reports; electricians and admins see the whole
 * queue, since that is what they triage and get assigned from.
 */
export async function listFaultReports(filters?: {
  status?: FaultStatus;
  priority?: FaultPriority;
  locationId?: string;
  take?: number;
}) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  return prisma.faultReport.findMany({
    where: {
      ...(caller.role === "CLIENT" && { reporterId: caller.id }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.locationId && { locationId: filters.locationId }),
    },
    include: { location: true, job: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: filters?.take ?? 100,
  });
}

export async function updateFaultReport(
  id: string,
  input: {
    description?: string;
    priority?: FaultPriority;
    status?: FaultStatus;
    photoUrls?: string[];
  }
) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  if (caller.role === "CLIENT") {
    const report = await prisma.faultReport.findUnique({
      where: { id },
      select: { reporterId: true },
    });

    if (report?.reporterId !== caller.id) {
      throw new Error("Forbidden — you can only edit faults you reported.");
    }

    // Triage belongs to electricians and admins, not the reporter.
    if (input.status) {
      throw new Error("Forbidden — only an electrician can change fault status.");
    }
  }

  const report = await prisma.faultReport.update({ where: { id }, data: input });

  revalidatePath("/fault-log");
  revalidatePath("/dashboard");
  return report;
}

export async function deleteFaultReport(id: string) {
  await requireRole(["ADMIN"]);

  await prisma.faultReport.delete({ where: { id } });
  revalidatePath("/fault-log");
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

/**
 * Faults that still have no electrician on them — the choices offered by the
 * booking panel on a technician's profile. A job always hangs off a fault, so
 * there is nothing to book without one.
 *
 * The ownership rule mirrors `createJob` exactly: a client sees only faults
 * they reported, staff see every unassigned fault. Anonymous reports are left
 * out because createJob rejects them until a client claims them — offering one
 * here would only produce an error on submit.
 */
export async function listBookableFaults() {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  return prisma.faultReport.findMany({
    where: {
      job: null,
      ...(caller.role === "CLIENT"
        ? { reporterId: caller.id }
        : { reporterId: { not: null } }),
    },
    select: {
      id: true,
      ref: true,
      description: true,
      priority: true,
      createdAt: true,
      location: { select: { building: true, room: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Assigns an electrician to a fault. Creating the job and flipping the fault to
 * ASSIGNED happen in one transaction so a fault can never show as assigned
 * without a job (or vice versa).
 */
export async function createJob(input: {
  faultId: string;
  electricianId: string;
  scheduledAt?: Date;
  notes?: string;
}) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const fault = await prisma.faultReport.findUnique({
    where: { id: input.faultId },
    select: { id: true, reporterId: true, job: { select: { id: true } } },
  });

  if (!fault) {
    throw new Error("Fault report not found.");
  }
  if (fault.job) {
    throw new Error("This fault already has a job assigned.");
  }
  if (caller.role === "CLIENT" && fault.reporterId !== caller.id) {
    throw new Error("Forbidden — you can only raise jobs for your own faults.");
  }
  if (!fault.reporterId) {
    throw new Error("Anonymous faults must be claimed by a client before assignment.");
  }

  // The actual call-out gate. The availability toggle is a convenience for the
  // electrician; this is what makes verification a hard requirement, and it
  // holds even if a client posts a request directly to this function.
  const electrician = await prisma.electricianProfile.findUnique({
    where: { id: input.electricianId },
    select: { ntaVerified: true, isAvailable: true },
  });

  if (!electrician) {
    throw new Error("Electrician not found.");
  }
  if (!electrician.ntaVerified) {
    throw new Error(
      "This electrician has not completed NTA verification and cannot take call-outs yet."
    );
  }
  if (!electrician.isAvailable) {
    throw new Error("This electrician is not currently accepting call-outs.");
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.job.create({
      data: {
        faultId: input.faultId,
        clientId: fault.reporterId!,
        electricianId: input.electricianId,
        scheduledAt: input.scheduledAt ?? null,
        notes: input.notes || null,
      },
    });

    await tx.faultReport.update({
      where: { id: input.faultId },
      data: { status: "ASSIGNED" },
    });

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/fault-log");
  return job;
}

/** Loads a job and asserts the caller is its client, its electrician, or admin. */
async function requireJobAccess(jobId: string) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { electrician: { select: { id: true, userId: true } } },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  const isClient = job.clientId === caller.id;
  const isElectrician = job.electrician.userId === caller.id;

  if (!isClient && !isElectrician && caller.role !== "ADMIN") {
    throw new Error("Forbidden — you are not a party to this job.");
  }

  return { caller, job, isClient, isElectrician };
}

export async function getJob(jobId: string) {
  await requireJobAccess(jobId);

  return prisma.job.findUnique({
    where: { id: jobId },
    include: {
      fault: { include: { location: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      electrician: { include: { user: { select: { name: true, phone: true } } } },
      receipt: true,
      review: true,
    },
  });
}

/** Jobs for the signed-in user, on whichever side of them they sit. */
export async function listJobs(filters?: { status?: JobStatus; take?: number }) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const profileId =
    caller.role === "CLIENT" ? null : await getElectricianProfileIdFor(caller.id);

  return prisma.job.findMany({
    where: {
      ...(caller.role !== "ADMIN" && {
        OR: [
          { clientId: caller.id },
          ...(profileId ? [{ electricianId: profileId }] : []),
        ],
      }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      fault: { select: { ref: true, description: true, priority: true } },
      client: { select: { name: true } },
      electrician: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.take ?? 100,
  });
}

/**
 * Moves a job through its lifecycle, keeping the linked fault's status and the
 * job's timestamps in step. Only the assigned electrician (or an admin) may
 * progress work; the client may only cancel.
 */
export async function updateJobStatus(jobId: string, status: JobStatus) {
  const { caller, isClient, isElectrician } = await requireJobAccess(jobId);

  if (status === "CANCELLED") {
    if (!isClient && !isElectrician && caller.role !== "ADMIN") {
      throw new Error("Forbidden — you cannot cancel this job.");
    }
  } else if (!isElectrician && caller.role !== "ADMIN") {
    throw new Error("Forbidden — only the assigned electrician can progress this job.");
  }

  const faultStatus: Record<JobStatus, FaultStatus> = {
    PENDING: "ASSIGNED",
    ACCEPTED: "ASSIGNED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "RESOLVED",
    CANCELLED: "OPEN",
  };

  const job = await prisma.$transaction(async (tx) => {
    const updated = await tx.job.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === "IN_PROGRESS" && { startedAt: new Date() }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });

    await tx.faultReport.update({
      where: { id: updated.faultId },
      data: { status: faultStatus[status] },
    });

    return updated;
  });

  revalidatePath("/dashboard");
  revalidatePath("/fault-log");
  return job;
}

export async function updateJob(
  jobId: string,
  input: { scheduledAt?: Date | null; notes?: string | null }
) {
  const { caller, isElectrician } = await requireJobAccess(jobId);

  if (!isElectrician && caller.role !== "ADMIN") {
    throw new Error("Forbidden — only the assigned electrician can edit this job.");
  }

  const job = await prisma.job.update({ where: { id: jobId }, data: input });

  revalidatePath("/dashboard");
  return job;
}

export async function deleteJob(jobId: string) {
  await requireRole(["ADMIN"]);

  const job = await prisma.$transaction(async (tx) => {
    const removed = await tx.job.delete({ where: { id: jobId } });
    await tx.faultReport.update({
      where: { id: removed.faultId },
      data: { status: "OPEN" },
    });
    return removed;
  });

  revalidatePath("/dashboard");
  return job;
}

// ─── Certificates (CoC / licences) ──────────────────────────────────────────

export async function createCertificate(input: {
  type: CertType;
  clientName?: string;
  propertyAddress?: string;
  propertyType?: string;
  workDescription?: string;
  inspectionDate?: Date;
  signatureDataUrl?: string;
  pdfUrl?: string;
  expiresAt?: Date;
}) {
  const { profileId } = await requireElectricianProfileId();

  const prefix = input.type === "COC" ? "COC" : "CERT";

  const certificate = await prisma.certificate.create({
    data: {
      ref: makeRef(prefix),
      type: input.type,
      electricianId: profileId,
      clientName: input.clientName || null,
      propertyAddress: input.propertyAddress || null,
      propertyType: input.propertyType || null,
      workDescription: input.workDescription || null,
      inspectionDate: input.inspectionDate ?? null,
      signatureDataUrl: input.signatureDataUrl || null,
      pdfUrl: input.pdfUrl || null,
      expiresAt: input.expiresAt ?? null,
    },
  });

  revalidatePath("/certs");
  return certificate;
}

/** Public — anyone holding a certificate can verify it by its reference. */
export async function getCertificateByRef(ref: string) {
  return prisma.certificate.findUnique({
    where: { ref },
    include: {
      electrician: {
        select: {
          ntaUid: true,
          ntaVerified: true,
          wiremanLicense: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}

/** Certificates issued by the caller; admins may list any electrician's. */
export async function listCertificates(electricianId?: string) {
  const caller = await requireRole(["ELECTRICIAN", "ADMIN"]);

  let targetId = electricianId;

  if (caller.role !== "ADMIN") {
    const { profileId } = await requireElectricianProfileId();
    targetId = profileId;
  }

  return prisma.certificate.findMany({
    where: targetId ? { electricianId: targetId } : undefined,
    orderBy: { issuedAt: "desc" },
  });
}

export async function updateCertificate(
  id: string,
  input: {
    clientName?: string | null;
    propertyAddress?: string | null;
    propertyType?: string | null;
    workDescription?: string | null;
    inspectionDate?: Date | null;
    signatureDataUrl?: string | null;
    pdfUrl?: string | null;
    expiresAt?: Date | null;
  }
) {
  const caller = await requireRole(["ELECTRICIAN", "ADMIN"]);

  if (caller.role !== "ADMIN") {
    const { profileId } = await requireElectricianProfileId();
    const cert = await prisma.certificate.findUnique({
      where: { id },
      select: { electricianId: true },
    });

    if (cert?.electricianId !== profileId) {
      throw new Error("Forbidden — you can only edit certificates you issued.");
    }
  }

  const certificate = await prisma.certificate.update({ where: { id }, data: input });

  revalidatePath("/certs");
  return certificate;
}

export async function deleteCertificate(id: string) {
  await requireRole(["ADMIN"]);

  await prisma.certificate.delete({ where: { id } });
  revalidatePath("/certs");
}

// ─── Receipts ───────────────────────────────────────────────────────────────

export async function createReceipt(input: {
  jobId: string;
  lineItems: LineItem[];
  currency?: string;
  pdfUrl?: string;
}) {
  const { caller, job, isElectrician } = await requireJobAccess(input.jobId);

  if (!isElectrician && caller.role !== "ADMIN") {
    throw new Error("Forbidden — only the assigned electrician can issue a receipt.");
  }

  if (!input.lineItems?.length) {
    throw new Error("A receipt needs at least one line item.");
  }

  const totalAmount = input.lineItems.reduce((sum, item) => sum + item.amount, 0);

  const receipt = await prisma.receipt.create({
    data: {
      ref: makeRef("RCP"),
      jobId: job.id,
      userId: job.clientId,
      lineItems: input.lineItems,
      totalAmount,
      currency: input.currency ?? "NAD",
      pdfUrl: input.pdfUrl || null,
    },
  });

  revalidatePath("/receipts");
  return receipt;
}

export async function getReceipt(id: string) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      job: { include: { electrician: { select: { userId: true } }, fault: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!receipt) return null;

  const isParty =
    receipt.userId === caller.id || receipt.job.electrician.userId === caller.id;

  if (!isParty && caller.role !== "ADMIN") {
    throw new Error("Forbidden — you are not a party to this receipt.");
  }

  return receipt;
}

export async function listReceipts(filters?: { take?: number }) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const profileId =
    caller.role === "CLIENT" ? null : await getElectricianProfileIdFor(caller.id);

  return prisma.receipt.findMany({
    where:
      caller.role === "ADMIN"
        ? undefined
        : {
            OR: [
              { userId: caller.id },
              ...(profileId ? [{ job: { electricianId: profileId } }] : []),
            ],
          },
    include: { job: { include: { fault: { select: { ref: true, description: true } } } } },
    orderBy: { issuedAt: "desc" },
    take: filters?.take ?? 100,
  });
}

/** Signs the receipt on whichever side the caller sits. */
export async function signReceipt(id: string) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { job: { select: { electrician: { select: { userId: true } } } } },
  });

  if (!receipt) {
    throw new Error("Receipt not found.");
  }

  const isClient = receipt.userId === caller.id;
  const isElectrician = receipt.job.electrician.userId === caller.id;

  if (!isClient && !isElectrician) {
    throw new Error("Forbidden — you are not a party to this receipt.");
  }

  const signed = await prisma.receipt.update({
    where: { id },
    data: isClient ? { signedByClient: true } : { signedByElectrician: true },
  });

  revalidatePath("/receipts");
  return signed;
}

export async function deleteReceipt(id: string) {
  await requireRole(["ADMIN"]);

  await prisma.receipt.delete({ where: { id } });
  revalidatePath("/receipts");
}

// ─── Reviews ────────────────────────────────────────────────────────────────

/**
 * A client reviews a completed job. The review insert and the electrician's
 * rolling rating are one transaction, so `averageRating` / `totalReviews` can
 * never drift from the rows they summarise.
 */
export async function createReview(input: {
  jobId: string;
  rating: number;
  comment?: string;
}) {
  const { caller, job, isClient } = await requireJobAccess(input.jobId);

  if (!isClient) {
    throw new Error("Forbidden — only the client on this job can review it.");
  }
  if (job.status !== "COMPLETED") {
    throw new Error("You can only review a completed job.");
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be a whole number between 1 and 5.");
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        jobId: job.id,
        reviewerId: caller.id,
        electricianId: job.electricianId,
        rating: input.rating,
        comment: input.comment?.trim() || null,
      },
    });

    const stats = await tx.review.aggregate({
      where: { electricianId: job.electricianId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.electricianProfile.update({
      where: { id: job.electricianId },
      data: {
        averageRating: stats._avg.rating,
        totalReviews: stats._count._all,
      },
    });

    return created;
  });

  revalidatePath("/technicians");
  revalidatePath("/dashboard");
  return review;
}

export async function listReviewsForElectrician(electricianId: string) {
  return prisma.review.findMany({
    where: { electricianId },
    include: { reviewer: { select: { name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteReview(id: string) {
  const caller = await requireRole(["CLIENT", "ELECTRICIAN", "ADMIN"]);

  const review = await prisma.review.findUnique({
    where: { id },
    select: { reviewerId: true, electricianId: true },
  });

  if (!review) {
    throw new Error("Review not found.");
  }
  if (review.reviewerId !== caller.id && caller.role !== "ADMIN") {
    throw new Error("Forbidden — you can only delete your own review.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id } });

    const stats = await tx.review.aggregate({
      where: { electricianId: review.electricianId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.electricianProfile.update({
      where: { id: review.electricianId },
      data: {
        averageRating: stats._avg.rating,
        totalReviews: stats._count._all,
      },
    });
  });

  revalidatePath("/technicians");
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export async function getMySubscription() {
  const userId = await requireUserId();

  return prisma.subscription.findUnique({ where: { userId } });
}

/**
 * Writes the caller's plan. Payment capture happens at the provider — this only
 * records the outcome, so it must be called from a verified webhook or after a
 * confirmed checkout, never straight from an unvalidated client form.
 */
export async function upsertSubscription(input: {
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  renewsAt?: Date | null;
  externalId?: string | null;
}) {
  const userId = await requireUserId();

  const fields = {
    plan: input.plan,
    status: input.status ?? ("ACTIVE" as SubscriptionStatus),
    renewsAt: input.renewsAt ?? null,
    externalId: input.externalId ?? null,
  };

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  });

  revalidatePath("/dashboard");
  return subscription;
}

export async function cancelSubscription() {
  const userId = await requireUserId();

  const subscription = await prisma.subscription.update({
    where: { userId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  revalidatePath("/dashboard");
  return subscription;
}
