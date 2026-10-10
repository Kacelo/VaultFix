import { Suspense } from "react";
import { getDirectoryFilterOptions, searchElectricians } from "@/lib/supabase/actions";
import { TechnicianCard } from "./TechnicianCard";
import { TechnicianFilters } from "./TechnicianFilters";

// The directory reflects live availability and ratings, so render per request
// rather than serving a cached snapshot.
export const dynamic = "force-dynamic";

async function Directory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]) as string | undefined;

  // The results and the filter options are independent reads, so they go out
  // together rather than one after the other — this page re-renders on every
  // filter change, and a serial pair doubled the latency of each toggle.
  //
  // Filter options still come from the data that actually exists, so we never
  // offer a choice that returns nothing.
  const [electricians, options] = await Promise.all([
    searchElectricians({
      serviceArea: one("area"),
      specialisation: one("spec"),
      onlyAvailable: one("available") === "1",
      onlyVerified: one("verified") === "1",
    }),
    getDirectoryFilterOptions(),
  ]);

  return (
    <>
      <TechnicianFilters areas={options.areas} specialisations={options.specialisations} />

      {electricians.length === 0 ? (
        <div className="glass" style={{ padding: "3rem 2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔌</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
            {options.total === 0 ? "No electricians registered yet" : "No electricians match these filters"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {options.total === 0
              ? "Once electricians sign up and complete their profile, they'll appear here."
              : "Try widening your search — clear a filter or choose a different area."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.125rem" }}>
          {electricians.map((e) => (
            <TechnicianCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </>
  );
}

export default function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        <div style={{ marginBottom: "2.5rem" }}>
          <h1
            id="technicians-heading"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
              fontWeight: 800,
              marginBottom: "0.75rem",
            }}
          >
            Find a Verified Electrician
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: 540 }}>
            All electricians on FaultFx are cross-checked against the NTA database. Browse by specialisation or location.
          </p>
        </div>

        <Suspense
          fallback={
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "3rem" }}>
              Loading electricians…
            </div>
          }
        >
          <Directory searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
