"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signReceipt } from "@/lib/supabase/actions";

export function SignReceiptButton({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sign() {
    setBusy(true);
    setError("");
    try {
      // The action decides which side you sign as, from your session — the
      // client never gets to claim it is signing on someone else's behalf.
      await signReceipt(receiptId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        id={`sign-receipt-${receiptId}`}
        type="button"
        onClick={sign}
        disabled={busy}
        className="btn-primary"
        style={{ padding: "0.4rem 0.875rem", fontSize: "0.8rem" }}
      >
        {busy ? "Signing…" : "✍ Sign"}
      </button>
      {error && (
        <span role="alert" style={{ color: "#fca5a5", fontSize: "0.75rem", alignSelf: "center" }}>
          {error}
        </span>
      )}
    </>
  );
}
