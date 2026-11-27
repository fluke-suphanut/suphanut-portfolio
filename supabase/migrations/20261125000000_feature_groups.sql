-- Feature groups on project bullets, and a grade for a project's summary line.
-- Added 2026-11-25 for the ECM flagship card (three features, each with its own heading).
-- Core PostgreSQL only, runs unchanged on local PostgreSQL 15+ and Supabase. Additive: no existing data changes.
begin;

-- Bullets of one project that share a group_title form one feature, shown under that heading,
-- in bullet position order. NULL = ungrouped (every other project).
alter table project_bullets add column group_title text;

-- Grade of the project summary line when it states a number (e.g. "65M+ page archive").
-- NULL = the summary states no number.
alter table projects add column summary_grade evidence_grade;
alter table projects add constraint projects_summary_grade_needs_summary
  check (summary_grade is null or summary is not null);

commit;
