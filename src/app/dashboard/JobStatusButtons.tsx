"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateJobStatus } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

type Status = "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

/**
 * The one forward step available from each status, labelled as the action the
 * electrician is taking rather than the state it lands in.
 *
 * This mirrors JOB_TRANSITIONS in actions.ts, which is the authority — the
 * server rejects anything illegal regardless of what is rendered here. The
 * duplication is deliberate: a label is a UI concern, and the two end states
 * are terminal, so they offer nothing.
 */
const NEXT_STEP: Partial<Record<Status, { to: Status; label: string; busy: string }>> = {
  PENDING: { to: "ACCEPTED", label: "Accept", busy: "Accepting…" },
  ACCEPTED: { to: "IN_PROGRESS", label: "Start work", busy: "Starting…" },
  IN_PROGRESS: { to: "COMPLETED", label: "Mark complete", busy: "Completing…" },
};

export function JobStatusButtons({ jobId, status }: { jobId: string; status: Status }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"advance" | "cancel" | null>(null);
  const [error, setError] = useState("");

  const next = NEXT_STEP[status];

  // Completed and cancelled jobs are done with; there is nothing to offer.
  if (!next) {
    return null;
  }

  async function move(to: Status, kind: "advance" | "cancel") {
    setBusy(kind);
    setError("");
    try {
      await updateJobStatus(jobId, to);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this job.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => move("CANCELLED", "cancel")}
          disabled={busy !== null}
        >
          {busy === "cancel" ? "…" : "Cancel"}
        </Button>
        <Button
          id={`advance-job-${jobId}`}
          type="button"
          size="sm"
          onClick={() => move(next.to, "advance")}
          disabled={busy !== null}
        >
          {busy === "advance" ? next.busy : next.label}
        </Button>
      </div>
      {error && (
        <span role="alert" className="max-w-[260px] text-right text-xs text-[#fca5a5]">
          {error}
        </span>
      )}
    </div>
  );
}
