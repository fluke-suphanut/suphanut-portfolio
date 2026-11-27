// Tests for scripts/release-cv.mjs. Run: npm run test:scripts
// Every case runs the real script as a child process. The live check runs against a local HTTP server,
// so no case reads or writes the real site, the database or Cloudflare.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readApproval } from "./release-cv.mjs";

const repo = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const script = path.join(repo, "scripts/release-cv.mjs");
const FILES = JSON.parse(await readFile(path.join(repo, "lib/downloads.json"), "utf8")).map((d) => d.file);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const body = (file) => `%PDF-1.4 test copy of ${file}`;

function approval(overrides = {}) {
  const files = Object.fromEntries(
    FILES.map((f) => [f, { sha256: sha(body(f)), approved_by: "qa-engineer", approved_on: "2026-11-27", ...overrides[f] }]),
  );
  return JSON.stringify({ schema: 1, files });
}

function runScript(args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repo,
      env: { PATH: process.env.PATH, ...env },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function fixture(t, approvalText) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "release-cv-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const f of FILES) await writeFile(path.join(dir, f), body(f));
  const file = path.join(dir, "approved.json");
  await writeFile(file, approvalText);
  return { dir, file };
}

const publicState = () =>
  Promise.all(FILES.map((f) => stat(path.join(repo, "public", f)).then((s) => `${f}:${s.mtimeMs}`, () => `${f}:absent`)));

test("readApproval returns one approved hash per download file", () => {
  const got = readApproval(approval(), FILES);
  assert.deepEqual(got, FILES.map((f) => ({ file: f, sha256: sha(body(f)) })));
});

test("readApproval rejects a missing file, a bad hash and a bad date together", () => {
  const text = JSON.stringify({
    schema: 1,
    files: { [FILES[0]]: { sha256: "ABC", approved_by: "qa-engineer", approved_on: "27/11/2026" } },
  });
  assert.throws(() => readApproval(text, FILES), (e) =>
    /sha256 must be 64/.test(e.message) && /approved_on must be/.test(e.message) && /no entry/.test(e.message));
});

test("a source PDF that does not match stops before anything is copied (exit 1)", async (t) => {
  const { dir, file } = await fixture(t, approval({ [FILES[1]]: { sha256: "0".repeat(64) } }));
  const before = await publicState();
  const r = await runScript([dir, "--approved", file, "--no-deploy"], { DATABASE_URL: "postgres://unused" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`${FILES[1]}: sha256 ${sha(body(FILES[1]))}, approved 0{64}`));
  assert.deepEqual(await publicState(), before, "public/ must not change");
});

test("a missing source PDF stops with exit 1", async (t) => {
  const { dir, file } = await fixture(t, approval());
  await rm(path.join(dir, FILES[0]));
  const r = await runScript([dir, "--approved", file, "--no-deploy"], { DATABASE_URL: "postgres://unused" });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`${FILES[0]}: missing`));
});

test("missing settings stop with exit 2 before reading any PDF", async (t) => {
  const { dir, file } = await fixture(t, approval());
  const noDb = await runScript([dir, "--approved", file, "--no-deploy"]);
  assert.equal(noDb.code, 2);
  assert.match(noDb.out, /DATABASE_URL is not set/);
  const noToken = await runScript([dir, "--approved", file], { DATABASE_URL: "postgres://unused" });
  assert.equal(noToken.code, 2);
  assert.match(noToken.out, /CLOUDFLARE_API_TOKEN is not set/);
  const noApproval = await runScript([dir, "--no-deploy"], { DATABASE_URL: "postgres://unused" });
  assert.equal(noApproval.code, 2);
  assert.match(noApproval.out, /--approved/);
});

async function liveServer(t, files) {
  const server = createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, "http://x").pathname.slice(1));
    if (name === "") return res.end(FILES.map((f) => `<a href="/${f}" download>${f}</a>`).join(""));
    if (!(name in files)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": "application/pdf" }).end(files[name]);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

test("--verify-live passes when the served PDFs match the approval", async (t) => {
  const { file } = await fixture(t, approval());
  const base = await liveServer(t, Object.fromEntries(FILES.map((f) => [f, body(f)])));
  const r = await runScript(["--verify-live", "--approved", file, "--base", base]);
  assert.equal(r.code, 0, r.out);
  for (const f of FILES) assert.match(r.out, new RegExp(`ok   live: ${f}`));
});

test("--verify-live fails when the site serves an older PDF", { timeout: 60_000 }, async (t) => {
  const { file } = await fixture(t, approval());
  const base = await liveServer(t, { ...Object.fromEntries(FILES.map((f) => [f, body(f)])), [FILES[1]]: "old" });
  const r = await runScript(["--verify-live", "--approved", file, "--base", base]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`live ${FILES[1]}: ${sha("old")}, approved ${sha(body(FILES[1]))}`));
});
