"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyElectrician } from "@/lib/supabase/actions";

/**
 * Approving an electrician is what unblocks them from working, so the queue is
 * actionable in place rather than read-only.
 *
 * NTA and the wireman's licence are approved separately because they are
 * separate documents: only NTA gates assignment and availability, so an admin
 * should be able to clear it without waiting on a licence that may not exist.
 */
export function VerifyButtons({
  profileId,
  hasLicence,
  wiremanVerified,
}: {
  profileId: string;
  hasLicence: boolean;
  wiremanVerified: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"nta" | "wireman" | null>(null);
  const [error, setError] = useState("");

  async function approve(field: "nta" | "wireman") {
    setBusy(field);
    setError("");
    try {
      await verifyElectrician(
        profileId,
        field === "nta" ? { ntaVerified: true } : { wiremanVerified: true }
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update verification.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {error && (
        <span role="alert" style={{ color: "#fca5a5", fontSize: "0.72rem", maxWidth: 180 }}>
          {error}
        </span>
      )}

      {hasLicence && !wiremanVerified && (
        <button
          type="button"
          onClick={() => approve("wireman")}
          disabled={busy !== null}
          className="btn-outline"
          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: busy ? "default" : "pointer" }}
        >
          {busy === "wireman" ? "…" : "Approve licence"}
        </button>
      )}

      <button
        id={`approve-nta-${profileId}`}
        type="button"
        onClick={() => approve("nta")}
        disabled={busy !== null}
        className="btn-primary"
        style={{
          padding: "0.35rem 0.875rem",
          fontSize: "0.75rem",
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy === "nta" ? "Approving…" : "Approve NTA"}
      </button>
    </div>
  );
}
