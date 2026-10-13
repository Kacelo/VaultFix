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
vi.mock("next/headers", () => ({
  headers: async () => new Map([["host", "test.local"]]),
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
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  electricianProfile: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  faultReport: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
  job: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
  location: { findMany: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
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
