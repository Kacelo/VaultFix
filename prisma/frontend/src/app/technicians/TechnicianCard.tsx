"use client";

import Link from "next/link";

export type DirectoryElectrician = {
  id: string;
  specialisation: string | null;
  serviceArea: string | null;
  calloutFee: number | null;
  isAvailable: boolean;
  averageRating: number | null;
  totalReviews: number;
  ntaVerified: boolean;
  wiremanVerified: boolean;
  user: { name: string; avatarUrl: string | null };
};

function CertBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={{
        padding: "0.2rem 0.5rem",
        borderRadius: "var(--radius-full)",
        fontSize: "0.7rem",
        fontWeight: 700,
        background: active ? "rgba(20,184,166,0.12)" : "rgba(255,255,255,0.04)",
        color: active ? "var(--teal-300)" : "var(--text-subtle)",
        border: `1px solid ${active ? "rgba(20,184,166,0.25)" : "var(--border-muted)"}`,
        textDecoration: active ? "none" : "line-through",
        letterSpacing: "0.03em",
      }}
    >
      {active ? "✓ " : ""}{label}
    </span>
  );
}

export function TechnicianCard({ e }: { e: DirectoryElectrician }) {
  const rating = e.averageRating;

  return (
    <div
      className="glass"
      style={{ padding: "1.5rem", transition: "transform 0.2s, box-shadow 0.2s", position: "relative" }}
      onMouseEnter={(el) => {
        (el.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (el.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(el) => {
        (el.currentTarget as HTMLElement).style.transform = "";
        (el.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <span className={`dot ${e.isAvailable ? "dot-green" : "dot-amber"}`} />
        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
          {e.isAvailable ? "Available" : "Busy"}
        </span>
      </div>

      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #0d9488, #14b8a6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          fontWeight: 800,
          color: "#fff",
          fontFamily: "var(--font-display)",
          marginBottom: "0.875rem",
          boxShadow: "0 0 20px rgba(20,184,166,0.2)",
        }}
      >
        {e.user.name.charAt(0).toUpperCase()}
      </div>

      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem" }}>
        {e.user.name}
      </h2>
      <p style={{ color: "var(--teal-400)", fontSize: "0.825rem", fontWeight: 500, marginBottom: "0.25rem" }}>
        {e.specialisation ?? "General electrical work"}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
        📍 {e.serviceArea ?? "Service area not set"}
      </p>

      {/* No reviews yet is shown as exactly that, rather than as zero stars */}
      <div style={{ marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {rating === null ? (
          <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>No reviews yet</span>
        ) : (
          <>
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? "#f59e0b" : "rgba(255,255,255,0.12)"}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {rating.toFixed(1)} ({e.totalReviews})
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
        <CertBadge label="NTA Verified" active={e.ntaVerified} />
        <CertBadge label="Wireman Lic." active={e.wiremanVerified} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Call-out fee:</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-300)" }}>
          {e.calloutFee === null ? "On request" : `N$${e.calloutFee.toLocaleString()}`}
        </span>
      </div>

      <Link
        href={`/technicians/${e.id}`}
        id={`view-profile-${e.id}`}
        className="btn-primary"
        style={{ display: "flex", justifyContent: "center", fontSize: "0.875rem", padding: "0.625rem 1rem" }}
      >
        View Profile &amp; Book
      </Link>
    </div>
  );
}
