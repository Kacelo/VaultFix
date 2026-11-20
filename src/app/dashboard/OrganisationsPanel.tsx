"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addOrganisationMember,
  listOrganisationMembers,
  removeOrganisationMember,
} from "@/lib/supabase/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Org = { id: string; name: string; role: string };
type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

/** Owners and managers administer an organisation; members only read it. */
const MANAGES = ["OWNER", "MANAGER"];

/**
 * See who is in your organisations, and add or remove colleagues.
 *
 * Organisations themselves are created by the platform, not here: FaultFx
 * registers a customer and their rooms, so self-serve creation would produce
 * organisations with no buildings and no QR codes.
 *
 * Members load on expand rather than up front: the server component would
 * otherwise query every organisation's people on every dashboard render to
 * show a list most people never open.
 *
 * Every rule shown here — who may add, who may remove, that the last owner
 * stays — is enforced in actions.ts. This only avoids offering what the
 * server would refuse.
 */
export function OrganisationsPanel({ organisations }: { organisations: Org[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [inviteEmail, setInviteEmail] = useState("");

  function run(work: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  async function toggle(orgId: string) {
    if (openId === orgId) {
      setOpenId(null);
      return;
    }
    setOpenId(orgId);
    setError("");
    if (!members[orgId]) {
      try {
        const list = await listOrganisationMembers(orgId);
        setMembers((m) => ({ ...m, [orgId]: list as Member[] }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load members.");
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {organisations.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          You don&apos;t belong to an organisation. Once FaultFx sets your workplace up and
          registers its rooms, you&apos;ll be able to report faults against them from a
          dropdown, and colleagues will see each other&apos;s reports instead of each one
          being private to whoever logged it.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {organisations.map((org) => {
            const canManage = MANAGES.includes(org.role);
            const isOpen = openId === org.id;

            return (
              <li key={org.id} className="border-b border-border pb-2 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{org.name}</div>
                    <div className="text-xs text-muted-foreground">
                      you are {org.role.toLowerCase()}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggle(org.id)}>
                    {isOpen ? "Hide people" : "People"}
                  </Button>
                </div>

                {isOpen && (
                  <div className="mt-2 flex flex-col gap-2 pl-1">
                    {(members[org.id] ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0 text-xs">
                          <span className="font-medium">{m.user.name}</span>{" "}
                          <span className="text-muted-foreground">{m.user.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.role.toLowerCase()}</Badge>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                run(async () => {
                                  await removeOrganisationMember({
                                    organisationId: org.id,
                                    membershipId: m.id,
                                  });
                                  setMembers((prev) => ({
                                    ...prev,
                                    [org.id]: (prev[org.id] ?? []).filter((x) => x.id !== m.id),
                                  }));
                                })
                              }
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {canManage && (
                      <form
                        className="mt-1 flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const email = inviteEmail.trim();
                          if (!email) return;
                          run(async () => {
                            await addOrganisationMember({
                              organisationId: org.id,
                              email,
                            });
                            setInviteEmail("");
                            // Drop the cached list so it reloads on next open.
                            setMembers((prev) =>
                              Object.fromEntries(
                                Object.entries(prev).filter(([id]) => id !== org.id)
                              )
                            );
                          });
                        }}
                      >
                        <Input
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button type="submit" size="sm" disabled={pending}>
                          Add
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs leading-relaxed text-[#fca5a5]">
          {error}
        </p>
      )}
    </div>
  );
}
