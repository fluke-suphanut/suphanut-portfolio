// B · Pipeline (design/b-pipeline.md): scroll story along input → OCR/ASR → LLM → human review → write gate,
// with a sticky rail that lights the stages of the project in the middle of the screen.
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { featureGroups, getContent, type Metric, type Project } from "@/lib/content";
import { AUTOMATION_LEAD } from "@/lib/copy";
import MotionRuntime from "@/components/motion-runtime";
import {
  BadgeLegend, Bullets, MetricProse, ProjectBullets, ProjectSummary, Chips, ContactLinks, DemoFigure, MetricTile, NavLinks, PrototypeFooter,
  SectionHeading, SkipLink,
} from "@/components/shared";
import PipelineController from "./pipeline-controller";
import { BASE_STAGE, STAGES, stageLabel, stagesOf, type StageKey } from "./stages";
import { anuphanB, bai, plexMonoB } from "./fonts";
import "./b.css";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getContent();
  return { title: `${profile.name} · ${profile.title} — B · Pipeline`, description: profile.tagline };
}

function StageChips({ stages }: { stages: StageKey[] }) {
  if (stages.length === 0) return null;
  return (
    <ul className="stage-chips">
      {stages.map((k) => (
        <li key={k}>{stageLabel(k)}</li>
      ))}
    </ul>
  );
}

// ---- hero pipeline (inline SVG, decorative: the same facts are in StageChips and the metric tiles)
const NODE_W = 196;
const NODE_GAP = 55;
const nodeX = (i: number) => i * (NODE_W + NODE_GAP);
const nodeCx = (k: StageKey) => nodeX(STAGES.findIndex((s) => s.key === k)) + NODE_W / 2;
// Connector from each hero metric tile (4 equal columns) to its stage: 60M+ → OCR, 90K+ → LLM, 0.033 → OCR, 35 → base.
const METRIC_TARGET: StageKey[] = ["ocr-asr", "llm", "ocr-asr", "base"];

function HeroPipelineWide() {
  const segs = STAGES.slice(0, -1).map((_, i) => `M${nodeX(i) + NODE_W} 36 H${nodeX(i + 1) - 4}`).join(" ");
  return (
    <svg className="hero-pipe wide" viewBox="0 0 1200 250" aria-hidden="true" role="presentation" data-loop="">
      <g className="connectors">
        {METRIC_TARGET.map((k, i) => {
          const x0 = 150 + i * 300;
          const [x1, y1] = k === "base" ? [x0, 128] : [nodeCx(k), 64];
          return <path key={i} d={`M${x0} 250 C${x0} 190 ${x1} 170 ${x1} ${y1}`} />;
        })}
      </g>
      <path className="pipe-line" d={segs} pathLength={1} />
      {STAGES.slice(1).map((s, i) => (
        <path key={s.key} className="pipe-head" d={`M${nodeX(i + 1) - 10} 30 L${nodeX(i + 1) - 2} 36 L${nodeX(i + 1) - 10} 42`} />
      ))}
      {STAGES.map((s, i) => (
        <g key={s.key} className="pipe-node" style={{ "--i": i } as CSSProperties}>
          <rect x={nodeX(i) + 0.75} y="8.75" width={NODE_W - 1.5} height="54.5" rx="8" />
          <text x={nodeX(i) + NODE_W / 2} y="40" textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
      <g className="pipe-node pipe-base" style={{ "--i": 5 } as CSSProperties}>
        <rect x="0.75" y="96.75" width="1198.5" height="30.5" rx="8" />
        <text x="600" y="117" textAnchor="middle">
          {BASE_STAGE.label}
        </text>
      </g>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="token" cx="0" cy="36" r="4" style={{ "--t": i } as CSSProperties} />
      ))}
    </svg>
  );
}

function HeroPipelineTall() {
  const y = (i: number) => i * 48;
  const segs = STAGES.slice(0, -1).map((_, i) => `M167 ${y(i) + 36} V${y(i + 1) - 2}`).join(" ");
  return (
    <svg className="hero-pipe tall" viewBox="0 0 335 276" aria-hidden="true" role="presentation" data-loop="">
      <path className="pipe-line" d={segs} pathLength={1} />
      {STAGES.map((s, i) => (
        <g key={s.key} className="pipe-node" style={{ "--i": i } as CSSProperties}>
          <rect x="0.75" y={y(i) + 0.75} width="333.5" height="34.5" rx="8" />
          <text x="167" y={y(i) + 22} textAnchor="middle">
            {s.label}
          </text>
        </g>
      ))}
      <g className="pipe-node pipe-base" style={{ "--i": 5 } as CSSProperties}>
        <rect x="0.75" y="246.75" width="333.5" height="26.5" rx="8" />
        <text x="167" y="264" textAnchor="middle">
          {BASE_STAGE.label}
        </text>
      </g>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="token" cx="167" cy="0" r="4" style={{ "--t": i } as CSSProperties} />
      ))}
    </svg>
  );
}

function Rail() {
  return (
    <div className="rail" aria-hidden="true">
      <div className="rail-progress" data-gsap-scrub="" data-trigger="#projects" data-start="top 40%" data-end="bottom 60%">
        <span />
      </div>
      <ol className="rail-nodes">
        {STAGES.map((s) => (
          <li key={s.key} data-rail-stage={s.key}>
            <span className="rail-dot" />
            <span className="rail-label">{s.label}</span>
          </li>
        ))}
      </ol>
      <div className="rail-base" data-rail-stage={BASE_STAGE.key}>
        {BASE_STAGE.label}
      </div>
    </div>
  );
}

function CompactRail() {
  return (
    <div className="rail-compact" aria-hidden="true">
      {STAGES.map((s) => (
        <span key={s.key} className="dot" data-rail-stage={s.key} />
      ))}
      <span className="base" data-rail-stage={BASE_STAGE.key} />
    </div>
  );
}

function Connector() {
  return (
    <svg className="connector" viewBox="0 0 24 72" aria-hidden="true" role="presentation" data-gsap-scrub="" data-start="top 85%" data-end="bottom 55%">
      <path className="connector-line" d="M12 0 V62" pathLength={1} />
      <path className="connector-head" d="M6 58 L12 66 L18 58" />
    </svg>
  );
}

function ProjectBlock({ project, metrics }: { project: Project; metrics: Metric[] }) {
  const stages = stagesOf(project.slug);
  const flagship = featureGroups(project).length > 0;
  return (
    <article className={`project${flagship ? " flagship" : ""}`} data-stages={stages.join(" ")} data-reveal="" data-disclosure={project.disclosure}>
      <div className="r-item" style={{ "--i": 0 } as CSSProperties}>
        <StageChips stages={stages} />
      </div>
      <p className="status r-item" style={{ "--i": 1 } as CSSProperties}>
        {project.status}
      </p>
      <h3 className="r-item" style={{ "--i": 2 } as CSSProperties}>
        {project.title}
      </h3>
      <ProjectSummary project={project} className="summary-line r-item" />
      {project.demoPrefix && project.demoProduct && (
        <div className="r-item" style={{ "--i": 4 } as CSSProperties}>
          <DemoFigure prefix={project.demoPrefix} product={project.demoProduct} kind="flow" sizes="(min-width: 1024px) 760px, 100vw" />
        </div>
      )}
      <ProjectBullets project={project} metrics={metrics} />
      <div className="stack-row">
        <span className="stack-label">Stack</span>
        <Chips items={project.stack} />
      </div>
    </article>
  );
}

export default async function PipelinePage() {
  const c = await getContent();
  const { profile } = c;
  return (
    <div className={`vb ${bai.variable} ${anuphanB.variable} ${plexMonoB.variable}`}>
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
          <div className="hero-head">
            <div>
              <p className="eyebrow">{profile.title}</p>
              <h1 id="top-title">{profile.name}</h1>
            </div>
            <p className="tagline">{profile.tagline}</p>
          </div>
          <div className="hero-sub">
            <p className="summary">
            <MetricProse text={profile.summary} metrics={c.heroMetrics} />
          </p>
            <p className="location">{profile.location}</p>
          </div>
          <div className="hero-diagram">
            <HeroPipelineWide />
            <HeroPipelineTall />
            <div className="hero-metrics">
              {c.heroMetrics.map((m, i) => (
                <MetricTile key={m.value} metric={m} style={{ "--i": i } as CSSProperties} />
              ))}
            </div>
          </div>
          <BadgeLegend />
        </section>

        <section id="projects" className="wrap section projects" aria-labelledby="projects-title">
          <SectionHeading id="projects" />
          <CompactRail />
          <div className="projects-grid">
            <Rail />
            <div className="project-list">
              {c.featured.map((p, i) => (
                <div key={p.slug}>
                  {i > 0 && <Connector />}
                  <ProjectBlock project={p} metrics={c.heroMetrics} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="smaller-projects" className="wrap section" aria-labelledby="smaller-projects-title">
          <SectionHeading id="smaller-projects" />
          <svg className="branches" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" role="presentation" data-reveal="" style={{ "--rise": "0px" } as CSSProperties}>
            <path d="M0 2 H1200 M200 2 V40 M600 2 V40 M1000 2 V40" pathLength={1} />
          </svg>
          <div className="cards">
            {c.cards.map((p, i) => (
              <article key={p.slug} className="card" data-reveal="" data-disclosure={p.disclosure} style={{ "--delay": `${i * 100}ms`, "--rise": "16px", "--rd": "500ms" } as CSSProperties}>
                <p className="status">{p.status}</p>
                <h3>{p.title}</h3>
                <Bullets items={p.bullets} />
                {p.demoPrefix && p.demoProduct && (
                  <DemoFigure prefix={p.demoPrefix} product={p.demoProduct} kind="result" sizes="(min-width: 1024px) 380px, 100vw" />
                )}
              </article>
            ))}
          </div>
        </section>

        {c.automations.length > 0 && (
          <section id="automation" className="wrap section" aria-labelledby="automation-title">
            <SectionHeading id="automation" />
            <p className="auto-lead">{AUTOMATION_LEAD}</p>
            <div className="cards auto-cards">
              {c.automations.map((a, i) => (
                <article
                  key={a.slug}
                  className={`card${a.slug === "choosing-not-to-use-n8n" ? " is-story" : ""}`}
                  data-reveal=""
                  data-disclosure={a.disclosure}
                  style={{ "--delay": `${i * 100}ms`, "--rise": "16px", "--rd": "500ms" } as CSSProperties}
                >
                  <StageChips stages={stagesOf(a.slug)} />
                  <h3>{a.title}</h3>
                  <Bullets items={a.bullets} />
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="wrap section pair">
          <section id="experience" aria-labelledby="experience-title">
            <SectionHeading id="experience" />
            <div className="timeline" data-gsap-scrub="" data-start="top 70%" data-end="bottom 50%">
              <span className="timeline-fill" aria-hidden="true" />
              <ol>
              {c.timeline.map((t, i) => (
                <li key={t.role + t.org} style={{ "--at": i / Math.max(1, c.timeline.length - 1) } as CSSProperties}>
                  <span className="t-dot" aria-hidden="true" />
                  <p className="period">{t.period}</p>
                  <h3>
                    {t.role} · {t.org}
                  </h3>
                  {t.note && <p className="note">{t.note}</p>}
                </li>
              ))}
              </ol>
            </div>
          </section>
          <section id="skills" aria-labelledby="skills-title">
            <SectionHeading id="skills" />
            <Chips items={c.skills} className="chips skills" />
          </section>
        </div>

        <section id="contact" className="wrap section" aria-labelledby="contact-title">
          <div className="contact-block" data-reveal="" style={{ "--rise": "0px" } as CSSProperties}>
            <svg className="contact-arrow" viewBox="0 0 64 24" aria-hidden="true" role="presentation">
              <path d="M0 12 H56 M48 4 L58 12 L48 20" />
            </svg>
            <SectionHeading id="contact" />
            <ContactLinks profile={profile} emailClass="email" />
          </div>
        </section>
      </main>
      <div className="wrap">
        <PrototypeFooter name={profile.name} />
      </div>
      <MotionRuntime />
      <PipelineController />
    </div>
  );
}
