"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export default function CertsGeneratePage() {
  // Form state
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [workDesc, setWorkDesc] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [electricianName, setElectricianName] = useState("");
  const [ntaUid, setNtaUid] = useState("");

  // E-signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [signed, setSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // PDF generation state
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setSigned(true);
  }

  function endDraw() {
    setDrawing(false);
    lastPos.current = null;
  }

  function clearSignature() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setSigned(false);
  }

  async function generateCOC() {
    setGenerating(true);
    // Mock PDF generation — replace with jsPDF + html2canvas when installed
    await new Promise((r) => setTimeout(r, 2000));
    setGenerated(true);
    setGenerating(false);
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

      <div className="container-sm" style={{ position: "relative" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/certs" style={{ color: "var(--text-muted)", fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.25rem", marginBottom: "1rem" }}>
            ← Back to Certifications
          </Link>
          <h1
            id="coc-generator-heading"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, marginBottom: "0.5rem" }}
          >
            Certificate of Compliance Generator
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Fill in the details below, sign digitally, and download a formatted COC document.
          </p>
        </div>

        {generated ? (
          <div className="glass animate-fade-up" style={{ padding: "2.5rem", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📄</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>COC Generated!</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.75rem" }}>
              Your Certificate of Compliance has been generated and is ready to download.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-primary" style={{ padding: "0.75rem 1.5rem" }}>⬇ Download PDF</button>
              <button className="btn-outline" style={{ padding: "0.75rem 1.5rem" }}>📧 Email to Client</button>
              <button onClick={() => setGenerated(false)} className="btn-outline" style={{ padding: "0.75rem 1.5rem" }}>Generate Another</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Section 1: Property & Client */}
            <div className="glass" style={{ padding: "1.75rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem", color: "var(--teal-300)" }}>
                1. Property & Client Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label htmlFor="coc-client-name" className="label">Client / Owner Name</label>
                  <input id="coc-client-name" className="input" placeholder="Full name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="coc-inspection-date" className="label">Inspection Date</label>
                  <input id="coc-inspection-date" className="input" type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="coc-address" className="label">Property Address</label>
                  <input id="coc-address" className="input" placeholder="Street, suburb, city" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="coc-property-type" className="label">Property Type</label>
                  <select id="coc-property-type" className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={{ cursor: "pointer" }}>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="government">Government / Institutional</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Work Description */}
            <div className="glass" style={{ padding: "1.75rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem", color: "var(--teal-300)" }}>
                2. Work Description
              </h2>
              <label htmlFor="coc-work-desc" className="label">Describe the electrical work completed</label>
              <textarea
                id="coc-work-desc"
                className="input"
                rows={4}
                placeholder="e.g. Replacement of DB board, rewiring of distribution circuits, installation of earth leakage protection…"
                value={workDesc}
                onChange={(e) => setWorkDesc(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>

            {/* Section 3: Electrician Details */}
            <div className="glass" style={{ padding: "1.75rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem", color: "var(--teal-300)" }}>
                3. Electrician Details
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div>
                  <label htmlFor="coc-elec-name" className="label">Electrician Name</label>
                  <input id="coc-elec-name" className="input" placeholder="Full name" value={electricianName} onChange={(e) => setElectricianName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="coc-nta-uid" className="label">NTA UID / License No.</label>
                  <input id="coc-nta-uid" className="input" placeholder="e.g. NTA-2023-00412" value={ntaUid} onChange={(e) => setNtaUid(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section 4: E-Signature */}
            <div className="glass" style={{ padding: "1.75rem" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem", color: "var(--teal-300)" }}>
                4. Digital Signature
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                Draw your signature below using mouse or touch. This will be embedded in the certificate.
              </p>
              <div
                style={{
                  border: `2px dashed ${signed ? "rgba(20,184,166,0.4)" : "var(--border-muted)"}`,
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  position: "relative",
                  background: "rgba(0,0,0,0.2)",
                  transition: "border-color 0.2s",
                  touchAction: "none",
                }}
              >
                <canvas
                  ref={canvasRef}
                  id="signature-canvas"
                  width={580}
                  height={140}
                  style={{ display: "block", width: "100%", height: 140, cursor: "crosshair" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!signed && (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-subtle)",
                      fontSize: "0.875rem",
                      pointerEvents: "none",
                    }}
                  >
                    ✍ Sign here
                  </div>
                )}
              </div>
              {signed && (
                <button
                  id="clear-signature-btn"
                  type="button"
                  onClick={clearSignature}
                  style={{
                    marginTop: "0.625rem",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Clear signature
                </button>
              )}
            </div>

            {/* Generate button */}
            <button
              id="generate-coc-btn"
              type="button"
              onClick={generateCOC}
              disabled={generating || !clientName || !clientAddress || !workDesc || !signed}
              className="btn-primary"
              style={{ justifyContent: "center", fontSize: "1rem", padding: "1rem 2rem" }}
            >
              {generating ? "Generating COC…" : "📄 Generate Certificate of Compliance"}
            </button>
            {(!signed || !clientName) && (
              <p style={{ color: "var(--text-subtle)", fontSize: "0.8rem", textAlign: "center" }}>
                Fill in all required fields and add your signature to continue.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
