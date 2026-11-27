![Three pinned paper sheets in yellow, red, and black, with a starburst and an eye mark](docs/banner.png)

# suphanut-portfolio

The source of [suphanut.pages.dev](https://suphanut.pages.dev), the portfolio of Suphanut Meeyindee, an AI engineer. The site is one static page in an editorial poster style: colour bands, a profile photo, hand-drawn marks, and six project stories told as problem, approach, result, and impact.

The text lives in PostgreSQL and is read once, at build time. The output is plain HTML, CSS, and images, so the live site has no server code, no database connection, and no secret.

## Why it is built this way

- **Content in a database, not in JSX.** Each project line has a grade: `counted` (recounted from real data) or `estimated` (taken from a record made at the time). The build checks the row counts and the story structure, so a missing step fails the build instead of shipping a half-empty section.
- **Static export.** The content changes a few times a month. Reading the database at request time would add a credential on Cloudflare and a slower page for no gain. The full reasoning is in [ADR 0001](docs/adr/0001-static-export-on-cloudflare-workers-assets.md) (in Thai).
- **Checks that run against the built site.** Scripts load the real pages in Chrome and check sections, counts, reduced motion, horizontal scroll, images, and text that must never ship.

## Stack

- Next.js 16 (App Router, `output: "export"`), React 19, TypeScript
- PostgreSQL 15 or later, read with `pg` during `next build` only (`lib/content.ts`)
- Cloudflare Pages for the public site, and Wrangler for the local preview
- Playwright Core with your installed Google Chrome, for the browser checks and screenshots
- `sharp`, for converting images to WebP

## Routes

| Route | What it is | In the public build |
|---|---|---|
| `/d` | Design D, editorial. The design that was chosen. | Served at `/`. `/d` redirects to `/` with a 301. |
| `/a` | Design A, a dark hero with a WebGL particle network (react-three-fiber) | No (404) |
| `/b` | Design B, a scroll story along a pipeline (GSAP ScrollTrigger) | No (404) |
| `/c` | Design C, typographic, with big numbers and evidence badges | No (404) |
| `/` | A chooser that links the four designs | No |

The three other designs stay in the repo as prototypes. They use demo drawings with made-up data, captioned "Illustration · sample data".

## Run it locally

You need Node.js 22, npm, PostgreSQL 15 or later with `psql`, and Google Chrome (only for the checks).

1. Install the packages:

	```bash
	npm ci
	```

2. Set the connection string in your shell. Do not write the value into a file in the repo. [`.env.example`](.env.example) lists the variable names.

	```bash
	export DATABASE_URL="postgres://localhost:5432/portfolio"
	```

3. Create the database, then load the schema and the content. The seed empties the tables first, so you can run it again.

	```bash
	createdb portfolio
	npm run db:migrate
	npm run db:seed
	```

4. Start the dev server with hot reload at http://localhost:3000:

	```bash
	npm run dev
	```

To serve the build the way Cloudflare does, build it and start Wrangler. No Cloudflare account is needed.

```bash
npm run build       # reads the database, writes out/
npm run preview     # http://localhost:8787
```

## Build the public site and deploy it

The public build contains design D only.

The page has **Download CV** and **Download resume** buttons. The PDFs are not in this repo, because they carry a phone number: git ignores `public/*.pdf`. Copy them in before the public build, which fails without them. The file names are in [`lib/downloads.json`](lib/downloads.json).

```bash
npm run media:import-cv -- <folder-with-the-pdfs>   # copies Suphanut-Meeyindee-CV.pdf and Suphanut-Meeyindee-Resume.pdf into public/
npm run build:public      # writes out-public/
npm run preview:public    # http://localhost:8788
```

`npm run build:public` ([`scripts/build-public.mjs`](scripts/build-public.mjs)) works on a copy of the sources in `.public-build/`. On that copy, it does these steps:

1. It removes `/a`, `/b`, `/c`, and the chooser, and serves design D at `/`.
2. It writes `_redirects`, so `/d` answers with a 301 to `/`.
3. It builds with `PORTFOLIO_PUBLIC=1`. That setting drops rows that are not approved for publication, allows search engines to index the page, and sets the page title and description.
4. It moves the result to `out-public/`.

The script never changes `out/` or your source tree.

To deploy, set `CLOUDFLARE_API_TOKEN` in your shell or secret store, never in a file. Then run the deploy from outside the repo folder, so Wrangler does not read `wrangler.jsonc` (a Workers config):

```bash
(cd /tmp && npx --prefix <path-to-repo> wrangler pages deploy <path-to-repo>/out-public \
	--project-name suphanut --branch main --commit-dirty=true)
npm run check:routes -- https://suphanut.pages.dev --public
```

## Checks

Start the matching preview server before you run a check that takes a URL.

| Command | What it checks |
|---|---|
| `npm run lint` | ESLint |
| `npm run build` | TypeScript, and the content guard: the row count of every section and the shape of every project story |
| `npm run check:routes -- [<base>] [--public]` | Local: `/`, `/a`, `/b`, `/c`, and `/d` answer 200, and an unknown path answers 404. With `--public`: `/` answers 200, `/a` `/b` `/c` answer 404, `/d` redirects to `/`, and the page has a title, a description, and no `noindex`. |
| `npm run check:pages -- [<base>] [--public] [--pack <content-pack.md>]` | Sections and counts, project stories, lazy images, no grade badges on design D, the CV and resume download buttons and their PDFs, reduced motion, image captions, and no horizontal scroll at 375 px and 1440 px. With `--pack`, every line on design D must match the content pack word for word. |
| `npm run check:leaks -- <n8n-inventory.md> [out] [--images <README.md>]` | Text that must never ship: home-directory paths, private IP addresses, Thai mobile numbers, evidence codes, n8n workflow IDs, and the words in your private rules file. With `--images`, every image must be a demo drawing, an image named in the generated-images README, or the site icon. |
| `npm run screenshots -- <base> <out-dir> [/a,/b,/c,/d]` | Takes full-page PNGs at 1440 px and 375 px. |

There are no unit tests. The checks run against the built pages instead.

Some checks read files that are not in this repo, because those files hold private details:

- `check:leaks` reads its word list (company domains, internal repository names, and similar words) from `scripts/leak-rules.local.json`, which git ignores. Copy [`scripts/leak-rules.example.json`](scripts/leak-rules.example.json) to that name and put in your own words. Without the file, the check refuses to run. The check also needs a Markdown table with the n8n workflow IDs in its first column.
- `check:pages --pack` needs the content pack, the private source document of every line on the site.
- `check:pages` expects the CV and resume PDFs in the build (see [Build the public site and deploy it](#build-the-public-site-and-deploy-it)).

## Edit the content

Change rows in the database, then build again. [docs/content-model.md](docs/content-model.md) describes the tables and the rules for each row.

## Repository layout

```
app/                 routes: page.tsx (chooser), a/, b/, c/, d/; global CSS, layout, site icon
components/          shared parts (badges, demo figure, metric tile) and the motion runtime
lib/content.ts       the only module that reads the database, and the build guard
lib/copy.ts          interface text that is not stored in the database
supabase/migrations  schema in core PostgreSQL; `npm run db:migrate` applies every file in name order
supabase/seed.sql    the site content
public/d/            images of design D
public/demo/         demo drawings with made-up data, used by designs A to C
scripts/             public build, checks, screenshots, image import
docs/                architecture decision record, content model, banner
```

## Limits

- The content is in English only.
- A content change needs a new build and a new deploy. The live site never reads the database.
- The machine that builds the site needs network access to the database.
- `check:pages --pack` and the full leak check depend on private files. You cannot run them unchanged in a fresh clone.

## Licence

The code is under the [MIT License](LICENSE).

The MIT License does not cover the content. The text in `supabase/seed.sql` and `lib/copy.ts`, the profile photo and illustrations in `public/d/`, the demo drawings in `public/demo/`, the site icon, and `docs/banner.png` are © 2026 Suphanut Meeyindee, all rights reserved. Replace them with your own before you publish a site built from this code.
