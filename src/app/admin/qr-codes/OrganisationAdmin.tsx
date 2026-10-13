"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganisation } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  _count: { memberships: number; locations: number };
};

/**
 * Registering a customer: the platform creates the organisation, names its
 * first owner, and then adds its rooms below.
 *
 * Creation lives here rather than in the customer's own dashboard because an
 * organisation is only useful once its buildings and QR codes exist, and those
 * are a platform job. The owner can manage their own people from their
 * dashboard afterwards.
 */
export function OrganisationAdmin({ organisations }: { organisations: AdminOrg[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setError("");
    startTransition(async () => {
      try {
        await createOrganisation({
          name: trimmed,
          ownerEmail: ownerEmail.trim() || undefined,
        });
        setName("");
        setOwnerEmail("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create the organisation.");
      }
    });
  }

  return (
    <div className="glass mb-6 p-6">
      <h2 className="mb-1 font-[family-name:var(--font-display)] text-base font-bold">
        Organisations
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        A customer whose buildings you maintain. Rooms added below can be assigned to one.
      </p>

      {organisations.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {organisations.map((org) => (
            <li
              key={org.id}
              className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{org.name}</div>
                <div className="text-xs text-muted-foreground">{org.slug}</div>
              </div>
              <div className="flex-shrink-0 text-xs text-muted-foreground">
                {org._count.locations} room{org._count.locations === 1 ? "" : "s"} ·{" "}
                {org._count.memberships} member{org._count.memberships === 1 ? "" : "s"}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <Input
          id="new-org-name"
          placeholder="Organisation name (e.g. FNB Namibia)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Input
          id="new-org-owner"
          type="email"
          placeholder="Owner's email (optional)"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? "Creating…" : "Add organisation"}
        </Button>
      </form>

      <p className="mt-2 text-xs text-muted-foreground">
        The owner must already have a FaultFx account. Leave it blank to own it yourself and
        hand over later.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-xs text-[#fca5a5]">
          {error}
        </p>
      )}
    </div>
  );
}
