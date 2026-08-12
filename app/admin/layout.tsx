import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff Admin", robots: { index: false, follow: false, noarchive: true, noimageindex: true } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
