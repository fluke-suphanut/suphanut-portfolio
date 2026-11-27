import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";

// D · Editorial (design/d-editorial.md section 3.2). Archivo's width axis gives the condensed display
// face; Fraunces is the high-contrast serif; Plex Mono is only for the evidence badges.
export const archivo = Archivo({
  subsets: ["latin"], axes: ["wdth"], variable: "--font-sans", display: "swap",
});
export const fraunces = Fraunces({
  subsets: ["latin"], style: ["normal", "italic"], variable: "--font-serif", display: "swap", preload: false,
});
export const plexMonoD = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["500"], variable: "--font-mono", display: "swap", preload: false,
});
