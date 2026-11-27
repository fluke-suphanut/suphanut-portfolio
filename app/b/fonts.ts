import { Anuphan, Bai_Jamjuree, IBM_Plex_Mono } from "next/font/google";

export const bai = Bai_Jamjuree({ subsets: ["latin"], weight: ["600"], variable: "--font-display", display: "swap" });
export const anuphanB = Anuphan({ subsets: ["latin"], variable: "--font-body", display: "swap" });
export const plexMonoB = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", preload: false,
});
