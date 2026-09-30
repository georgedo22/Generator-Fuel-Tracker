import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generator Fuel Tracker",
  description: "Track generators, fuel logs and consumption.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}