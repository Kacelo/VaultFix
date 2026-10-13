"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrganisationContext, setActiveOrganisation } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Org = { id: string; name: string; role: string };

/**
 * Switches between personal use and an organisation the person belongs to.
 *
 * Context is held server-side in an httpOnly cookie, so this component only
 * asks for the change and then refreshes — it cannot set the context itself,
 * and the server re-checks membership on every read regardless.
 *
 * Renders nothing for anyone with no memberships, which is everyone today.
 */
export function ContextSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    getOrganisationContext()
      .then((ctx) => {
        if (!live) return;
        setOrgs(ctx.organisations);
        setActiveId(ctx.activeId);
      })
      // Signed out, or the context could not be read: the switcher simply
      // does not appear. It is never the reason a page fails.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (orgs.length === 0) {
    return null;
  }

  const active = orgs.find((o) => o.id === activeId);

  function choose(id: string | null) {
    startTransition(async () => {
      await setActiveOrganisation(id);
      setActiveId(id);
      // Server components hold the scoped data, so they have to re-render.
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id="context-switcher"
          variant="outline"
          size="sm"
          disabled={pending}
          className="max-w-[190px]"
        >
          <span className="truncate">{active ? active.name : "Personal"}</span>
          <span aria-hidden className="ml-1 opacity-60">
            ▾
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Acting as</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => choose(null)}>
          <span className="flex-1">Personal</span>
          {activeId === null && <span aria-hidden>✓</span>}
        </DropdownMenuItem>

        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => choose(org.id)}>
            <span className="flex-1 truncate">
              {org.name}
              <span className="ml-1 text-xs text-muted-foreground">
                {org.role.toLowerCase()}
              </span>
            </span>
            {activeId === org.id && <span aria-hidden>✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
