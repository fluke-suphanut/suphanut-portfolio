// AC8: the Cloudflare-style preview (`npx wrangler dev`) must answer 200 on / /a /b /c /d.
// --public (the public build, `npm run preview:public`): / answers 200, /a /b /c answer 404, /d redirects (301)
// to /, and the home page may be indexed (no robots noindex) and has a title and a description.
// Usage: node scripts/check-routes.mjs [base=http://localhost:8787] [--public]
const argv = process.argv.slice(2);
const isPublic = argv.includes("--public");
const base = argv.find((a) => !a.startsWith("--")) ?? (isPublic ? "http://localhost:8788" : "http://localhost:8787");
const want = isPublic
  ? { "/": 200, "/a": 404, "/b": 404, "/c": 404, "/d": 301, "/does-not-exist": 404 }
  : { "/": 200, "/a": 200, "/b": 200, "/c": 200, "/d": 200, "/does-not-exist": 404 };
let failed = 0;
for (const [p, status] of Object.entries(want)) {
  const res = await fetch(base + p, { redirect: "manual" });
  const to = res.headers.get("location");
  const ok = res.status === status && (status !== 301 || new URL(to, base).pathname === "/");
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${res.status} ${p}${to ? ` -> ${to}` : ""}`);
}
if (isPublic) {
  const html = await (await fetch(base + "/")).text();
  const noindex = /<meta name="robots"[^>]*noindex/i.test(html);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  const ok = !noindex && !!title && !/prototype|Editorial/i.test(title) && !!description;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} / indexable (noindex: ${noindex}), title "${title}", description "${description}"`);
}
process.exit(failed ? 1 : 0);
