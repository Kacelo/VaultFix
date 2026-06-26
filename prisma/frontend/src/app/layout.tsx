import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaultFix | Namibia's Trusted Electrician Hub",
  description:
    "Connect with NTA-verified electricians, log faults instantly with QR codes, generate Certificates of Compliance, and manage electrical services across Namibia.",
  keywords: [
    "electrician Namibia",
    "fault logging",
    "NTA certified",
    "certificate of compliance",
    "electrical services Namibia",
    "VaultFix",
  ],
  openGraph: {
    title: "VaultFix | Namibia's Trusted Electrician Hub",
    description:
      "The smart platform for verified electricians and clients to connect, report faults, and manage compliance.",
    url: "https://faultfix.com.na",
    siteName: "VaultFix",
    locale: "en_NA",
    type: "website",
  },
  metadataBase: new URL("https://faultfix.com.na"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
    >
      <body className="min-h-dvh flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
