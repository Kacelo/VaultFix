"use client";

import Link from "next/link";


const footerLinks = {
  Platform: [
    { href: "/technicians", label: "Find Electricians" },
    { href: "/fault-log", label: "Report a Fault" },
    { href: "/certs", label: "Certifications" },
    { href: "/pricing", label: "Pricing" },
  ],
  Resources: [
    { href: "/about", label: "About VaultFix" },
    { href: "/admin/qr-codes", label: "QR Code Generator" },
    { href: "/receipts", label: "Digital Receipts" },
    { href: "/reviews", label: "Reviews" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/contact", label: "Contact Us" },
  ],
};

const trustBadges = [
  { label: "NTA Verified", abbr: "NTA", color: "#14b8a6" },
  { label: "Eng. Council of Namibia", abbr: "ECN", color: "#f59e0b" },
  { label: "SA VTECH Database", abbr: "SVT", color: "#8b5cf6" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-muted)",
        background: "var(--bg-elevated)",
        paddingTop: "3.5rem",
        paddingBottom: "2rem",
      }}
    >
      <div className="container" style={{ padding: "0 1.5rem" }}>
        {/* Top section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "2.5rem",
            paddingBottom: "2.5rem",
            borderBottom: "1px solid var(--border-muted)",
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: "span 1" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                }}
              >
                V
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
                Vault<span style={{ color: "var(--teal-400)" }}>Fix</span>
              </span>
            </Link>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.7, marginBottom: "1.25rem", maxWidth: "220px" }}>
              Namibia&apos;s trusted hub for verified electricians and smart fault management.
            </p>

            {/* Trust badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {trustBadges.map((badge) => (
                <div
                  key={badge.abbr}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 20,
                      background: badge.color + "22",
                      border: `1px solid ${badge.color}44`,
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: badge.color,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {badge.abbr}
                  </span>
                  {badge.label}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "var(--text)",
                  marginBottom: "1rem",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                {category}
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                        transition: "color 0.2s",
                        display: "inline-block",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--teal-400)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            paddingTop: "1.5rem",
          }}
        >
          <p style={{ color: "var(--text-subtle)", fontSize: "0.8125rem" }}>
            © {year} VaultFix. All rights reserved. Built for Namibia 🇳🇦
          </p>
          <p style={{ color: "var(--text-subtle)", fontSize: "0.8125rem" }}>
            Powered by{" "}
            <span style={{ color: "var(--teal-500)", fontWeight: 600 }}>VaultFix Technologies</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
