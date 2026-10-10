"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLocation, deleteLocation } from "@/lib/supabase/actions";

export type ManagedLocation = {
  id: string;
  building: string;
  room: string;
  description: string | null;
  qrUrl: string | null;
};

export function QrManager({
  locations,
  defaultBaseUrl,
}: {
  locations: ManagedLocation[];
  defaultBaseUrl: string;
}) {
  const router = useRouter();
  const [newBuilding, setNewBuilding] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [generated, setGenerated] = useState<{ dataUrl: string; label: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // The stored qrUrl is stamped with whatever origin created it, which is wrong
  // when you generate locally but print for production — so the origin stays
  // editable. The default is resolved on the server to keep this render
  // identical on both sides of hydration.
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);

  async function generateQR(loc: ManagedLocation) {
    setBusyId(loc.id);
    setError("");
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(`${baseUrl}/fault-log/${loc.id}`, {
        width: 400,
        margin: 2,
        color: { dark: "#042f2e", light: "#f0fdfa" },
      });
      setGenerated({ dataUrl, label: `${loc.building} – ${loc.room}` });
    } catch {
      setError("Could not generate the QR code.");
    } finally {
      setBusyId(null);
    }
  }

  async function addLocation() {
    if (!newBuilding.trim() || !newRoom.trim()) {
      setError("Building and room are both required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createLocation({
        building: newBuilding.trim(),
        room: newRoom.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewBuilding("");
      setNewRoom("");
      setNewDesc("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the location.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(loc: ManagedLocation) {
    setBusyId(loc.id);
    setError("");
    try {
      await deleteLocation(loc.id);
      router.refresh();
    } catch {
      // A location that already has fault reports is protected by a foreign key.
      setError(
        `Could not delete ${loc.building} – ${loc.room}. Locations with existing fault reports cannot be removed.`
      );
    } finally {
      setBusyId(null);
    }
  }

  function downloadQR() {
    if (!generated) return;
    const a = document.createElement("a");
    a.href = generated.dataUrl;
    a.download = `faultfx-qr-${generated.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: "var(--radius-md)",
            color: "#fca5a5",
            fontSize: "0.875rem",
            marginBottom: "1.25rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.75rem" }}>
        {/* Left: location manager */}
        <div>
          <div className="glass" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
              Add a Location
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label htmlFor="qr-building" className="label">Building / Block</label>
                <input id="qr-building" className="input" placeholder="e.g. Block A" value={newBuilding} onChange={(e) => setNewBuilding(e.target.value)} />
              </div>
              <div>
                <label htmlFor="qr-room" className="label">Room / Department</label>
                <input id="qr-room" className="input" placeholder="e.g. Classroom 5" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
              </div>
              <div>
                <label htmlFor="qr-desc" className="label">
                  Description <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input id="qr-desc" className="input" placeholder="e.g. Second floor, east wing" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <button id="qr-add-location-btn" type="button" onClick={addLocation} disabled={saving} className="btn-primary" style={{ justifyContent: "center" }}>
                {saving ? "Saving…" : "+ Add Location"}
              </button>
            </div>
          </div>

          <div className="glass" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
            <label htmlFor="qr-base-url" className="label">Base URL</label>
            <input id="qr-base-url" className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.375rem" }}>
              QR links will point to: {baseUrl}/fault-log/[id]
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {locations.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem" }}>
                No locations yet. Add one above to generate its QR code.
              </p>
            )}
            {locations.map((loc) => (
              <div
                key={loc.id}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-muted)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem 1.125rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{loc.building} — {loc.room}</div>
                  {loc.description && (
                    <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{loc.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                  <button
                    id={`generate-qr-${loc.id}`}
                    type="button"
                    onClick={() => generateQR(loc)}
                    disabled={busyId === loc.id}
                    className="btn-primary"
                    style={{ padding: "0.5rem 0.875rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                  >
                    {busyId === loc.id ? "…" : "Generate QR"}
                  </button>
                  <button
                    id={`delete-location-${loc.id}`}
                    type="button"
                    onClick={() => removeLocation(loc)}
                    disabled={busyId === loc.id}
                    className="btn-outline"
                    aria-label={`Delete ${loc.building} ${loc.room}`}
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: QR preview */}
        <div>
          <div
            className="glass"
            style={{
              padding: "2rem",
              textAlign: "center",
              minHeight: 380,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "1.25rem",
            }}
          >
            {generated ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generated.dataUrl}
                  alt={`QR code for ${generated.label}`}
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: "var(--radius-md)",
                    border: "4px solid rgba(20,184,166,0.25)",
                    boxShadow: "0 0 40px rgba(20,184,166,0.15)",
                  }}
                />
                <div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {generated.label}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Scan to go directly to the fault reporting form for this location.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", justifyContent: "center" }}>
                  <button id="qr-download-btn" type="button" onClick={downloadQR} className="btn-primary" style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem" }}>
                    ⬇ Download PNG
                  </button>
                  <button type="button" onClick={() => setGenerated(null)} className="btn-outline" style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem" }}>
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    background: "rgba(20,184,166,0.06)",
                    border: "2px dashed rgba(20,184,166,0.2)",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                  }}
                >
                  📱
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Select a location and click &quot;Generate QR&quot; to create a printable QR code.
                </p>
              </>
            )}
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              padding: "1.125rem",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--amber-300)", marginBottom: "0.625rem" }}>
              💡 Print Tips
            </h3>
            <ul style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.8, paddingLeft: "1rem" }}>
              <li>Print at minimum 5×5 cm for reliable scanning</li>
              <li>Laminate or use weather-resistant paper for outdoor locations</li>
              <li>Place at eye level near the entrance of each room</li>
              <li>Add a label below: &quot;Scan to Report an Electrical Fault&quot;</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
