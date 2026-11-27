-- Source: docs/adr/0001-static-export-on-cloudflare-workers-assets.md section 3 (copied verbatim).
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
  source        text not null,            -- provenance as written in content-pack, e.g. '✅ / ⚠️'; never rendered
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
