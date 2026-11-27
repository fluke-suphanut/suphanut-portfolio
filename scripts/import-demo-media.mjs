// Copies the public demo drawings into public/demo as WebP (720 and 1440 wide).
// Source: the storybook-public demo/media folder (Smoke Data drawings, made-up data). Never point this at a private folder.
// The site names each drawing set by what it shows (PREFIXES). When the source folder uses other names, put
// { "<site prefix>": "<source prefix>" } in scripts/demo-media.local.json (git-ignored); missing entries keep the site name.
// Usage: node scripts/import-demo-media.mjs <media-dir>
import { readdir, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PREFIXES = ["call-scoring", "ecm", "ocr", "number-extraction", "data-chatbot", "agent-dispatch", "auto-assign"];
const sourceOf = JSON.parse(
  (await readFile(path.join(import.meta.dirname, "demo-media.local.json"), "utf8").catch(() => null)) ?? "{}",
);
const KINDS = ["screen", "result", "flow"];
const WIDTHS = [720, 1440];

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/import-demo-media.mjs <media-dir>");
  process.exit(1);
}
// Only the public demo set may be imported: refuse any folder outside a storybook-public checkout.
if (!path.resolve(src).split(path.sep).includes("storybook-public")) {
  console.error("refusing to read a folder outside storybook-public");
  process.exit(1);
}
const outDir = path.resolve("public/demo");
await mkdir(outDir, { recursive: true });
const files = new Set(await readdir(src));
let n = 0;
for (const prefix of PREFIXES) {
  for (const kind of KINDS) {
    const name = `${sourceOf[prefix] ?? prefix}-${kind}.jpg`;
    if (!files.has(name)) throw new Error(`missing ${name}`);
    for (const w of WIDTHS) {
      // Strip all metadata (EXIF/XMP) so no source path or author field ships.
      await sharp(path.join(src, name)).resize({ width: w }).webp({ quality: 78 })
        .toFile(path.join(outDir, `${prefix}-${kind}-${w}.webp`));
      n++;
    }
  }
}
console.log(`wrote ${n} files to public/demo`);
