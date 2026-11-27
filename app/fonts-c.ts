import { Anuphan, IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

// Fonts for C and for the chooser page `/`. Same families as the OFL files in the storybook demo,
// loaded from Google Fonts at build time (design/00-shared.md section 6).
export const anuphan = Anuphan({ subsets: ["latin"], variable: "--font-anuphan", display: "swap" });
export const plexThaiC = IBM_Plex_Sans_Thai({
  subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-thai", display: "swap",
});
export const plexMonoC = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", preload: false,
});
