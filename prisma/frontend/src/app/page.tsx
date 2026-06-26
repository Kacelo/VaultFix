"use client";

import Link from "next/link";


const features = [
  {
    icon: "⚡",
    title: "NTA Cert Verification",
    desc: "Every electrician is cross-checked against the NTA database using their UID before they can accept jobs.",
    badge: "NTA Verified",
    color: "#14b8a6",
  },
  {
    icon: "📍",
    title: "QR Code Fault Logging",
    desc: "Scan a QR code in any classroom, office, or building to instantly report what's not working — no app needed.",
    badge: "Smart Logging",
    color: "#f59e0b",
  },
  {
    icon: "🧠",
    title: "NLP Priority Ranking",
    desc: "Describe the fault in plain language. Our AI automatically ranks it as Critical, High, Medium or Low priority.",
    badge: "AI-Powered",
    color: "#8b5cf6",
  },
  {
    icon: "📄",
    title: "Certificate of Compliance",
    desc: "Electricians can generate legally-formatted COC documents with e-signatures directly on the platform.",
    badge: "Digital COC",
    color: "#14b8a6",
  },
  {
    icon: "🔍",
    title: "Find a Technician",
    desc: "Browse verified, licensed electricians by location and specialisation. Check reviews before you book.",
    badge: "Qualified Only",
    color: "#f59e0b",
  },
  {
    icon: "🧾",
    title: "Digital Receipts",
    desc: "Every job produces a signed digital receipt — transparent pricing, itemised labour and materials.",
    badge: "Transparent",
    color: "#22c55e",
  },
];

const stats = [
  { value: "500+", label: "Verified Electricians" },
  { value: "2,400+", label: "Faults Resolved" },
  { value: "180+", label: "COCs Generated" },
  { value: "98%", label: "Client Satisfaction" },
];

const steps = [
  {
    step: "01",
    title: "Scan or Visit",
    desc: "Scan a QR code on-site or visit faultfix.com.na on any device.",
  },
  {
    step: "02",
    title: "Describe the Fault",
    desc: "Type what's wrong — our AI reads plain language and ranks the priority automatically.",
  },
  {
    step: "03",
    title: "Get Matched",
    desc: "A verified, NTA-certified electrician is assigned based on location and availability.",
  },
  {
    step: "04",
    title: "Resolved & Receipted",
    desc: "Track progress, get a digital receipt, and leave a review — all in one place.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "calc(100dvh - 68px)",
          background: "var(--grad-hero)",
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          padding: "4rem 1.5rem",
        }}
      >
        {/* Background glow blobs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--grad-glow)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "20%",
            right: "-10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="container" style={{ position: "relative" }}>
          <div style={{ maxWidth: 680 }}>
            {/* Badge */}
            <div
              className="animate-fade-up"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 1rem",
                background: "rgba(20,184,166,0.1)",
                border: "1px solid rgba(20,184,166,0.25)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--teal-300)",
                marginBottom: "1.75rem",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#14b8a6", boxShadow: "0 0 8px #14b8a6", display: "inline-block" }} />
              Now live in Namibia 🇳🇦
            </div>

            <h1
              id="main-heading"
              className="animate-fade-up delay-100"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
              }}
            >
              Namibia&apos;s Trusted{" "}
              <span className="gradient-text">Electrician Hub</span>
            </h1>

            <p
              className="animate-fade-up delay-200"
              style={{
                fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)",
                color: "var(--text-muted)",
                lineHeight: 1.7,
                marginBottom: "2.5rem",
                maxWidth: 560,
              }}
            >
              Connect with NTA-verified electricians, log faults instantly via QR code, generate Certificates of Compliance, and manage every electrical job — start to finish.
            </p>

            <div className="animate-fade-up delay-300" style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginBottom: "3rem" }}>
              <Link href="/fault-log" id="hero-report-fault-cta" className="btn-accent" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                ⚡ Report a Fault
              </Link>
              <Link href="/technicians" id="hero-find-electrician-cta" className="btn-outline" style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}>
                Find an Electrician
              </Link>
            </div>

            {/* Trust logos */}
            <div
              className="animate-fade-up delay-400"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "1.25rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                Trusted by:
              </span>
              {[
                { abbr: "NTA", label: "Namibia Training Authority", color: "#14b8a6" },
                { abbr: "ECN", label: "Engineering Council of Namibia", color: "#f59e0b" },
                { abbr: "SVT", label: "SA VTECH Database", color: "#8b5cf6" },
              ].map((b) => (
                <div
                  key={b.abbr}
                  title={b.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.75rem",
                    background: b.color + "15",
                    border: `1px solid ${b.color}30`,
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: b.color,
                    letterSpacing: "0.05em",
                  }}
                >
                  {b.abbr}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--bg-elevated)",
          borderTop: "1px solid var(--border-muted)",
          borderBottom: "1px solid var(--border-muted)",
          padding: "2rem 1.5rem",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1.5rem",
              textAlign: "center",
            }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    color: "var(--teal-400)",
                    lineHeight: 1,
                    marginBottom: "0.375rem",
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="section" id="features">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                fontWeight: 800,
                marginBottom: "1rem",
              }}
            >
              Everything in one platform
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem", maxWidth: 520, margin: "0 auto" }}>
              VaultFix brings together fault reporting, certified technicians, compliance documents, and digital receipts.
            </p>
          </div>

          <div className="grid-features">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="glass"
                style={{
                  padding: "1.75rem",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  cursor: "default",
                  animationDelay: `${i * 0.08}s`,
                  animation: "fadeUp 0.6s ease both",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}25`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.875rem" }}>{f.icon}</div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    marginBottom: "0.625rem",
                  }}
                >
                  {f.title}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1rem" }}>
                  {f.desc}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.2rem 0.625rem",
                    background: f.color + "18",
                    border: `1px solid ${f.color}30`,
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: f.color,
                    letterSpacing: "0.04em",
                  }}
                >
                  {f.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────── */}
      <section
        className="section"
        style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border-muted)" }}
        id="how-it-works"
      >
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                fontWeight: 800,
                marginBottom: "1rem",
              }}
            >
              How it works
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>
              From fault to fix in four simple steps.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {steps.map((s, i) => (
              <div
                key={s.step}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.75rem",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Large step number watermark */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "-0.5rem",
                    right: "0.75rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "4.5rem",
                    fontWeight: 900,
                    color: "rgba(20,184,166,0.06)",
                    lineHeight: 1,
                    userSelect: "none",
                  }}
                >
                  {s.step}
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, rgba(20,184,166,0.25), rgba(20,184,166,0.08))",
                    border: "1px solid rgba(20,184,166,0.3)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "var(--teal-300)",
                    marginBottom: "1rem",
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.625rem" }}>
                  {s.title}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.65 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dual CTA (Client vs Electrician) ─────────────────── */}
      <section className="section" id="get-started">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Client card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.03))",
                border: "1px solid rgba(20,184,166,0.2)",
                borderRadius: "var(--radius-xl)",
                padding: "2.5rem 2rem",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🏠</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
                I need an electrician
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: "1.75rem" }}>
                Report a fault, find a verified technician near you, track progress in real time, and get a digital receipt when the job is done.
              </p>
              <Link href="/register?role=client" id="client-register-cta" className="btn-primary">
                Get Started Free
              </Link>
            </div>

            {/* Electrician card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "var(--radius-xl)",
                padding: "2.5rem 2rem",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔧</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
                I&apos;m an electrician
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: "1.75rem" }}>
                Register with your NTA UID, get verified, set your own call-out fees, and connect with clients looking for qualified electricians across Namibia.
              </p>
              <Link href="/register?role=electrician" id="electrician-register-cta" className="btn-accent">
                Join as Electrician
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
