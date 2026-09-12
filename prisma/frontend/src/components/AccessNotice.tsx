import Link from "next/link";

/**
 * Shown when a page's data requires a session or a role the caller lacks.
 * The server actions throw on unauthorised access by design; pages render this
 * instead of a stack trace.
 */
export function AccessNotice({
  title,
  message,
  showLogin = true,
}: {
  title: string;
  message: string;
  showLogin?: boolean;
}) {
  return (
    <div className="glass" style={{ padding: "3rem 2rem", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.875rem" }}>🔒</div>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.25rem",
          marginBottom: "0.625rem",
        }}
      >
        {title}
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: showLogin ? "1.75rem" : 0 }}>
        {message}
      </p>
      {showLogin && (
        <Link href="/login" className="btn-primary" style={{ display: "inline-flex", justifyContent: "center" }}>
          Log in
        </Link>
      )}
    </div>
  );
}
