import Link from "next/link";
import {
  getCurrentUser,
  getMyVerificationStatus,
  listBookableFaults,
  listFaultReports,
  listJobs,
  listPendingVerifications,
  listReceipts,
} from "@/lib/supabase/actions";
import { AccessNotice } from "@/components/AccessNotice";
import { VerifyButtons } from "./VerifyButtons";

// Everything here is the caller's own live workload; a cached snapshot would be
// actively misleading.
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard | FaultFx" };

const ACTIVE_JOB_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"] as const;

function isActiveJob(status: string) {
  return (ACTIVE_JOB_STATUSES as readonly string[]).includes(status);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function priorityClass(priority: string) {
  return `badge badge-${priority.toLowerCase()}`;
}

function Stat({ value, label, href }: { value: number | string; label: string; href?: string }) {
  const body = (
    <>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.75rem",
          fontWeight: 800,
          color: "var(--teal-300)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.03em" }}>
        {label}
      </div>
    </>
  );

  return (
    <div className="glass" style={{ padding: "1.125rem 1.25rem", flex: "1 1 150px" }}>
      {href ? <Link href={href}>{body}</Link> : body}
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="glass" style={{ padding: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
          {title}
        </h2>
        {action && (
          <Link href={action.href} style={{ fontSize: "0.8rem", color: "var(--teal-400)" }}>
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.7 }}>{children}</p>
  );
}

function Row({
  title,
  meta,
  right,
}: {
  title: React.ReactNode;
  meta: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid var(--border-muted)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
          {meta}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/* ── Client ──────────────────────────────────────────────────────────────── */

async function ClientDashboard() {
  const [faults, jobs, receipts] = await Promise.all([
    listFaultReports(),
    listJobs(),
    listReceipts(),
  ]);

  const openFaults = faults.filter((f) => f.status === "OPEN");
  const activeJobs = jobs.filter((j) => isActiveJob(j.status));
  const toSign = receipts.filter((r) => !r.signedByClient);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginBottom: "1.25rem" }}>
        <Stat value={openFaults.length} label="OPEN FAULTS" href="/fault-log" />
        <Stat value={activeJobs.length} label="JOBS IN PROGRESS" />
        <Stat value={toSign.length} label="RECEIPTS TO SIGN" href="/receipts" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Surfaced first because it is the only item here that is blocked on
            the client rather than on someone else. */}
        {toSign.length > 0 && (
          <Card title="Needs your signature" action={{ href: "/receipts", label: "Go to receipts" }}>
            {toSign.slice(0, 5).map((r) => (
              <Row
                key={r.id}
                title={r.job.fault.description}
                meta={`${r.ref} · issued ${formatDate(r.issuedAt)}`}
                right={
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-300)" }}>
                    N${r.totalAmount.toLocaleString()}
                  </span>
                }
              />
            ))}
          </Card>
        )}

        <Card title="Your fault reports" action={{ href: "/fault-log", label: "Report a fault" }}>
          {faults.length === 0 ? (
            <Empty>
              You haven&apos;t reported any faults yet. Scan a QR code in a room, or use the report
              form, and it will show up here.
            </Empty>
          ) : (
            faults
              .slice(0, 6)
              .map((f) => (
                <Row
                  key={f.id}
                  title={f.description}
                  meta={`${f.ref} · ${f.location ? `${f.location.building} · ${f.location.room}` : "No location"} · ${formatDate(f.createdAt)}`}
                  right={<span className={priorityClass(f.priority)}>{f.status}</span>}
                />
              ))
          )}
        </Card>

        <Card title="Your jobs">
          {jobs.length === 0 ? (
            <Empty>
              No call-outs yet. Once you assign an electrician to one of your faults, the job
              appears here. <Link href="/technicians" style={{ color: "var(--teal-400)" }}>Find an electrician</Link>.
            </Empty>
          ) : (
            jobs
              .slice(0, 6)
              .map((j) => (
                <Row
                  key={j.id}
                  title={j.fault.description}
                  meta={`${j.fault.ref} · ${j.electrician.user.name}`}
                  right={<span className="badge badge-verified">{j.status}</span>}
                />
              ))
          )}
        </Card>
      </div>
    </>
  );
}

/* ── Electrician ─────────────────────────────────────────────────────────── */

async function ElectricianDashboard() {
  const [verification, jobs, receipts] = await Promise.all([
    // An ELECTRICIAN account without a profile row is possible if sign-up was
    // interrupted; that is a prompt to finish setup, not a crash.
    getMyVerificationStatus().catch(() => null),
    listJobs(),
    listReceipts(),
  ]);

  const activeJobs = jobs.filter((j) => isActiveJob(j.status));
  const completed = jobs.filter((j) => j.status === "COMPLETED");
  const toSign = receipts.filter((r) => !r.signedByElectrician);

  return (
    <>
      {/* The single most important thing an electrician can be told: why no
          work is arriving. Verification gates both assignment (createJob) and
          the availability toggle, so it goes above everything else. */}
      {!verification?.ntaVerified && (
        <div
          className="glass"
          style={{
            padding: "1.5rem",
            marginBottom: "1.25rem",
            border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.06)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.05rem",
              marginBottom: "0.5rem",
            }}
          >
            ⚠ Verification incomplete
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "1.125rem" }}>
            {verification
              ? "Until your NTA certification is verified you cannot be assigned call-outs and cannot mark yourself available. Submitting your NTA UID sends it to an administrator to check."
              : "Your electrician profile isn't set up yet. Add your NTA UID to start the verification process."}
          </p>
          <Link
            href="/electrician/verification"
            className="btn-primary"
            style={{ display: "inline-flex", justifyContent: "center", fontSize: "0.875rem" }}
          >
            {verification?.ntaUid ? "Check verification status" : "Submit for verification"}
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginBottom: "1.25rem" }}>
        <Stat value={activeJobs.length} label="ACTIVE CALL-OUTS" />
        <Stat value={completed.length} label="COMPLETED" />
        <Stat value={toSign.length} label="RECEIPTS TO SIGN" href="/receipts" />
        <Stat
          value={verification?.isAvailable ? "Available" : "Busy"}
          label="STATUS"
          href="/electrician/verification"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <Card title="Your call-outs" action={{ href: "/certs", label: "Certificates" }}>
          {jobs.length === 0 ? (
            <Empty>
              No call-outs assigned yet.{" "}
              {verification?.ntaVerified
                ? "Clients find you through the directory — keep your service area and call-out fee current."
                : "Verified electricians appear in the directory and can be booked."}
            </Empty>
          ) : (
            jobs
              .slice(0, 8)
              .map((j) => (
                <Row
                  key={j.id}
                  title={j.fault.description}
                  meta={`${j.fault.ref} · ${j.client.name} · ${formatDate(j.createdAt)}`}
                  right={<span className={priorityClass(j.fault.priority)}>{j.status}</span>}
                />
              ))
          )}
        </Card>

        {toSign.length > 0 && (
          <Card title="Receipts awaiting your signature" action={{ href: "/receipts", label: "Go to receipts" }}>
            {toSign.slice(0, 5).map((r) => (
              <Row
                key={r.id}
                title={r.job.fault.description}
                meta={`${r.ref} · issued ${formatDate(r.issuedAt)}`}
                right={
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-300)" }}>
                    N${r.totalAmount.toLocaleString()}
                  </span>
                }
              />
            ))}
          </Card>
        )}
      </div>
    </>
  );
}

/* ── Admin ───────────────────────────────────────────────────────────────── */

async function AdminDashboard() {
  const [pending, unassigned, jobs] = await Promise.all([
    listPendingVerifications(),
    listBookableFaults(),
    listJobs(),
  ]);

  const activeJobs = jobs.filter((j) => isActiveJob(j.status));

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginBottom: "1.25rem" }}>
        <Stat value={pending.length} label="AWAITING VERIFICATION" />
        <Stat value={unassigned.length} label="UNASSIGNED FAULTS" />
        <Stat value={activeJobs.length} label="ACTIVE JOBS" />
        <Stat value="QR" label="MANAGE LOCATIONS" href="/admin/qr-codes" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* First, because everyone in this queue is blocked from working until
            an admin acts. Oldest first. */}
        <Card title="Verification queue">
          {pending.length === 0 ? (
            <Empty>Nothing waiting. Every submitted NTA UID has been reviewed.</Empty>
          ) : (
            pending.map((p) => (
              <Row
                key={p.id}
                title={p.user.name}
                meta={`NTA ${p.ntaUid} · ${p.user.email} · submitted ${formatDate(p.updatedAt)}${
                  p.wiremanLicense ? ` · licence ${p.wiremanLicense}` : ""
                }`}
                right={
                  <VerifyButtons
                    profileId={p.id}
                    hasLicence={Boolean(p.wiremanLicense)}
                    wiremanVerified={p.wiremanVerified}
                  />
                }
              />
            ))
          )}
        </Card>

        <Card title="Faults with no electrician assigned">
          {unassigned.length === 0 ? (
            <Empty>Every reported fault has an electrician on it.</Empty>
          ) : (
            unassigned
              .slice(0, 8)
              .map((f) => (
                <Row
                  key={f.id}
                  title={f.description}
                  meta={`${f.ref} · ${f.location ? `${f.location.building} · ${f.location.room}` : "No location"} · ${formatDate(f.createdAt)}`}
                  right={<span className={priorityClass(f.priority)}>{f.priority}</span>}
                />
              ))
          )}
        </Card>

        <Card title="Recent jobs">
          {jobs.length === 0 ? (
            <Empty>No jobs have been created yet.</Empty>
          ) : (
            jobs
              .slice(0, 8)
              .map((j) => (
                <Row
                  key={j.id}
                  title={j.fault.description}
                  meta={`${j.fault.ref} · ${j.client.name} → ${j.electrician.user.name}`}
                  right={<span className="badge badge-verified">{j.status}</span>}
                />
              ))
          )}
        </Card>
      </div>
    </>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

export default async function DashboardPage() {
  // proxy.ts redirects signed-out callers to /login before this runs, so this
  // is a backstop rather than the primary gate.
  const user = await getCurrentUser().catch(() => null);

  return (
    <section
      style={{
        minHeight: "calc(100dvh - 68px)",
        background: "var(--grad-hero)",
        padding: "2.5rem 1.5rem 4rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, background: "var(--grad-glow)", pointerEvents: "none" }}
      />

      <div className="container" style={{ position: "relative" }}>
        {!user ? (
          <AccessNotice
            title="Sign in to view your dashboard"
            message="Your faults, call-outs and receipts live behind your account."
          />
        ) : (
          <>
            <div style={{ marginBottom: "2rem" }}>
              <h1
                id="dashboard-heading"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                  fontWeight: 800,
                  marginBottom: "0.35rem",
                }}
              >
                {user.name.split(" ")[0]}&apos;s dashboard
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                {user.role === "ADMIN"
                  ? "Platform overview — verifications, unassigned faults and live jobs."
                  : user.role === "ELECTRICIAN"
                    ? "Your call-outs, certificates and verification status."
                    : "Your fault reports, call-outs and receipts."}
              </p>
            </div>

            {user.role === "ADMIN" ? (
              <AdminDashboard />
            ) : user.role === "ELECTRICIAN" ? (
              <ElectricianDashboard />
            ) : (
              <ClientDashboard />
            )}
          </>
        )}
      </div>
    </section>
  );
}
