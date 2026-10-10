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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Everything here is the caller's own live workload; a cached snapshot would be
// actively misleading.
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard | FaultFx" };

const ACTIVE_JOB_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS"] as const;

function isActiveJob(status: string) {
  return (ACTIVE_JOB_STATUSES as readonly string[]).includes(status);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * shadcn's Card ships a flat `bg-card`. `.glass` is declared unlayered in
 * globals.css, so it beats Tailwind's utilities and restores the frosted panel
 * the rest of the app uses — same primitives, same visual language.
 *
 * The extra utilities settle a conflict rather than decorate: Card draws its
 * own `ring-1` at a `rounded-xl` (12px) radius, while `.glass` rounds to 20px
 * and draws a teal border. Left alone that renders as two mismatched outlines
 * with the corners clipped by Card's `overflow-hidden`.
 */
const GLASS = "glass border-transparent ring-0 rounded-[var(--radius-lg)] p-4";

function StatCard({
  value,
  label,
  href,
}: {
  value: number | string;
  label: string;
  href?: string;
}) {
  const body = (
    <div className="flex h-full flex-col justify-center p-4">
      <div className="flex p-4">
        <CardTitle className="font-(family-name:--font-display) text-3xl font-extrabold leading-none text-(--teal-300)">
          {value}
        </CardTitle>
        <div className="mt-1 text-xs tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );

  return (
    <Card
      className={`${GLASS} min-w-37.5 min-h-37.5 flex-1 py-0 transition-transform hover:-translate-y-0.5 p-10`}
    >
      {href ? <Link href={href}>{body}</Link> : body}
    </Card>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <Card className={GLASS}>
      <CardHeader>
        <CardTitle className="font-(family-name:--font-display) text-base">
          {title}
        </CardTitle>
        {action && (
          <CardAction>
            <Button
              asChild
              variant="link"
              size="sm"
              className="text-(--teal-400)"
            >
              <Link href={action.href}>{action.label} →</Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
  );
}

/** Reuses the established priority palette from globals.css. */
function PriorityBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={`badge-${value.toLowerCase()} border-transparent`}
    >
      {value}
    </Badge>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={isActiveJob(value) ? "secondary" : "outline"}
      className="font-medium"
    >
      {value.replace("_", " ")}
    </Badge>
  );
}

function Money({ amount }: { amount: number }) {
  return (
    <span className="font-(family-name:--font-display) font-bold text-(--teal-300)">
      N${amount.toLocaleString()}
    </span>
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
      <div className="mb-5 flex flex-wrap gap-3.5">
        <StatCard
          value={openFaults.length}
          label="OPEN FAULTS"
          href="/fault-log"
        />
        <StatCard value={activeJobs.length} label="JOBS IN PROGRESS" />
        <StatCard
          value={toSign.length}
          label="RECEIPTS TO SIGN"
          href="/receipts"
        />
      </div>

      <div className="flex flex-col gap-5">
        {/* First, because it is the only item here blocked on the client rather
            than on someone else. */}
        {toSign.length > 0 && (
          <Section
            title="Needs your signature"
            action={{ href: "/receipts", label: "Go to receipts" }}
          >
            <Table>
              <TableBody>
                {toSign.slice(0, 5).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.job.fault.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.ref} · issued {formatDate(r.issuedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={r.totalAmount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        <Section
          title="Your fault reports"
          action={{ href: "/fault-log", label: "Report a fault" }}
        >
          {faults.length === 0 ? (
            <Empty>
              You haven&apos;t reported any faults yet. Scan a QR code in a
              room, or use the report form, and it will show up here.
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault</TableHead>
                  <TableHead>Where</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faults.slice(0, 6).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.location
                        ? `${f.location.building} · ${f.location.room}`
                        : "No location"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={f.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PriorityBadge value={f.priority} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section title="Your jobs">
          {jobs.length === 0 ? (
            <Empty>
              No call-outs yet. Once you assign an electrician to one of your
              faults, the job appears here.{" "}
              <Link href="/technicians" className="text-(--teal-400)">
                Find an electrician
              </Link>
              .
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault</TableHead>
                  <TableHead>Electrician</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 6).map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">
                      {j.fault.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.electrician.user.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge value={j.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
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
      {/* The single most important thing an electrician can be told: why no work
          is arriving. Verification gates both assignment (createJob) and the
          availability toggle, so it goes above everything else. */}
      {!verification?.ntaVerified && (
        <Alert className="mb-5 border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]">
          <AlertTitle className="font-(family-name:--font-display) text-base font-bold">
            ⚠ Verification incomplete
          </AlertTitle>
          <AlertDescription className="mt-1 block leading-relaxed">
            {verification
              ? "Until your NTA certification is verified you cannot be assigned call-outs and cannot mark yourself available. Submitting your NTA UID sends it to an administrator to check."
              : "Your electrician profile isn't set up yet. Add your NTA UID to start the verification process."}
            <Button asChild className="mt-4 w-fit">
              <Link href="/electrician/verification">
                {verification?.ntaUid
                  ? "Check verification status"
                  : "Submit for verification"}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-5 flex flex-wrap gap-3.5">
        <StatCard value={activeJobs.length} label="ACTIVE CALL-OUTS" />
        <StatCard value={completed.length} label="COMPLETED" />
        <StatCard
          value={toSign.length}
          label="RECEIPTS TO SIGN"
          href="/receipts"
        />
        <StatCard
          value={verification?.isAvailable ? "Available" : "Busy"}
          label="STATUS"
          href="/electrician/verification"
        />
      </div>

      <div className="flex flex-col gap-5">
        <Section
          title="Your call-outs"
          action={{ href: "/certs", label: "Certificates" }}
        >
          {jobs.length === 0 ? (
            <Empty>
              No call-outs assigned yet.{" "}
              {verification?.ntaVerified
                ? "Clients find you through the directory — keep your service area and call-out fee current."
                : "Verified electricians appear in the directory and can be booked."}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 8).map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">
                      {j.fault.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.client.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(j.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge value={j.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        {toSign.length > 0 && (
          <Section
            title="Receipts awaiting your signature"
            action={{ href: "/receipts", label: "Go to receipts" }}
          >
            <Table>
              <TableBody>
                {toSign.slice(0, 5).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.job.fault.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.ref} · issued {formatDate(r.issuedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={r.totalAmount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
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
      <div className="mb-5 flex flex-wrap gap-3.5">
        <StatCard value={pending.length} label="AWAITING VERIFICATION" />
        <StatCard value={unassigned.length} label="UNASSIGNED FAULTS" />
        <StatCard value={activeJobs.length} label="ACTIVE JOBS" />
        <StatCard value="QR" label="MANAGE LOCATIONS" href="/admin/qr-codes" />
      </div>

      <div className="flex flex-col gap-5">
        {/* First, because everyone in this queue is blocked from working until
            an admin acts. Oldest first. */}
        <Section title="Verification queue">
          {pending.length === 0 ? (
            <Empty>
              Nothing waiting. Every submitted NTA UID has been reviewed.
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Electrician</TableHead>
                  <TableHead>NTA UID</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.ntaUid}
                      {p.wiremanLicense && (
                        <div className="text-xs">
                          licence {p.wiremanLicense}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <VerifyButtons
                        profileId={p.id}
                        hasLicence={Boolean(p.wiremanLicense)}
                        wiremanVerified={p.wiremanVerified}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section title="Faults with no electrician assigned">
          {unassigned.length === 0 ? (
            <Empty>Every reported fault has an electrician on it.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault</TableHead>
                  <TableHead>Where</TableHead>
                  <TableHead>Logged</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassigned.slice(0, 8).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {f.location
                        ? `${f.location.building} · ${f.location.room}`
                        : "No location"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(f.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PriorityBadge value={f.priority} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>

        <Section title="Recent jobs">
          {jobs.length === 0 ? (
            <Empty>No jobs have been created yet.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fault</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Electrician</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.slice(0, 8).map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">
                      {j.fault.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.client.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {j.electrician.user.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge value={j.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
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
    // The hero gradient stays an inline style: it is a CSS gradient behind a
    // custom property, which Tailwind's bg-* utilities cannot express.
    <section
      className="relative min-h-[calc(100dvh-68px)] overflow-hidden px-6 pt-10 pb-16"
      style={{ background: "var(--grad-hero)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--grad-glow)" }}
      />

      <div className="container relative">
        {!user ? (
          <AccessNotice
            title="Sign in to view your dashboard"
            message="Your faults, call-outs and receipts live behind your account."
          />
        ) : (
          <>
            <header className="mb-8">
              <h1
                id="dashboard-heading"
                className="font-(family-name:--font-display) text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold"
              >
                {user.name.split(" ")[0]}&apos;s dashboard
              </h1>
              <p className="mt-1 text-[0.95rem] text-muted-foreground">
                {user.role === "ADMIN"
                  ? "Platform overview — verifications, unassigned faults and live jobs."
                  : user.role === "ELECTRICIAN"
                  ? "Your call-outs, certificates and verification status."
                  : "Your fault reports, call-outs and receipts."}
              </p>
            </header>

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
