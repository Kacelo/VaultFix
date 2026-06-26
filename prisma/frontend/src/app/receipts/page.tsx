import Link from "next/link";

const receipts = [
  {
    id: "rcpt-1",
    ref: "VF-RCP-0091",
    date: "2025-11-14",
    client: "John Ndapewoshali",
    electrician: "Johannes Nakale",
    items: [
      { desc: "Call-out fee", amount: 250 },
      { desc: "Labour (3 hrs @ N$120/hr)", amount: 360 },
      { desc: "DB board replacement (materials)", amount: 890 },
    ],
    signed: true,
  },
  {
    id: "rcpt-2",
    ref: "VF-RCP-0085",
    date: "2025-10-29",
    client: "Sara Muteka",
    electrician: "Maria Hamukwaya",
    items: [
      { desc: "Call-out fee", amount: 300 },
      { desc: "Labour (1.5 hrs @ N$150/hr)", amount: 225 },
      { desc: "Conduit and cabling (materials)", amount: 430 },
    ],
    signed: false,
  },
];

export default function ReceiptsPage() {
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
            id="receipts-heading"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, marginBottom: "0.5rem" }}
          >
            Digital Receipts
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Itemised, signed receipts for every completed electrical job.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {receipts.map((rcpt) => {
            const total = rcpt.items.reduce((s, i) => s + i.amount, 0);
            return (
              <div key={rcpt.id} className="glass" style={{ padding: "1.75rem" }}>
                {/* Receipt header */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
                        Receipt {rcpt.ref}
                      </h2>
                      <span
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "var(--radius-full)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: rcpt.signed ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                          color: rcpt.signed ? "#4ade80" : "var(--amber-300)",
                        }}
                      >
                        {rcpt.signed ? "✓ Signed" : "⏳ Awaiting Signature"}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.825rem" }}>
                      {rcpt.date} · Client: <strong style={{ color: "var(--text)" }}>{rcpt.client}</strong> · Electrician: <strong style={{ color: "var(--text)" }}>{rcpt.electrician}</strong>
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      id={`download-receipt-${rcpt.id}`}
                      type="button"
                      className="btn-outline"
                      style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}
                    >
                      ⬇ PDF
                    </button>
                    {!rcpt.signed && (
                      <button
                        id={`sign-receipt-${rcpt.id}`}
                        type="button"
                        className="btn-primary"
                        style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}
                      >
                        ✍ Sign
                      </button>
                    )}
                  </div>
                </div>

                {/* Line items */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-muted)" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0", color: "var(--text-muted)", fontWeight: 500 }}>Description</th>
                      <th style={{ textAlign: "right", padding: "0.5rem 0", color: "var(--text-muted)", fontWeight: 500 }}>Amount (NAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rcpt.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.625rem 0", color: "var(--text)" }}>{item.desc}</td>
                        <td style={{ padding: "0.625rem 0", textAlign: "right", color: "var(--text)" }}>N${item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "1.5px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem 0", fontWeight: 700, fontFamily: "var(--font-display)" }}>Total</td>
                      <td style={{ padding: "0.75rem 0", textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--teal-300)", fontSize: "1.05rem" }}>
                        N${total.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
