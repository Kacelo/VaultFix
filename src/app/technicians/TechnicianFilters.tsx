"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Filters live in the URL rather than component state: the query runs on the
 * server (see searchElectricians), so a filtered directory is shareable,
 * bookmarkable, and survives a refresh.
 */
export function TechnicianFilters({
  areas,
  specialisations,
}: {
  areas: string[];
  specialisations: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => router.push(`/technicians?${params.toString()}`));
  }

  return (
    <div
      className="glass"
      style={{
        padding: "1.125rem 1.5rem",
        marginBottom: "1.75rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        alignItems: "center",
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <select
        id="technicians-filter-location"
        className="input"
        style={{ flex: "1 1 200px" }}
        defaultValue={searchParams.get("area") ?? ""}
        onChange={(e) => setParam("area", e.target.value)}
      >
        <option value="">All Locations</option>
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <select
        id="technicians-filter-spec"
        className="input"
        style={{ flex: "1 1 200px" }}
        defaultValue={searchParams.get("spec") ?? ""}
        onChange={(e) => setParam("spec", e.target.value)}
      >
        <option value="">All Specialisations</option>
        {specialisations.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
        <input
          id="filter-available"
          type="checkbox"
          style={{ accentColor: "var(--teal-500)" }}
          defaultChecked={searchParams.get("available") === "1"}
          onChange={(e) => setParam("available", e.target.checked ? "1" : "")}
        />
        Available now
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer", userSelect: "none" }}>
        <input
          id="filter-verified"
          type="checkbox"
          style={{ accentColor: "var(--teal-500)" }}
          defaultChecked={searchParams.get("verified") === "1"}
          onChange={(e) => setParam("verified", e.target.checked ? "1" : "")}
        />
        NTA verified only
      </label>
    </div>
  );
}
