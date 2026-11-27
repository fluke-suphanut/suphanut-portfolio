---
Status: proposed
Date: 2026-11-24
Decided by: solution-architect (NTN-2) จาก PRD `portfolio-landing`; รอเจ้าของงานรับ
---

# Static export ตอน build, Cloudflare Workers Static Assets, schema SQL กลางสำหรับ Postgres/Supabase

เว็บ portfolio มีเนื้อหาที่เปลี่ยนไม่บ่อย และเจ้าของงานแก้เนื้อหาผ่าน DB เราจึงอ่าน DB **ตอน `next build` เท่านั้น** แล้ว export เป็น HTML ทั้งหมด (`output: 'export'`) และให้ Cloudflare เสิร์ฟเป็น static assets ของ Worker ที่ไม่มีโค้ดฝั่ง server ข้อดีคือไม่มี DB credential และไม่มี DB connection บน Cloudflare ตอน request ส่วน schema ใช้แค่ core PostgreSQL จึงรันได้ทั้งบนเครื่องและบน Supabase

## 1. Render: static ตอน build

**ตัดสิน:** ทุก route (`/`, `/a`, `/b`, `/c`) เป็น static อ่าน DB ผ่าน module เดียว (`lib/content.ts`, ใช้ `DATABASE_URL`) ตอน build แล้วไม่อ่าน DB อีก

| ตัวเลือก | ไม่มี DB/secret บน Cloudflare | เนื้อหาใหม่โดยไม่ต้อง build | ผ่าน AC5 ได้ง่าย | ตรง AC7 ("build ใหม่ แล้วเห็นข้อมูลใหม่") |
|---|---|---|---|---|
| **Static export ตอน build** (เลือก) | ✓ | — | ✓ | ✓ |
| อ่าน DB ตอน request ผ่าน Hyperdrive | — | ✓ | — | ✓ |
| ISR / revalidate บน OpenNext | — | ✓ | ✓ | ✓ |

- **Hyperdrive ตอน request**: ต้องเก็บ connection string ของ DB ไว้บน Cloudflare และทุก request ต้องรอ DB จึงเสีย latency และมีจุดพังเพิ่ม ทั้งที่เนื้อหาเปลี่ยนแค่ไม่กี่ครั้งต่อเดือน
- **ISR บน OpenNext**: ต้องมี cache ฝั่ง R2/KV และ DB credential อยู่ใน runtime อีก ซึ่งเกินความจำเป็นของ prototype

## 2. Adapter และคำสั่ง preview (AC8)

**ตัดสิน:** ใช้ Next.js `output: 'export'` + **Cloudflare Workers Static Assets** (`wrangler.jsonc` มีแค่ `assets` และไม่มี `main`) จึงไม่ต้องใช้ adapter ตอน runtime

| ตัวเลือก | ไม่มีโค้ด server บน Cloudflare | รองรับ route handler/ISR | ยังดูแลอยู่ |
|---|---|---|---|
| **Static export + Workers Static Assets** (เลือก) | ✓ | — | ✓ |
| `@opennextjs/cloudflare` (1.20.18 ✅ npm view 2026-11-24) | — | ✓ | ✓ |
| `@cloudflare/next-on-pages` | — | ✓ | — (npm ระบุ deprecated ให้ไปใช้ OpenNext ✅ npm view 2026-11-24) |

- **OpenNext**: เป็นตัวที่ควรใช้ทันทีที่ต้องการ render ตอน request แต่ตอนนี้จะทำให้ `pg` และโค้ด server ถูกรวมเข้าไปใน Worker โดยไม่ได้ใช้
- **next-on-pages**: deprecated แล้ว

`wrangler.jsonc` (ที่ root ของ repo):
```jsonc
{
  "name": "suphanut-portfolio",
  "compatibility_date": "2026-11-01",
  "assets": { "directory": "./out", "not_found_handling": "404-page" }
}
```
`next.config.ts` ต้องมี `output: 'export'` และ `images: { unoptimized: true }` (static export ใช้ image optimizer ของ Next ไม่ได้)

**คำสั่ง preview สำหรับ AC8** (ไม่ต้อง login Cloudflare และไม่ deploy):
```bash
export DATABASE_URL=postgres://localhost:5432/portfolio   # local; Supabase later = change this value only
npm run build                                             # next build -> ./out (reads DB here)
npx wrangler dev --port 8787                              # serves ./out like Cloudflare does
for p in / /a /b /c; do curl -s -o /dev/null -w "%{http_code} $p\n" http://localhost:8787$p; done
```
ผลที่คาด: `200` ทั้ง 4 route ตรวจแล้วกับ `out/` จำลอง (`index/a/b/c/404.html`) บน wrangler 4.167.0: `/`, `/a`, `/b`, `/c` ได้ 200 และ route ที่ไม่มีได้ 404 ✅ (รันบนเครื่อง 2026-11-24, ยังไม่ได้ลองกับ build จริงของ app)

## 3. Schema SQL ของเนื้อหา

**ตัดสิน:** migration ไฟล์เดียว `supabase/migrations/20261124000000_content_schema.sql` (ชื่อไฟล์ตามรูปแบบของ Supabase CLI) ใช้แค่ core PostgreSQL ไม่มี extension และไม่อ้าง role `anon`/`authenticated` จึงรันด้วย `psql` ได้ทั้งสองที่โดยไม่ต้องแก้

กติกาข้อมูล:
- `grade`: `counted` = ✅, `estimated` = ⚠️ UI แปลงเป็น badge ถ้าบรรทัดเดียวมีทั้ง ✅ และ ⚠️ (เช่น `✅ E-21 / ⚠️ E-20`) ให้เก็บ grade ที่อ่อนที่สุดคือ `estimated` และเก็บข้อความเดิมไว้ใน `source` QA ใช้กฎนี้ตรวจ AC2
- `source`: provenance ตาม content-pack ใช้ภายในเท่านั้น **ห้าม render**
- `disclosure`: `cv` / `new_pending` / `new_approved` prototype แสดงทุกแถวได้ แต่ build สำหรับ deploy สาธารณะต้องกรอง `new_pending` ออก
- ไม่มีคอลัมน์เบอร์โทรเลยจนกว่าเจ้าของงานจะตัดสิน
- เพิ่มตาราง `automation_bullets` อีก 1 ตาราง นอกจาก 7 ตารางในโจทย์ เพราะเรื่อง n8n แต่ละเรื่องมีหลาย bullet และแต่ละ bullet มี grade ของตัวเอง ตัวเลข "530 workflows ✅" เก็บใน `metrics` โดยใช้ `section = 'automation'`
- เปิด RLS ทุกตารางแต่ไม่มี policy: บน Supabase จะปิดการอ่านผ่าน Data API ส่วน build อ่านผ่าน `DATABASE_URL` ในฐานะเจ้าของตาราง จึงไม่โดน RLS

```sql
-- Portfolio content schema. Runs unchanged on local PostgreSQL 15+ and Supabase.
-- Uses only core PostgreSQL: no extensions, no Supabase-only roles (anon, authenticated).
begin;

-- Evidence grade of a claim: 'counted' = ✅ counted from real data, 'estimated' = ⚠️ read from docs / sampled / estimated.
create domain evidence_grade as text
  check (value in ('counted', 'estimated'));

-- Disclosure state: 'cv' = already public in the CV; 'new_pending' = NEW line awaiting owner OK; 'new_approved' = owner said OK.
create domain disclosure_state as text
  check (value in ('cv', 'new_pending', 'new_approved'));

create table profile (
  id          smallint primary key default 1 check (id = 1),  -- single row
  name        text not null,
  nickname    text,
  title       text not null,
  tagline     text not null,
  summary     text not null,
  location    text not null,
  email       text not null,
  github_url  text not null,
  education   text not null,
  updated_at  timestamptz not null default now()
  -- No phone column on purpose: the phone number is not stored until the owner decides (PRD open question).
);

create table projects (
  slug          text primary key check (slug ~ '^[a-z0-9-]+$'),
  position      int  not null unique,
  kind          text not null check (kind in ('featured', 'card')),
  title         text not null,
  status        text not null,           -- honest state, e.g. 'production', 'pilot', 'prototype'
  summary       text,                    -- one line; required for cards
  stack         text[] not null default '{}',
  demo_prefix   text,                    -- image prefix in public/demo, e.g. 'call-scoring'
  demo_product  text,                    -- made-up product name shown with the demo image, e.g. 'CallScore'
  disclosure    disclosure_state not null default 'cv',
  check (kind = 'featured' or summary is not null)
);

create table project_bullets (
  id            bigint generated always as identity primary key,
  project_slug  text not null references projects (slug) on delete cascade,
  position      int  not null,
  body          text not null,
  grade         evidence_grade not null,  -- weakest grade of the claims in the line
  source        text not null,            -- provenance as written in content-pack, e.g. '✅ E-21 / ⚠️ E-20'; never rendered
  disclosure    disclosure_state not null default 'cv',
  unique (project_slug, position)
);

create table metrics (
  id          bigint generated always as identity primary key,
  section     text not null check (section in ('hero', 'automation')),
  position    int  not null,
  value       text not null,             -- display string, e.g. '60M+', '0.033'
  label       text not null,
  grade       evidence_grade not null,
  source      text not null,
  disclosure  disclosure_state not null default 'cv',
  unique (section, position)
);

create table automations (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  position    int  not null unique,
  title       text not null,
  note        text,                      -- e.g. 'canary is in CV'
  disclosure  disclosure_state not null default 'new_pending'
);

create table automation_bullets (
  id               bigint generated always as identity primary key,
  automation_slug  text not null references automations (slug) on delete cascade,
  position         int  not null,
  body             text not null,
  grade            evidence_grade not null,
  source           text not null,
  disclosure       disclosure_state not null default 'new_pending',
  unique (automation_slug, position)
);

create table skills (
  id        bigint generated always as identity primary key,
  position  int  not null unique,
  name      text not null unique
);

create table timeline (
  id          bigint generated always as identity primary key,
  position    int  not null unique,      -- display order, newest first
  kind        text not null check (kind in ('work', 'education')),
  role        text not null,
  org         text not null,
  period      text not null,             -- display string, e.g. 'Mar 2026 – present'
  start_date  date not null,
  end_date    date,                      -- null = present
  note        text,
  check (end_date is null or end_date >= start_date)
);

-- Supabase exposes the public schema through its Data API. RLS with no policies denies that API;
-- the site reads at build time through DATABASE_URL as the table owner, which RLS does not restrict.
alter table profile            enable row level security;
alter table projects           enable row level security;
alter table project_bullets    enable row level security;
alter table metrics            enable row level security;
alter table automations        enable row level security;
alter table automation_bullets enable row level security;
alter table skills             enable row level security;
alter table timeline           enable row level security;

commit;
```

รันบนเครื่อง: `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/migrations/20261124000000_content_schema.sql` แล้วตามด้วย `supabase/seed.sql` ซึ่ง Fullstack Engineer สร้างจาก `content-pack.md`

ผลตรวจบนเครื่อง ✅ (PostgreSQL 15.17 ใน DB ชั่วคราว 2026-11-24 ลบทิ้งแล้ว):
- schema รันผ่าน
- grade ที่ไม่ใช่ค่าที่กำหนด, การ์ดที่ไม่มี summary และ profile แถวที่ 2 ถูกปฏิเสธทั้งหมด
- เจ้าของตารางอ่านได้ 1 แถว แต่ role ที่จำลอง Data API อ่านได้ 0 แถว
- ยังไม่ได้รันบน Supabase จริง เพราะห้ามสร้าง project

## 4. ที่อยู่ repo

**ตัดสิน:** `~/suphanut-portfolio` (ตอนนี้ยังไม่มีโฟลเดอร์นี้ ✅ `ls` 2026-11-24)
- Fullstack Engineer เป็นคนสร้างด้วย `create-next-app` แล้วค่อย `git init` เพื่อให้ create-next-app เจอโฟลเดอร์ว่าง ห้ามสร้าง remote และห้าม push จนกว่าเจ้าของงานอนุมัติ
- เมื่อสร้าง repo แล้ว ให้คัดลอก ADR นี้ไปไว้ที่ `docs/adr/0001-static-export-on-cloudflare-workers-assets.md`

## Consequences

- **แก้เนื้อหาแล้วต้อง build ใหม่**: ถ้าเจ้าของงานแก้ใน DB จะเห็นผลหลัง build และ deploy รอบถัดไปเท่านั้น ถ้าต้องการให้อัปเดตเองภายหลัง ให้ใช้ deploy hook ที่ทำงานเมื่อ DB เปลี่ยน ซึ่งเป็นงานรอบหน้า
- **ตอน deploy จริง**: เครื่องที่รัน build ต้องเข้าถึง DB ได้ ถ้าใช้ Cloudflare Workers Builds ตัว build จะเข้าถึง Postgres บนเครื่องไม่ได้ จึงต้องย้ายไป Supabase ก่อน หรือ build บนเครื่องแล้ว `wrangler deploy` ไฟล์ใน `out/` Supabase บังคับใช้ SSL ให้ใส่ `sslmode` ใน `DATABASE_URL` และ engineer ตรวจตอนต่อครั้งแรก secret อ้างด้วยชื่อ env (`DATABASE_URL`, `CLOUDFLARE_API_TOKEN`) เท่านั้น
- **ตัดออกไปแล้ว**: route handler, middleware, server actions, ISR และ `next/image` optimizer ถ้าต้องการสิ่งเหล่านี้ภายหลังต้องเปลี่ยนไปใช้ `@opennextjs/cloudflare` และเขียน ADR ใหม่ที่ supersede ฉบับนี้ ส่วน schema และ `lib/content.ts` ใช้ต่อได้
- **AC3 ตรวจง่ายขึ้น**: ผล build มีแค่ `out/` ให้ grep และไม่มี bundle ของฝั่ง server แต่ต้องไม่ render คอลัมน์ `source`
- **Three.js/GSAP/Motion** ทำงานฝั่ง client จึงใช้กับ static export ได้ ไม่มีผลต่อการตัดสินใจนี้
