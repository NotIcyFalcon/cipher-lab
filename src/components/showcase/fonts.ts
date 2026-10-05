import { Anton } from "next/font/google";

/** Condensed display face for the showcase titles (loaded only on the dashboard). */
export const displayFont = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
