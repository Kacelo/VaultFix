import { listReceipts } from "@/lib/supabase/actions";
import { AccessNotice } from "@/components/AccessNotice";
import { SignReceiptButton } from "./SignReceiptButton";

export const dynamic = "force-dynamic";

type LineItem = { desc: string; amount: number };

/** lineItems is a Json column, so it arrives untyped — narrow it defensively. */
function toLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is LineItem =>
      typeof i === "object" &&
      i !== null &&
      typeof (i as LineItem).desc === "string" &&
      typeof (i as LineItem).amount === "number"
  );
}

export default async function ReceiptsPage() {
  let receipts;

  try {
    receipts = await listReceipts();
  } catch {
    receipts = null;
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
            id="receipts-heading"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, marginBottom: "0.5rem" }}
          >
            Digital Receipts
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Itemised, signed receipts for every completed electrical job.
          </p>
        </div>

        {receipts === null ? (
          <AccessNotice
            title="Sign in to view your receipts"
            message="Receipts are private to the client and the electrician on each job."
          />
        ) : receipts.length === 0 ? (
          <div className="glass" style={{ padding: "3rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🧾</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>
              No receipts yet
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Receipts appear here once an electrician issues one for a completed job.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {receipts.map((rcpt) => {
              const items = toLineItems(rcpt.lineItems);
              const fullySigned = rcpt.signedByClient && rcpt.signedByElectrician;

              return (
                <div key={rcpt.id} className="glass" style={{ padding: "1.75rem" }}>
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
                            background: fullySigned ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                            color: fullySigned ? "#4ade80" : "var(--amber-300)",
                          }}
                        >
                          {fullySigned ? "✓ Signed" : "⏳ Awaiting Signature"}
                        </span>
                      </div>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.825rem" }}>
                        {rcpt.issuedAt.toLocaleDateString("en-GB")} · Fault:{" "}
                        <strong style={{ color: "var(--text)" }}>{rcpt.job.fault.ref}</strong> ·{" "}
                        {rcpt.job.fault.description.slice(0, 60)}
                        {rcpt.job.fault.description.length > 60 ? "…" : ""}
                      </p>
                      <p style={{ color: "var(--text-subtle)", fontSize: "0.775rem", marginTop: "0.25rem" }}>
                        Client {rcpt.signedByClient ? "signed ✓" : "not signed"} · Electrician{" "}
                        {rcpt.signedByElectrician ? "signed ✓" : "not signed"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {rcpt.pdfUrl && (
                        <a
                          id={`download-receipt-${rcpt.id}`}
                          href={rcpt.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline"
                          style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}
                        >
                          ⬇ PDF
                        </a>
                      )}
                      {!fullySigned && <SignReceiptButton receiptId={rcpt.id} />}
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-muted)" }}>
                        <th style={{ textAlign: "left", padding: "0.5rem 0", color: "var(--text-muted)", fontWeight: 500 }}>Description</th>
                        <th style={{ textAlign: "right", padding: "0.5rem 0", color: "var(--text-muted)", fontWeight: 500 }}>
                          Amount ({rcpt.currency})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "0.625rem 0", color: "var(--text)" }}>{item.desc}</td>
                          <td style={{ padding: "0.625rem 0", textAlign: "right", color: "var(--text)" }}>
                            N${item.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "1.5px solid var(--border)" }}>
                        <td style={{ padding: "0.75rem 0", fontWeight: 700, fontFamily: "var(--font-display)" }}>Total</td>
                        <td style={{ padding: "0.75rem 0", textAlign: "right", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--teal-300)", fontSize: "1.05rem" }}>
                          N${rcpt.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
