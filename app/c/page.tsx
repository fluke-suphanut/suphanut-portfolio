// C · Evidence (design/c-evidence.md): typographic, big numbers with evidence badges, bento grid.
// No animation library: CSS plus the shared MotionRuntime.
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { excerpt, featureGroups, getContent, type Metric, type Project } from "@/lib/content";
import { AUTOMATION_LEAD } from "@/lib/copy";
import MotionRuntime from "@/components/motion-runtime";
import {
  BadgeLegend, Bullets, MetricProse, ProjectBullets, ProjectSummary, ContactLinks, DemoFigure, EvidenceBadge, MetricTile, NavLinks,
  PrototypeFooter, SectionHeading, SkipLink,
} from "@/components/shared";
import { anuphan, plexMonoC, plexThaiC } from "../fonts-c";
import "./c.css";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getContent();
  return { title: `${profile.name} · ${profile.title} — C · Evidence`, description: profile.tagline };
}

// Lead numeral per tile: text cut from one bullet (design/c-evidence.md section 3). `excerpt` fails the build
// when the text is not in that bullet, so the big number always matches the DB and carries its grade.
const LEADS: Record<string, { bullet: number; text: string; count?: boolean }> = {
  "call-quality-scoring": { bullet: 5, text: "89,987", count: true },
  ecm: { bullet: 0, text: "67.7M", count: true },
  "document-extraction-pilot": { bullet: 2, text: "115 s → 63 s" },
  "inference-finetuning-b200": { bullet: 0, text: "30+", count: true },
  "code-security-triage": { bullet: 1, text: "all 12" },
  "agentic-dw-chatbot": { bullet: 1, text: "12 of 12" },
  "phone-number-extraction": { bullet: 1, text: "302", count: true },
  "chat-to-agent-dispatch": { bullet: 0, text: "1 of 3" },
  "work-assignment-optimizer": { bullet: 0, text: "90.7%", count: true },
};

function Lead({ project }: { project: Project }) {
  const cfg = LEADS[project.slug];
  if (!cfg) throw new Error(`no lead numeral configured for ${project.slug}`);
  const { text, grade } = excerpt(project, cfg.bullet, cfg.text);
  return (
    <p className="lead" aria-hidden="true">
      <span className="lead-num" data-count={cfg.count ? "reveal" : undefined} data-count-duration="900">
        {text}
      </span>
      <EvidenceBadge grade={grade} hidden />
    </p>
  );
}

// The flagship (ECM, the project with feature groups) is a full-width tile: intro and picture on top,
// its three features in columns underneath.
function Tile({ project, index, withImage, metrics }: { project: Project; index: number; withImage: boolean; metrics: Metric[] }) {
  const cfg = LEADS[project.slug];
  const flagship = featureGroups(project).length > 0;
  const strong = new Map([[cfg.bullet, cfg.text]]);
  return (
    <article
      className={`tile t${index + 1}${flagship ? " flagship" : ""}`}
      data-reveal=""
      data-disclosure={project.disclosure}
      style={{ "--delay": `${index * 40}ms` } as CSSProperties}
    >
      <div className="tile-text">
        <p className="label">{project.status}</p>
        <Lead project={project} />
        <h3>{project.title}</h3>
        {project.kind === "featured" && <ProjectSummary project={project} className="tile-summary" />}
        {!flagship && <ProjectBullets project={project} metrics={metrics} strong={strong} />}
        {project.kind === "featured" && (
          <p className="stack">
            <span className="label">Stack</span> {project.stack.join(" · ")}
          </p>
        )}
      </div>
      {withImage && project.demoPrefix && project.demoProduct && (
        <DemoFigure
          prefix={project.demoPrefix}
          product={project.demoProduct}
          kind="result"
          sizes="(min-width: 1024px) 40vw, 100vw"
        />
      )}
      {flagship && <ProjectBullets project={project} metrics={metrics} strong={strong} />}
    </article>
  );
}

export default async function EvidencePage() {
  const c = await getContent();
  const { profile } = c;
  return (
    <div className={`vc ${anuphan.variable} ${plexThaiC.variable} ${plexMonoC.variable}`}>
      <div className="progress" aria-hidden="true" data-scrub="page">
        <span />
      </div>
      <SkipLink />
      <header className="nav" data-nav-root="">
        <div className="wrap nav-inner">
          <a className="brand" href="#top">
            {profile.name}
          </a>
          <nav>
            <NavLinks hide={c.automations.length ? [] : ["automation"]} />
          </nav>
        </div>
      </header>

      <main>
        <section id="top" className="wrap hero" aria-labelledby="top-title">
          <div className="hero-meta">
            <p className="label">{profile.title}</p>
            <p className="label">{profile.location}</p>
          </div>
          <h1 id="top-title">{profile.name}</h1>
          <p className="tagline">{profile.tagline}</p>
          <div className="rule" aria-hidden="true" />
          <div className="hero-metrics">
            {c.heroMetrics.map((m, i) => (
              <MetricTile key={m.value} metric={m} count={{ trigger: "load", delay: 200 + i * 120, duration: 1000 }} />
            ))}
          </div>
          <div className="rule rule-2" aria-hidden="true" />
          <p className="summary">
            <MetricProse text={profile.summary} metrics={c.heroMetrics} />
          </p>
          <BadgeLegend />
        </section>

        <section id="projects" className="wrap section" aria-labelledby="projects-title">
          <SectionHeading id="projects" />
          <div className="bento">
            {c.featured.map((p, i) => (
              <Tile key={p.slug} project={p} index={i} withImage metrics={c.heroMetrics} />
            ))}
          </div>
        </section>

        <section id="smaller-projects" className="wrap section" aria-labelledby="smaller-projects-title">
          <SectionHeading id="smaller-projects" />
          <div className="cards">
            {c.cards.map((p, i) => (
              <Tile key={p.slug} project={p} index={i} withImage={false} metrics={c.heroMetrics} />
            ))}
          </div>
        </section>

        {c.automations.length > 0 && (
          <section id="automation" className="wrap section" aria-labelledby="automation-title">
            <SectionHeading id="automation" />
            <p className="auto-lead">{AUTOMATION_LEAD}</p>
            <div className="auto-cols">
              {c.automations.map((a, i) => (
                <article
                  key={a.slug}
                  className={`auto-col${a.slug === "choosing-not-to-use-n8n" ? " is-story" : ""}`}
                  data-disclosure={a.disclosure}
                  data-reveal=""
                  style={{ "--delay": `${i * 40}ms`, "--rise": "0px" } as CSSProperties}
                >
                  <h3>{a.title}</h3>
                  <Bullets items={a.bullets} />
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="experience" className="wrap section" aria-labelledby="experience-title">
          <SectionHeading id="experience" />
          <ol className="timeline">
            {c.timeline.map((t) => (
              <li key={t.role + t.org}>
                <p className="label period">{t.period}</p>
                <h3>{t.role}</h3>
                <p className="org">
                  {t.org}
                  {t.note && <span className="note">{t.note}</span>}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="skills" className="wrap section" aria-labelledby="skills-title">
          <SectionHeading id="skills" />
          <p className="skills">
            {c.skills.map((s, i) => (
              <span key={s}>
                {i > 0 && " · "}
                <span className="nowrap">{s}</span>
              </span>
            ))}
          </p>
        </section>

        <section id="contact" className="wrap section" aria-labelledby="contact-title">
          <SectionHeading id="contact" />
          <ContactLinks profile={profile} emailClass="email" />
        </section>
      </main>
      <div className="wrap">
        <PrototypeFooter name={profile.name} />
      </div>
      <MotionRuntime scrub />
    </div>
  );
}
