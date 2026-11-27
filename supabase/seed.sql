-- Seed for the portfolio content schema.
-- Every string comes from content-pack.md (As of 2026-11-26, fact-checked). Re-runnable: it empties the tables first.
-- grade: 'counted' = ✅, 'estimated' = ⚠️. A line with both keeps the weakest ('estimated') and both marks
-- in `source` (ADR-0001 section 3). This public seed keeps only the marks in `source`; the evidence behind each
-- line (where it was counted or recorded) stays in the private content pack. `source` is never rendered.
-- Since the 2026-11-26 fact check the marks mean: ✅ recounted or rerun on 2026-11-26, ⚠️ taken from a record
-- made at the time. /d shows no grade badges (owner request); A-C still show them.
-- No phone number anywhere: the owner has not decided (PRD open question).
begin;

truncate profile, projects, project_bullets, project_story, metrics, automations, automation_bullets, skills,
  skill_groups, skill_group_items, timeline
  restart identity cascade;

insert into profile (name, nickname, title, tagline, summary, location, email, github_url, education) values (
  'Suphanut Meeyindee',
  'Fluke',
  'AI Engineer',
  'Production LLM systems with evals and human review · GPU platform',
  'AI Engineer working on production AI systems at a Thai debt-purchase and asset-management company. Wrote the OCR worker behind 67M+ document pages of searchable text, the ranking tiers of the archive''s search box, and the document tools and citation check of its chat-with-data assistant. Built the reliability layer of a team-built ASR + LLM pipeline that scores 100K+ calls on a typical business day. Responsible for the LiteLLM proxy layer for internal LLM traffic, and deploys models on a shared NVIDIA DGX B200 with Kubernetes.',
  'Nakhon Pathom, Thailand',
  'meeyindee.s@gmail.com',
  'https://github.com/fluke-suphanut',
  'B.Eng. Electronics and Computer Systems Engineering, Silpakorn University, 2021–2025'
);

-- Hero metrics (content-pack "Hero metrics": owner decision 2026-11-25, values fact-checked 2026-11-26).
-- 0.033 stays in project 4, 302 in the phone-extraction card. 100K+ and 30+ replace the CV's 90K+ and 35
-- after the recount, so they are no longer CV lines: 'new_approved' (owner asked for the corrected values).
insert into metrics (section, position, value, label, grade, source, disclosure) values
  ('hero', 1, '67M+',  'document pages with OCR text in the archive (Nov 2026)', 'counted', '✅', 'cv'),
  ('hero', 2, '100K+', 'calls scored on a typical business day (Nov 2026)', 'counted', '✅', 'new_approved'),
  ('hero', 3, '30+',   'GPU pods across 5 namespaces on the shared B200 I deploy on (Nov 2026)', 'counted', '✅', 'new_approved'),
  ('hero', 4, '12/12', 'real security issues kept by AI triage in one held-out test (answer key checked by AI models, not yet by people)', 'counted', '✅', 'new_approved');
-- No 'automation' metrics (PM decision 2026-11-25): a lone "530 workflows" reads as if the owner built all
-- of them, and "0 contain the owner's name" is internal method, not work. The site intro line covers it.

-- Projects in the owner's order (content-pack "Projects", 2026-11-25). Titles name the work, not the real system
-- or hardware (content-pack "Project names", owner request 2026-11-26); slugs keep the old internal names. Featured projects carry their story in
-- project_story; the old summary line is gone from the content pack, so featured summaries are NULL.
-- Project 2 merges the former "Shared GPU server" and "LLM gateway" projects; phone extraction is now a card.
insert into projects (slug, position, kind, title, status, summary, summary_grade, stack, demo_prefix, demo_product, disclosure) values
  ('ecm', 1, 'featured', 'Document archive AI: OCR, search and chat with data', 'production', null, null,
    '{Python,OpenSearch,PostgreSQL,"NestJS / Fastify",React,"LLM tool calling",Kubernetes,"GitLab CI"}', 'ecm', 'DocVault', 'cv'),
  ('inference-finetuning-b200', 2, 'featured', 'Self-hosted LLM serving & fine-tuning on a shared GPU server', 'ongoing', null, null,
    '{vLLM,LiteLLM,Kubernetes,"NVIDIA DGX B200",LoRA,Airflow,MLflow,Python}', null, null, 'new_approved'),
  ('call-quality-scoring', 3, 'featured', 'Call-quality scoring with ASR + LLM', 'production', null, null,
    '{TypeScript,Fastify,PostgreSQL,Redis,n8n,LLM,ASR}', 'call-scoring', 'CallScore', 'cv'),
  ('document-extraction-pilot', 4, 'featured', 'Form data extraction: handwriting OCR + LLM + human review', 'pilot', null, null,
    '{Python,Surya,Gemma,PostgreSQL,Redis,n8n}', 'ocr', 'FormLens', 'cv'),
  ('code-security-triage', 5, 'featured', 'AI triage for code security scans', 'POC', null, null,
    '{Python,"GitLab CI","open-source SAST scanners",LLM-as-judge}', null, null, 'new_approved'),
  ('agentic-dw-chatbot', 6, 'featured', 'Agentic data-warehouse chatbot', 'prototype', null, null,
    '{Python,LangGraph,"OpenAI-compatible gateway",PostgreSQL}', 'data-chatbot', 'DataAsk', 'cv'),
  -- Cards: the summary line is also bullet 1 (design/00-shared.md section 13 item 4). The content pack writes
  -- card lines as list fragments; the site starts them with a capital and ends them with a full stop.
  ('phone-number-extraction', 7, 'card', 'Phone number extraction from collection notes', 'pilot on internal platform',
    'Sampled 25,000 production rows before design and narrowed the scope.', null,
    '{Next.js}', 'number-extraction', 'NumberSift', 'cv'),
  ('chat-to-agent-dispatch', 8, 'card', 'Chat-to-agent dispatch bot', 'personal tool',
    'Only I can approve; 1 of 3 requests approved, ran and reported back.', null,
    '{Lark}', 'agent-dispatch', 'TaskRelay', 'cv'),
  ('work-assignment-optimizer', 9, 'card', 'Monthly work-assignment optimizer', 'prototype',
    'Assigned 90.7% of 20,774 tasks in a July 2026 test run.', null,
    '{"cuOpt MILP"}', 'auto-assign', 'CaseRouter', 'cv');

-- Result step: the graded evidence bullets. A body with line breaks is a lead line plus sub-items.
insert into project_bullets (project_slug, position, group_title, body, grade, source) values
  -- ECM: three features (group_title is the feature heading).
  ('ecm', 1, 'OCR of the whole archive', 'Wrote the Python OCR worker. It has OCR''d 65.5M unique page images, and because one file can belong to several documents, 67.7M document pages now carry OCR text (Nov 2026).', 'counted', '✅'),
  ('ecm', 2, 'OCR of the whole archive', 'The archive backfill finished on 18 Oct 2026 with 10 pages left failed.', 'counted', '✅'),
  ('ecm', 3, 'OCR of the whole archive', 'If the OCR engine can''t be reached, the page goes back to the queue without using a retry. If the GPU fails mid-request, a circuit breaker stops the worker after a few pages, so the queue isn''t burned.', 'counted', '✅'),
  ('ecm', 4, 'OCR of the whole archive', 'The backfill once stalled for ~8 h (8 Oct 2026); that fix landed the same day.', 'counted', '✅'),
  ('ecm', 5, 'OCR of the whole archive', 'PDF parsing runs as its own locked-down process: separate user, no network, 3 GB memory cap.', 'counted', '✅'),
  ('ecm', 6, 'OCR of the whole archive', 'Measured before deciding: the PDFs'' own text layer passed a rule-based quality check on only 2% of ~162K sampled pages.', 'estimated', '⚠️'),
  ('ecm', 7, 'One search box over every document field, Google-style', 'One box searches structured fields (contract number, name, document type) and the OCR text. Results come back in 7 fixed tiers: exact code → person name → field text → contract digits → near-miss name → contract prefix → OCR page content. Exact matches always rank first.', 'counted', '✅'),
  ('ecm', 8, 'One search box over every document field, Google-style', 'Typos: with one letter missing from a first name or surname, the same person''s documents were in the top 10 for 50 of 50 test queries (the exact document: 27–30 of 50).', 'estimated', '⚠️'),
  ('ecm', 9, 'One search box over every document field, Google-style', 'Contract number + document type typed together: the right document in the top 10 for 80 of 80 test documents, up from 0. Live since 3 Nov 2026.', 'estimated', '⚠️ / ✅'),
  ('ecm', 10, 'One search box over every document field, Google-style', 'Heaviest search case at 8 concurrent users: p95 1,008 → 681 ms by capping highlight work, passing 9 of 10 runs; 0.77% of documents lose their text snippet.', 'estimated', '⚠️'),
  ('ecm', 11, 'One search box over every document field, Google-style', 'OCR text search is on in the normal search box since 29 Oct 2026.', 'estimated', '⚠️'),
  ('ecm', 12, 'One search box over every document field, Google-style', 'OpenSearch cluster stood up from a script kit of 104 files with 200 test functions.', 'counted', '✅'),
  ('ecm', 13, 'Chat with data: ask questions and get answers that cite the page', E'The team started the in-app AI assistant. I built its document side:\na tool that reads OCR pages under the user''s access rights\nfull-text search across the archive for its search tool, built and tested, behind a feature flag that is not yet on in production (Nov 2026)', 'counted', '✅'),
  ('ecm', 14, 'Chat with data: ask questions and get answers that cite the page', 'Citation check: every page and line the model cites is checked against what it actually read. Citations it cannot back are removed, and the user is told.', 'counted', '✅'),
  ('ecm', 15, 'Chat with data: ask questions and get answers that cite the page', 'Clicking a citation opens the cited page with the source lines boxed on the scan.', 'counted', '✅'),
  ('ecm', 16, 'Chat with data: ask questions and get answers that cite the page', 'Thai test set of 45 questions with known answers, run on production in Sep 2026: 93.3% on the first run, then 100% with 0 made-up citations after a duplicate-name fix.', 'estimated', '⚠️'),
  ('ecm', 17, 'Chat with data: ask questions and get answers that cite the page', 'Confirmed the model choice by eval: two self-hosted models tied on quality over the same 45 questions, and the chosen one answered 2.7× faster (median 2.6 s vs 7.1 s).', 'estimated', '⚠️'),
  ('ecm', 18, 'Chat with data: ask questions and get answers that cite the page', 'I wrote about 19% of the assistant''s back-end code (1,400 of 7,479 surviving lines, Nov 2026).', 'counted', '✅'),

  ('inference-finetuning-b200', 1, null, 'The shared B200 runs 30+ GPU pods across 5 namespaces (33 counted on 26 Nov 2026).', 'counted', '✅'),
  ('inference-finetuning-b200', 2, null, 'Moved a Gemma 4 31B deployment onto its declared GPU: the allocation matches the pin, and the runner recorded a one-annotation change with no rollback.', 'estimated', '✅ / ⚠️'),
  ('inference-finetuning-b200', 3, null, 'I''m responsible for the LiteLLM proxy layer for internal LLM traffic: its config and spend logs. I add models without restarting it, and set the retry policy for one OCR deployment.', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 4, null, 'The LoRA fine-tune of Gemma 4 31B improved court names by +0.096 (1−CER, CI 0.061–0.132), but case numbers dropped by 0.10–0.12. It stayed as the base for the next round.', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 5, null, 'Two smaller 9B models passed 0 of 5 fields, both against the 31B base and against the original thresholds.', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 6, null, 'In single runs with two different page parsers, feeding page text to the fine-tuned model passed 3 of 5 fields, against 2 of 5 for the base. A control run (base + page text) is still to come.', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 7, null, 'A gate of at least 17 of 18 synthetic calibration cases decides which self-hosted model may label calls: one model passed (17/18), one failed (16/18).', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 8, null, 'Closed a fail-open hole in a deployment guard: with no config it now blocks 18 built-in protected workloads. Hooks block 8 risky command shapes for AI coding agents.', 'counted', '✅'),

  ('call-quality-scoring', 1, null, 'LLM canary that checks the LLM generates tokens, not only that the endpoint answers. n8n runs it hourly.', 'estimated', '✅ / ⚠️'),
  ('call-quality-scoring', 2, null, 'Hourly SLO check: will today''s calls be review-ready by 08:00 at the rate measured in the last hour? A morning scoreboard grades each day against p90 16 h and 95% review-ready. On 3 reported days in Aug 2026 (96K–99K calls each), p90 was 1.9–2.4 h.', 'estimated', '✅ / ⚠️'),
  ('call-quality-scoring', 3, null, 'Scoring queue changed from FIFO to recent-first: calls from the last 48 h jump ahead of the backlog, which reached ~200K jobs after the Aug 2026 outage.', 'estimated', '✅ / ⚠️'),
  ('call-quality-scoring', 4, null, 'ASR submits default to 20 concurrent and 120 calls/min, below the ~160/min the GPU sustained after a CUDA out-of-memory burst.', 'estimated', '✅ / ⚠️'),
  ('call-quality-scoring', 5, null, 'Auth guards at 98 API call sites in one security merge request.', 'counted', '✅'),
  ('call-quality-scoring', 6, null, 'Review app: 89,987 QA reviews of ~78,000 calls from 392 reviewer IDs (12 Nov 2026).', 'estimated', '⚠️'),

  ('document-extraction-pilot', 1, null, 'Fine-tuned Surya OCR for Thai handwriting: 0.033 CER on a 364-image handwriting test set; the base model scored 0.518 on that set in an earlier report.', 'estimated', '⚠️'),
  ('document-extraction-pilot', 2, null, 'Suspicious-value flags: a 251-page replay caught 14 of 61 wrong-value pages (was 0); false alarms on good pages went from 2 to 6 of 190.', 'estimated', '⚠️'),
  ('document-extraction-pilot', 3, null, 'Median batch latency 115 s → 63 s on an 8-page synthetic test, by skipping a remote call whose answer was never used. Not yet re-measured in production.', 'estimated', '⚠️'),

  ('code-security-triage', 1, null, 'The shared CI template is included by 219 repositories (Nov 2026).', 'counted', '✅'),
  ('code-security-triage', 2, null, 'On a held-out set of 31 scanner findings covering 24 labeled issues, AI triage kept all 12 real issues and removed 8 of 12 false alarms. The answer key was written and checked by AI models, not yet by people.', 'counted', '✅'),
  ('code-security-triage', 3, null, 'That run made 31 model calls with 0 errors, at a logged cost of USD 0.63 and 78 s.', 'estimated', '✅ / ⚠️'),

  ('agentic-dw-chatbot', 1, null, 'A router to domain agents replaced one agent that picked the wrong datasets.', 'estimated', '⚠️ / ✅'),
  ('agentic-dw-chatbot', 2, null, '10 tools, 7 of them bound to a domain, and 12 of 12 unit tests passing on re-run (LLM and database mocked).', 'counted', '✅'),

  ('phone-number-extraction', 1, null, 'Sampled 25,000 production rows before design and narrowed the scope.', 'estimated', '⚠️'),
  ('phone-number-extraction', 2, null, 'Rewrote an untested prototype with 302 passing Vitest tests and a dry-run write gate.', 'counted', '✅'),

  ('chat-to-agent-dispatch', 1, null, 'Only I can approve; 1 of 3 requests approved, ran and reported back.', 'counted', '✅'),
  ('work-assignment-optimizer', 1, null, 'Assigned 90.7% of 20,774 tasks in a July 2026 test run.', 'counted', '✅');

-- Lines that are not in the CV (CV archive section checked 2026-11-25) were approved by the owner for the public
-- site on 2026-11-25: ECM bullets missing from the CV, every bullet of the new projects 2 and 5, and the new
-- chatbot result line. A bullet merged from a CV line and a new line counts as new (ECM 7). The fact-check
-- rewrite of 2026-11-26 keeps each bullet's origin. Every other bullet keeps the column default 'cv'.
update project_bullets set disclosure = 'new_approved'
  where (project_slug = 'ecm' and position in (2, 5, 7, 9, 10, 11, 15, 16, 18))
     or project_slug in ('inference-finetuning-b200', 'code-security-triage')
     or (project_slug = 'agentic-dw-chatbot' and position = 2);

-- Problem, Approach and Impact steps (content-pack "Projects", told as a story). The trailing marks of each
-- content-pack line are the grade; `source` keeps the marks only. Approach: 'text' before the items = lead line,
-- 'text' after them = closing paragraph; 'sub' = sub-item of the item above.
insert into project_story (project_slug, step, position, role, body, grade, source) values
  ('ecm', 'problem', 1, 'text', 'The company had to move a very large document archive off a legacy commercial system, and the team built its own platform to do it. The PDFs'' own text was too poor to search.', 'estimated', '⚠️'),
  ('ecm', 'approach', 1, 'text', 'The team built the platform. My part was three features, each tested with a test set before or right after launch:', null, null),
  ('ecm', 'approach', 2, 'item', 'I checked whether the PDFs'' own text layer was good enough. It was not, so OCR stayed the text source for the whole archive.', null, null),
  ('ecm', 'approach', 3, 'item', 'I built the fixed ranking tiers behind the single search box.', null, null),
  ('ecm', 'approach', 4, 'item', 'I gave the in-app assistant tools that read pages under each user''s access rights, plus a check on every citation it makes.', null, null),
  ('ecm', 'impact', 1, 'text', 'As of Nov 2026, one box finds a document by contract number, name or a phrase on the page, and the assistant''s answers open the exact page they cite.', 'estimated', '⚠️'),

  ('inference-finetuning-b200', 'problem', 1, 'text', 'Many teams'' models share one GPU server. One document task, reading 5 handwritten fields on legal case pages, had no off-the-shelf model we tested that met the accuracy bar; the best passed 2 of 5 fields.', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 'approach', 1, 'item', 'I run model deployments with vLLM on the team''s Kubernetes cluster, behind a LiteLLM gateway.', null, null),
  ('inference-finetuning-b200', 'approach', 2, 'item', 'For the handwriting task, I set a pass threshold per field, then compared four options with paired 95% confidence intervals on the same 2,280 rows:', 'estimated', '⚠️'),
  ('inference-finetuning-b200', 'approach', 3, 'sub', 'the base model', null, null),
  ('inference-finetuning-b200', 'approach', 4, 'sub', 'LoRA fine-tunes', null, null),
  ('inference-finetuning-b200', 'approach', 5, 'sub', 'smaller 9B models', null, null),
  ('inference-finetuning-b200', 'approach', 6, 'sub', 'a page parser feeding the fine-tuned model', null, null),
  ('inference-finetuning-b200', 'impact', 1, 'text', 'Teams share one GPU server, and internal LLM clients reach models through one gateway. No version has passed all 5 fields yet, so none went to production: model choices rest on paired evals, not impressions.', 'estimated', '⚠️'),

  ('call-quality-scoring', 'problem', 1, 'text', 'A team-built pipeline scores 100K+ calls on a typical business day. In Aug 2026 the LLM stopped generating for ~24 h, and no alert fired, because every health check still said OK. It was found by hand.', 'counted', '✅'),
  ('call-quality-scoring', 'approach', 1, 'text', 'My part was the reliability layer, and I aimed it at the service, not its parts:', null, null),
  ('call-quality-scoring', 'approach', 2, 'item', 'a canary that checks the LLM really generates tokens', null, null),
  ('call-quality-scoring', 'approach', 3, 'item', 'an SLO check derived from the service goal', null, null),
  ('call-quality-scoring', 'approach', 4, 'item', 'a recent-first queue', null, null),
  ('call-quality-scoring', 'approach', 5, 'item', 'ASR caps set after GPU memory bursts', null, null),
  ('call-quality-scoring', 'approach', 6, 'text', 'Each check runs as its own scheduled workflow.', null, null),
  ('call-quality-scoring', 'impact', 1, 'text', 'If the LLM stops generating, the hourly canary should now raise an alarm within the hour; a real outage has not tested it yet. After an outage, the last 48 h of calls are scored before the backlog.', 'estimated', '✅ / ⚠️'),

  ('document-extraction-pilot', 'problem', 1, 'text', 'Values on scanned forms, including Thai handwriting, had to reach four legacy databases. A value no person has reviewed must never overwrite one that is already there.', 'estimated', '⚠️'),
  ('document-extraction-pilot', 'approach', 1, 'item', 'I fine-tuned OCR for Thai handwriting.', null, null),
  ('document-extraction-pilot', 'approach', 2, 'item', 'An LLM extracts fields per document type.', null, null),
  ('document-extraction-pilot', 'approach', 3, 'item', 'Suspicious values are flagged.', null, null),
  ('document-extraction-pilot', 'approach', 4, 'item', 'Every send to the legacy systems follows a person''s action.', null, null),
  ('document-extraction-pilot', 'impact', 1, 'text', 'Pilot so far: 2,280 pages in 50 batches (Jul–Nov 2026). Since Sep 2026, every send to the legacy systems (1,120 of 1,120) followed a person''s click.', 'counted', '✅'),

  ('code-security-triage', 'problem', 1, 'text', 'The team replaced a commercial code scanner with open-source tools, which raise far more findings than developers can read. The replacement had to cut false alarms without hiding real issues.', 'estimated', '⚠️'),
  ('code-security-triage', 'approach', 1, 'item', 'Open-source scanners run from a shared CI template that the team maintains, opt-in per repository. I built the AI triage layer that reads their findings. It runs as a separate batch, not inside CI yet.', null, null),
  ('code-security-triage', 'approach', 2, 'item', 'An LLM reads the code around each finding and drops false alarms.', null, null),
  ('code-security-triage', 'approach', 3, 'item', 'Every snippet passes a secret and personal-data masker and a Gitleaks rescan before the model sees it; any hit stops the batch.', null, null),
  ('code-security-triage', 'approach', 4, 'item', 'I measured once on a held-out set, with the prompt committed before the run.', null, null),
  ('code-security-triage', 'impact', 1, 'text', 'An early test suggests the triage can cut noise without hiding real issues. It is still a POC, and the triage step is not yet part of the pipeline.', 'estimated', '⚠️'),

  ('agentic-dw-chatbot', 'problem', 1, 'text', 'Built for staff to ask data questions in Thai across many overlapping datasets. One agent kept picking the wrong dataset, and LLMs are unreliable at arithmetic.', 'estimated', '⚠️'),
  ('agentic-dw-chatbot', 'approach', 1, 'item', 'A router hands each question to one of 4 domain agents.', null, null),
  ('agentic-dw-chatbot', 'approach', 2, 'item', 'A restricted calculator does the maths and refuses sums over 10,000 rows, so the LLM never guesses a number.', null, null),
  ('agentic-dw-chatbot', 'approach', 3, 'item', 'Eval sets check most answers against the database.', null, null),
  ('agentic-dw-chatbot', 'impact', 1, 'text', 'It is a prototype and not in production. It shows the design: route each question to a domain, and let tools compute every number.', 'counted', '✅');

-- Every story line is new site copy (not in the CV); the owner approved the story format and text on 2026-11-25.
update project_story set disclosure = 'new_approved';

-- Automation with n8n: the owner approved all 4 stories for the public site on 2026-11-25 (content-pack), so 'new_approved'.
insert into automations (slug, position, title, note, disclosure) values
  ('monitoring-workflows', 1, 'Monitoring workflows for call scoring', 'canary is in CV', 'new_approved'),
  ('nightly-asr-recovery', 2, 'Nightly recovery of failed speech-to-text jobs', null, 'new_approved'),
  ('human-approved-sync', 3, 'Human-approved sync from OCR to the legacy system', null, 'new_approved'),
  ('choosing-not-to-use-n8n', 4, 'Choosing not to use n8n', 'story card', 'new_approved');

-- A body line that starts a list keeps the list items on the following lines (one per line); the page shows
-- them as a sub-list with the bullet's single badge after the last item.
insert into automation_bullets (automation_slug, position, body, grade, source) values
  ('monitoring-workflows', 1, 'Each health check runs as its own scheduled workflow: an hourly LLM canary, an hourly SLO check (will today''s calls be review-ready by 08:00?), and a daily morning summary of p90 turnaround and review-ready rate.', 'estimated', '⚠️'),
  ('monitoring-workflows', 2, 'Why separate: in Aug 2026 the first canary was a branch in the monitor workflow and never ran, because n8n stops the whole run when the first node throws.', 'estimated', '⚠️'),
  ('monitoring-workflows', 3, 'Targets come from the service goal: the hourly alarm fires if today''s calls won''t be review-ready by 08:00, and the morning scoreboard grades each day against p90 16 h and 95% review-ready.', 'counted', '✅'),
  ('monitoring-workflows', 4, 'The morning summary is a report, never an alarm: it posts the scoreboard and has no failing condition, so the alarm channel stays meaningful.', 'counted', '✅'),
  ('nightly-asr-recovery', 1, 'Found the recovery workflow switched off with 193K+ failed recordings waiting (Aug 2026), and turned it on with a watched first run.', 'estimated', '⚠️'),
  ('nightly-asr-recovery', 2, 'Each hourly run inside a 01:00–06:00 window checks the worker and the ASR, sends a one-row canary, then sends a wave capped at 2,500 ASR jobs.', 'counted', '✅'),
  ('nightly-asr-recovery', 3, 'First night (Aug 2026): 15,005 rows resubmitted, 94.80% recovered, and that day''s service still closed on target.', 'estimated', '⚠️'),
  ('nightly-asr-recovery', 4, 'Kept a second "recovery" workflow off on purpose. Its filter skipped the status holding 97.6% of the eligible failed rows (Aug 2026), and it started from rows past the recorder''s retention.', 'estimated', '✅ / ⚠️'),
  ('human-approved-sync', 1, 'Built in my own n8n project: v1 Jul 2026, v2 created Jul 2026 and active, 22 nodes, last edited Nov 2026.', 'estimated', '✅ / ⚠️'),
  ('human-approved-sync', 2, 'One webhook writes reviewed values to the legacy databases of 4 portfolios. An LLM step splits free-text addresses into fields before the write.', 'counted', '✅'),
  ('human-approved-sync', 3, 'Added a guard that rejects sends from parent documents and from states that should not sync; live since 18 Sep 2026.', 'counted', '✅'),
  ('human-approved-sync', 4, 'Fixed the workflow so values the worker blocked stay blocked; before the fix, a fallback could re-send them. The apply failed twice with HTTP 500 until the root cause was found: a WAF blocked one string in the request body. Live since 7 Oct 2026.', 'estimated', '✅ / ⚠️'),
  ('human-approved-sync', 5, 'A person starts every sync.', 'counted', '✅'),
  ('choosing-not-to-use-n8n', 1, 'The Lark dispatch bot started as an n8n draft. The n8n API returned HTTP 500 on two create attempts, so the next morning it became a direct WebSocket bot that needs no inbound webhook.', 'estimated', '✅ / ⚠️');

-- automation_bullets above take the column default ('new_pending'); the owner approved them on 2026-11-25.
update automation_bullets set disclosure = 'new_approved';

insert into skills (position, name) values
  (1, 'LiteLLM'), (2, 'LangGraph'), (3, 'agents & tool calling'), (4, 'LLM-as-judge evals'),
  (5, 'human review'), (6, 'canary & SLO'), (7, 'OCR (Surya)'), (8, 'ASR'), (9, 'OpenSearch'),
  (10, 'Kubernetes'), (11, 'NVIDIA DGX B200'), (12, 'Airflow'), (13, 'MLflow'), (14, 'Python'),
  (15, 'TypeScript'), (16, 'SQL / PostgreSQL'), (17, 'Fastify'), (18, 'Next.js'), (19, 'pytest'),
  (20, 'Vitest'), (21, 'GitLab CI'), (22, 'n8n');

-- Skill groups for prototype D (content-pack "Skills (4 groups, replaces the flat chip list on /d)").
insert into skill_groups (position, title) values
  (1, 'Document AI'), (2, 'LLM apps & evals'), (3, 'Inference & fine-tuning'), (4, 'Automation & delivery');
insert into skill_group_items (group_position, position, name) values
  (1, 1, 'OCR (Surya, VLM page parsers)'), (1, 2, 'field extraction'), (1, 3, 'OpenSearch'), (1, 4, 'human review'),
  (2, 1, 'agents & tool calling'), (2, 2, 'LangGraph'), (2, 3, 'chat with data'), (2, 4, 'LLM-as-judge'),
  (2, 5, 'eval sets with known answers'), (2, 6, 'citation checks'),
  (3, 1, 'vLLM'), (3, 2, 'LiteLLM'), (3, 3, 'NVIDIA DGX B200'), (3, 4, 'Kubernetes'), (3, 5, 'LoRA fine-tuning'),
  (3, 6, 'paired evals'), (3, 7, 'Airflow'), (3, 8, 'MLflow'),
  (4, 1, 'n8n'), (4, 2, 'canary & SLO'), (4, 3, 'GitLab CI'), (4, 4, 'Python'), (4, 5, 'TypeScript'),
  (4, 6, 'SQL / PostgreSQL'), (4, 7, 'Next.js'), (4, 8, 'pytest'), (4, 9, 'Vitest');

insert into timeline (position, kind, role, org, period, start_date, end_date, note) values
  (1, 'work', 'AI Engineer', 'JMT Network Services PCL', 'Mar 2026 – present', '2026-03-01', null, null),
  (2, 'work', 'Full Stack Developer Intern', 'Somsri Garment Co., Ltd.', 'Apr–Jun 2024', '2024-04-01', '2024-06-30', 'Nuxt, TypeScript ERP modules'),
  (3, 'education', 'B.Eng.', 'Silpakorn University', '2021–2025', '2021-06-01', '2025-05-31', null);

commit;
