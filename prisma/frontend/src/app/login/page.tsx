"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // TODO: wire up Supabase signInWithPassword
    try {
      await new Promise((r) => setTimeout(r, 1000)); // mock
      window.location.href = "/dashboard";
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
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
      {/* bg glow */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "var(--grad-glow)", pointerEvents: "none" }} />

      <div
        className="glass animate-fade-up"
        style={{ width: "100%", maxWidth: 440, padding: "2.5rem 2rem", position: "relative" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #0d9488, #14b8a6)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "var(--font-display)",
              boxShadow: "0 0 30px rgba(20,184,166,0.3)",
              margin: "0 auto 1rem",
            }}
          >
            V
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.375rem",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Sign in to your FaultFx account
          </p>
        </div>

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
          <div style={{ marginBottom: "1.125rem" }}>
            <label htmlFor="login-email" className="label">Email address</label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: "0.5rem" }}>
            <label htmlFor="login-password" className="label">Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: "1.5rem" }}>
            <Link href="/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--teal-400)" }}>
              Forgot password?
            </Link>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", fontSize: "1rem", padding: "0.875rem" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border-muted)" }} />
          <span style={{ color: "var(--text-subtle)", fontSize: "0.8125rem" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "var(--border-muted)" }} />
        </div>

        {/* Google sign-in */}
        <button
          id="login-google-btn"
          type="button"
          onClick={() => {/* TODO: supabase.auth.signInWithOAuth({ provider: 'google' }) */}}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.625rem",
            padding: "0.75rem",
            background: "rgba(255,255,255,0.05)",
            border: "1.5px solid var(--border-muted)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            fontSize: "0.9375rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-muted)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.6 5.1C9.8 39.7 16.4 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.5l6.2 5.2C37 37.4 44 32 44 24c0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--teal-400)", fontWeight: 600 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
