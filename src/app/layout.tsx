import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import SmoothScroll from "@/components/ui/SmoothScroll";
import { displayFont } from "@/components/showcase/fonts";
import "@xterm/xterm/css/xterm.css";
import "./globals.css";
import "./workspace.css";
import "./batch-five.css";
// The design system loads after the older sheets so its tokens and element
// defaults win; page layouts that were not rebuilt keep working through
// legacy.css.
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/shell.css";
import "@/styles/components.css";
import "@/styles/legacy.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cyber Box — Learn by doing",
  description:
    "A personal cybersecurity learning space with guided notes and hands-on labs.",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${displayFont.variable}`}>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
