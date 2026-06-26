"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Priority = "critical" | "high" | "medium" | "low";

/** Simple NLP priority ranking based on keywords in the fault description */
function rankPriority(text: string): Priority {
  const t = text.toLowerCase();
  if (
    t.match(/fire|shock|electrocute|sparks?|burning|smell|smoke|no power|main(s)? (fail|out)|flood|emergency/)
  )
    return "critical";
  if (
    t.match(/tripped|trip|breaker|short|overload|flicker|intermittent|multiple|half|entire/)
  )
    return "high";
  if (t.match(/one plug|single socket|single light|dim|slow|warm|slight/))
    return "medium";
  return "low";
}

const priorityConfig: Record<Priority, { label: string; color: string; bg: string; icon: string; desc: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "🚨", desc: "Immediate attention required — safety risk" },
  high: { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🔴", desc: "Should be addressed within hours" },
  medium: { label: "Medium", color: "#eab308", bg: "rgba(234,179,8,0.12)", icon: "🟡", desc: "Address within 24–48 hours" },
  low: { label: "Low", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: "🟢", desc: "Can be scheduled at convenience" },
};

function FaultLogForm() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location") || "";

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(locationId ? decodeURIComponent(locationId) : "");
  const [priority, setPriority] = useState<Priority | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [faultRef, setFaultRef] = useState("");

  function handleDescChange(val: string) {
    setDescription(val);
    if (val.length > 12) {
      setPriority(rankPriority(val));
    } else {
      setPriority(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1400)); // mock API
    const ref = "VF-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    setFaultRef(ref);
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div
        className="glass animate-fade-up"
        style={{ maxWidth: 520, margin: "0 auto", padding: "2.5rem 2rem", textAlign: "center" }}
      >
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          Fault Logged!
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.7 }}>
          Your fault has been reported and is being reviewed. A verified electrician will be assigned shortly.
        </p>
        <div
          style={{
            background: "rgba(20,184,166,0.08)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Reference number</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "var(--teal-300)", letterSpacing: "0.05em" }}>
            {faultRef}
          </div>
        </div>
        <button
          onClick={() => { setSubmitted(false); setDescription(""); setPriority(null); }}
          className="btn-outline"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Log Another Fault
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 600, margin: "0 auto" }}>
      {locationId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            background: "rgba(20,184,166,0.08)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.875rem",
            color: "var(--teal-300)",
            marginBottom: "1.5rem",
          }}
        >
          <span>📍</span>
          <strong>Location pre-filled from QR code:</strong>&nbsp;{decodeURIComponent(locationId)}
        </div>
      )}

      {/* Location */}
      <div style={{ marginBottom: "1.125rem" }}>
        <label htmlFor="fault-location" className="label">Location / Room</label>
        <input
          id="fault-location"
          type="text"
          className="input"
          placeholder="e.g. Block A – Classroom 12, Admin Building – Server Room"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="fault-description" className="label">
          Describe the fault{" "}
          <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(plain language is fine)</span>
        </label>
        <textarea
          id="fault-description"
          className="input"
          placeholder="e.g. The lights in the classroom keep flickering and the plug near the whiteboard gives a small shock when touched."
          value={description}
          onChange={(e) => handleDescChange(e.target.value)}
          required
          rows={4}
          style={{ resize: "vertical" }}
        />
        <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)", marginTop: "0.375rem" }}>
          💡 Tip: Describe what you see, hear, or smell — our AI will rank the priority automatically.
        </p>
      </div>

      {/* Priority display */}
      {priority && (
        <div
          className="animate-fade-up"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.875rem",
            padding: "1rem 1.125rem",
            background: priorityConfig[priority].bg,
            border: `1px solid ${priorityConfig[priority].color}35`,
            borderLeft: `3px solid ${priorityConfig[priority].color}`,
            borderRadius: "var(--radius-md)",
            marginBottom: "1.25rem",
          }}
        >
          <span style={{ fontSize: "1.375rem", flexShrink: 0 }}>{priorityConfig[priority].icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: priorityConfig[priority].color, fontSize: "0.9rem", marginBottom: "0.2rem" }}>
              {priorityConfig[priority].label} Priority — AI Ranked
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.825rem" }}>{priorityConfig[priority].desc}</div>
          </div>
          {/* Manual override */}
          <select
            id="fault-priority-override"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "1px solid var(--border-muted)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              padding: "0.25rem 0.5rem",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <option value="critical">🚨 Critical</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
      )}

      {/* Reported by (optional) */}
      <div style={{ marginBottom: "1.75rem" }}>
        <label htmlFor="fault-reporter" className="label">
          Your name <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span>
        </label>
        <input id="fault-reporter" type="text" className="input" placeholder="Leave blank to report anonymously" />
      </div>

      <button
        id="fault-submit-btn"
        type="submit"
        disabled={submitting || !description || !location}
        className="btn-primary"
        style={{ width: "100%", justifyContent: "center", fontSize: "1rem", padding: "0.875rem" }}
      >
        {submitting ? "Submitting…" : "⚡ Submit Fault Report"}
      </button>
    </form>
  );
}

export default function FaultLogPage() {
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
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 1rem",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--amber-300)",
              marginBottom: "1.25rem",
            }}
          >
            ⚡ Fault Reporting System
          </div>
          <h1
            id="fault-log-heading"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
              fontWeight: 800,
              marginBottom: "0.875rem",
            }}
          >
            Report an Electrical Fault
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>
            Describe what&apos;s wrong in plain language — our AI automatically ranks the severity so the right technician gets assigned fast.
          </p>
        </div>

        <Suspense fallback={<div style={{ color: "var(--text-muted)", textAlign: "center" }}>Loading…</div>}>
          <FaultLogForm />
        </Suspense>
      </div>
    </section>
  );
}
