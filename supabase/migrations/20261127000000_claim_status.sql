-- Claim status (claim-status-contract.md, 2026-11-27): one evidence vocabulary for the claim ledger,
-- this DB and cv_build.py provenance. Core PostgreSQL only, runs unchanged on local PostgreSQL 15+ and Supabase.
-- Additive: new nullable columns, no existing data changes; `grade` stays until every reader uses claim_status.
begin;

-- V-live   recounted or rerun on as_of from the real system or saved raw output, value matches
-- V-dated  a primary record from as_of exists (query output, run log, ticket, commit, tool-written result)
-- Changed  recounted on as_of, value differed; the row holds the new value
-- Doc-only only a later summary / disagreeing sources / a record a recount contradicts
-- Owner    only the owner can confirm it
create domain claim_status as text
  check (value in ('V-live', 'V-dated', 'Changed', 'Doc-only', 'Owner'));

-- as_of = the date the value is true for (measurement or recount day; first of month when only the month is known).
-- claim_ref = claim_id of the ledger row this line comes from.
alter table project_bullets
  add column claim_status claim_status,
  add column as_of        date,
  add column claim_ref    text,
  add constraint project_bullets_verified_needs_as_of
    check (claim_status not in ('V-live', 'V-dated', 'Changed') or as_of is not null);

alter table metrics
  add column claim_status claim_status,
  add column as_of        date,
  add column claim_ref    text,
  add constraint metrics_verified_needs_as_of
    check (claim_status not in ('V-live', 'V-dated', 'Changed') or as_of is not null);

alter table automation_bullets
  add column claim_status claim_status,
  add column as_of        date,
  add column claim_ref    text,
  add constraint automation_bullets_verified_needs_as_of
    check (claim_status not in ('V-live', 'V-dated', 'Changed') or as_of is not null);

alter table project_story
  add column claim_status claim_status,
  add column as_of        date,
  add column claim_ref    text,
  add constraint project_story_verified_needs_as_of
    check (claim_status not in ('V-live', 'V-dated', 'Changed') or as_of is not null);

-- Project summary line (pairs with projects.summary_grade from 20261125000000_feature_groups.sql).
alter table projects
  add column summary_claim_status claim_status,
  add column summary_as_of        date,
  add column summary_claim_ref    text,
  add constraint projects_summary_claim_needs_summary
    check (summary_claim_status is null or summary is not null),
  add constraint projects_summary_verified_needs_as_of
    check (summary_claim_status not in ('V-live', 'V-dated', 'Changed') or summary_as_of is not null);

commit;
