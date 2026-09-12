"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { syncUserProfile } from "@/lib/supabase/actions";
import { towns } from "../towns";

type Role = "client" | "electrician";
type Step = 1 | 2 | 3;

function RegisterForm() {
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 (electrician) fields. The NTA UID is deliberately not collected
  // here — certification is checked later, as a gate on accepting call-outs
  // rather than a barrier to creating an account.
  const [specialisation, setSpecialisation] = useState("");
  const [location, setLocation] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < (role === "electrician" ? 3 : 2)) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: name,
          phone,
          role: role.toUpperCase(),
          ...(role === "electrician" && {
            specialisation,
            service_area: location,
          }),
        },
      },
    });

    if (signUpError || !data.user) {
      console.log("Sign-up error:", signUpError);
      setLoading(false);
      setError(
        signUpError?.message ?? "Registration failed. Please try again."
      );
      return;
    }

    try {
      await syncUserProfile({
        userId: data.user.id,
        email,
        name,
        phone,
        role: role === "electrician" ? "ELECTRICIAN" : "CLIENT",
        ...(role === "electrician" && {
          specialisation,
          serviceArea: location,
        }),
      });
    } catch (syncError) {
      setLoading(false);
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Your account was created, but saving your profile failed. Please contact support."
      );
      return;
    }

    setLoading(false);

    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      // Email confirmation required before a session is issued
      setConfirmationSent(true);
    }
  }

  const totalSteps = role === "electrician" ? 3 : 2;
  const stepLabels =
    role === "electrician"
      ? ["Basic Info", "Your Trade", "Confirm"]
      : ["Basic Info", "Confirm"];

  if (confirmationSent) {
    return (
      <div
        style={{
          minHeight: "calc(100dvh - 68px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          background: "var(--grad-hero)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--grad-glow)",
            pointerEvents: "none",
          }}
        />
        <div
          className="glass animate-fade-up"
          style={{
            width: "100%",
            maxWidth: 440,
            padding: "2.5rem 2rem",
            position: "relative",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📬</div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "0.75rem",
            }}
          >
            Check your email
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "var(--text)" }}>{email}</strong>. Click it
            to activate your FaultFx account.
          </p>
          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
            <Link
              href="/login"
              style={{ color: "var(--teal-400)", fontWeight: 600 }}
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100dvh - 68px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        background: "var(--grad-hero)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--grad-glow)",
          pointerEvents: "none",
        }}
      />

      <div
        className="glass animate-fade-up"
        style={{
          width: "100%",
          maxWidth: 500,
          padding: "2.5rem 2rem",
          position: "relative",
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "linear-gradient(135deg, #0d9488, #14b8a6)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "var(--font-display)",
              boxShadow: "0 0 24px rgba(20,184,166,0.3)",
              margin: "0 auto 0.875rem",
            }}
          >
            V
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.625rem",
              fontWeight: 800,
              marginBottom: "0.25rem",
            }}
          >
            Create your account
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            Join FaultFx today
          </p>
        </div>

        {/* Step progress */}
        <div style={{ display: "flex", gap: "0.375rem", marginBottom: "2rem" }}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background:
                    i + 1 <= step
                      ? "linear-gradient(90deg, #0d9488, #14b8a6)"
                      : "var(--border-muted)",
                  transition: "background 0.3s",
                }}
              />
              <span
                style={{
                  fontSize: "0.7rem",
                  color:
                    i + 1 <= step ? "var(--teal-300)" : "var(--text-subtle)",
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                {stepLabels[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Role selector (step 1 only) */}
        {step === 1 && (
          <div
            style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}
          >
            {(["client", "electrician"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                id={`role-select-${r}`}
                onClick={() => setRole(r)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  borderRadius: "var(--radius-sm)",
                  border: `1.5px solid ${
                    role === r ? "var(--teal-500)" : "var(--border-muted)"
                  }`,
                  background:
                    role === r ? "rgba(20,184,166,0.1)" : "transparent",
                  color: role === r ? "var(--teal-300)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {r === "client" ? "🏠 Client" : "🔧 Electrician"}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "var(--radius-sm)",
              padding: "0.75rem 1rem",
              color: "#fca5a5",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ─── Step 1: Basic Info ─── */}
          {step === 1 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label htmlFor="reg-name" className="label">
                  Full name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  className="input"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="label">
                  Email address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="reg-phone" className="label">
                  Phone number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  className="input"
                  placeholder="+264 81 000 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="label">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  className="input"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
            </div>
          )}

          {/* ─── Step 2 (Electrician): Trade details ─── */}
          {step === 2 && role === "electrician" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  background: "rgba(20,184,166,0.05)",
                  border: "1px solid rgba(20,184,166,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "1rem 1.125rem",
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: "var(--teal-300)" }}>
                  About NTA certification
                </strong>
                <br />
                You don&apos;t need your NTA UID to sign up. You can create your
                profile and browse now — we&apos;ll ask you to submit your
                certification when you&apos;re ready to start accepting
                call-outs.
              </div>

              <div>
                <label htmlFor="reg-specialisation" className="label">
                  Specialisation
                </label>
                <select
                  id="reg-specialisation"
                  className="input"
                  value={specialisation}
                  onChange={(e) => setSpecialisation(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Select specialisation…</option>
                  <option value="residential">Residential Wiring</option>
                  <option value="commercial">Commercial Installations</option>
                  <option value="industrial">Industrial Electrical</option>
                  <option value="solar">Solar / Renewable Energy</option>
                  <option value="maintenance">
                    Fault Finding & Maintenance
                  </option>
                  <option value="coc">Certificate of Compliance (COC)</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-location" className="label">
                  Service area (city/town)
                </label>
                <select
                  id="reg-location"
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">Select location</option>
                  {towns.map((town) => (
                    <option key={town} value={town}>
                      {town}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ─── Step 2 (Client) or Step 3 (Electrician): Confirm ─── */}
          {((step === 2 && role === "client") ||
            (step === 3 && role === "electrician")) && (
            <div
              style={{
                background: "rgba(20,184,166,0.05)",
                border: "1px solid rgba(20,184,166,0.15)",
                borderRadius: "var(--radius-md)",
                padding: "1.25rem",
                fontSize: "0.9rem",
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  marginBottom: "0.875rem",
                  fontFamily: "var(--font-display)",
                }}
              >
                Review your details
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Name:</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>
                    {name}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Email:</span>
                  <span style={{ color: "var(--text)", fontWeight: 500 }}>
                    {email}
                  </span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Role:</span>
                  <span
                    style={{
                      color: "var(--teal-400)",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {role}
                  </span>
                </div>
                {role === "electrician" && specialisation && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Specialisation:</span>
                    <span
                      style={{
                        color: "var(--text)",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {specialisation}
                    </span>
                  </div>
                )}
                {role === "electrician" && location && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Service area:</span>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      {location}
                    </span>
                  </div>
                )}
              </div>
              <p
                style={{
                  marginTop: "1rem",
                  fontSize: "0.8rem",
                  color: "var(--text-subtle)",
                }}
              >
                By creating an account you agree to our{" "}
                <Link href="/terms" style={{ color: "var(--teal-400)" }}>
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" style={{ color: "var(--teal-400)" }}>
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          )}

          <div
            style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem" }}
          >
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="btn-outline"
                style={{ flex: 1, justifyContent: "center" }}
              >
                Back
              </button>
            )}
            <button
              id="register-next-btn"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                flex: 1,
                justifyContent: "center",
                fontSize: "0.9375rem",
                padding: "0.875rem",
              }}
            >
              {loading
                ? "Creating account…"
                : step < totalSteps
                ? "Continue →"
                : "Create Account"}
            </button>
          </div>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--teal-400)", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "calc(100dvh - 68px)",
            background: "var(--grad-hero)",
          }}
        />
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
