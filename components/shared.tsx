// Building blocks used by all three prototypes (design/00-shared.md sections 4, 5, 8, 11).
// Server components only: no state, so they add no client JavaScript.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { featureGroups, type Bullet, type Grade, type Metric, type Profile, type Project } from "@/lib/content";
import { CAPTION, GRADE_TEXT, SECTIONS, VARIANTS, type SectionId, sectionTitle } from "@/lib/copy";

export function EvidenceBadge({ grade, hidden }: { grade: Grade; hidden?: boolean }) {
  const t = GRADE_TEXT[grade];
  return (
    <span className="badge" data-grade={grade} aria-hidden={hidden || undefined}>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
        {grade === "counted" ? (
          <>
            <rect x="0.75" y="0.75" width="10.5" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3.2 6.2 5.1 8l3.7-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d="M6 1.2 11 10.4H1L6 1.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M6 4.6v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span aria-hidden="true">{t.short}</span>
      {!hidden && <span className="sr-only">{t.long}</span>}
    </span>
  );
}

export function BadgeLegend() {
  return (
    <p className="legend">
      <span className="nowrap">
        <EvidenceBadge grade="counted" hidden /> {GRADE_TEXT.counted.long}
      </span>{" "}
      <span aria-hidden="true">·</span>{" "}
      <span className="nowrap">
        <EvidenceBadge grade="estimated" hidden /> {GRADE_TEXT.estimated.long}
      </span>
    </p>
  );
}

// Keeps the badge glued to the last word so it never wraps onto a line by itself.
// A body with line breaks is a lead line plus list items; the one badge follows the last item.
// `badges={false}`: no grade badge (D shows none since the 2026-11-26 fact check; the grade stays in the DB).
export function BulletText({ bullet, strong, badges = true }: { bullet: Bullet; strong?: string; badges?: boolean }) {
  const grade = badges ? bullet.grade : null;
  const [lead, ...items] = bullet.body.split("\n");
  if (items.length) {
    return (
      <>
        {emphasize(lead, strong)}
        <ul className="sublist">
          {items.map((it, i) => (
            <li key={i}>{i === items.length - 1 ? <Glued text={it} grade={grade} strong={strong} /> : emphasize(it, strong)}</li>
          ))}
        </ul>
      </>
    );
  }
  return <Glued text={bullet.body} grade={grade} strong={strong} />;
}

// grade null: plain text, no badge
export function Glued({ text, grade, strong }: { text: string; grade: Grade | null; strong?: string }) {
  if (!grade) return <>{emphasize(text, strong)}</>;
  const cut = text.lastIndexOf(" ");
  return (
    <>
      {emphasize(text.slice(0, cut + 1), strong)}
      <span className="nowrap">
        {emphasize(text.slice(cut + 1), strong)}&nbsp;
        <EvidenceBadge grade={grade} />
      </span>
    </>
  );
}

// A project's summary line; when it states a number it carries the summary's grade badge (AC2).
// Featured projects have no summary row since the story round (2026-11-25): A-C show the story's Problem
// paragraph instead, with its grade.
export function ProjectSummary({ project, className }: { project: Project; className?: string }) {
  const text = project.summary ?? project.story?.problem.body;
  const grade = project.summary ? project.summaryGrade : project.story?.problem.grade;
  if (!text) return null;
  return <p className={className}>{grade ? <Glued text={text} grade={grade} /> : text}</p>;
}

// The ECM flagship groups its bullets into features, each under its own heading (h4 under the project h3).
// Numbers in a feature heading get the matching hero-metric badge through MetricProse.
// Projects without features render as a plain bullet list.
export function ProjectBullets({
  project,
  metrics,
  strong,
  className = "features",
  level = 4,
  badges = true,
}: {
  project: Project;
  metrics: Metric[];
  strong?: Map<number, string>;
  className?: string;
  /** heading level of the feature titles (D nests them under the h4 step labels) */
  level?: 4 | 5;
  /** false: no grade badges on bullets or on numbers in feature titles */
  badges?: boolean;
}) {
  const H = level === 5 ? "h5" : "h4";
  const groups = featureGroups(project);
  if (groups.length === 0) return <Bullets items={project.bullets} strong={strong} badges={badges} />;
  return (
    <div className={className}>
      {groups.map((g) => (
        <div key={g.title} className="feature">
          <H className="feature-title">
            <MetricProse text={g.title} metrics={badges ? metrics : []} />
          </H>
          <Bullets
            items={g.bullets}
            strong={strong && new Map([...strong].filter(([i]) => i >= g.offset).map(([i, t]) => [i - g.offset, t]))}
            badges={badges}
          />
        </div>
      ))}
    </div>
  );
}

function emphasize(text: string, strong?: string): ReactNode {
  if (!strong) return text;
  const i = text.indexOf(strong);
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <strong>{strong}</strong>
      {text.slice(i + strong.length)}
    </>
  );
}

// Prose that repeats a metric value (the hero summary repeats 60M+ and 90K+) gets that metric's badge
// right after the number, so every number on the page carries its grade (AC2). Grades come from the
// metric rows, so the paragraph and the tiles can never disagree.
export function MetricProse({
  text,
  metrics,
  accent,
}: {
  text: string;
  metrics: Metric[];
  /** first occurrence of this word is wrapped in <em class="accent"> (D's hand-drawn emphasis) */
  accent?: { word: string; mark?: ReactNode };
}) {
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byValue = new Map(metrics.map((m) => [m.value, m]));
  // whole tokens only: "35" must not match inside "B200" or "350". No metrics (D, no badges): one plain part.
  const re = new RegExp(`(?<=^|[\\s(])(${[...byValue.keys()].map(esc).join("|")})(?=[\\s.,;:)]|$)`, "g");
  const parts = byValue.size ? text.split(re) : [text];
  // the accent goes on the first plain-text part (even index) that contains the word
  const accentPart = accent ? parts.findIndex((p, i) => i % 2 === 0 && p.includes(accent.word)) : -1;
  return (
    <>
      {parts.map((part, i) => {
        const m = i % 2 === 1 ? byValue.get(part) : undefined;
        if (!m) {
          if (!accent || i !== accentPart) return part;
          const at = part.indexOf(accent.word);
          return (
            <span key={i}>
              {part.slice(0, at)}
              <em className="accent">
                {accent.word}
                {accent.mark}
              </em>
              {part.slice(at + accent.word.length)}
            </span>
          );
        }
        return (
          <span key={i} className="nowrap">
            {part}&nbsp;
            <EvidenceBadge grade={m.grade} />
          </span>
        );
      })}
    </>
  );
}

export function Bullets({
  items,
  className,
  strong,
  badges,
}: {
  items: Bullet[];
  className?: string;
  strong?: Map<number, string>;
  badges?: boolean;
}) {
  return (
    <ul className={className ?? "bullets"}>
      {items.map((b, i) => (
        <li key={i} className="r-item" data-disclosure={b.disclosure} style={{ "--i": i } as CSSProperties}>
          <BulletText bullet={b} strong={strong?.get(i)} badges={badges} />
        </li>
      ))}
    </ul>
  );
}

// The page HTML holds the final value. The runtime counts up from zero only when motion is allowed.
// The moving copy is aria-hidden; screen readers read the sr-only final value.
export function CountValue({
  value,
  trigger,
  delay = 0,
  duration = 1000,
  className,
}: {
  value: string;
  trigger?: "load" | "reveal";
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <span className={className}>
      <span
        aria-hidden="true"
        data-count={trigger}
        data-count-delay={trigger ? delay : undefined}
        data-count-duration={trigger ? duration : undefined}
      >
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

export function MetricTile({
  metric,
  count,
  className = "metric",
  style,
  badge = true,
}: {
  metric: Metric;
  badge?: boolean;
  count?: { trigger: "load" | "reveal"; delay?: number; duration?: number };
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} data-disclosure={metric.disclosure} data-count-host="" style={style}>
      <CountValue value={metric.value} className="metric-value" {...count} />
      <span className="metric-label">{metric.label}</span>
      {badge && <EvidenceBadge grade={metric.grade} />}
    </div>
  );
}

type DemoKind = "screen" | "result" | "flow";
const DEMO_SIZE: Record<DemoKind, [number, number]> = { screen: [1440, 900], result: [1440, 900], flow: [1440, 810] };

export function DemoFigure({
  prefix,
  product,
  kind,
  sizes,
  className,
}: {
  prefix: string;
  product: string;
  kind: DemoKind;
  sizes: string;
  className?: string;
}) {
  const [w, h] = DEMO_SIZE[kind];
  const base = `/demo/${prefix}-${kind}`;
  return (
    <figure className={className ? `demo ${className}` : "demo"}>
      <div className="demo-frame" style={{ aspectRatio: `${w} / ${h}` }}>
        {/* Static export: next/image optimizer is off (ADR-0001), so plain img with a WebP srcset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${base}-720.webp`}
          srcSet={`${base}-720.webp 720w, ${base}-1440.webp 1440w`}
          sizes={sizes}
          width={w}
          height={h}
          alt={`${product} demo ${kind}`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <figcaption>
        <span className="demo-product">{product}</span> <span className="demo-caption">{CAPTION}</span>
      </figcaption>
    </figure>
  );
}

export function Chips({ items, className = "chips" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

export function SkipLink() {
  return (
    <a className="skip-link" href="#projects">
      Skip to content
    </a>
  );
}

export function SectionHeading({ id, className }: { id: SectionId; className?: string }) {
  return (
    <h2 id={`${id}-title`} className={className}>
      {sectionTitle(id)}
    </h2>
  );
}

// `hide`: sections left out of this build (a public build drops n8n rows still waiting for the owner's OK).
export function NavLinks({ hide = [] }: { hide?: SectionId[] }) {
  return (
    <ul className="nav-links">
      {SECTIONS.filter((s) => !hide.includes(s.id)).map((s) => (
        <li key={s.id} className={s.id === "contact" ? "nav-contact" : undefined}>
          <a href={`#${s.id}`} data-nav={s.id}>
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ContactLinks({ profile, emailClass }: { profile: Profile; emailClass?: string }) {
  const gh = profile.githubUrl.replace(/^https?:\/\//, "");
  return (
    <dl className="contact-list">
      <div>
        <dt>Email</dt>
        <dd>
          <a className={emailClass} href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </dd>
      </div>
      <div>
        <dt>GitHub</dt>
        <dd>
          <a href={profile.githubUrl} rel="me noopener">
            {gh}
          </a>
        </dd>
      </div>
      <div>
        <dt>Location</dt>
        <dd>{profile.location}</dd>
      </div>
    </dl>
  );
}

export function PrototypeFooter({ name }: { name: string }) {
  return (
    <footer className="site-footer">
      <span>{name}</span>
      <Link href="/">← /</Link>
    </footer>
  );
}

export { VARIANTS };
