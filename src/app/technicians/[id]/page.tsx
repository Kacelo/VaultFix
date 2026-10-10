import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCurrentUser,
  getElectricianById,
  listBookableFaults,
  listReviewsForElectrician,
} from "@/lib/supabase/actions";
import { BookingForm, type BookableFault } from "./BookingForm";

// Availability, rating and the caller's own open faults all change under us, so
// render per request rather than serving a cached snapshot — same reasoning as
// the directory itself.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/technicians/[id]">) {
  const { id } = await props.params;
  const electrician = await getElectricianById(id);

  if (!electrician) {
    return { title: "Electrician not found | FaultFx" };
  }

  const trade = electrician.specialisation ?? "Electrician";
  const area = electrician.serviceArea ? ` in ${electrician.serviceArea}` : "";

  return {
    title: `${electrician.user.name} — ${trade} | FaultFx`,
    description: `${electrician.user.name} is ${
      electrician.ntaVerified ? "an NTA-verified" : "a registered"
    } ${trade.toLowerCase()}${area} on FaultFx. View credentials, reviews and book a call-out.`,
  };
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: "0.1rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? "#f59e0b" : "rgba(255,255,255,0.12)"}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function CertBadge({
  label,
  active,
  note,
}: {
  label: string;
  active: boolean;
  note: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        padding: "0.75rem 0.875rem",
        borderRadius: "var(--radius-lg)",
        background: active ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${
          active ? "rgba(20,184,166,0.25)" : "var(--border-muted)"
        }`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.825rem",
          fontWeight: 700,
          color: active ? "var(--teal-300)" : "var(--text-subtle)",
          marginBottom: "0.2rem",
        }}
      >
        <span>{active ? "✓" : "○"}</span>
        {label}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
        {note}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: "1 1 100px", textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.35rem",
          fontWeight: 800,
          color: "var(--teal-300)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "1.05rem",
        marginBottom: "0.875rem",
      }}
    >
      {children}
    </h2>
  );
}

export default async function TechnicianProfilePage(
  props: PageProps<"/technicians/[id]">
) {
  const { id } = await props.params;
  const electricianId = decodeURIComponent(id);

  // Three independent reads against a remote database, so they go out at once.
  // Awaiting them in sequence made the page cost the sum of three round trips
  // when it only ever needed the slowest. Reviews are keyed off the route param
  // rather than the loaded profile precisely so they need not wait for it —
  // an id that matches no electrician simply returns no reviews.
  const [electrician, reviews, viewer] = await Promise.all([
    getElectricianById(electricianId),
    listReviewsForElectrician(electricianId),
    // The profile is public, so a signed-out visitor is expected, not an error.
    getCurrentUser().catch(() => null),
  ]);

  // A stale or hand-typed profile link should 404 rather than render an empty
  // shell with a booking form pointing at nothing.
  if (!electrician) {
    notFound();
  }

  const isSelf = viewer?.electricianProfile?.id === electrician.id;

  // Only a signed-in client (or staff) has faults to book against; the action
  // throws for everyone else, which here just means "show the login prompt".
  // This one genuinely depends on who the viewer turned out to be, so it is the
  // only read that cannot join the batch above.
  let faults: BookableFault[] = [];
  if (viewer && !isSelf) {
    faults = await listBookableFaults().catch(() => []);
  }

  const { user, _count: counts } = electrician;
  const rating = electrician.averageRating;

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
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--grad-glow)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative" }}>
        <Link
          href="/technicians"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            marginBottom: "1.5rem",
          }}
        >
          ← All electricians
        </Link>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            alignItems: "flex-start",
          }}
        >
          {/* ── Main column ─────────────────────────────────────────── */}
          <div
            style={{
              flex: "1 1 420px",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div
              className="glass animate-fade-up"
              style={{ padding: "1.75rem", position: "relative" }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <span
                  className={`dot ${
                    electrician.isAvailable ? "dot-green" : "dot-amber"
                  }`}
                />
                <span
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  {electrician.isAvailable ? "Available" : "Busy"}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1.125rem",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "#fff",
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 0 24px rgba(20,184,166,0.25)",
                    flexShrink: 0,
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ minWidth: 0 }}>
                  <h1
                    id="technician-name"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.4rem, 2.4vw, 1.9rem)",
                      fontWeight: 800,
                      marginBottom: "0.2rem",
                    }}
                  >
                    {user.name}
                  </h1>
                  <p
                    style={{
                      color: "var(--teal-400)",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                    }}
                  >
                    {electrician.specialisation ?? "General electrical work"}
                  </p>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.825rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    📍 {electrician.serviceArea ?? "Service area not set"}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    {rating === null ? (
                      <span
                        style={{
                          fontSize: "0.825rem",
                          color: "var(--text-subtle)",
                        }}
                      >
                        No reviews yet
                      </span>
                    ) : (
                      <>
                        <Stars rating={rating} />
                        <span
                          style={{
                            fontSize: "0.825rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {rating.toFixed(1)} · {electrician.totalReviews}{" "}
                          {electrician.totalReviews === 1
                            ? "review"
                            : "reviews"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "1.5rem",
                  paddingTop: "1.25rem",
                  borderTop: "1px solid var(--border-muted)",
                }}
              >
                <Stat
                  value={String(counts.jobsAssigned)}
                  label="JOBS COMPLETED"
                />
                <Stat
                  value={String(counts.certificates)}
                  label="CERTIFICATES"
                />
                <Stat
                  value={
                    electrician.calloutFee === null
                      ? "—"
                      : `N$${electrician.calloutFee.toLocaleString()}`
                  }
                  label="CALL-OUT FEE"
                />
                <Stat
                  value={formatDate(electrician.createdAt)}
                  label="JOINED"
                />
              </div>
            </div>

            {/* Credentials are the reason this platform exists, so an unverified
                licence is stated plainly rather than hidden. */}
            <div className="glass" style={{ padding: "1.5rem" }}>
              <SectionTitle>Credentials</SectionTitle>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}
              >
                <CertBadge
                  label="NTA Verified"
                  active={electrician.ntaVerified}
                  note={
                    electrician.ntaVerified
                      ? "Checked against the NTA database"
                      : "Not yet verified — cannot take call-outs"
                  }
                />
                <CertBadge
                  label="Wireman's Licence"
                  active={electrician.wiremanVerified}
                  note={
                    electrician.wiremanVerified
                      ? "Licence on file and confirmed"
                      : "No confirmed licence on file"
                  }
                />
              </div>
            </div>

            <div className="glass" style={{ padding: "1.5rem" }}>
              <SectionTitle>About</SectionTitle>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  lineHeight: 1.8,
                }}
              >
                {electrician.bio?.trim() ||
                  `${user.name} hasn't added a bio yet. Their verification status and reviews below are the best guide to their work.`}
              </p>
            </div>

            <div className="glass" style={{ padding: "1.5rem" }}>
              <SectionTitle>
                Reviews{" "}
                {reviews.length > 0 && (
                  <span style={{ color: "var(--text-subtle)" }}>
                    ({reviews.length})
                  </span>
                )}
              </SectionTitle>

              {reviews.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    lineHeight: 1.7,
                  }}
                >
                  No reviews yet. Reviews can only be left by a client after a
                  completed job, so this is a new profile rather than a poor
                  one.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.125rem",
                  }}
                >
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        paddingBottom: "1.125rem",
                        borderBottom: "1px solid var(--border-muted)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: "0.625rem",
                          marginBottom: "0.375rem",
                        }}
                      >
                        <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                          {r.reviewer.name}
                        </span>
                        <Stars rating={r.rating} size={12} />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-subtle)",
                            marginLeft: "auto",
                          }}
                        >
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                      {r.comment && (
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                            lineHeight: 1.7,
                          }}
                        >
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Booking panel ───────────────────────────────────────── */}
          <aside
            style={{
              flex: "1 1 320px",
              maxWidth: 380,
              position: "sticky",
              top: "1.5rem",
            }}
          >
            <div
              className="glass animate-fade-up"
              style={{ padding: "1.5rem" }}
            >
              {isSelf ? (
                <div>
                  <SectionTitle>This is your profile</SectionTitle>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      lineHeight: 1.7,
                      marginBottom: "1.25rem",
                    }}
                  >
                    This is how clients see you in the directory. Keep your
                    specialisation, service area and call-out fee current — they
                    drive the filters clients search with.
                  </p>
                  <Link
                    href="/electrician/verification"
                    className="btn-primary"
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    Manage my profile
                  </Link>
                </div>
              ) : !viewer ? (
                <div>
                  <SectionTitle>Book {user.name}</SectionTitle>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                      lineHeight: 1.7,
                      marginBottom: "1.25rem",
                    }}
                  >
                    Log in to assign {user.name.split(" ")[0]} to one of your
                    fault reports. Browsing the directory stays open to
                    everyone.
                  </p>
                  <Link
                    href="/login"
                    className="btn-primary"
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      fontSize: "0.875rem",
                    }}
                  >
                    Log in to book
                  </Link>
                </div>
              ) : (
                <BookingForm
                  electricianId={electrician.id}
                  electricianName={user.name.split(" ")[0]}
                  isAvailable={electrician.isAvailable}
                  ntaVerified={electrician.ntaVerified}
                  calloutFee={electrician.calloutFee}
                  faults={faults}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
