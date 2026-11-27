-- Project stories (content-pack.md As of 2026-11-25): each featured project is told in four steps,
-- Problem -> Approach -> Result -> Impact. Result stays in project_bullets; this table holds the other three.
-- Skill groups for prototype D (4 named groups). The flat `skills` table stays for A-C.
-- Core PostgreSQL only, runs unchanged on local PostgreSQL 15+ and Supabase. Additive: no existing data changes.
begin;

-- One row per paragraph or list item of a story step, in position order.
--   problem, impact: exactly one 'text' row with a grade (checked by the build guard in lib/content.ts).
--   approach: 'text' rows before the first item are the lead line, 'text' rows after the items are a closing
--   paragraph (shown as a note when graded); 'item' = list item; 'sub' = sub-item of the item above it.
create table project_story (
  id            bigint generated always as identity primary key,
  project_slug  text not null references projects (slug) on delete cascade,
  step          text not null check (step in ('problem', 'approach', 'impact')),
  position      int  not null,
  role          text not null default 'text' check (role in ('text', 'item', 'sub')),
  body          text not null,
  grade         evidence_grade,              -- weakest grade of the claims in the line; NULL = the line states no graded claim
  source        text,                        -- provenance as written in content-pack; never rendered
  disclosure    disclosure_state not null default 'new_pending',
  unique (project_slug, step, position),
  check (step = 'approach' or (role = 'text' and grade is not null)),
  check (grade is not null or source is null)
);

create table skill_groups (
  position  int  primary key,
  title     text not null unique
);

create table skill_group_items (
  id              bigint generated always as identity primary key,
  group_position  int  not null references skill_groups (position) on delete cascade,
  position        int  not null,
  name            text not null,
  unique (group_position, position),
  unique (group_position, name)
);

-- Same RLS stance as the other content tables (ADR-0001 section 3): no Data API access, build reads as owner.
alter table project_story     enable row level security;
alter table skill_groups      enable row level security;
alter table skill_group_items enable row level security;

commit;
