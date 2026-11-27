// Hand-drawn marks for D that must recolour or animate. Paths are the hand-written SVGs listed in
// portfolio-site/assets/generated/README.md (svg/), inlined so they can use currentColor.
// All are decorative: aria-hidden, no text inside.
import type { CSSProperties } from "react";

type P = { className?: string; style?: CSSProperties };

export const Starburst = ({ className, style }: P) => (
  <svg className={className} style={style} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <polygon
      fill="currentColor"
      points="50.0,3.4 54.6,32.7 74.6,7.4 62.5,37.5 91.8,25.9 68.0,45.2 94.6,50.0 68.4,54.9 88.5,72.2 63.3,63.3 72.3,88.7 54.6,67.2 50.0,97.4 44.8,69.3 27.4,89.1 37.2,62.8 7.6,74.5 30.3,55.3 1.4,50.0 32.0,45.2 5.3,24.2 37.5,37.5 24.6,6.0 45.2,32.3"
    />
  </svg>
);

export const Underline = ({ className, style }: P) => (
  <svg className={className} style={style} viewBox="0 0 400 28" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="none">
    <path
      pathLength={1}
      d="M4 18c38-5 77-7 118-6 44 1 86 4 128 1 14-1 27-3 36-6 6-2 9-6 6-8-4-2-9 2-8 6 1 5 8 6 14 5"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

export const DotGrid = ({ className, style }: P) => (
  <svg className={className} style={style} viewBox="0 0 96 76" fill="currentColor" aria-hidden="true" focusable="false">
    {[8, 28, 48, 68].flatMap((y) => [8, 28, 48, 68, 88].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />))}
  </svg>
);

export const Arrow = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M4 12h15m-5-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Pin = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Rotating circular label (words from profile.title and the tagline). aria-hidden: it repeats the hero
// and would be unreadable while turning.
export function CircleText({ text, className }: { text: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false" data-loop="">
      <defs>
        <path id="d-circle-path" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
      </defs>
      <g className="circle-text-spin">
        <text>
          <textPath href="#d-circle-path" textLength="288">
            {text}
          </textPath>
        </text>
      </g>
      <Starburst className="circle-text-star" />
    </svg>
  );
}
