// Copies the images that prototype D uses into public/d/ (AC D6).
// Source: the shared portfolio-site/assets folder. Only web-ready files listed in
// assets/generated/README.md and the local edits of the profile photo are copied; never original/.
// Usage: node scripts/import-d-assets.mjs <portfolio-site/assets>
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const FILES = [
  "profile-edits/profile-cutout-640.webp",
  "profile-edits/profile-cutout-1280.webp",
  "generated/web/brush-block-yellow-900.webp",
  "generated/web/brush-swash-black-900.webp",
  "generated/web/brush-circle-black-600.webp",
  "generated/web/eye-mark-400.webp",
  "generated/web/starburst-red-400.webp",
  "generated/web/squiggle-wave-yellow-600.webp",
  "generated/web/profile-illustration-640.webp",
  "generated/web/profile-illustration-1280.webp",
  "generated/web/profile-poster-640.webp",
  "generated/web/profile-poster-1122.webp",
  // covers matched to projects by slug in app/d/page.tsx (design/d-editorial.md section 8.1); unused covers are not shipped
  ...["document-archive", "inference-finetune", "voice-scoring", "handwriting-reading", "security-triage", "agentic-router"]
    .flatMap((c) => [`generated/web/cover-${c}-720.webp`, `generated/web/cover-${c}-1440.webp`]),
  // spot illustrations in the Problem / Impact steps of projects 1-3
  ...["archive-pile", "archive-found", "gpu-shared", "eval-balance", "night-alarm"]
    .flatMap((c) => [`generated/web/spot-${c}-480.webp`, `generated/web/spot-${c}-960.webp`]),
];

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/import-d-assets.mjs <portfolio-site/assets>");
  process.exit(1);
}
const readme = await readFile(path.join(src, "generated/README.md"), "utf8");
const out = path.resolve("public/d");
await mkdir(out, { recursive: true });
for (const f of FILES) {
  if (f.includes("/original/")) throw new Error(`refusing to ship an original: ${f}`);
  const name = path.basename(f);
  // every shipped file must be named in the generated-images README (profile edits are listed there too)
  const stem = name.replace(/-\d+\.webp$/, "");
  // README forms: full name, `stem-{720,1440}.webp`, or `stem-720.webp` (...), `-1440.webp` on one row
  const size = name.match(/-(\d+)\.webp$/)?.[1];
  const sameRow = readme.split("\n").some((l) => l.includes(`${stem}-`) && l.includes(`-${size}.webp`));
  if (!readme.includes(name) && !readme.includes(`${stem}-{`) && !sameRow) throw new Error(`${name} is not listed in generated/README.md`);
  await copyFile(path.join(src, f), path.join(out, name));
}
console.log(`copied ${FILES.length} files to public/d`);
