// UI labels that are not rows in the DB. Wording comes from content-pack.md and design/00-shared.md section 3.
export const SECTIONS = [
  { id: "projects", title: "Projects" },
  { id: "smaller-projects", title: "Smaller projects" },
  { id: "automation", title: "Automation with n8n" },
  { id: "experience", title: "Experience timeline" },
  { id: "skills", title: "Skills" },
  { id: "contact", title: "Contact" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];
export const sectionTitle = (id: SectionId) => SECTIONS.find((s) => s.id === id)!.title;

export const CAPTION = "Illustration · sample data";

export const GRADE_TEXT = {
  counted: { short: "counted", long: "counted from real data" },
  estimated: { short: "estimated", long: "read from docs / estimated" },
} as const;

// Lead sentence of the n8n section: "Site intro line" in content-pack.md (PM decision 2026-11-25).
export const AUTOMATION_LEAD =
  "Monitoring, recovery jobs and a human-approved sync I built on the company's n8n, each tied to the system it keeps running.";

export const VARIANTS = [
  { href: "/a", label: "A · Signal Field" },
  { href: "/b", label: "B · Pipeline" },
  { href: "/c", label: "C · Evidence" },
  { href: "/d", label: "D · Editorial" },
] as const;

// D · Editorial labels that are not DB rows (PRD-addendum-d-editorial.md, design/d-editorial.md section 12).
export const D_LABELS = {
  about: "About",
  numbers: "By the numbers",
  basedIn: "Based in Nakhon Pathom",
  circle: "AI Engineer · GPU platform · human review ·",
  // from the content-pack heading "### 1. Document archive AI … (FLAGSHIP)"; design/d-editorial.md section 12 (awaiting PM)
  flagship: "Flagship",
  // content-pack "Hero metrics": footnote under the numbers band on /d, replaces the badge legend (2026-11-26)
  numbersNote:
    "Every number was checked on 26 Nov 2026 against production systems, the code, or the record made when it was measured.",
} as const;
