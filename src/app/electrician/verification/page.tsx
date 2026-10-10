import { getMyVerificationStatus } from "@/lib/supabase/actions";
import { AccessNotice } from "@/components/AccessNotice";
import { VerificationPanel } from "./VerificationPanel";

export const dynamic = "force-dynamic";

export default async function ElectricianVerificationPage() {
  let status;

  try {
    status = await getMyVerificationStatus();
  } catch {
    // Requires a session and an electrician profile.
    status = null;
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

      <div className="container-sm" style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1
            id="verification-heading"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 800, marginBottom: "0.5rem" }}
          >
            Get ready for call-outs
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.7 }}>
            Namibian law requires a certified electrician for this work, so we
            check your NTA certification before any client can book you. It&apos;s a
            one-off step.
          </p>
        </div>

        {status === null ? (
          <AccessNotice
            title="Electrician account required"
            message="Log in with your electrician account to submit your certification."
          />
        ) : (
          <VerificationPanel initial={status} />
        )}
      </div>
    </section>
  );
}
