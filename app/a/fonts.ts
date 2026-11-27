import { Chakra_Petch, IBM_Plex_Mono, IBM_Plex_Sans_Thai } from "next/font/google";

export const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["600"], variable: "--font-display", display: "swap" });
export const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["latin"], weight: ["400"], variable: "--font-body", display: "swap",
});
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap", preload: false,
});
