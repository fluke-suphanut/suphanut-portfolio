// D · Editorial Poster (design/d-editorial.md, PRD-addendum-d-editorial.md): cream paper, full-width colour
// bands, condensed display name, Fraunces headings, hand-drawn marks and the owner's photo.
// No testimonials and no quotes anywhere on this page (AC D3). No animation library: CSS + MotionRuntime.
// No grade badges anywhere on this page (owner request after the 2026-11-26 fact check): each sentence states its
// own limits, and one footnote under the numbers says how they were checked. Grades stay in the DB for A-C.
import type { Metadata } from "next";
import Link from "next/link";
import { preload } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import { featureGroups, getContent, isPublicBuild, type Metric, type Project, type StoryLine } from "@/lib/content";
import { AUTOMATION_LEAD, D_LABELS, sectionTitle, type SectionId } from "@/lib/copy";
import MotionRuntime from "@/components/motion-runtime";
import { Bullets, MetricProse, MetricTile, ProjectBullets, SkipLink } from "@/components/shared";
import { Arrow, CircleText, DotGrid, Pin, Starburst, Underline } from "./marks";
import { archivo, fraunces, plexMonoD } from "./fonts";
import "./d.css";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getContent();
  // Public site: name and title, with the tagline as the description (content-pack "Identity").
  if (isPublicBuild) return { title: `${profile.name} · ${profile.title}`, description: profile.tagline };
  return { title: `${profile.name} · ${profile.title} — D · Editorial`, description: profile.tagline };
}

const IMG = "/d";

// Cover and spot art per project, matched by slug (design/d-editorial.md section 8.1). A featured project
// without a cover fails the build, so a new or reordered project can never pick up another project's art.
const COVERS: Record<string, string> = {
  ecm: "cover-document-archive",
  "inference-finetuning-b200": "cover-inference-finetune",
  "call-quality-scoring": "cover-voice-scoring",
  "document-extraction-pilot": "cover-handwriting-reading",
  "code-security-triage": "cover-security-triage",
  "agentic-dw-chatbot": "cover-agentic-router",
};
const SPOTS: Record<string, { problem?: string; impact?: string }> = {
  ecm: { problem: "spot-archive-pile", impact: "spot-archive-found" },
  "inference-finetuning-b200": { problem: "spot-gpu-shared", impact: "spot-eval-balance" },
  "call-quality-scoring": { impact: "spot-night-alarm" },
};
// Skill group icons, in group order (design/d-editorial.md section 6.3).
const SKILL_ICONS = ["eye", "starburst", "dots", "arrow"] as const;

function Heading({ id, title, accent, className }: { id: string; title: string; accent?: string; className?: string }) {
  const at = accent ? title.lastIndexOf(accent) : -1;
  return (
    <div className={`heading${className ? ` ${className}` : ""}`}>
      <h2 id={`${id}-title`}>
        {at >= 0 ? (
          <>
            {title.slice(0, at)}
            <em className="accent">{accent}</em>
            {title.slice(at + accent!.length)}
          </>
        ) : (
          title
        )}
      </h2>
      <Underline className="h-underline" />
    </div>
  );
}

function Pill({ href, children, tone = "primary", nav }: { href: string; children: ReactNode; tone?: "primary" | "dark"; nav?: string }) {
  return (
    <a className={`pill pill-${tone}`} href={href} data-nav={nav}>
      <span>{children}</span>
      <Arrow className="pill-arrow" />
    </a>
  );
}

function Band({
  id,
  tone,
  className,
  children,
  label,
  scrub,
}: {
  id: string;
  tone: "paper" | "ink" | "mustard" | "red" | "white";
  className?: string;
  children: ReactNode;
  label?: boolean;
  scrub?: string;
}) {
  return (
    <section
      id={id}
      className={`band band-${tone}${className ? ` ${className}` : ""}`}
      aria-labelledby={label === false ? undefined : `${id}-title`}
      data-scrub={scrub}
    >
      {children}
    </section>
  );
}

// Spot illustration inside a Problem or Impact step (projects 1-3). Decorative: the step text carries the content.
function Spot({ name, sizes }: { name: string; sizes: string }) {
  return (
    <figure className="spot" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${IMG}/${name}-480.webp`}
        srcSet={`${IMG}/${name}-480.webp 480w, ${IMG}/${name}-960.webp 960w`}
        sizes={sizes}
        width={480}
        height={320}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

// Approach lines: 'text' rows before the list are its lead, after it a closing paragraph (a graded one is
// styled as a note); 'sub' rows nest under the item above.
function Approach({ lines }: { lines: StoryLine[] }) {
  const blocks: ReactNode[] = [];
  let items: { line: StoryLine; subs: StoryLine[] }[] = [];
  const flush = () => {
    if (!items.length) return;
    blocks.push(
      <ul key={`ul${blocks.length}`} className="approach-list">
        {items.map(({ line, subs }, i) => (
          <li key={i} data-disclosure={line.disclosure}>
            <StoryText line={line} />
            {subs.length > 0 && (
              <ul className="approach-sub">
                {subs.map((sub, j) => (
                  <li key={j} data-disclosure={sub.disclosure}>
                    <StoryText line={sub} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>,
    );
    items = [];
  };
  for (const l of lines) {
    if (l.role === "item") items.push({ line: l, subs: [] });
    else if (l.role === "sub") items[items.length - 1].subs.push(l);
    else {
      const after = items.length > 0 || blocks.length > 0;
      flush();
      blocks.push(
        <p key={`p${blocks.length}`} className={after && l.grade ? "approach-note" : "approach-lead"} data-disclosure={l.disclosure}>
          <StoryText line={l} />
        </p>,
      );
    }
  }
  flush();
  return <>{blocks}</>;
}

function StoryText({ line }: { line: StoryLine }) {
  return <>{line.body}</>;
}

function Step({ step, children, mark }: { step: "problem" | "approach" | "result" | "impact"; children: ReactNode; mark?: ReactNode }) {
  return (
    <section className={`step step-${step}`} data-step={step}>
      <span className="step-mark" aria-hidden="true">
        {mark}
      </span>
      <h4 className="step-label">{STEP_LABELS[step]}</h4>
      {children}
    </section>
  );
}

// One featured project told in four steps (design/d-editorial.md section 6.4). The flagship (ECM, the
// project with feature groups) sits in a white frame and lays Approach and Result out in three columns.
function ProjectStory({ project, index, metrics }: { project: Project; index: number; metrics: Metric[] }) {
  const cover = COVERS[project.slug];
  if (!cover) throw new Error(`no D cover for ${project.slug}`);
  const story = project.story;
  if (!story) throw new Error(`${project.slug}: featured project without a story`);
  const flagship = featureGroups(project).length > 0;
  const spots = SPOTS[project.slug] ?? {};
  const spotSizes = flagship ? "(min-width: 1024px) 370px, calc(100vw - 68px)" : "(min-width: 1024px) 240px, calc(100vw - 68px)";
  const titleId = `project-${project.slug}-title`;
  return (
    <article
      id={`project-${project.slug}`}
      aria-labelledby={titleId}
      className={`story${flagship ? " flagship" : ""}${!flagship && index % 2 === 0 ? " cover-right" : ""}`}
      data-disclosure={project.disclosure}
    >
      <header className="story-header">
        <p className="status">
          {flagship && <span className="flag-pill">{D_LABELS.flagship}</span>}
          {project.status}
        </p>
        <h3 id={titleId}>{project.title}</h3>
      </header>
      <figure className="story-cover" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${IMG}/${cover}-720.webp`}
          srcSet={`${IMG}/${cover}-720.webp 720w, ${IMG}/${cover}-1440.webp 1440w`}
          sizes="(min-width: 1024px) 470px, calc(100vw - 40px)"
          width={720}
          height={480}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </figure>
      <div className="story-rail">
        <Step step="problem">
          <div className={`step-body${spots.problem ? " has-spot" : ""}`}>
            {spots.problem && <Spot name={spots.problem} sizes={spotSizes} />}
            <p className="story-lead" data-disclosure={story.problem.disclosure}>
              <StoryText line={story.problem} />
            </p>
          </div>
        </Step>
        <Step step="approach">
          <div className="step-body approach">
            <Approach lines={story.approach} />
          </div>
        </Step>
        <Step step="result">
          <div className="step-body result">
            <ProjectBullets project={project} metrics={metrics} level={5} badges={false} />
          </div>
        </Step>
        <Step step="impact" mark={<Starburst />}>
          <div className={`step-body${spots.impact ? " has-spot spot-after" : ""}`}>
            {spots.impact && <Spot name={spots.impact} sizes={spotSizes} />}
            <p className="impact-box" data-reveal="" data-disclosure={story.impact.disclosure}>
              <StoryText line={story.impact} />
            </p>
          </div>
        </Step>
      </div>
      <p className="stack-line">
        <span className="label">Stack</span> {project.stack.join(" · ")}
      </p>
    </article>
  );
}

const STEP_LABELS = { problem: "Problem", approach: "Approach", result: "Result", impact: "Impact" } as const;

// One header style per n8n story, in order; the last (the road not taken) is the dark one.
const STORY_HEADS = ["story-head-mustard", "story-head-red", "story-head-paper", "story-head-ink"] as const;

const PHOTO = {
  src: `${IMG}/profile-cutout-640.webp`,
  srcSet: `${IMG}/profile-cutout-640.webp 640w, ${IMG}/profile-cutout-1280.webp 1280w`,
  sizes: "(min-width: 1024px) 520px, 90vw",
};

export default async function EditorialPage() {
  // The hero photo is the LCP element (design/d-editorial.md section 11): preload it from the <head>.
  preload(PHOTO.src, { as: "image", imageSrcSet: PHOTO.srcSet, imageSizes: PHOTO.sizes, fetchPriority: "high" });
  const c = await getContent();
  const { profile } = c;
  const [first, ...rest] = profile.name.split(" ");
  const showAutomation = c.automations.length > 0;
  const navItems: { id: SectionId | "about"; title: string }[] = [
    { id: "about", title: D_LABELS.about },
    { id: "skills", title: sectionTitle("skills") },
    { id: "projects", title: sectionTitle("projects") },
    ...(showAutomation ? [{ id: "automation" as const, title: sectionTitle("automation") }] : []),
    { id: "experience", title: sectionTitle("experience") },
  ];
  const year = new Date().getFullYear();
  const github = profile.githubUrl.replace(/^https?:\/\//, "");

  return (
    <div className={`vd ${archivo.variable} ${fraunces.variable} ${plexMonoD.variable}`}>
      <SkipLink />
      <header className="nav" data-nav-root="">
        <div className="wrap nav-inner">
          <a className="brand" href="#top">
            <Starburst className="brand-star" />
            <span>{profile.name}</span>
          </a>
          <nav aria-label="Sections">
            <ul className="nav-links">
              {navItems.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} data-nav={n.id}>
                    {n.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <Pill href="#contact" nav="contact">
            {sectionTitle("contact")}
          </Pill>
        </div>
      </header>

      <main>
        {/* 0 · Hero */}
        <Band id="top" tone="paper" className="hero" scrub="self">
          <div className="wrap hero-grid">
            <div className="hero-text">
              <p className="eyebrow">{profile.title}</p>
              <h1 id="top-title" className="display-name">
                <span>{first}</span> <span>{rest.join(" ")}</span>
              </h1>
              <Underline className="name-underline" />
              <p className="tagline">{profile.tagline}</p>
              <Pill href="#projects">{sectionTitle("projects")}</Pill>
            </div>
            <CircleText text={D_LABELS.circle} className="circle-text" />
            <div className="portrait">
              {/* eslint-disable @next/next/no-img-element */}
              <img className="brush-block" src={`${IMG}/brush-block-yellow-900.webp`} width={900} height={802} alt="" aria-hidden="true" decoding="async" />
              <img
                className="photo"
                src={PHOTO.src}
                srcSet={PHOTO.srcSet}
                sizes={PHOTO.sizes}
                width={640}
                height={619}
                alt={profile.name}
                fetchPriority="high"
              />
              <img className="swash" src={`${IMG}/brush-swash-black-900.webp`} width={900} height={533} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              <img className="eye pop" src={`${IMG}/eye-mark-400.webp`} width={400} height={335} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              {/* eslint-enable @next/next/no-img-element */}
              <DotGrid className="dots" />
              <Starburst className="hero-star pop" />
            </div>
          </div>
        </Band>

        {/* 1 · About */}
        <Band id="about" tone="paper" className="about">
          <div className="about-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${IMG}/profile-illustration-640.webp`}
              srcSet={`${IMG}/profile-illustration-640.webp 640w, ${IMG}/profile-illustration-1280.webp 1280w`}
              sizes="(min-width: 1024px) 42vw, 100vw"
              width={640}
              height={427}
              alt="Illustration of Suphanut Meeyindee sketching a diagram at a desk"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="about-text" data-reveal="">
            <h2 id="about-title" className="eyebrow">
              {D_LABELS.about}
            </h2>
            <p className="lead summary">
              <MetricProse
                text={profile.summary}
                metrics={[]}
                accent={{ word: "production", mark: <Underline className="accent-underline" /> }}
              />
            </p>
            <p className="location-badge">
              <Pin className="pin" />
              <span>{D_LABELS.basedIn}</span>
            </p>
          </div>
        </Band>

        {/* 2 · By the numbers (replaces the reference's testimonials: no quotes, no people) */}
        <Band id="numbers" tone="mustard" className="numbers" scrub="">
          <div className="wrap side-grid">
            <div className="side">
              <h2 id="numbers-title">{D_LABELS.numbers}</h2>
              <Underline className="numbers-underline" />
            </div>
            <div>
              <div className="metric-row">
                {c.heroMetrics.map((m, i) => (
                  <MetricTile key={m.value} metric={m} badge={false} count={{ trigger: "reveal", delay: i * 120, duration: 1000 }} />
                ))}
              </div>
              <p className="numbers-note">{D_LABELS.numbersNote}</p>
            </div>
          </div>
          <Starburst className="numbers-star" />
        </Band>

        {/* 3 · Skills: the four groups of the content pack */}
        <Band id="skills" tone="ink" className="skills">
          <div className="wrap skills-grid">
            <div className="skills-head">
              <h2 id="skills-title">{sectionTitle("skills")}</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="squiggle" src={`${IMG}/squiggle-wave-yellow-600.webp`} width={600} height={56} alt="" aria-hidden="true" loading="lazy" />
            </div>
            {c.skillGroups.map((g, i) => {
              const icon = SKILL_ICONS[i % SKILL_ICONS.length];
              return (
                <div key={g.title} className="skill-area" data-reveal="" style={{ "--delay": `${i * 60}ms` } as CSSProperties}>
                  <span className={`area-icon icon-${icon}`} aria-hidden="true">
                    {icon === "starburst" && <Starburst />}
                    {icon === "dots" && <DotGrid />}
                    {icon === "arrow" && <Arrow />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {icon === "eye" && <img src={`${IMG}/eye-mark-400.webp`} width={400} height={335} alt="" loading="lazy" />}
                  </span>
                  <h3>{g.title}</h3>
                  <ul className="chips">
                    {g.items.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Band>

        {/* 4 · Projects: six stories, Problem -> Approach -> Result -> Impact */}
        <Band id="projects" tone="paper" className="projects">
          <div className="wrap">
            <Heading id="projects" title={sectionTitle("projects")} />
            <div className="stories">
              {c.featured.map((p, i) => (
                <ProjectStory key={p.slug} project={p} index={i} metrics={c.heroMetrics} />
              ))}
            </div>
          </div>
        </Band>

        {/* 5 · Automation with n8n (the reference's "insights" slot) */}
        {showAutomation && (
          <Band id="automation" tone="ink" className="automation">
            <div className="wrap">
              <Heading id="automation" title={sectionTitle("automation")} accent="n8n" />
              <p className="auto-lead">{AUTOMATION_LEAD}</p>
              <div className="story-grid">
                {c.automations.map((a, i) => (
                  <article
                    key={a.slug}
                    className={`story-card${a.slug === "choosing-not-to-use-n8n" ? " is-alt" : ""}`}
                    data-reveal=""
                    data-disclosure={a.disclosure}
                    style={{ "--delay": `${i * 60}ms` } as CSSProperties}
                  >
                    <div className={`story-head ${STORY_HEADS[i % 4]}`} aria-hidden="true">
                      {/* eslint-disable @next/next/no-img-element */}
                      {i % 4 === 0 && <img src={`${IMG}/eye-mark-400.webp`} width={400} height={335} alt="" loading="lazy" />}
                      {i % 4 === 1 && <img src={`${IMG}/squiggle-wave-yellow-600.webp`} width={600} height={56} alt="" loading="lazy" />}
                      {i % 4 === 2 && <img src={`${IMG}/brush-circle-black-600.webp`} width={600} height={578} alt="" loading="lazy" />}
                      {/* eslint-enable @next/next/no-img-element */}
                      {i % 4 === 3 && <Starburst />}
                    </div>
                    <h3>{a.title}</h3>
                    <Bullets items={a.bullets} badges={false} />
                  </article>
                ))}
              </div>
            </div>
          </Band>
        )}

        {/* 6 · Smaller projects */}
        <Band id="smaller-projects" tone="paper" className="smaller">
          <div className="wrap">
            <Heading id="smaller-projects" title={sectionTitle("smaller-projects")} className="heading-small" />
            <div className="small-grid">
              {c.cards.map((p, i) => (
                <article key={p.slug} className="small-card" data-reveal="" data-disclosure={p.disclosure} style={{ "--delay": `${i * 60}ms` } as CSSProperties}>
                  <p className="status">{p.status}</p>
                  <h3>{p.title}</h3>
                  <Bullets items={p.bullets} badges={false} />
                </article>
              ))}
            </div>
          </div>
        </Band>

        {/* 7 · Experience timeline */}
        <Band id="experience" tone="white" className="experience">
          <div className="wrap exp-grid">
            <div>
              <Heading id="experience" title={sectionTitle("experience")} />
              <div className="timeline" data-scrub="">
                <span className="timeline-line" aria-hidden="true">
                  <span />
                </span>
                <ol>
                  {c.timeline.map((t, i) => (
                    <li key={t.role + t.org} style={{ "--at": i / Math.max(1, c.timeline.length - 1) } as CSSProperties}>
                      <span className="t-dot" aria-hidden="true" />
                      <p className="eyebrow period">{t.period}</p>
                      <h3>{t.role}</h3>
                      <p className="org">{t.org}</p>
                      {t.note && <p className="note">{t.note}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <figure className="poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${IMG}/profile-poster-640.webp`}
                srcSet={`${IMG}/profile-poster-640.webp 640w, ${IMG}/profile-poster-1122.webp 1122w`}
                sizes="(min-width: 1024px) 320px, 70vw"
                width={640}
                height={800}
                alt="Illustrated poster portrait of Suphanut Meeyindee"
                loading="lazy"
                decoding="async"
              />
              <DotGrid className="poster-dots" />
            </figure>
          </div>
        </Band>

        {/* 8 · Contact */}
        <Band id="contact" tone="mustard" className="contact">
          <div className="wrap" data-reveal="">
            <h2 id="contact-title">{sectionTitle("contact")}</h2>
            <dl className="contact-list">
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a className="pill pill-dark pill-email" href={`mailto:${profile.email}`}>
                    <span>{profile.email}</span>
                    <Arrow className="pill-arrow" />
                  </a>
                </dd>
              </div>
              <div>
                <dt className="label">GitHub</dt>
                <dd>
                  <a className="text-link" href={profile.githubUrl} rel="me noopener">
                    {github}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="label">Location</dt>
                <dd>{profile.location}</dd>
              </div>
            </dl>
          </div>
          {/* eslint-disable @next/next/no-img-element */}
          <img className="contact-star" src={`${IMG}/starburst-red-400.webp`} width={400} height={397} alt="" aria-hidden="true" loading="lazy" />
          <img className="contact-swash" src={`${IMG}/brush-swash-black-900.webp`} width={900} height={533} alt="" aria-hidden="true" loading="lazy" />
          {/* eslint-enable @next/next/no-img-element */}
        </Band>
      </main>

      <footer className="footer">
        <div className="wrap footer-grid">
          <p className="footer-name">
            <span>{profile.name}</span>
            <Starburst className="footer-star" />
          </p>
          <ul className="footer-nav">
            {navItems.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`}>{n.title}</a>
              </li>
            ))}
          </ul>
          <div className="footer-contact">
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
            <p>{profile.location}</p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {year} {profile.name}
          </span>
          {/* back to the prototype chooser; the public site has no chooser (D is `/`) */}
          {!isPublicBuild && <Link href="/">← /</Link>}
        </div>
      </footer>
      <MotionRuntime scrub />
    </div>
  );
}
