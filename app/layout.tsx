import type { Metadata } from "next";
import "./globals.css";

function siteUrl() { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"); } catch { return new URL("http://localhost:3000"); } }

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "MYMZ Swimming School | Confidence in the Water",
  description:
    "Swimming lessons designed to build confidence, technique and lifelong skills in the water.",
  applicationName: "MYMZ Swimming School",
  openGraph: {
    type: "website",
    siteName: "MYMZ Swimming School",
    title: "MYMZ Swimming School | Confidence in the Water",
    description: "Supportive swimming lessons for children and adults, designed to build confidence, technique and lifelong ability.",
  },
  twitter: { card: "summary_large_image", title: "MYMZ Swimming School", description: "Confidence in the water. Skills for life." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><a href="#application-content" className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-white px-4 py-3 font-bold text-navy shadow-lg transition focus:translate-y-0">Skip to application content</a><div id="application-content" tabIndex={-1}>{children}</div></body>
    </html>
  );
}
