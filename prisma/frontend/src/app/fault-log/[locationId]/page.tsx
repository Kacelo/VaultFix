"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

/** QR code destination — pre-fills the fault log with the location */
export default function LocationFaultPage() {
  const params = useParams();
  const locationId = decodeURIComponent(params.locationId as string);

  return (
    <section
      style={{
        minHeight: "calc(100dvh - 68px)",
        background: "var(--grad-hero)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--grad-glow)", pointerEvents: "none" }} />

      <div className="glass animate-fade-up" style={{ maxWidth: 480, width: "100%", padding: "2.5rem 2rem", textAlign: "center" }}>
        {/* QR icon */}
        <div
          style={{
            width: 72,
            height: 72,
            background: "linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.05))",
            border: "1px solid rgba(20,184,166,0.3)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.25rem",
          }}
        >
          📍
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.3rem 0.875rem",
            background: "rgba(20,184,166,0.1)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--teal-300)",
            marginBottom: "1rem",
            letterSpacing: "0.04em",
          }}
        >
          QR SCANNED ✓
        </div>

        <h1
          id="location-fault-heading"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.625rem",
            fontWeight: 800,
            marginBottom: "0.625rem",
          }}
        >
          Report a Fault
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "0.5rem", fontSize: "0.9375rem" }}>
          You&apos;re reporting from:
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "var(--teal-300)",
            marginBottom: "1.75rem",
            background: "rgba(20,184,166,0.08)",
            padding: "0.625rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(20,184,166,0.15)",
          }}
        >
          {locationId}
        </p>

        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          Tap below to open the fault form. Your location will be pre-filled automatically. Just describe what&apos;s not working and submit — no account needed.
        </p>

        <Link
          href={`/fault-log?location=${encodeURIComponent(locationId)}`}
          id="location-report-fault-btn"
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", fontSize: "1rem", padding: "0.875rem 1.5rem" }}
        >
          ⚡ Report Fault for This Location
        </Link>

        <p style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-subtle)" }}>
          Powered by <span style={{ color: "var(--teal-400)", fontWeight: 600 }}>FaultFx</span>
        </p>
      </div>
    </section>
  );
}
