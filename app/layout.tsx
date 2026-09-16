import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapon Outbound Battle",
  description: "Live scoreboard - Mapon Outbound Battle, 22-30 Sept 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
