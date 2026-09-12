"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setElectricianAvailability,
  submitNtaForVerification,
} from "@/lib/supabase/actions";

export type VerificationState = {
  ntaUid: string | null;
  ntaVerified: boolean;
  wiremanLicense: string | null;
  wiremanVerified: boolean;
  isAvailable: boolean;
};

type Stage = "not-submitted" | "pending" | "verified";

function stageOf(v: VerificationState): Stage {
  if (v.ntaVerified) return "verified";
  return v.ntaUid ? "pending" : "not-submitted";
}

const stageCopy: Record<Stage, { label: string; color: string; bg: string; blurb: string }> = {
  "not-submitted": {
    label: "Not submitted",
    color: "var(--amber-300)",
    bg: "rgba(245,158,11,0.12)",
    blurb:
      "Submit your NTA UID below. Until it's verified you can build your profile, but you can't be assigned call-outs.",
  },
  pending: {
    label: "Awaiting review",
    color: "var(--amber-300)",
    bg: "rgba(245,158,11,0.12)",
    blurb:
      "Your certification is with our team for checking. We'll let you know as soon as it's confirmed.",
  },
  verified: {
    label: "Verified",
    color: "#4ade80",
    bg: "rgba(34,197,94,0.12)",
    blurb:
      "Your NTA certification is confirmed. You can switch yourself on to start receiving call-outs.",
  },
};

export function VerificationPanel({ initial }: { initial: VerificationState }) {
  const router = useRouter();
  const [ntaUid, setNtaUid] = useState(initial.ntaUid ?? "");
  const [wiremanLicense, setWiremanLicense] = useState(initial.wiremanLicense ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const stage = stageOf(initial);
  const copy = stageCopy[stage];

  async function submit() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await submitNtaForVerification({
        ntaUid,
        wiremanLicense: wiremanLicense || undefined,
      });
      setNotice("Submitted. We'll review your certification and update your status.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your certification.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setElectricianAvailability(!initial.isAvailable);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your availability.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Status */}
      <div className="glass" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
            NTA certification
          </h2>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: copy.bg,
              color: copy.color,
            }}
          >
            {copy.label}
          </span>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7 }}>
          {copy.blurb}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "var(--radius-md)",
            color: "#fca5a5",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(20,184,166,0.1)",
            border: "1px solid rgba(20,184,166,0.25)",
            borderRadius: "var(--radius-md)",
            color: "var(--teal-300)",
            fontSize: "0.875rem",
          }}
        >
          {notice}
        </div>
      )}

      {/* Submission */}
      <div className="glass" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "1rem" }}>
          {stage === "not-submitted" ? "Submit your certification" : "Update your certification"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div>
            <label htmlFor="nta-uid-input" className="label">NTA UID</label>
            <input
              id="nta-uid-input"
              type="text"
              className="input"
              placeholder="e.g. NTA-2023-00412"
              value={ntaUid}
              onChange={(e) => setNtaUid(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="wireman-licence-input" className="label">
              Wireman licence number{" "}
              <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="wireman-licence-input"
              type="text"
              className="input"
              placeholder="e.g. WL-2024-0012"
              value={wiremanLicense}
              onChange={(e) => setWiremanLicense(e.target.value)}
            />
          </div>

          {stage === "verified" && (
            <p style={{ fontSize: "0.8rem", color: "var(--amber-300)", lineHeight: 1.6 }}>
              ⚠ Changing these numbers withdraws you from call-outs until the new
              details have been checked.
            </p>
          )}

          <button
            id="submit-nta-btn"
            type="button"
            onClick={submit}
            disabled={busy || !ntaUid.trim()}
            className="btn-primary"
            style={{ justifyContent: "center" }}
          >
            {busy ? "Submitting…" : stage === "not-submitted" ? "Submit for verification" : "Resubmit for verification"}
          </button>
        </div>
      </div>

      {/* Availability — the gate */}
      <div className="glass" style={{ padding: "1.5rem", opacity: initial.ntaVerified ? 1 : 0.6 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem" }}>
          Accepting call-outs
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.125rem", lineHeight: 1.7 }}>
          {initial.ntaVerified
            ? initial.isAvailable
              ? "You're visible in the directory and can be assigned to new faults."
              : "You're hidden from new call-outs. Existing jobs are unaffected."
            : "This unlocks once your NTA certification is verified."}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}>
          <button
            id="toggle-availability-btn"
            type="button"
            onClick={toggleAvailability}
            disabled={busy || !initial.ntaVerified}
            className={initial.isAvailable ? "btn-outline" : "btn-primary"}
            style={{ justifyContent: "center" }}
          >
            {initial.isAvailable ? "Stop accepting call-outs" : "Start accepting call-outs"}
          </button>

          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <span className={`dot ${initial.isAvailable ? "dot-green" : "dot-amber"}`} />
            {initial.isAvailable ? "Available" : "Not available"}
          </span>
        </div>
      </div>
    </div>
  );
}
