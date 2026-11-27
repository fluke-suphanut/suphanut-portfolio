// Copies the CV and resume PDFs into public/ so the site can offer them for download (lib/downloads.json).
// The PDFs carry the owner's phone number, so git ignores them (/public/*.pdf): they reach the site through
// the build, never through the repository. Usage: node scripts/import-cv.mjs <cv-dir>
import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

const downloads = JSON.parse(await readFile(new URL("../lib/downloads.json", import.meta.url), "utf8"));
const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/import-cv.mjs <cv-dir>");
  process.exit(2);
}
for (const { file } of downloads) {
  const from = path.join(src, file);
  const head = await readFile(from).then((b) => b.subarray(0, 5).toString("latin1"), () => null);
  if (head !== "%PDF-") throw new Error(`${from} is missing or is not a PDF`);
  await copyFile(from, path.resolve("public", file));
  console.log(`copied ${file}`);
}
