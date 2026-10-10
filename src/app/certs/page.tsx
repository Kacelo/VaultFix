import Link from "next/link";
import { listCertificates } from "@/lib/supabase/actions";
import { AccessNotice } from "@/components/AccessNotice";

export const dynamic = "force-dynamic";

const typeLabel: Record<string, string> = {
  COC: "Certificate of Compliance",
  WIREMAN_LICENSE: "Wireman License",
  NTA_VERIFIED: "NTA Verification",
};

const statusStyle: Record<string, { color: string; bg: string }> = {
  issued: { color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
  active: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  expired: { color: "#f87171", bg: "rgba(239,68,68,0.12)" },
};

export default async function CertsDashboardPage() {
  let certs;

  try {
    certs = await listCertificates();
  } catch {
    certs = null;
  }

  return (
    <section
      style={{
        minHeight: "calc(100dvh - 68px)",
        background: "var(--grad-hero)",
        padding: "3rem 1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--grad-glow)", pointerEvents: "none" }} />

      <div className="container" style={{ position: "relative" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2.5rem" }}>
          <div>
            <h1
              id="certs-heading"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, marginBottom: "0.5rem" }}
            >
              Certifications
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              Manage Certificates of Compliance, wireman licenses, and regulatory verifications.
            </p>
          </div>
          <Link href="/certs/generate" id="generate-coc-cta" className="btn-primary">
            + Generate COC
          </Link>
        </div>

        {/* Regulatory verification cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { abbr: "NTA", label: "Namibia Training Authority", desc: "UID cross-check for electrician certification", color: "#14b8a6", status: "Integrated (Mock)" },
            { abbr: "ECN", label: "Engineering Council of Namibia", desc: "Professional registration verification", color: "#f59e0b", status: "Coming Soon" },
            { abbr: "SVT", label: "SA VTECH Database", desc: "South African technical qualification lookup", color: "#8b5cf6", status: "Coming Soon" },
          ].map((db) => (
            <div
              key={db.abbr}
              className="glass"
              style={{ padding: "1.25rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span
                  style={{
                    padding: "0.3rem 0.625rem",
                    background: db.color + "18",
                    border: `1px solid ${db.color}35`,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: db.color,
                    letterSpacing: "0.04em",
                  }}
                >
                  {db.abbr}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: db.status === "Coming Soon" ? "var(--text-subtle)" : "#4ade80",
                    fontWeight: 500,
                  }}
                >
                  {db.status}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.925rem", marginBottom: "0.25rem" }}>{db.label}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>{db.desc}</div>
            </div>
          ))}
        </div>

        {/* Issued certs list */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem" }}>
            Issued Certificates
          </h2>
          {certs === null ? (
            <AccessNotice
              title="Electrician access required"
              message="Log in as a registered electrician to view and issue certificates."
            />
          ) : certs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "1rem 0" }}>
              No certificates issued yet. Use “Generate COC” above to issue your first one.
            </p>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {certs.map((cert) => {
              const expired = cert.expiresAt !== null && cert.expiresAt < new Date();
              const status = expired ? "expired" : cert.type === "COC" ? "issued" : "active";

              return (
              <div
                key={cert.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  padding: "1rem 1.125rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {typeLabel[cert.type] ?? cert.type}
                    </span>
                    <span
                      style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        background: statusStyle[status]?.bg,
                        color: statusStyle[status]?.color,
                        textTransform: "capitalize",
                      }}
                    >
                      {status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {cert.clientName ?? "—"} · {cert.ref} ·{" "}
                    {cert.issuedAt.toLocaleDateString("en-GB")}
                  </div>
                  {cert.propertyAddress && (
                    <div style={{ fontSize: "0.775rem", color: "var(--text-subtle)", marginTop: "0.125rem" }}>
                      📍 {cert.propertyAddress}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {cert.pdfUrl ? (
                    <a
                      id={`download-cert-${cert.id}`}
                      href={cert.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline"
                      style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}
                    >
                      ⬇ PDF
                    </a>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", alignSelf: "center" }}>
                      PDF not generated
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
