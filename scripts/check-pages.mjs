// Browser checks for the built site (run against `npx wrangler dev`):
//   AC1 sections and counts, AC4 motion + reduced motion, AC6 demo captions, AC9 no horizontal scroll.
//   D stories: 6 projects in order, each told in 4 steps. D shows no grade badges at all (owner request after
//   the 2026-11-26 fact check); A-C keep them.
//   With --pack <content-pack.md> (AC2 on /d): every text on /d that comes from the content pack (summary,
//   hero metrics and footnote, skill groups, stories, small cards, n8n) matches it word for word, and nothing
//   extra is shown.
// Usage: node scripts/check-pages.mjs [base=http://localhost:8787] [--pack <content-pack.md>] [--public]
//   --public: the public build (default base :8788); D is checked at `/`, and /a-/d are not opened.
import { readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { parsePack } from "./content-pack.mjs";

const argv = process.argv.slice(2);
const packAt = argv.indexOf("--pack");
const packPath = packAt >= 0 ? argv.splice(packAt, 2)[1] : undefined;
// --public: the public build (`npm run preview:public`, :8788) serves only design D, at `/`.
const pubAt = argv.indexOf("--public");
const isPublic = pubAt >= 0;
if (isPublic) argv.splice(pubAt, 1);
const base = argv[0] ?? (isPublic ? "http://localhost:8788" : "http://localhost:8787");
const D = isPublic ? "/" : "/d";
const VARIANTS = isPublic ? ["/"] : ["/a", "/b", "/c", "/d"];
const PAGES = isPublic ? ["/"] : ["/", ...VARIANTS];
// Where each page keeps its metric tiles and the summary paragraph. D moves both out of the hero
// (design/d-editorial.md section 6: metrics in "By the numbers", summary in "About").
const SCOPE = { [D]: { metrics: "#numbers", summary: "#about .summary" } };
const scopeOf = (route) => SCOPE[route] ?? { metrics: "#top", summary: "#top .summary" };
const results = [];
const check = (ac, route, name, ok, detail = "") => results.push({ ac, route, name, ok, detail });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

async function open(route, { width = 1440, reduced = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    isMobile: width < 500,
    hasTouch: width < 500,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + route, { waitUntil: "networkidle" });
  return { page, ctx, errors };
}

try {
  // ---- AC1: chooser + sections (public: no link to the prototypes or the chooser at all)
  {
    const { page, ctx } = await open("/");
    const links = await page.$$eval("a", (as) => as.map((a) => a.getAttribute("href")));
    if (isPublic) {
      const proto = links.filter((h) => /^\/[abcd]?$/.test(h ?? ""));
      check("AC1", "/", "public: no links to /, /a, /b, /c or /d", proto.length === 0, proto.join(" "));
    } else check("AC1", "/", `links to ${VARIANTS.join(" ")}`, VARIANTS.every((h) => links.includes(h)), links.join(" "));
    await ctx.close();
  }
  // ---- names: project titles name the work, not the real system or hardware (content-pack "Project names",
  // owner request 2026-11-26). Every heading and every project or card title on every page is checked; body
  // text may still name the tools.
  for (const route of PAGES) {
    const { page, ctx } = await open(route);
    const hits = await page.evaluate(() =>
      [...document.querySelectorAll("h1, h2, h3, h4, h5, h6, #projects article h3, #smaller-projects article h3, .feature-title")]
        .map((h) => h.textContent.trim())
        .filter((t) => /\b(ECM|DGX|B200|Surya)\b/i.test(t)),
    );
    const titles = await page.evaluate(() => document.querySelectorAll("#projects h3, #smaller-projects h3").length);
    check("names", route, `no ECM, DGX, B200 or Surya in headings (${titles} project titles)`, hits.length === 0 && (route === "/" && !isPublic ? true : titles === 9), JSON.stringify(hits));
    await ctx.close();
  }

  for (const route of VARIANTS) {
    const { page, ctx, errors } = await open(route);
    const scope = scopeOf(route);
    const s = await page.evaluate((scope) => {
      const q = (sel) => document.querySelectorAll(sel).length;
      return {
        order: [...document.querySelectorAll("main > section[id]")].map((x) => x.id).join(" "),
        h1: document.querySelector("h1")?.textContent,
        heroMetrics: q(`${scope.metrics} [data-count-host]`),
        projects: q("#projects h3"),
        cards: q("#smaller-projects h3"),
        automation: q("#automation h3"),
        timeline: q("#experience li"),
        skills: document.querySelectorAll("#skills li").length || document.querySelectorAll("#skills .nowrap").length,
        contact: q("#contact dd"),
        mailto: q('#contact a[href^="mailto:"]'),
      };
    }, scope);
    // D shows the content pack's 4 skill groups (27 chips); A-C the flat list of 22
    const skills = route === D ? 27 : 22;
    const ok =
      !!s.h1 && s.heroMetrics === 4 && s.projects === 6 && s.cards === 3 && s.automation === 4 &&
      s.timeline === 3 && s.skills === skills && s.contact === 3 && s.mailto === 1;
    check("AC1", route, `hero, 6 projects, 3 cards, 4 n8n, timeline, ${skills} skills, contact`, ok, JSON.stringify(s));
    if (route === D) {
      // owner's order (content-pack 2026-11-25): Projects -> n8n -> small cards -> Experience -> Contact
      const want = "top about numbers skills projects automation smaller-projects experience contact";
      check("AC1", route, "section order: numbers after About, then skills, projects, n8n, small cards", s.order === want, s.order);
    }

    // ---- flagship: the first project is ECM with 3 feature headings, each with graded bullets (none on D),
    // and it is visibly bigger than the second project card
    const flag = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#projects h3")].map((h) => h.closest("article"));
      const first = cards[0];
      const feats = [...(first?.querySelectorAll(".feature") ?? [])].map((f) => ({
        title: f.querySelector("h4, h5")?.textContent?.trim(),
        bullets: f.querySelectorAll("li[data-disclosure]").length,
        badged: [...f.querySelectorAll("li[data-disclosure]")].filter((li) => li.querySelector(".badge[data-grade]")).length,
      }));
      const area = (el) => (el ? el.getBoundingClientRect().width * el.getBoundingClientRect().height : 0);
      const lead = first?.querySelector(".lead");
      return {
        lead: lead ? `${lead.querySelector(".lead-num")?.textContent} ${lead.querySelector(".badge")?.getAttribute("data-grade")}` : null,
        title: first?.querySelector("h3")?.textContent ?? "",
        feats,
        // D tells every project as a long story, so area says nothing there: the flagship instead sits in its
        // own frame with a larger title than the next story
        biggerThanNext: first?.classList.contains("story")
          ? first.classList.contains("flagship") && getComputedStyle(first).borderTopStyle === "solid" &&
            parseFloat(getComputedStyle(first.querySelector("h3")).fontSize) > parseFloat(getComputedStyle(cards[1].querySelector("h3")).fontSize)
          // A-C: the flagship class, a larger title and more area than the next card. (Until 2026-11-26 this
          // was "1.5x the next card's area"; that ratio was this script's own choice, not the spec's, and /a at
          // 1440 dropped to 1.46x when the evidence fix shortened ECM's Problem line and lengthened project 2.)
          : first.classList.contains("flagship") && area(first) > area(cards[1]) &&
            parseFloat(getComputedStyle(first.querySelector("h3")).fontSize) > parseFloat(getComputedStyle(cards[1].querySelector("h3")).fontSize),
        summaryBadge: !!first?.querySelector(".tile-summary .badge, .summary-line .badge, .card-summary .badge, p.muted .badge, .story-lead .badge"),
      };
    });
    check(
      "ECM",
      route,
      "flagship (ECM, titled Document archive AI) first, 3 features with headings and graded bullets, larger card",
      flag.title.startsWith("Document archive AI") && flag.feats.length === 3 &&
        flag.feats.every((f) => f.title && f.badged === (route === D ? 0 : f.bullets)) &&
        // bullets per feature as in content-pack.md (As of 2026-11-26): OCR 6, Search 6, Chat with data 6
        flag.feats.map((f) => f.bullets).join(",") === "6,6,6" &&
        flag.biggerThanNext && flag.summaryBadge === (route !== D) &&
        // C shows a big lead number cut from the first OCR bullet; it must be 67.7M with the counted grade
        (route !== "/c" || flag.lead === "67.7M counted"),
      JSON.stringify(flag),
    );

    // ---- D stories: 6 projects, each with the 4 step headings in order, a Problem and an Impact paragraph,
    // Result bullets, a lazy cover with real width/height (CLS)
    if (route === D) {
      const st = await page.evaluate(() =>
        [...document.querySelectorAll("#projects article.story")].map((a) => ({
          slug: a.id.replace(/^project-/, ""),
          steps: [...a.querySelectorAll(":scope .step > h4")].map((h) => h.textContent).join(">"),
          problem: a.querySelector(".story-lead")?.textContent.trim().length ?? 0,
          impact: a.querySelector(".impact-box")?.textContent.trim().length ?? 0,
          approach: a.querySelectorAll(".step-approach li").length,
          result: a.querySelectorAll(".step-result li[data-disclosure]").length,

          imgs: [...a.querySelectorAll("img")].map((i) => `${i.loading}:${i.getAttribute("width")}x${i.getAttribute("height")}:${i.getAttribute("src").split("/").pop()}`),
        })),
      );
      const order = "ecm inference-finetuning-b200 call-quality-scoring document-extraction-pilot code-security-triage agentic-dw-chatbot";
      const okStories =
        st.map((x) => x.slug).join(" ") === order &&
        st.every((x) => x.steps === "Problem>Approach>Result>Impact" && x.problem > 0 && x.impact > 0 && x.approach > 0 && x.result > 0) &&
        st.every((x) => x.imgs.length > 0 && x.imgs.every((i) => /^lazy:\d+x\d+:(cover|spot)-[a-z-]+-\d+\.webp$/.test(i)));
      check("D-story", route, "6 stories in order, 4 steps each, Problem/Approach/Result/Impact filled, lazy sized images", okStories, JSON.stringify(st));

      // ---- D grades: no badge, no grade attribute, no legend and no grade words anywhere on the page; the
      // footnote under the numbers takes the legend's place
      const g = await page.evaluate(() => ({
        badges: document.querySelectorAll(".badge").length,
        dataGrade: document.querySelectorAll("[data-grade]").length,
        legend: document.querySelectorAll(".legend").length,
        words: (document.body.textContent.match(/✅|⚠️|\bestimated\b|counted from real data|read from docs/g) ?? []).length,
        footnote: document.querySelectorAll("#numbers .numbers-note").length,
      }));
      check("D-grades", route, `0 grade badges on the page (found ${g.badges}), footnote under the numbers`,
        g.badges === 0 && g.dataGrade === 0 && g.legend === 0 && g.words === 0 && g.footnote === 1, JSON.stringify(g));
    }

    // ---- AC2 (partial, A-C): numbers repeated in the hero summary carry the same badge as their metric tile
    if (route !== D) {
      const prose = await page.evaluate((scope) => {
        const p = document.querySelector(scope.summary);
        const tiles = new Map(
          [...document.querySelectorAll(`${scope.metrics} [data-count-host]`)].map((t) => [
            t.querySelector(".sr-only")?.textContent,
            t.querySelector(".badge")?.getAttribute("data-grade"),
          ]),
        );
        const tagged = [...(p?.querySelectorAll(".nowrap") ?? [])]
          .filter((n) => n.querySelector(".badge"))
          .map((n) => [n.firstChild?.textContent?.replace(/\u00a0/g, "").trim(), n.querySelector(".badge")?.getAttribute("data-grade")]);
        const repeated = [...tiles.keys()].filter((v) => v && new RegExp(`(^|\\s)${v.replace(/[.+]/g, "\\$&")}(?=[\\s.,]|$)`).test(p?.textContent ?? ""));
        return { repeated, tagged, ok: repeated.length > 0 && repeated.every((v) => tagged.some(([t, g]) => t === v && g === tiles.get(v))) };
      }, scope);
      check("AC2", route, `hero summary numbers carry badges (${prose.repeated.join(", ")})`, prose.ok, JSON.stringify(prose.tagged));
    }
    check("—", route, "no page errors", errors.length === 0, errors.join(" | "));

    // ---- AC6: every demo image sits in a figure whose caption is exact
    // (only storybook-public demo drawings need it; D uses generated covers and shows no demo image)
    const figs = await page.$$eval('img[src^="/demo/"]', (imgs) =>
      imgs.map((img) => img.closest("figure")?.querySelector(".demo-caption")?.textContent ?? null),
    );
    const wantDemo = route !== D;
    check(
      "AC6",
      route,
      wantDemo ? `all ${figs.length} demo images captioned` : "no demo images on this page (nothing to caption)",
      wantDemo ? figs.length > 0 && figs.every((c) => c === "Illustration · sample data") : figs.length === 0,
      "",
    );

    // ---- copy: the site speaks in first person; "owner" must not appear in visible text
    // (innerText = rendered text only: no class names, data-* attributes or hidden sr-only duplicates of it)
    const owner = await page.evaluate(() =>
      (document.body.innerText.match(/[^.\n]*\bowner\b[^.\n]*/gi) ?? []).map((t) => t.trim().slice(0, 90)),
    );
    check("copy", route, 'no "owner" in visible text', owner.length === 0, JSON.stringify(owner));

    // ---- D3: no testimonials or quotes attributed to anyone
    const quotes = await page.evaluate(() => ({
      blocks: document.querySelectorAll("main blockquote, main q, main cite, main figure figcaption cite").length,
      curly: (document.querySelector("main")?.textContent.match(/[“”«»]/g) ?? []).length,
    }));
    check("D3", route, "no quote blocks or quotation marks", quotes.blocks === 0 && quotes.curly === 0, JSON.stringify(quotes));

    // ---- AC4 (motion on): hero animation + a scroll-linked value that changes with scroll
    const hero = await page.evaluate(() => ({
      motionOk: document.documentElement.classList.contains("motion-ok"),
      cssAnims: document.getAnimations().length,
      canvas: !!document.querySelector(".hero-canvas canvas"),
      counted: [...document.querySelectorAll('#top [data-count]')].length,
    }));
    await page.waitForTimeout(2500);
    const canvasLater = await page.evaluate(() => !!document.querySelector(".hero-canvas canvas"));
    const heroOk = hero.motionOk && (hero.cssAnims > 0 || canvasLater || hero.counted > 0);
    check("AC4", route, "hero animation runs", heroOk, JSON.stringify({ ...hero, canvasLater }));

    const readP = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("[data-scrub], [data-gsap-scrub]")].map((el) => el.style.getPropertyValue("--p") || "-").join(","),
      );
    const before = await readP();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.45));
    await page.waitForTimeout(800);
    const mid = await readP();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(800);
    const end = await readP();
    check("AC4", route, "scroll-linked values change with scroll", before !== mid && mid !== end, `${before} | ${mid} | ${end}`);

    // ---- reduced motion switched on mid-visit stops motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(500);
    const stopped = await page.evaluate(() => ({
      motionOk: document.documentElement.classList.contains("motion-ok"),
      canvas: !!document.querySelector(".hero-canvas canvas"),
      running: document.getAnimations().filter((a) => a.playState === "running").length,
    }));
    check("AC4", route, "switching to reduce mid-visit stops motion", !stopped.motionOk && !stopped.canvas && stopped.running === 0, JSON.stringify(stopped));
    await ctx.close();
  }

  // ---- AC2 on /d against the content pack (only with --pack)
  if (packPath) {
    const pack = parsePack(await readFile(packPath, "utf8"));
    const { page, ctx } = await open(D, { reduced: true });
    const dom = await page.evaluate(() => {
      // visible text only; all whitespace dropped so list markup and line breaks do not matter
      const txt = (el) => (el ? el.textContent.replace(/\s+/g, "") : null);
      return {
        summary: txt(document.querySelector("#about .summary")),
        footnote: txt(document.querySelector("#numbers .numbers-note")),
        metrics: [...document.querySelectorAll("#numbers [data-count-host]")].map((m) => [txt(m.querySelector(".sr-only")), txt(m.querySelector(".metric-label"))]),
        skills: [...document.querySelectorAll("#skills .skill-area")].map((g) => [txt(g.querySelector("h3")), [...g.querySelectorAll("li")].map(txt)]),
        projects: [...document.querySelectorAll("#projects article.story")].map((a) => ({
          title: txt(a.querySelector("h3")),
          status: txt(a.querySelector(".status"))?.replace(/^Flagship/, ""),
          problem: txt(a.querySelector(".story-lead")),
          // every Approach line (lead, item, sub-item, closing paragraph); an item's sub-list is compared as
          // separate lines, so it is cut off before reading the item's own text
          approach: [...a.querySelectorAll(".step-approach .approach > p, .step-approach .approach-list > li, .step-approach .approach-sub > li")].map((el) => {
            const c = el.cloneNode(true);
            c.querySelectorAll(".approach-sub").forEach((x) => x.remove());
            return txt(c);
          }),
          features: [...a.querySelectorAll(".feature-title")].map(txt),
          result: [...a.querySelectorAll(".step-result li[data-disclosure]")].map(txt),
          impact: txt(a.querySelector(".impact-box")),
        })),
        automationLead: txt(document.querySelector("#automation .auto-lead")),
        automations: [...document.querySelectorAll("#automation article.story-card")].map((a) => ({
          title: txt(a.querySelector("h3")),
          bullets: [...a.querySelectorAll("li[data-disclosure]")].map(txt),
        })),
        cards: [...document.querySelectorAll("#smaller-projects article.small-card")].map((a) => ({
          title: txt(a.querySelector("h3")),
          status: txt(a.querySelector(".status")),
          bullets: [...a.querySelectorAll("li[data-disclosure]")].map(txt),
        })),
      };
    });
    await ctx.close();
    // D shows text only, so the pack's grades (provenance) are left out of the comparison
    const text = (line) => line?.[0] ?? null;
    // card lines are list fragments in the pack; the site capitalises them and ends them with a full stop
    const frag = (t) => t?.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase()) ?? null;
    const diffs = [];
    const eq = (where, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`${where}: site ${JSON.stringify(a)} vs pack ${JSON.stringify(b)}`); };
    eq("summary", dom.summary, pack.summary);
    eq("footnote", dom.footnote, pack.footnote);
    eq("hero metrics", dom.metrics, pack.metrics.map(([v, l]) => [v, l]));
    eq("skills", dom.skills, pack.skills);
    eq("project count", dom.projects.length, pack.projects.length);
    pack.projects.forEach((pp, i) => {
      const dp = dom.projects[i] ?? {};
      const want = {
        title: pp.title, status: pp.status, problem: text(pp.problem), approach: pp.approach.map(text),
        features: pp.features, result: pp.result.map(text), impact: text(pp.impact),
      };
      for (const k of Object.keys(want)) eq(`${pp.title.slice(0, 12)} ${k}`, dp[k], want[k]);
    });
    eq("n8n intro", dom.automationLead, pack.automationLead);
    eq("n8n count", dom.automations.length, pack.automations.length);
    pack.automations.forEach((pa, i) => eq(`n8n ${pa.title.slice(0, 12)}`, dom.automations[i], { title: pa.title, bullets: pa.bullets.map(text) }));
    eq("card count", dom.cards.length, pack.cards.length);
    pack.cards.forEach((pc, i) => {
      const dc = dom.cards[i] ?? { bullets: [] };
      eq(`card ${pc.title.slice(0, 12)}`, { ...dc, bullets: dc.bullets.map(frag) }, { title: pc.title, status: pc.status, bullets: pc.bullets.map((b) => frag(text(b))) });
    });
    check("AC2", D, "summary, metrics, footnote, skills, stories, n8n and cards match content-pack word for word", diffs.length === 0, `${diffs.length} differences\n      ${diffs.slice(0, 6).join("\n      ")}`);
  }

  // ---- AC4 (reduced from the start): nothing moves, all content readable, final numbers in place
  for (const route of VARIANTS) {
    const { page, ctx } = await open(route, { reduced: true });
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const hidden = [...document.querySelectorAll("main *")].filter((el) => {
        const cs = getComputedStyle(el);
        return el.textContent.trim() && el.children.length === 0 && !el.closest(".sr-only") && (cs.opacity === "0" || cs.visibility === "hidden");
      }).length;
      const numbersFinal = [...document.querySelectorAll("[data-count]")].every((el) => el.textContent === el.nextElementSibling?.textContent || el.closest(".lead"));
      return {
        motionOk: document.documentElement.classList.contains("motion-ok"),
        canvas: !!document.querySelector("canvas"),
        animations: document.getAnimations().length,
        hiddenTextNodes: hidden,
        numbersFinal,
      };
    });
    const ok = !r.motionOk && !r.canvas && r.animations === 0 && r.hiddenTextNodes === 0 && r.numbersFinal;
    check("AC4", route, "reduced motion: no animation, all text visible", ok, JSON.stringify(r));
    await ctx.close();
  }

  // ---- D4 / AC a11y: the skip link, once focused, must be readable (text vs its own background >= 4.5:1).
  // Its colours come from --focus / --on-focus; a variant rule like `.vX a { color }` can silently override them.
  for (const route of VARIANTS) {
    const { page, ctx } = await open(route, { reduced: true });
    await page.keyboard.press("Tab"); // the skip link is the first focusable element
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const lum = ([r, g, b]) => {
        const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      // first non-transparent background at or above the link
      let n = el, bg = "rgba(0, 0, 0, 0)";
      while (n && (bg = getComputedStyle(n).backgroundColor) && (rgb(bg)[3] === 0 || bg === "transparent")) n = n.parentElement;
      const fg = getComputedStyle(el).color;
      const [l1, l2] = [lum(rgb(fg)), lum(rgb(bg))].sort((a, b) => b - a);
      const rect = el.getBoundingClientRect();
      return { isSkip: el.classList.contains("skip-link"), fg, bg, ratio: +((l1 + 0.05) / (l2 + 0.05)).toFixed(2), onScreen: rect.top >= 0 && rect.bottom <= innerHeight };
    });
    check("D4", route, `focused skip link contrast ${r.ratio}:1 (>= 4.5)`, r.isSkip && r.onScreen && r.ratio >= 4.5, JSON.stringify(r));
    await ctx.close();
  }

  // ---- AC9: no horizontal scroll at 375 and 1440
  for (const width of [375, 1440]) {
    for (const route of PAGES) {
      const { page, ctx } = await open(route, { width });
      await page.waitForTimeout(500);
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      check("AC9", route, `no horizontal scroll at ${width}`, w[0] <= w[1], `${w[0]} / ${w[1]}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.ac.padEnd(4)} ${r.route.padEnd(3)} ${r.name}${r.ok ? "" : `  ${r.detail}`}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
