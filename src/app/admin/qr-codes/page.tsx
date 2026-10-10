import { headers } from "next/headers";
import { getAllLocations } from "@/lib/supabase/actions";
import { AccessNotice } from "@/components/AccessNotice";
import { QrManager } from "./QrManager";

export const dynamic = "force-dynamic";

export default async function QRCodeGeneratorPage() {
  let locations;

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const defaultBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  try {
    locations = await getAllLocations();
  } catch {
    // Every location action on this screen — read, create, update, delete —
    // requires ADMIN. Render the reason rather than a server error.
    //
    // proxy.ts only checks that the caller is signed in, not what role they
    // hold, so this is the check that actually keeps non-admins out.
    locations = null;
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

        {locations === null ? (
          <AccessNotice
            title="Admin access required"
            message="Log in with an administrator account to manage locations and print QR codes."
          />
        ) : (
          <QrManager locations={locations} defaultBaseUrl={defaultBaseUrl} />
        )}
      </div>
    </section>
  );
}
