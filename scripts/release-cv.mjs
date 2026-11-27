// Releases the CV and resume PDFs that QA approved, and nothing else.
//   1. Reads the approved sha256 of every file in lib/downloads.json from the QA approval file.
//   2. Stops before copying anything if a PDF in <cv-dir> does not match.
//   3. Copies the PDFs into public/, runs the public build, and checks the copies in out-public/.
//   4. Deploys out-public/ to Cloudflare Pages, then downloads each PDF from the live site and checks it again.
//
// Usage:
//   node scripts/release-cv.mjs <cv-dir> --approved <approved.json> [--no-deploy] [--base <url>] [--project <name>]
//   node scripts/release-cv.mjs --verify-live --approved <approved.json> [--base <url>]
// --approved defaults to $PORTFOLIO_APPROVED. A full release needs DATABASE_URL and CLOUDFLARE_API_TOKEN.
// Exit codes: 0 every check passed, 1 a hash or live check failed, 2 bad arguments, environment or approval file.
// The approval file format is in docs/release-cv.md.
import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SHA256 = /^[0-9a-f]{64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LIVE_TRIES = 5;
const LIVE_RETRY_MS = 3000;

class UsageError extends Error {}
class GateError extends Error {}

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function parseArgs(argv) {
  const opts = { approved: process.env.PORTFOLIO_APPROVED, base: "https://suphanut.pages.dev", project: "suphanut" };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-deploy") opts.noDeploy = true;
    else if (a === "--verify-live") opts.verifyLive = true;
    else if (["--approved", "--base", "--project"].includes(a)) {
      if (!argv[i + 1]) throw new UsageError(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a.startsWith("--")) throw new UsageError(`unknown option ${a}`);
    else rest.push(a);
  }
  opts.cvDir = rest[0];
  opts.base = opts.base.replace(/\/+$/, "");
  if (!opts.approved) throw new UsageError("pass --approved <approved.json> or set PORTFOLIO_APPROVED");
  if (!opts.verifyLive && !opts.cvDir) throw new UsageError("usage: release-cv.mjs <cv-dir> --approved <file>");
  if (!opts.verifyLive && !process.env.DATABASE_URL) throw new UsageError("DATABASE_URL is not set (the build reads the database)");
  if (!opts.verifyLive && !opts.noDeploy && !process.env.CLOUDFLARE_API_TOKEN)
    throw new UsageError("CLOUDFLARE_API_TOKEN is not set (use --no-deploy to stop before the deploy)");
  return opts;
}

// Returns [{ file, sha256 }] for every download, or throws UsageError naming each problem.
export function readApproval(json, files) {
  let data;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new UsageError(`approval file is not JSON: ${e.message}`);
  }
  if (data?.schema !== 1) throw new UsageError("approval file: schema must be 1");
  const problems = [];
  const out = files.map((file) => {
    const entry = data.files?.[file];
    if (!entry) problems.push(`${file}: no entry`);
    else {
      if (!SHA256.test(entry.sha256 ?? "")) problems.push(`${file}: sha256 must be 64 lowercase hex characters`);
      if (!entry.approved_by) problems.push(`${file}: approved_by is missing`);
      if (!DATE.test(entry.approved_on ?? "")) problems.push(`${file}: approved_on must be YYYY-MM-DD`);
    }
    return { file, sha256: entry?.sha256 };
  });
  if (problems.length) throw new UsageError(`approval file:\n  ${problems.join("\n  ")}`);
  return out;
}

// Compares the files in `dir` with the approval; throws GateError listing every mismatch.
async function gate(dir, approval, label) {
  const bad = [];
  for (const { file, sha256: want } of approval) {
    const got = await readFile(path.join(dir, file)).then(sha256, () => "missing");
    if (got === want) console.log(`ok   ${label}: ${file} ${got.slice(0, 12)}`);
    else bad.push(`${file}: ${got === "missing" ? "missing" : `sha256 ${got}`}, approved ${want}`);
  }
  if (bad.length) throw new GateError(`${label} does not match the approval:\n  ${bad.join("\n  ")}`);
}

function run(cmd, args, options) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...options });
  if (r.status !== 0) throw new GateError(`${path.basename(cmd)} ${args[0]} failed with exit ${r.status ?? r.signal}`);
}

async function verifyLive(base, approval) {
  const page = await fetch(`${base}/`, { cache: "no-store" });
  const html = await page.text();
  const unlinked = approval.filter(({ file }) => !html.includes(`href="/${file}"`)).map(({ file }) => file);
  if (!page.ok || unlinked.length)
    throw new GateError(`${base}/ answered ${page.status}; no download link for: ${unlinked.join(", ") || "-"}`);

  for (const { file, sha256: want } of approval) {
    let got;
    for (let i = 1; i <= LIVE_TRIES; i++) {
      // The query string skips edge caches, so the check reads what the new deployment serves.
      const res = await fetch(`${base}/${file}?release=${Date.now()}`, { cache: "no-store" });
      got = res.ok ? sha256(Buffer.from(await res.arrayBuffer())) : `HTTP ${res.status}`;
      if (got === want) break;
      if (i < LIVE_TRIES) await new Promise((r) => setTimeout(r, LIVE_RETRY_MS));
    }
    if (got !== want) throw new GateError(`live ${file}: ${got}, approved ${want}`);
    console.log(`ok   live: ${file} ${got.slice(0, 12)}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const repo = process.cwd();
  const files = JSON.parse(await readFile(path.join(repo, "lib/downloads.json"), "utf8")).map((d) => d.file);
  const approvalText = await readFile(opts.approved, "utf8").catch(() => {
    throw new UsageError(`cannot read the approval file ${opts.approved}`);
  });
  const approval = readApproval(approvalText, files);

  if (opts.verifyLive) return verifyLive(opts.base, approval);

  await gate(opts.cvDir, approval, "source");
  for (const { file } of approval) await copyFile(path.join(opts.cvDir, file), path.join(repo, "public", file));
  await gate(path.join(repo, "public"), approval, "public/");
  run(process.execPath, [path.join(repo, "scripts/build-public.mjs")], { cwd: repo });
  await gate(path.join(repo, "out-public"), approval, "out-public/");
  if (opts.noDeploy) return console.log("stopped before the deploy (--no-deploy)");

  // Run Wrangler outside the repo, so it does not read wrangler.jsonc (a Workers config, not Pages).
  run("npx", ["--prefix", repo, "wrangler", "pages", "deploy", path.join(repo, "out-public"),
    "--project-name", opts.project, "--branch", "main", "--commit-dirty=true"], { cwd: os.tmpdir() });
  await verifyLive(opts.base, approval);
  console.log(`released; next: npm run check:pages -- ${opts.base} --public`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`FAIL ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
