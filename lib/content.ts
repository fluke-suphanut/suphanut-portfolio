// The only module that reads the database. It runs during `next build` (static export, ADR-0001),
// so the connection string never reaches the browser or Cloudflare.
// `source` columns are never selected: provenance stays in the DB and cannot leak into `out/`.
import "server-only";
import { Client } from "pg";

export type Grade = "counted" | "estimated";
export type Disclosure = "cv" | "new_pending" | "new_approved";

export interface Profile {
  name: string;
  title: string;
  tagline: string;
  summary: string;
  location: string;
  email: string;
  githubUrl: string;
}

export interface Metric {
  value: string;
  label: string;
  grade: Grade;
  disclosure: Disclosure;
}

export interface Bullet {
  /** may hold a lead line plus list items, one per line (shown as a sub-list) */
  body: string;
  grade: Grade;
  disclosure: Disclosure;
  /** feature heading this bullet belongs to (ECM flagship); null when the project has no features */
  group?: string | null;
}

export interface FeatureGroup {
  title: string;
  bullets: Bullet[];
  /** index of the group's first bullet in project.bullets */
  offset: number;
}

export type StoryRole = "text" | "item" | "sub";

/** One paragraph or list item of a story step (Problem, Approach, Impact). */
export interface StoryLine {
  role: StoryRole;
  body: string;
  /** NULL when the line states no graded claim (most Approach lines) */
  grade: Grade | null;
  disclosure: Disclosure;
}

/** Problem -> Approach -> Result -> Impact (content-pack "Projects"). Result is `Project.bullets`. */
export interface Story {
  problem: StoryLine;
  approach: StoryLine[];
  impact: StoryLine;
}

export interface Project {
  slug: string;
  kind: "featured" | "card";
  title: string;
  status: string;
  summary: string | null;
  /** grade of the summary when it states a number, else null */
  summaryGrade: Grade | null;
  stack: string[];
  demoPrefix: string | null;
  demoProduct: string | null;
  disclosure: Disclosure;
  bullets: Bullet[];
  /** featured projects only; null for cards */
  story: Story | null;
}

export interface SkillGroup {
  title: string;
  items: string[];
}

export interface Automation {
  slug: string;
  title: string;
  disclosure: Disclosure;
  bullets: Bullet[];
}

export interface TimelineItem {
  kind: "work" | "education";
  role: string;
  org: string;
  period: string;
  note: string | null;
}

export interface Content {
  profile: Profile;
  heroMetrics: Metric[];
  featured: Project[];
  cards: Project[];
  automations: Automation[];
  timeline: TimelineItem[];
  skills: string[];
  /** prototype D's four named groups (content-pack "Skills (4 groups)") */
  skillGroups: SkillGroup[];
}

// Section sizes from design/00-shared.md section 2. A build with other counts fails loudly.
const EXPECTED = {
  heroMetrics: 4,
  featured: 6,
  cards: 3,
  automations: 4,
  timeline: 3,
  skills: 22,
  skillGroups: 4,
} as const;

// PORTFOLIO_PUBLIC=1 (the public build, scripts/build-public.mjs) drops rows still waiting for the owner's OK
// (disclosure = 'new_pending'), lets search engines index the site and hides the links back to the prototype chooser.
export const isPublicBuild = process.env.PORTFOLIO_PUBLIC === "1";
const visible = <T extends { disclosure: Disclosure }>(rows: T[]) =>
  isPublicBuild ? rows.filter((r) => r.disclosure !== "new_pending") : rows;

let cached: Promise<Content> | undefined;

export function getContent(): Promise<Content> {
  cached ??= load();
  return cached;
}

async function load(): Promise<Content> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set: the build reads content from PostgreSQL.");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    // One client runs one query at a time (pg), so these run in sequence.
    const q = (sql: string) => db.query(sql);
    const profile = await q(`select name, title, tagline, summary, location, email, github_url from profile where id = 1`);
    const metrics = await q(`select section, value, label, grade, disclosure from metrics order by section, position`);
    const projects = await q(`select slug, kind, title, status, summary, summary_grade, stack, demo_prefix, demo_product,
                                     disclosure
                                from projects order by position`);
    const bullets = await q(`select project_slug, body, grade, disclosure, group_title from project_bullets
                               order by project_slug, position`);
    const automations = await q(`select slug, title, disclosure from automations order by position`);
    const autoBullets = await q(`select automation_slug, body, grade, disclosure from automation_bullets
                                   order by automation_slug, position`);
    const timeline = await q(`select kind, role, org, period, note from timeline order by position`);
    const skills = await q(`select name from skills order by position`);
    const storyRows = await q(`select project_slug, step, role, body, grade, disclosure from project_story
                                 order by project_slug, step, position`);
    const groups = await q(`select g.title, i.name from skill_groups g join skill_group_items i on i.group_position = g.position
                              order by g.position, i.position`);

    const p = profile.rows[0];
    if (!p) throw new Error("profile table is empty: run supabase/seed.sql");

    const bulletsOf = (rows: Record<string, string>[], key: string, slug: string): Bullet[] =>
      visible(
        rows
          .filter((r) => r[key] === slug)
          .map((r) => ({
            body: r.body,
            grade: r.grade as Grade,
            disclosure: r.disclosure as Disclosure,
            group: r.group_title ?? null,
          })),
      );

    const allProjects: Project[] = visible(
      projects.rows.map((r) => ({
        slug: r.slug,
        kind: r.kind,
        title: r.title,
        status: r.status,
        summary: r.summary,
        summaryGrade: r.summary_grade ?? null,
        stack: r.stack,
        demoPrefix: r.demo_prefix,
        demoProduct: r.demo_product,
        disclosure: r.disclosure,
        bullets: bulletsOf(bullets.rows, "project_slug", r.slug),
        story: r.kind === "featured" ? storyOf(storyRows.rows, r.slug) : null,
      })),
    );

    const skillGroups: SkillGroup[] = [];
    for (const r of groups.rows) {
      const last = skillGroups[skillGroups.length - 1];
      if (last?.title === r.title) last.items.push(r.name);
      else skillGroups.push({ title: r.title, items: [r.name] });
    }

    const allMetrics: (Metric & { section: string })[] = visible(
      metrics.rows.map((r) => ({
        section: r.section,
        value: r.value,
        label: r.label,
        grade: r.grade,
        disclosure: r.disclosure,
      })),
    );

    const content: Content = {
      profile: {
        name: p.name,
        title: p.title,
        tagline: p.tagline,
        summary: p.summary,
        location: p.location,
        email: p.email,
        githubUrl: p.github_url,
      },
      heroMetrics: allMetrics.filter((m) => m.section === "hero").map(stripSection),
      featured: allProjects.filter((x) => x.kind === "featured"),
      cards: allProjects.filter((x) => x.kind === "card"),
      automations: visible(
        automations.rows.map((r) => ({
          slug: r.slug,
          title: r.title,
          disclosure: r.disclosure,
          bullets: bulletsOf(autoBullets.rows, "automation_slug", r.slug),
        })),
      ),
      timeline: timeline.rows.map((r) => ({ kind: r.kind, role: r.role, org: r.org, period: r.period, note: r.note })),
      skills: skills.rows.map((r) => r.name),
      skillGroups,
    };

    assertShape(content);
    return content;
  } finally {
    await db.end();
  }
}

// A featured project's story. Fails the build when a step is missing or malformed, so no page ever shows a
// project with a gap in its four steps. Rows hidden by a public build count as missing.
function storyOf(rows: Record<string, string>[], slug: string): Story {
  const lines = (step: string): StoryLine[] =>
    visible(
      rows
        .filter((r) => r.project_slug === slug && r.step === step)
        .map((r) => ({ role: r.role as StoryRole, body: r.body, grade: (r.grade as Grade) ?? null, disclosure: r.disclosure as Disclosure })),
    );
  const single = (step: "problem" | "impact"): StoryLine => {
    const got = lines(step);
    if (got.length !== 1 || got[0].role !== "text" || !got[0].grade) {
      throw new Error(`${slug}: story step "${step}" needs exactly one graded paragraph (got ${got.length})`);
    }
    return got[0];
  };
  const approach = lines("approach");
  if (!approach.some((l) => l.role === "item")) throw new Error(`${slug}: story step "approach" has no list item`);
  if (approach[0].role === "sub") throw new Error(`${slug}: approach starts with a sub-item`);
  approach.forEach((l, i) => {
    if (l.role === "sub" && !["item", "sub"].includes(approach[i - 1].role)) throw new Error(`${slug}: approach sub-item without an item above it`);
  });
  return { problem: single("problem"), approach, impact: single("impact") };
}

function stripSection(m: Metric & { section: string }): Metric {
  return { value: m.value, label: m.label, grade: m.grade, disclosure: m.disclosure };
}

function assertShape(c: Content) {
  const got = {
    heroMetrics: c.heroMetrics.length,
    featured: c.featured.length,
    cards: c.cards.length,
    automations: c.automations.length,
    timeline: c.timeline.length,
    skills: c.skills.length,
    skillGroups: c.skillGroups.length,
  };
  const wrong = (Object.keys(EXPECTED) as (keyof typeof EXPECTED)[]).filter((k) => {
    // A public build may hide the whole n8n section (design/00-shared.md section 10, "partial").
    if (isPublicBuild && k === "automations") return got[k] > EXPECTED[k];
    return got[k] !== EXPECTED[k];
  });
  const emptyCards = [...c.featured, ...c.cards].filter((x) => x.bullets.length === 0).map((x) => x.slug);
  // A project either groups every bullet into features or none of them, and each group is contiguous.
  for (const p of c.featured) {
    const groups = p.bullets.map((b) => b.group ?? null);
    if (groups.some((g) => g) && groups.some((g) => !g)) throw new Error(`${p.slug}: some bullets have a feature group, some do not`);
    const seen = new Set<string>();
    groups.forEach((g, i) => {
      if (!g || g === groups[i - 1]) return;
      if (seen.has(g)) throw new Error(`${p.slug}: feature "${g}" is split by another feature`);
      seen.add(g);
    });
  }
  if (wrong.length || emptyCards.length) {
    throw new Error(
      `content check failed: ${wrong.map((k) => `${k}=${got[k]} (want ${EXPECTED[k]})`).join(", ")}` +
        (emptyCards.length ? ` projects without bullets: ${emptyCards.join(", ")}` : ""),
    );
  }
}

// Splits a project's bullets into its feature groups (empty when the project has none).
export function featureGroups(project: Project): FeatureGroup[] {
  const out: FeatureGroup[] = [];
  project.bullets.forEach((b, i) => {
    if (!b.group) return;
    const last = out[out.length - 1];
    if (last && last.title === b.group) last.bullets.push(b);
    else out.push({ title: b.group, bullets: [b], offset: i });
  });
  return out;
}

// Picks a substring out of a bullet so a page can show it as a big number with the bullet's grade.
// Fails the build when the text is not in the bullet, so a page number never drifts from the DB.
export function excerpt(project: Project, bulletIndex: number, text: string): { text: string; grade: Grade } {
  const b = project.bullets[bulletIndex];
  if (!b || !b.body.includes(text)) {
    throw new Error(`excerpt "${text}" not found in ${project.slug} bullet ${bulletIndex + 1}`);
  }
  return { text, grade: b.grade };
}
