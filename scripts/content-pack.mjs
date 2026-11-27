// Reads the parts of content-pack.md that the site shows. Trailing ✅/⚠️ marks and their sources are
// provenance, not text: a line's grade is the weakest mark on it (ADR-0001). All whitespace is dropped, as on
// the DOM side of scripts/check-pages.mjs. Each line is [text, grade | null].
export function parsePack(md) {
  const squash = (t) => t.replace(/\s+/g, "");
  const MARK = /\s(✅|⚠️)/;
  const split = (line) => {
    const m = line.match(MARK);
    if (!m) return [squash(line), null];
    const marks = line.slice(m.index);
    return [squash(line.slice(0, m.index)), marks.includes("⚠️") ? "estimated" : "counted"];
  };
  const lines = md.split("\n");
  // the "> " line that follows a line starting with `label`
  const quoteAfter = (label) => {
    const at = lines.findIndex((l) => l.startsWith(label));
    const q = lines.slice(at + 1).find((l) => l.startsWith("> "));
    return at >= 0 && q ? squash(q.slice(2)) : null;
  };

  const projects = [];
  let p = null, step = null;
  for (const raw of lines) {
    const h = raw.match(/^### (\d)\. (.+?)(?: \(FLAGSHIP\))? — status: (.+?)(?: · |$)/);
    if (h) { p = { title: squash(h[2]), status: squash(h[3]), problem: null, approach: [], features: [], result: [], impact: null }; projects.push(p); step = null; continue; }
    if (/^###? /.test(raw)) { p = null; continue; }
    if (!p) continue;
    const st = raw.match(/^\*\*(Problem|Approach|Result|Impact)\.\*\*\s*(.*)$/);
    if (st) {
      step = st[1].toLowerCase();
      if (step === "problem") p.problem = split(st[2]);
      else if (step === "impact") p.impact = split(st[2]);
      else if (step === "approach" && st[2]) p.approach.push(split(st[2]));
      continue;
    }
    if (/^(Stack:|Never on the site:|<!--)/.test(raw)) { step = null; continue; }
    if (!raw.trim() || !step) continue;
    if (step === "approach") {
      // lead, list item, sub-item or closing line: each keeps the grade of its own marks (null when it has none)
      p.approach.push(split(raw.replace(/^\s*- /, "")));
    } else if (step === "result") {
      const f = raw.match(/^\*(.+)\*$/);
      if (f) { p.features.push(squash(f[1])); continue; }
      if (/^- /.test(raw)) p.result.push(split(raw.slice(2)));
      else if (/^\s+- /.test(raw)) {
        // sub-item: joins its bullet; the bullet's grade is the one on its last sub-item
        const last = p.result[p.result.length - 1];
        const [t, g] = split(raw.trim().slice(2));
        last[0] += t;
        if (g) last[1] = g;
      }
    }
  }

  const skills = [...md.matchAll(/^- \*\*(.+?):\*\* (.+)$/gm)]
    .filter((m) => md.indexOf(m[0]) > md.indexOf("## Skills (4 groups"))
    .slice(0, 4)
    .map((m) => [squash(m[1]), m[2].split(/,\s(?![^()]*\))/).map(squash)]);

  const heroAt = md.indexOf("## Hero metrics");
  const metrics = md.slice(heroAt, md.indexOf("\n## ", heroAt + 3)).split("\n")
    .filter((l) => /^\| [^-M|]/.test(l) && !/^\| Metric/.test(l))
    .map((l) => l.split("|").map((c) => c.trim()))
    .map((c) => [squash(c[1]), squash(c[2]), c[3].includes("⚠️") ? "estimated" : "counted"]);

  // Smaller projects: "- **Title** (status, tech)" then either " — line" or ":" with "  - line" sub-items
  // (a "demo ..." sub-item is an image note, not text)
  const cards = [];
  const cardsAt = lines.findIndex((l) => l.startsWith("### Smaller projects"));
  for (const raw of lines.slice(cardsAt + 1)) {
    if (/^#/.test(raw)) break;
    const c = raw.match(/^- \*\*(.+?)\*\* \((.+)\)(?::$| — (.+)$)/);
    if (c) {
      const status = c[2].replace(/, [^,]+$/, "");
      cards.push({ title: squash(c[1]), status: squash(status), bullets: c[3] ? [split(c[3].replace(/ · demo .*$/, ""))] : [] });
    } else if (/^\s+- /.test(raw) && !/^\s+- demo /.test(raw) && cards.length) {
      cards[cards.length - 1].bullets.push(split(raw.trim().slice(2)));
    }
  }

  // Automation with n8n: "### A. Title" stories with "- " bullets, until a line that is neither
  const automations = [];
  const autoAt = lines.findIndex((l) => l.startsWith("## Automation with n8n"));
  let a = null;
  for (const raw of lines.slice(autoAt + 1)) {
    if (/^## /.test(raw)) break;
    const h = raw.match(/^### [A-Z]\. (.+?)(?: \(story card\))?$/);
    if (h) { a = { title: squash(h[1]), bullets: [] }; automations.push(a); continue; }
    if (!a || !raw.trim()) continue;
    if (/^- /.test(raw)) a.bullets.push(split(raw.slice(2)));
    else a = null;
  }

  return {
    summary: quoteAfter("Summary (hero / about):"),
    footnote: quoteAfter("Footnote under the numbers band"),
    automationLead: quoteAfter("Site intro line for this section"),
    metrics,
    skills,
    projects: projects.filter((x) => x.problem),
    cards,
    automations,
  };
}
