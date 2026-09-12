"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/technicians", label: "Find Electricians" },
  { href: "/fault-log", label: "Report Fault" },
  { href: "/certs", label: "Certifications" },
  { href: "/about", label: "About" },
];

/**
 * Just enough of the signed-in user to greet them. `undefined` is a third,
 * meaningful state: the session has not resolved yet, which is neither signed
 * in nor signed out and must not be rendered as either.
 */
type SessionUser = { name: string; initial: string };

/**
 * `user_metadata` is set by the user at sign-up, so it is self-asserted and
 * used for display only — never to decide what someone may do. Every such
 * decision stays on the server, where the guards in actions.ts read the role
 * from the database.
 *
 * The nav deliberately does not branch on role: one `/dashboard` link for
 * everyone, and the page itself renders client, electrician or admin content
 * from the caller's database role.
 */
function toSessionUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): SessionUser {
  const email = user.email ?? "";
  const fullName = user.user_metadata?.full_name;
  const name =
    (typeof fullName === "string" && fullName.trim()) || email.split("@")[0] || "Account";

  return { name, initial: name.charAt(0).toUpperCase() };
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [signingOut, setSigningOut] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /**
   * The session is read in the browser rather than passed down from a server
   * component on purpose: the Navbar lives in the root layout, so reading
   * cookies for it up there would opt every page in the app — including the
   * static landing, login and register pages — into per-request rendering, and
   * add a Supabase auth call plus a user query to each one.
   *
   * `onAuthStateChange` emits INITIAL_SESSION as soon as it subscribes, read
   * from the cookie the page already carried, so this costs no network round
   * trip. It also means login and sign-out update the nav immediately, without
   * a reload.
   */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toSessionUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);

    // Signed out through the browser client rather than the `signOut` server
    // action: the action clears the cookie but cannot notify the listener
    // above, so the nav would go on showing this user as signed in after the
    // redirect. Doing it here fires SIGNED_OUT and the nav updates at once.
    await supabase.auth.signOut();

    router.replace("/login");
    // Drops any server-rendered page still cached as signed-in.
    router.refresh();
    setSigningOut(false);
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        background: scrolled ? "rgba(10,22,40,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(45,212,191,0.12)"
          : "1px solid transparent",
      }}
    >
      <div className="container" style={{ padding: "0 1.5rem" }}>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "68px",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            id="nav-logo"
            style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                fontWeight: 800,
                color: "#fff",
                fontFamily: "var(--font-display)",
                boxShadow: "0 0 20px rgba(20,184,166,0.3)",
              }}
            >
              F
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.2rem",
                letterSpacing: "-0.02em",
              }}
            >
              Fault<span style={{ color: "var(--teal-400)" }}>Fx</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <ul
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              listStyle: "none",
            }}
            className="hide-mobile"
          >
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    padding: "0.5rem 0.875rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    transition: "color 0.2s, background 0.2s",
                    display: "block",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text)";
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth buttons */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            className="hide-mobile"
          >
            {user === undefined ? (
              /* Session not resolved yet. Holding the buttons' exact footprint
                 keeps the header from shifting when it lands, and showing
                 nothing beats showing the wrong thing for a frame. */
              <div aria-hidden style={{ width: 212, height: 38 }} />
            ) : user ? (
              <>
                <span
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "#fff",
                      fontFamily: "var(--font-display)",
                      flexShrink: 0,
                    }}
                  >
                    {user.initial}
                  </span>
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      maxWidth: 130,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.name}
                  </span>
                </span>
                <Link
                  id="nav-dashboard"
                  href="/dashboard"
                  className="btn-primary"
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
                >
                  Dashboard
                </Link>
                <button
                  id="nav-sign-out"
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="btn-outline"
                  style={{
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.875rem",
                    cursor: signingOut ? "default" : "pointer",
                    opacity: signingOut ? 0.7 : 1,
                  }}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-outline"
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="btn-primary"
                  style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text)",
              padding: "0.5rem",
            }}
            className="show-mobile"
          >
            {menuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            id="mobile-nav-menu"
            style={{
              borderTop: "1px solid var(--border-muted)",
              paddingBottom: "1rem",
            }}
          >
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                paddingTop: "0.75rem",
              }}
            >
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "0.625rem 0.75rem",
                      color: "var(--text-muted)",
                      fontSize: "0.9375rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
                marginTop: "1rem",
              }}
            >
              {user === undefined ? null : user ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.25rem 0.75rem 0.5rem",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "var(--font-display)",
                        flexShrink: 0,
                      }}
                    >
                      {user.initial}
                    </span>
                    <span
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {user.name}
                    </span>
                  </div>
                  <Link
                    id="mobile-nav-dashboard"
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary"
                    style={{ textAlign: "center", justifyContent: "center" }}
                  >
                    Dashboard
                  </Link>
                  <button
                    id="mobile-nav-sign-out"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    disabled={signingOut}
                    className="btn-outline"
                    style={{
                      justifyContent: "center",
                      cursor: signingOut ? "default" : "pointer",
                      opacity: signingOut ? 0.7 : 1,
                    }}
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="btn-outline"
                    style={{ textAlign: "center", justifyContent: "center" }}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary"
                    style={{ textAlign: "center", justifyContent: "center" }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .show-mobile { display: none !important; }
        }
      `}</style>
    </header>
  );
}
