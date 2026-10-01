import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@xterm/xterm/css/xterm.css";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Cyber Box — Learn by doing",
  description:
    "A personal cybersecurity learning space with guided notes and hands-on labs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
