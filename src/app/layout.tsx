// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import TopNav from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "Sentinel",
  description: "Sentinel dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <TopNav />
        <main style={{ padding: 24 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </main>
      </body>
    </html>
  );
}
