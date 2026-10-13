import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the authorization boundary.
 *
 * Prisma connects as the database owner, so Row Level Security protects
 * nothing on this code path — the guards in actions.ts are the ONLY thing
 * standing between a caller and the data. Server Actions are public POST
 * endpoints, reachable with arbitrary JSON, so these checks are load-bearing
 * in a way that a type annotation is not.
 *
 * Every bug found in this project so far has been in exactly this layer, which
 * is why it is the first thing with tests.
 */

// ── Mocks ───────────────────────────────────────────────────────────────────
// `cache` is memoisation keyed to a request scope that does not exist here.
// Passing the function straight through also means each guard genuinely re-runs.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
/** The org cookie the switcher sets; tests drive it directly. */
let orgCookie: string | undefined;
const cookieStore = {
  get: (name: string) =>
    name === "faultfx_active_org" && orgCookie ? { value: orgCookie } : undefined,
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  headers: async () => new Map([["host", "test.local"]]),
  cookies: async () => cookieStore,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

/** The signed-in auth user, swapped per test. */
let sessionUserId: string | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () =>
        sessionUserId
          ? { data: { user: { id: sessionUserId, email: "caller@test.local" } }, error: null }
          : { data: { user: null }, error: new Error("no session") },
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
  }),
}));

const prismaMock = {
  user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  electricianProfile: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  faultReport: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  job: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  location: { findMany: vi.fn(), findUnique: vi.fn() },
  membership: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  organisation: { findUnique: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const actions = await import("./actions");

// ── Helpers ─────────────────────────────────────────────────────────────────
const CLIENT_ID = "user-client";
const ELEC_USER_ID = "user-elec";
const ELEC_PROFILE_ID = "profile-elec";

/** Signs a caller in with the given database role. */
function signInAs(role: "CLIENT" | "ELECTRICIAN" | "ADMIN", id = CLIENT_ID) {
  sessionUserId = id;
  prismaMock.user.findUnique.mockResolvedValue({ id, role });
}

function signOut() {
  sessionUserId = null;
  prismaMock.user.findUnique.mockResolvedValue(null);
}

const ORG_ID = "org-fnb";

/** Puts the caller in an organisation context with the given standing. */
function actingAsOrg(role: "OWNER" | "MANAGER" | "MEMBER", organisationId = ORG_ID) {
  orgCookie = organisationId;
  prismaMock.membership.findUnique.mockResolvedValue({
    id: "mem-1",
    role,
    organisationId,
  });
}

/** Cookie names an organisation the caller is NOT in. */
function actingAsStranger(organisationId = ORG_ID) {
  orgCookie = organisationId;
  prismaMock.membership.findUnique.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  orgCookie = undefined;
  signOut();
});

// ── Signed out ──────────────────────────────────────────────────────────────
describe("a signed-out caller", () => {
  it("cannot read a fault report", async () => {
    await expect(actions.getFaultReport("fault-1")).rejects.toThrow(/Unauthorized/);
  });

  it("cannot list jobs", async () => {
    await expect(actions.listJobs()).rejects.toThrow(/Unauthorized/);
  });

  it("cannot read the admin location list", async () => {
    await expect(actions.getAllLocations()).rejects.toThrow(/Unauthorized/);
  });
});

// ── Role gates ──────────────────────────────────────────────────────────────
describe("role gates", () => {
  it("keeps a client out of the verification queue", async () => {
    signInAs("CLIENT");
    await expect(actions.listPendingVerifications()).rejects.toThrow(/requires role ADMIN/);
  });

  it("keeps a client out of the full location list", async () => {
    signInAs("CLIENT");
    await expect(actions.getAllLocations()).rejects.toThrow(/requires role ADMIN/);
  });

  it("stops an electrician deleting a fault report", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    await expect(actions.deleteFaultReport("fault-1")).rejects.toThrow(/requires role ADMIN/);
  });

  it("lets an admin into the verification queue", async () => {
    signInAs("ADMIN");
    prismaMock.electricianProfile.findMany.mockResolvedValue([]);
    await expect(actions.listPendingVerifications()).resolves.toEqual([]);
  });
});

// ── Privilege escalation ────────────────────────────────────────────────────
describe("syncUserProfile", () => {
  it("refuses to mint an administrator", async () => {
    await expect(
      actions.syncUserProfile({
        userId: "whoever",
        email: "a@b.c",
        name: "A",
        // The TS union is erased at runtime; this is what a raw POST sends.
        role: "ADMIN" as unknown as "CLIENT",
      })
    ).rejects.toThrow(/Invalid role/);
  });

  it("rejects an unknown role outright", async () => {
    await expect(
      actions.syncUserProfile({
        userId: "whoever",
        email: "a@b.c",
        name: "A",
        role: "SUPERUSER" as unknown as "CLIENT",
      })
    ).rejects.toThrow(/Invalid role/);
  });
});

// ── createJob: the call-out gates ───────────────────────────────────────────
describe("createJob", () => {
  const FAULT = {
    id: "fault-1",
    reporterId: CLIENT_ID,
    jobs: [] as { id: string }[],
  };

  beforeEach(() => {
    signInAs("CLIENT");
    prismaMock.faultReport.findUnique.mockResolvedValue(FAULT);
  });

  it("refuses an electrician who is not NTA verified", async () => {
    prismaMock.electricianProfile.findUnique.mockResolvedValue({
      ntaVerified: false,
      isAvailable: true,
    });
    await expect(
      actions.createJob({ faultId: "fault-1", electricianId: ELEC_PROFILE_ID })
    ).rejects.toThrow(/NTA verification/);
  });

  it("refuses an electrician who is not available", async () => {
    prismaMock.electricianProfile.findUnique.mockResolvedValue({
      ntaVerified: true,
      isAvailable: false,
    });
    await expect(
      actions.createJob({ faultId: "fault-1", electricianId: ELEC_PROFILE_ID })
    ).rejects.toThrow(/not currently accepting/);
  });

  it("refuses a fault that already has a live job", async () => {
    prismaMock.faultReport.findUnique.mockResolvedValue({
      ...FAULT,
      jobs: [{ id: "job-live" }],
    });
    await expect(
      actions.createJob({ faultId: "fault-1", electricianId: ELEC_PROFILE_ID })
    ).rejects.toThrow(/already has a job/);
  });

  it("stops a client raising a job on someone else's fault", async () => {
    prismaMock.faultReport.findUnique.mockResolvedValue({
      ...FAULT,
      reporterId: "somebody-else",
    });
    await expect(
      actions.createJob({ faultId: "fault-1", electricianId: ELEC_PROFILE_ID })
    ).rejects.toThrow(/your own faults/);
  });
});

// ── updateJobStatus: lifecycle + who may drive it ───────────────────────────
describe("updateJobStatus", () => {
  function jobIs(status: string) {
    prismaMock.job.findUnique.mockResolvedValue({
      id: "job-1",
      status,
      faultId: "fault-1",
      clientId: CLIENT_ID,
      electrician: { id: ELEC_PROFILE_ID, userId: ELEC_USER_ID },
    });
  }

  it("rejects skipping straight from pending to completed", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    jobIs("PENDING");
    await expect(actions.updateJobStatus("job-1", "COMPLETED")).rejects.toThrow(
      /cannot move to completed/
    );
  });

  it("rejects reopening a completed job", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    jobIs("COMPLETED");
    await expect(actions.updateJobStatus("job-1", "IN_PROGRESS")).rejects.toThrow(
      /can no longer change/
    );
  });

  it("stops the client progressing the work", async () => {
    signInAs("CLIENT");
    jobIs("PENDING");
    await expect(actions.updateJobStatus("job-1", "ACCEPTED")).rejects.toThrow(
      /only the assigned electrician/
    );
  });

  it("treats re-sending the current status as a no-op", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    jobIs("IN_PROGRESS");
    await expect(actions.updateJobStatus("job-1", "IN_PROGRESS")).resolves.toMatchObject({
      status: "IN_PROGRESS",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("allows the legal step, and only writes then", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    jobIs("IN_PROGRESS");
    prismaMock.$transaction.mockResolvedValue({ id: "job-1", status: "COMPLETED" });
    await expect(actions.updateJobStatus("job-1", "COMPLETED")).resolves.toMatchObject({
      status: "COMPLETED",
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });
});

// ── Fault ownership ─────────────────────────────────────────────────────────
describe("updateFaultReport", () => {
  it("stops a client editing someone else's fault", async () => {
    signInAs("CLIENT");
    prismaMock.faultReport.findUnique.mockResolvedValue({ reporterId: "somebody-else" });
    await expect(
      actions.updateFaultReport("fault-1", { description: "mine now" })
    ).rejects.toThrow(/faults you reported/);
  });

  it("stops a client triaging their own fault", async () => {
    signInAs("CLIENT");
    prismaMock.faultReport.findUnique.mockResolvedValue({ reporterId: CLIENT_ID });
    await expect(
      actions.updateFaultReport("fault-1", { status: "RESOLVED" })
    ).rejects.toThrow(/only an electrician can change fault status/i);
  });
});

// ── Organisation context ────────────────────────────────────────────────────
describe("organisation context", () => {
  it("ignores a cookie naming an organisation the caller is not in", async () => {
    signInAs("CLIENT");
    actingAsStranger();
    prismaMock.faultReport.findMany.mockResolvedValue([]);

    await actions.listFaultReports();

    // Falls back to personal scope, NOT the claimed organisation. This is the
    // property that makes a client-controlled cookie safe to read at all.
    const where = prismaMock.faultReport.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ reporterId: CLIENT_ID, organisationId: null });
    expect(where.organisationId).not.toBe(ORG_ID);
  });

  it("scopes a client to their own personal faults with no cookie", async () => {
    signInAs("CLIENT");
    prismaMock.faultReport.findMany.mockResolvedValue([]);

    await actions.listFaultReports();

    expect(prismaMock.faultReport.findMany.mock.calls[0][0].where).toMatchObject({
      reporterId: CLIENT_ID,
      organisationId: null,
    });
  });

  it("shows a member the whole organisation's faults, not just their own", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");
    prismaMock.faultReport.findMany.mockResolvedValue([]);

    await actions.listFaultReports();

    const where = prismaMock.faultReport.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ organisationId: ORG_ID });
    // The whole point: colleagues' reports are included.
    expect(where).not.toHaveProperty("reporterId");
  });

  it("leaves staff reads unscoped", async () => {
    signInAs("ELECTRICIAN", ELEC_USER_ID);
    prismaMock.faultReport.findMany.mockResolvedValue([]);

    await actions.listFaultReports();

    const where = prismaMock.faultReport.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty("organisationId");
    expect(where).not.toHaveProperty("reporterId");
  });

  it("refuses to switch into an organisation the caller is not in", async () => {
    signInAs("CLIENT");
    prismaMock.membership.findUnique.mockResolvedValue(null);

    await expect(actions.setActiveOrganisation(ORG_ID)).rejects.toThrow(/not a member/);
    // Nothing unauthorised reaches the cookie.
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("switches into an organisation the caller belongs to", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");

    await actions.setActiveOrganisation(ORG_ID);

    expect(cookieStore.set).toHaveBeenCalledOnce();
    const [, value, options] = cookieStore.set.mock.calls[0];
    expect(value).toBe(ORG_ID);
    // The client never needs to read it, so it must not be exposed to scripts.
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax" });
  });
});

// ── Organisation membership administration ─────────────────────────────────
describe("organisation membership", () => {
  it("stops a plain member adding colleagues", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");

    await expect(
      actions.addOrganisationMember({ organisationId: ORG_ID, email: "new@test.local" })
    ).rejects.toThrow(/requires OWNER or MANAGER/);
  });

  it("stops a manager creating another owner", async () => {
    signInAs("CLIENT");
    actingAsOrg("MANAGER");

    await expect(
      actions.addOrganisationMember({
        organisationId: ORG_ID,
        email: "new@test.local",
        role: "OWNER",
      })
    ).rejects.toThrow(/requires OWNER/);
  });

  it("will not add someone who has no account", async () => {
    signInAs("CLIENT");
    actingAsOrg("OWNER");
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      actions.addOrganisationMember({ organisationId: ORG_ID, email: "ghost@test.local" })
    ).rejects.toThrow(/no FaultFx account/i);
  });

  it("refuses to remove the last owner", async () => {
    signInAs("CLIENT");
    actingAsOrg("OWNER");
    prismaMock.membership.findUnique.mockResolvedValueOnce({
      id: "mem-1",
      role: "OWNER",
      organisationId: ORG_ID,
    });
    prismaMock.membership.count.mockResolvedValue(1);

    await expect(
      actions.removeOrganisationMember({ organisationId: ORG_ID, membershipId: "mem-x" })
    ).rejects.toThrow(/only owner/i);
  });

  it("keeps a non-member out of the people list", async () => {
    signInAs("CLIENT");
    actingAsStranger();

    await expect(actions.listOrganisationMembers(ORG_ID)).rejects.toThrow(/not a member/);
  });
});

// ── Fault ownership follows the building ───────────────────────────────────
describe("createFaultReport organisation stamping", () => {
  it("takes the organisation from the building, even for an anonymous report", async () => {
    signOut();
    prismaMock.location.findUnique.mockResolvedValue({ organisationId: ORG_ID });
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    await actions.createFaultReport({ description: "Dead socket", locationId: "loc-1" });

    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      organisationId: ORG_ID,
      reporterId: null,
    });
  });

  it("falls back to the reporter's context when the building is unowned", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");
    prismaMock.location.findUnique.mockResolvedValue({ organisationId: null });
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    await actions.createFaultReport({ description: "Flickering light", locationId: "loc-1" });

    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      organisationId: ORG_ID,
    });
  });

  it("leaves a personal fault unowned", async () => {
    signInAs("CLIENT");
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    // An address is now required when there is no registered room; see the
    // reporting-paths suite below.
    await actions.createFaultReport({
      description: "My kitchen plug",
      address: "12 Nelson Mandela Ave",
    });

    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      organisationId: null,
      reporterId: CLIENT_ID,
    });
  });
});

// ── Editing an organisation's faults ───────────────────────────────────────
describe("updateFaultReport in an organisation", () => {
  it("lets a manager correct a colleague's report", async () => {
    signInAs("CLIENT");
    actingAsOrg("MANAGER");
    prismaMock.faultReport.findUnique.mockResolvedValue({
      reporterId: "a-colleague",
      organisationId: ORG_ID,
    });
    prismaMock.faultReport.update.mockResolvedValue({ id: "f1" });

    await expect(
      actions.updateFaultReport("f1", { description: "Corrected" })
    ).resolves.toBeDefined();
  });

  it("stops a plain member rewriting a colleague's report", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");
    prismaMock.faultReport.findUnique.mockResolvedValue({
      reporterId: "a-colleague",
      organisationId: ORG_ID,
    });

    await expect(
      actions.updateFaultReport("f1", { description: "Nope" })
    ).rejects.toThrow(/faults you reported/);
  });
});

// ── The three reporting paths ───────────────────────────────────────────────
describe("who may report a fault, and where", () => {
  it("refuses an anonymous report that names no place at all", async () => {
    signOut();
    await expect(
      actions.createFaultReport({ description: "something is broken" })
    ).rejects.toThrow(/Scan the QR code|sign in/i);
    expect(prismaMock.faultReport.create).not.toHaveBeenCalled();
  });

  it("allows an anonymous report against a scanned room", async () => {
    signOut();
    prismaMock.location.findUnique.mockResolvedValue({ organisationId: ORG_ID });
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    await actions.createFaultReport({
      description: "Dead socket",
      locationId: "loc-1",
      reporterName: "Passing visitor",
    });

    // The sticker on the wall is the authorisation, and the fault still lands
    // with the organisation that owns the room.
    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      organisationId: ORG_ID,
      reporterName: "Passing visitor",
      reporterId: null,
    });
  });

  it("makes a signed-in reporter give an address when there is no room", async () => {
    signInAs("CLIENT");
    await expect(
      actions.createFaultReport({ description: "Kitchen plug dead" })
    ).rejects.toThrow(/pick a room or give an address/i);
  });

  it("accepts a personal report at an address, unowned", async () => {
    signInAs("CLIENT");
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    await actions.createFaultReport({
      description: "Kitchen plug dead",
      address: "12 Nelson Mandela Ave, Windhoek",
    });

    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      address: "12 Nelson Mandela Ave, Windhoek",
      organisationId: null,
      locationId: null,
    });
  });

  it("drops a stray address when a room was given", async () => {
    signInAs("CLIENT");
    prismaMock.location.findUnique.mockResolvedValue({ organisationId: null });
    prismaMock.faultReport.create.mockResolvedValue({ id: "f1" });

    await actions.createFaultReport({
      description: "Flickering",
      locationId: "loc-1",
      address: "ignored",
    });

    // The room already says where; two answers would disagree eventually.
    expect(prismaMock.faultReport.create.mock.calls[0][0].data).toMatchObject({
      address: null,
    });
  });
});

// ── The room dropdown must not leak other customers' sites ─────────────────
describe("listLocationsForReporting", () => {
  it("gives a signed-out caller nothing", async () => {
    signOut();
    await expect(actions.listLocationsForReporting()).resolves.toEqual([]);
    expect(prismaMock.location.findMany).not.toHaveBeenCalled();
  });

  it("gives a caller in personal context nothing", async () => {
    signInAs("CLIENT");
    await expect(actions.listLocationsForReporting()).resolves.toEqual([]);
    expect(prismaMock.location.findMany).not.toHaveBeenCalled();
  });

  it("returns only the active organisation's rooms", async () => {
    signInAs("CLIENT");
    actingAsOrg("MEMBER");
    prismaMock.location.findMany.mockResolvedValue([]);

    await actions.listLocationsForReporting();

    expect(prismaMock.location.findMany.mock.calls[0][0].where).toEqual({
      organisationId: ORG_ID,
    });
  });

  it("ignores a cookie naming an organisation the caller is not in", async () => {
    signInAs("CLIENT");
    actingAsStranger();
    await expect(actions.listLocationsForReporting()).resolves.toEqual([]);
    expect(prismaMock.location.findMany).not.toHaveBeenCalled();
  });
});

// ── Organisations are created by the platform ──────────────────────────────
describe("createOrganisation", () => {
  it("is closed to clients", async () => {
    signInAs("CLIENT");
    await expect(actions.createOrganisation({ name: "FNB Namibia" })).rejects.toThrow(
      /requires role ADMIN/
    );
  });

  it("installs an owner so the organisation is administrable", async () => {
    signInAs("ADMIN", "admin-1");
    prismaMock.organisation.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        organisation: {
          findUnique: async () => null,
          create: async (args: { data: { memberships: { create: { userId: string; role: string } } } }) => ({
            id: "org-1",
            name: "FNB Namibia",
            slug: "fnb-namibia",
            _owner: args.data.memberships.create,
          }),
        },
      })
    );

    const org = await actions.createOrganisation({ name: "FNB Namibia" });
    expect(org).toMatchObject({ slug: "fnb-namibia" });
    expect((org as unknown as { _owner: { role: string } })._owner).toMatchObject({
      role: "OWNER",
      userId: "admin-1",
    });
  });
});
