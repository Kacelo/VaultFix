"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { href: "/technicians", label: "Find Electricians" },
  { href: "/fault-log", label: "Report Fault" },
  { href: "/certs", label: "Certifications" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
        background: scrolled
          ? "rgba(10,22,40,0.9)"
          : "transparent",
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
          <Link href="/" id="nav-logo" style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
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
              V
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "1.2rem",
                letterSpacing: "-0.02em",
              }}
            >
              Vault<span style={{ color: "var(--teal-400)" }}>Fix</span>
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
                    (e.currentTarget as HTMLElement).style.color = "var(--text)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} className="hide-mobile">
            <Link href="/login" className="btn-outline" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
              Log in
            </Link>
            <Link href="/register" className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
              Get Started
            </Link>
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.25rem", paddingTop: "0.75rem" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "1rem" }}>
              <Link href="/login" className="btn-outline" style={{ textAlign: "center", justifyContent: "center" }}>
                Log in
              </Link>
              <Link href="/register" className="btn-primary" style={{ textAlign: "center", justifyContent: "center" }}>
                Get Started
              </Link>
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
