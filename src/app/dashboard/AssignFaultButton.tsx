"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createJob, listAssignableElectricians } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

type Electrician = {
  id: string;
  specialisation: string | null;
  serviceArea: string | null;
  calloutFee: number | null;
  averageRating: number | null;
  user: { name: string };
};

/**
 * Assigns an electrician to a fault, in place in the table.
 *
 * The list loads on first open rather than with the page: a dashboard showing
 * twenty unassigned faults would otherwise fetch the same electricians twenty
 * times over, to fill dropdowns nobody has opened.
 *
 * Only verified, available electricians are offered, because those are the two
 * gates `createJob` enforces — it re-checks both on submit regardless of what
 * was rendered here.
 */
export function AssignFaultButton({ faultId }: { faultId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Electrician[] | null>(null);
  const [chosen, setChosen] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function reveal() {
    setOpen(true);
    setError("");
    if (options) return;

    try {
      const list = await listAssignableElectricians();
      setOptions(list);
      setChosen(list[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load electricians.");
      setOptions([]);
    }
  }

  function assign() {
    if (!chosen) return;
    setError("");
    startTransition(async () => {
      try {
        await createJob({ faultId, electricianId: chosen });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not assign this fault.");
      }
    });
  }

  if (!open) {
    return (
      <Button id={`assign-${faultId}`} size="sm" onClick={reveal}>
        Assign
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        {options === null ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : options.length === 0 ? (
          <span className="max-w-[260px] text-right text-xs text-muted-foreground">
            No verified, available electrician right now.
          </span>
        ) : (
          <select
            aria-label="Electrician"
            className="input h-8 max-w-[220px] text-xs"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.user.name}
                {o.serviceArea ? ` · ${o.serviceArea}` : ""}
                {o.calloutFee !== null ? ` · N$${o.calloutFee.toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        )}

        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setError("");
          }}
        >
          Cancel
        </Button>

        {options !== null && options.length > 0 && (
          <Button size="sm" onClick={assign} disabled={pending || !chosen}>
            {pending ? "Assigning…" : "Confirm"}
          </Button>
        )}
      </div>

      {error && (
        <span role="alert" className="max-w-[300px] text-right text-xs text-[#fca5a5]">
          {error}
        </span>
      )}
    </div>
  );
}
