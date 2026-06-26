"use client";

import { useState, useRef, useEffect } from "react";

interface Location {
  id: string;
  building: string;
  room: string;
  description: string;
}

const defaultLocations: Location[] = [
  { id: "loc-1", building: "Block A", room: "Classroom 1", description: "Main lecture room, ground floor" },
  { id: "loc-2", building: "Block A", room: "Classroom 2", description: "Second lecture room, ground floor" },
  { id: "loc-3", building: "Block B", room: "Admin Office", description: "Administration and reception" },
  { id: "loc-4", building: "Block B", room: "Server Room", description: "IT infrastructure room" },
];

export default function QRCodeGeneratorPage() {
  const [locations, setLocations] = useState<Location[]>(defaultLocations);
  const [newBuilding, setNewBuilding] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://faultfix.com.na");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dynamically import qrcode only in browser
  async function generateQR(loc: Location) {
    setGeneratingId(loc.id);
    try {
      const QRCode = (await import("qrcode")).default;
      const url = `${baseUrl}/fault-log/${encodeURIComponent(`${loc.building} – ${loc.room}`)}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: { dark: "#042f2e", light: "#f0fdfa" },
      });
      setGenerated(dataUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingId(null);
    }
  }

  function addLocation() {
    if (!newBuilding || !newRoom) return;
    setLocations((prev) => [
      ...prev,
      {
        id: "loc-" + Date.now(),
        building: newBuilding,
        room: newRoom,
        description: newDesc,
      },
    ]);
    setNewBuilding("");
    setNewRoom("");
    setNewDesc("");
  }

  function downloadQR() {
    if (!generated) return;
    const a = document.createElement("a");
    a.href = generated;
    a.download = "vaultfix-qr.png";
    a.click();
  }

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
            id="qr-generator-heading"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, marginBottom: "0.5rem" }}
          >
            QR Code Generator
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            Generate printable QR codes for each building, room, or department. Staff scan the code to report faults instantly.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.75rem" }}>
          {/* Left: location manager */}
          <div>
            {/* Add new location */}
            <div
              className="glass"
              style={{ padding: "1.5rem", marginBottom: "1.25rem" }}
            >
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
                  <label htmlFor="qr-desc" className="label">Description <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional)</span></label>
                  <input id="qr-desc" className="input" placeholder="e.g. Second floor, east wing" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                </div>
                <button id="qr-add-location-btn" type="button" onClick={addLocation} className="btn-primary" style={{ justifyContent: "center" }}>
                  + Add Location
                </button>
              </div>
            </div>

            {/* Base URL config */}
            <div className="glass" style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
              <label htmlFor="qr-base-url" className="label">Base URL</label>
              <input id="qr-base-url" className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
              <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.375rem" }}>QR links will point to: {baseUrl}/fault-log/[location]</p>
            </div>

            {/* Locations list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
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
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{loc.building} — {loc.room}</div>
                    {loc.description && <div style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>{loc.description}</div>}
                  </div>
                  <button
                    id={`generate-qr-${loc.id}`}
                    type="button"
                    onClick={() => generateQR(loc)}
                    disabled={generatingId === loc.id}
                    className="btn-primary"
                    style={{ padding: "0.5rem 0.875rem", fontSize: "0.8rem", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {generatingId === loc.id ? "…" : "Generate QR"}
                  </button>
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
                    src={generated}
                    alt="Generated QR code"
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: "var(--radius-md)",
                      border: "4px solid rgba(20,184,166,0.25)",
                      boxShadow: "0 0 40px rgba(20,184,166,0.15)",
                    }}
                  />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Scan to go directly to the fault reporting form for this location.
                  </p>
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

            {/* Print tips */}
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
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </section>
  );
}
