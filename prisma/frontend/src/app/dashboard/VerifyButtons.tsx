"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyElectrician } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center justify-end gap-2">
      {error && (
        <span role="alert" className="max-w-[180px] text-xs text-[#fca5a5]">
          {error}
        </span>
      )}

      {hasLicence && !wiremanVerified && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => approve("wireman")}
          disabled={busy !== null}
        >
          {busy === "wireman" ? "…" : "Approve licence"}
        </Button>
      )}

      <Button
        id={`approve-nta-${profileId}`}
        type="button"
        size="sm"
        onClick={() => approve("nta")}
        disabled={busy !== null}
      >
        {busy === "nta" ? "Approving…" : "Approve NTA"}
      </Button>
    </div>
  );
}
