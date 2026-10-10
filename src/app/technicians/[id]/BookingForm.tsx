"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createJob } from "@/lib/supabase/actions";

export type BookableFault = {
  id: string;
  ref: string;
  description: string;
  priority: string;
  location: { building: string; room: string } | null;
};

function faultLabel(f: BookableFault) {
  const where = f.location ? `${f.location.building} · ${f.location.room}` : "No location";
  const summary = f.description.length > 48 ? `${f.description.slice(0, 48)}…` : f.description;
  return `${f.ref} — ${where} — ${summary}`;
}

/**
 * A job always hangs off an existing fault report, so booking is "attach this
 * electrician to one of my open faults" rather than a free-text request. The
 * select is therefore the whole form's premise: with no unassigned faults there
 * is nothing to book, and we send the client to report one first.
 *
 * Every rule enforced here is also enforced in `createJob` — this only spares
 * the client a round trip that would end in an error.
 */
export function BookingForm({
  electricianId,
  electricianName,
  isAvailable,
  ntaVerified,
  calloutFee,
  faults,
}: {
  electricianId: string;
  electricianName: string;
  isAvailable: boolean;
  ntaVerified: boolean;
  calloutFee: number | null;
  faults: BookableFault[];
}) {
  const router = useRouter();
  const [faultId, setFaultId] = useState(faults[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(false);

  const blocked = !ntaVerified
    ? `${electricianName} has not completed NTA verification yet and cannot take call-outs.`
    : !isAvailable
      ? `${electricianName} is not accepting call-outs right now. Try again later, or browse other electricians in the same area.`
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!faultId) {
      setError("Choose which fault this call-out is for.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await createJob({
        electricianId,
        faultId,
        // datetime-local has no timezone; the browser reads it as local time,
        // which is what the client meant.
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        notes: notes.trim() || undefined,
      });
      setBooked(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the booking.");
    } finally {
      setBusy(false);
    }
  }

  if (booked) {
    return (
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.625rem" }}>✅</div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: "0.5rem",
          }}
        >
          Booking sent
        </h3>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            lineHeight: 1.7,
            marginBottom: "1.25rem",
          }}
        >
          {electricianName} has been assigned to the fault and will confirm the call-out.
        </p>
        <Link
          href="/fault-log"
          className="btn-primary"
          style={{ display: "inline-flex", justifyContent: "center", fontSize: "0.875rem" }}
        >
          View my faults
        </Link>
      </div>
    );
  }

  if (blocked) {
    return (
      <div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: "0.625rem",
          }}
        >
          Not taking call-outs
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          {blocked}
        </p>
        <Link
          href="/technicians"
          className="btn-primary"
          style={{ display: "inline-flex", justifyContent: "center", fontSize: "0.875rem" }}
        >
          Browse electricians
        </Link>
      </div>
    );
  }

  if (faults.length === 0) {
    return (
      <div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: "0.625rem",
          }}
        >
          Book {electricianName}
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.7, marginBottom: "1.25rem" }}>
          A call-out is always attached to a fault report. Log the fault first — it takes a minute — then come
          back and assign it here.
        </p>
        <Link
          href="/fault-log"
          className="btn-primary"
          style={{ display: "inline-flex", justifyContent: "center", fontSize: "0.875rem" }}
        >
          Report a fault
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.05rem",
          marginBottom: "0.375rem",
        }}
      >
        Book {electricianName}
      </h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
        {calloutFee === null
          ? "Call-out fee quoted on request."
          : `Call-out fee: N$${calloutFee.toLocaleString()}`}
      </p>

      <label
        htmlFor="booking-fault"
        style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}
      >
        Which fault?
      </label>
      <select
        id="booking-fault"
        className="input"
        style={{ width: "100%", marginBottom: "1rem" }}
        value={faultId}
        onChange={(e) => setFaultId(e.target.value)}
        required
      >
        {faults.map((f) => (
          <option key={f.id} value={f.id}>
            {faultLabel(f)}
          </option>
        ))}
      </select>

      <label
        htmlFor="booking-when"
        style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}
      >
        Preferred time <span style={{ color: "var(--text-subtle)" }}>(optional)</span>
      </label>
      <input
        id="booking-when"
        type="datetime-local"
        className="input"
        style={{ width: "100%", marginBottom: "1rem" }}
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />

      <label
        htmlFor="booking-notes"
        style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}
      >
        Notes for the electrician <span style={{ color: "var(--text-subtle)" }}>(optional)</span>
      </label>
      <textarea
        id="booking-notes"
        className="input"
        rows={3}
        style={{ width: "100%", marginBottom: "1.25rem", resize: "vertical" }}
        placeholder="Gate code, best entrance, who to ask for…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {error && (
        <p
          role="alert"
          style={{ color: "#fca5a5", fontSize: "0.8rem", marginBottom: "0.875rem", lineHeight: 1.6 }}
        >
          {error}
        </p>
      )}

      <button
        id="confirm-booking"
        type="submit"
        disabled={busy}
        className="btn-primary"
        style={{ width: "100%", justifyContent: "center", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "Sending…" : "Request call-out"}
      </button>
    </form>
  );
}
