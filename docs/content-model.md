# Content model

All site text lives in PostgreSQL. [`lib/content.ts`](../lib/content.ts) is the only module that reads it, and it reads only during `next build`. The schema is in [`supabase/migrations/`](../supabase/migrations/), and the content is in [`supabase/seed.sql`](../supabase/seed.sql).

## Build guard

The build fails when the content has the wrong shape:

- A section has the wrong number of rows: 6 projects, 3 cards, 4 n8n stories, 4 hero metrics, 3 timeline rows, 22 skills, or 4 skill groups. A public build may have fewer n8n stories, or none.
- A featured project does not have all four story steps: one graded Problem paragraph, an Approach with at least one list item, the Result bullets, and one graded Impact paragraph.
- A project groups some of its bullets into features but not all of them, or the bullets of one feature are not next to each other.

## Columns

| Column | Values | Meaning |
|---|---|---|
| `grade` | `counted`, `estimated` | `counted` (✅) is recounted or rerun from real data. `estimated` (⚠️) is taken from a record made at the time. A line with both marks gets `estimated`. Designs A to C show the grade as a badge. Design D shows no badges and has one footnote under the numbers instead (`D_LABELS.numbersNote` in [`lib/copy.ts`](../lib/copy.ts)). |
| `source` | `✅`, `⚠️`, or both | The marks of the line. The evidence behind each line stays in the private content pack. The site never selects this column. |
| `disclosure` | `cv`, `new_pending`, `new_approved` | `cv`: the line is already in the CV. `new_pending`: the line is not approved for publication yet. `new_approved`: the line is new and approved. The public build (`PORTFOLIO_PUBLIC=1`) drops `new_pending` rows and hides the n8n section when no story is left. |
| `project_bullets.group_title` | text or null | Bullets with the same title form one feature with its own heading. |
| `projects.summary_grade` | grade or null | Set it when the summary line states a number, so the line gets a badge. |
| `projects.demo_prefix`, `demo_product` | text or null | The demo drawing set in `public/demo/` and the made-up product name shown with it (designs A to C). |

## Project stories

`project_story` holds the Problem, Approach, and Impact steps (`step` is `problem`, `approach`, or `impact`).

- Problem and Impact are one `text` row each, with a grade.
- In Approach, `text` rows before the first `item` are the lead line. `text` rows after the items are a closing paragraph, shown as a note when graded. A `sub` row nests under the `item` above it.
- A bullet body with line breaks shows its first line as the lead and the other lines as a sub-list, with one badge after the last item.

## Other tables

- `skill_groups` and `skill_group_items` hold the four skill groups of design D. The flat `skills` table is for designs A to C.
- There is no phone number column, on purpose.

## Images

- `public/demo/*.webp` are demo drawings with made-up data, at 720 px and 1440 px wide, with metadata removed. Every one is shown with the caption "Illustration · sample data". `npm run media:import -- <media-dir>` makes them again from the source drawings. When the source files use other names, map them in `scripts/demo-media.local.json` (git ignores it): `{ "<site prefix>": "<source prefix>" }`.
- `public/d/` holds the images of design D: the profile photo with the background removed, and generated illustrations. `npm run media:import-d -- <assets-dir>` copies a fixed list. It fails when a file is not named in the generated-images README of that folder.
- The site icon (`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`) is shared by every page. Next.js adds the `<link rel="icon">` and `apple-touch-icon` tags. Next.js rejects an ICO whose PNG frames have no alpha channel, so keep the frames in RGBA.
