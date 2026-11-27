// A · Signal Field (design/a-signal-field.md): dark page, WebGL particle network hero, calm cards below.
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { featureGroups, getContent, type Metric, type Project } from "@/lib/content";
import { AUTOMATION_LEAD } from "@/lib/copy";
import MotionRuntime from "@/components/motion-runtime";
import {
  BadgeLegend, Bullets, MetricProse, ProjectBullets, ProjectSummary, Chips, ContactLinks, DemoFigure, MetricTile, NavLinks, PrototypeFooter,
  SectionHeading, SkipLink,
} from "@/components/shared";
import HeroCanvas from "./hero-canvas";
import { buildNetwork } from "./network";
import { chakra, plexMono, plexThai } from "./fonts";
import "./a.css";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getContent();
  return { title: `${profile.name} · ${profile.title} — A · Signal Field`, description: profile.tagline };
}

// Static poster: ~60 nodes in the same layout as the canvas. Shown from the first HTML byte, and the only
// hero art under reduced motion, Save-Data or without WebGL.
function Poster({ className }: { className: string }) {
  const net = buildNetwork(60, 90, 11);
  const W = 1440, H = 900;
  const px = (i: number) => ((net.nodes[i * 3] + 1) / 2) * W;
  const py = (i: number) => ((1 - net.nodes[i * 3 + 1]) / 2) * H;
  const lines: string[] = [];
  for (let k = 0; k < net.edges.length; k += 2) {
    const a = net.edges[k], b = net.edges[k + 1];
    lines.push(`M${px(a).toFixed(0)} ${py(a).toFixed(0)}L${px(b).toFixed(0)} ${py(b).toFixed(0)}`);
  }
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" role="presentation">
      <path d={lines.join("")} stroke="#5EEAD4" strokeOpacity="0.18" strokeWidth="1" fill="none" />
      {Array.from({ length: net.nodes.length / 3 }, (_, i) => (
        <circle key={i} cx={px(i).toFixed(0)} cy={py(i).toFixed(0)} r={i % 10 === 0 ? 2.5 : 2} fill={i % 10 === 0 ? "#A78BFA" : "#5EEAD4"} fillOpacity="0.75" />
      ))}
    </svg>
  );
}

// The flagship (a project with feature groups, i.e. ECM) gets a highlighted panel: picture and intro on top,
// its features in three columns across the full width underneath.
function ProjectRow({ project, index, metrics }: { project: Project; index: number; metrics: Metric[] }) {
  const flagship = featureGroups(project).length > 0;
  return (
    <article
      className={`project${flagship ? " flagship" : index % 2 ? " flip" : ""}`}
      data-disclosure={project.disclosure}
      data-reveal=""
      style={{ "--rise": "0px" } as CSSProperties}
    >
      {project.demoPrefix && project.demoProduct && (
        <div className="project-media">
          <div className="parallax" data-scrub="">
            <DemoFigure prefix={project.demoPrefix} product={project.demoProduct} kind="screen" sizes="(min-width: 1024px) 580px, 100vw" />
          </div>
        </div>
      )}
      <div className="project-text">
        <p className="status r-item" style={{ "--i": 0 } as CSSProperties}>
          {project.status}
        </p>
        <h3 className="r-item" style={{ "--i": 1 } as CSSProperties}>
          {project.title}
        </h3>
        <ProjectSummary project={project} className="muted r-item" />
        {!flagship && <ProjectBullets project={project} metrics={metrics} />}
        <div className="stack-row r-item" style={{ "--i": project.bullets.length + 2 } as CSSProperties}>
          <span className="stack-label">Stack</span>
          <Chips items={project.stack} />
        </div>
      </div>
      {flagship && <ProjectBullets project={project} metrics={metrics} />}
    </article>
  );
}

export default async function SignalFieldPage() {
  const c = await getContent();
  const { profile } = c;
  const heroItems = ["eyebrow", "h1", "tagline", "summary", "location", "metrics"];
  const d = (name: string) => ({ "--i": heroItems.indexOf(name) }) as CSSProperties;
  return (
    <div className={`va ${chakra.variable} ${plexThai.variable} ${plexMono.variable}`}>
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
        <section id="top" className="hero" aria-labelledby="top-title">
          <Poster className="poster" />
          <HeroCanvas />
          <div className="scrim" aria-hidden="true" />
          <div className="wrap hero-inner">
            <p className="eyebrow hero-in" style={d("eyebrow")}>
              {profile.title}
            </p>
            <h1 id="top-title" className="hero-in" style={d("h1")}>
              {profile.name}
            </h1>
            <p className="tagline hero-in" style={d("tagline")}>
              {profile.tagline}
            </p>
            <p className="summary hero-in" style={d("summary")}>
              <MetricProse text={profile.summary} metrics={c.heroMetrics} />
            </p>
            <p className="location hero-in" style={d("location")}>
              {profile.location}
            </p>
            <div className="hero-metrics hero-in" style={d("metrics")}>
              {c.heroMetrics.map((m) => (
                // count-up starts once the staggered text reveal is done (+400 ms)
                <MetricTile key={m.value} metric={m} count={{ trigger: "load", delay: 1400, duration: 1200 }} />
              ))}
            </div>
            <BadgeLegend />
          </div>
        </section>

        <section id="projects" className="wrap section" aria-labelledby="projects-title">
          <SectionHeading id="projects" />
          <div className="project-list">
            {c.featured.map((p, i) => (
              <ProjectRow key={p.slug} project={p} index={i} metrics={c.heroMetrics} />
            ))}
          </div>
        </section>

        <section id="smaller-projects" className="wrap section" aria-labelledby="smaller-projects-title">
          <SectionHeading id="smaller-projects" />
          <div className="cards">
            {c.cards.map((p, i) => (
              <article key={p.slug} className="card" data-reveal="" data-disclosure={p.disclosure} style={{ "--delay": `${i * 80}ms`, "--rd": "500ms" } as CSSProperties}>
                {p.demoPrefix && p.demoProduct && (
                  <DemoFigure prefix={p.demoPrefix} product={p.demoProduct} kind="screen" sizes="(min-width: 1024px) 360px, 100vw" />
                )}
                <p className="status">{p.status}</p>
                <h3>{p.title}</h3>
                <Bullets items={p.bullets} />
              </article>
            ))}
          </div>
        </section>

        {c.automations.length > 0 && (
          <section id="automation" className="wrap section" aria-labelledby="automation-title">
            <SectionHeading id="automation" />
            <p className="muted auto-lead">{AUTOMATION_LEAD}</p>
            <div className="signal" data-scrub="top" data-start="0.8" data-end="0.4">
              <div className="signal-line" aria-hidden="true">
                <span />
              </div>
              <div className="auto-cards">
                {c.automations.map((a, i) => (
                  <article
                    key={a.slug}
                    className={`auto-card${a.slug === "choosing-not-to-use-n8n" ? " is-alt" : ""}`}
                    data-disclosure={a.disclosure}
                    style={{ "--at": i / Math.max(1, c.automations.length - 1) } as CSSProperties}
                  >
                    <span className={`signal-node${i === 0 ? " pulse" : ""}`} aria-hidden="true" data-loop={i === 0 ? "" : undefined} />
                    <h3>{a.title}</h3>
                    <Bullets items={a.bullets} />
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="wrap section pair">
          <section id="experience" aria-labelledby="experience-title">
            <SectionHeading id="experience" />
            <div className="timeline" data-scrub="" >
              <span className="timeline-fill" aria-hidden="true" />
              <ol>
                {c.timeline.map((t, i) => (
                  <li key={t.role + t.org} style={{ "--at": i / Math.max(1, c.timeline.length - 1) } as CSSProperties}>
                    <span className="t-dot" aria-hidden="true" />
                    <p className="period">{t.period}</p>
                    <h3>
                      {t.role} · {t.org}
                    </h3>
                    {t.note && <p className="muted">{t.note}</p>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
          <section id="skills" aria-labelledby="skills-title">
            <SectionHeading id="skills" />
            <div data-reveal="" style={{ "--rise": "0px", "--stagger": "18ms" } as CSSProperties}>
              <ul className="chips skills">
                {c.skills.map((s, i) => (
                  <li key={s} className="r-item" style={{ "--i": i } as CSSProperties}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <section id="contact" className="section contact" aria-labelledby="contact-title">
          <Poster className="poster contact-poster" />
          <div className="wrap" data-reveal="" style={{ "--rise": "16px" } as CSSProperties}>
            <SectionHeading id="contact" />
            <ContactLinks profile={profile} emailClass="email" />
          </div>
        </section>
      </main>
      <div className="wrap">
        <PrototypeFooter name={profile.name} />
      </div>
      <MotionRuntime scrub />
    </div>
  );
}
