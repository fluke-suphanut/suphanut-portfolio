import type { Metadata, Viewport } from "next";
import { isPublicBuild } from "@/lib/content";
import "./globals.css";

// The local build holds four prototypes and stays out of search engines. The public build (PORTFOLIO_PUBLIC=1)
// ships only the chosen design D at `/` and may be indexed; its title and description come from the D page.
export const metadata: Metadata = isPublicBuild
  ? {}
  : {
      title: "Portfolio prototypes",
      robots: { index: false, follow: false }, // prototypes only, not for search engines
    };

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Sets `html.motion-ok` before first paint so hidden-then-revealed content does not flash.
// Only when the user has not asked for reduced motion. If the page script never loads,
// the class is removed after 4 s so content can never stay hidden (design/00-shared.md section 7).
const MOTION_BOOT = `(function(){try{var d=document.documentElement;if(matchMedia('(prefers-reduced-motion: no-preference)').matches){d.classList.add('motion-ok');setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.remove('motion-ok')},4000)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
