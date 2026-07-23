"use client";

import Link from "next/link";


type Electrician = {
  id: string;
  name: string;
  specialisation: string;
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  wireman: boolean;
  coc: boolean;
  available: boolean;
  callout: string;
};

const electricians: Electrician[] = [
  { id: "e1", name: "Johannes Nakale", specialisation: "Residential Wiring", location: "Windhoek North", rating: 4.9, reviews: 47, verified: true, wireman: true, coc: true, available: true, callout: "N$250" },
  { id: "e2", name: "Maria Hamukwaya", specialisation: "Commercial Installations", location: "Windhoek CBD", rating: 4.8, reviews: 61, verified: true, wireman: true, coc: true, available: true, callout: "N$300" },
  { id: "e3", name: "David Shilongo", specialisation: "Fault Finding & Maintenance", location: "Swakopmund", rating: 4.7, reviews: 34, verified: true, wireman: false, coc: false, available: false, callout: "N$200" },
  { id: "e4", name: "Anna Nghidipohamba", specialisation: "Solar / Renewable Energy", location: "Ongwediva", rating: 4.9, reviews: 28, verified: true, wireman: true, coc: true, available: true, callout: "N$350" },
  { id: "e5", name: "Peter Amunyela", specialisation: "Industrial Electrical", location: "Walvis Bay", rating: 4.6, reviews: 52, verified: true, wireman: true, coc: false, available: true, callout: "N$400" },
  { id: "e6", name: "Selma Uusiku", specialisation: "Certificate of Compliance", location: "Windhoek South", rating: 5.0, reviews: 19, verified: true, wireman: true, coc: true, available: false, callout: "N$275" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? "#f59e0b" : "rgba(255,255,255,0.15)"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "0.25rem" }}>
        {rating.toFixed(1)} ({electricians.find(() => true)?.reviews})
      </span>
    </div>
  );
}

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

export default function TechniciansPage() {
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
        <div style={{ marginBottom: "2.5rem" }}>
          <h1
            id="technicians-heading"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
              fontWeight: 800,
              marginBottom: "0.75rem",
            }}
          >
            Find a Verified Electrician
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 540 }}>
            All electricians on FaultFx are cross-checked against the NTA database. Browse by specialisation or location.
          </p>
        </div>

        {/* Filter bar */}
        <div
          className="glass"
          style={{
            padding: "1.125rem 1.5rem",
            marginBottom: "1.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <input
            id="technicians-search"
            type="search"
            className="input"
            placeholder="🔍 Search by name or specialisation…"
            style={{ flex: "1 1 220px", minWidth: 200 }}
          />
          <select id="technicians-filter-location" className="input" style={{ flex: "0 1 160px" }}>
            <option value="">All Locations</option>
            <option>Windhoek</option>
            <option>Swakopmund</option>
            <option>Walvis Bay</option>
            <option>Ongwediva</option>
          </select>
          <select id="technicians-filter-spec" className="input" style={{ flex: "0 1 200px" }}>
            <option value="">All Specialisations</option>
            <option>Residential Wiring</option>
            <option>Commercial Installations</option>
            <option>Industrial Electrical</option>
            <option>Solar / Renewable Energy</option>
            <option>Fault Finding & Maintenance</option>
            <option>Certificate of Compliance</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
            <input id="filter-available" type="checkbox" style={{ accentColor: "var(--teal-500)" }} />
            Available now
          </label>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.125rem" }}>
          {electricians.map((e) => (
            <div
              key={e.id}
              className="glass"
              style={{
                padding: "1.5rem",
                transition: "transform 0.2s, box-shadow 0.2s",
                position: "relative",
              }}
              onMouseEnter={(el) => {
                (el.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                (el.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(el) => {
                (el.currentTarget as HTMLElement).style.transform = "";
                (el.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              {/* Available badge */}
              <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span className={`dot ${e.available ? "dot-green" : "dot-amber"}`} />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{e.available ? "Available" : "Busy"}</span>
              </div>

              {/* Avatar */}
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
                {e.name.charAt(0)}
              </div>

              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem" }}>
                {e.name}
              </h2>
              <p style={{ color: "var(--teal-400)", fontSize: "0.825rem", fontWeight: 500, marginBottom: "0.25rem" }}>
                {e.specialisation}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                📍 {e.location}
              </p>

              {/* Stars */}
              <div style={{ marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= Math.round(e.rating) ? "#f59e0b" : "rgba(255,255,255,0.12)"}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{e.rating} ({e.reviews})</span>
              </div>

              {/* Cert badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
                {e.verified && <CertBadge label="NTA Verified" active={true} />}
                <CertBadge label="Wireman Lic." active={e.wireman} />
                <CertBadge label="COC" active={e.coc} />
              </div>

              {/* Call-out fee */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Call-out fee:</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal-300)" }}>{e.callout}</span>
              </div>

              <Link
                href={`/technicians/${e.id}`}
                id={`view-profile-${e.id}`}
                className="btn-primary"
                style={{ display: "flex", justifyContent: "center", fontSize: "0.875rem", padding: "0.625rem 1rem" }}
              >
                View Profile & Book
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
