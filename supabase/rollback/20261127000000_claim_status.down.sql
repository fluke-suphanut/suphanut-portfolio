-- Reverses supabase/migrations/20261127000000_claim_status.sql: drops the claim status columns, their checks
-- and the claim_status domain. Run it by hand (psql -v ON_ERROR_STOP=1 -f ...); db:migrate never applies it.
-- It deletes every claim_status, as_of and claim_ref value, so export them first if they hold ledger data.
begin;

alter table projects
  drop constraint projects_summary_verified_needs_as_of,
  drop constraint projects_summary_claim_needs_summary,
  drop column summary_claim_ref,
  drop column summary_as_of,
  drop column summary_claim_status;

alter table project_story
  drop constraint project_story_verified_needs_as_of,
  drop column claim_ref,
  drop column as_of,
  drop column claim_status;

alter table automation_bullets
  drop constraint automation_bullets_verified_needs_as_of,
  drop column claim_ref,
  drop column as_of,
  drop column claim_status;

alter table metrics
  drop constraint metrics_verified_needs_as_of,
  drop column claim_ref,
  drop column as_of,
  drop column claim_status;

alter table project_bullets
  drop constraint project_bullets_verified_needs_as_of,
  drop column claim_ref,
  drop column as_of,
  drop column claim_status;

drop domain claim_status;

commit;
