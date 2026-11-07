# ArthAI core implementation plan

## Product decision

Build a dependable, evidence-backed company research and lead workflow for a sales team. The first complete release must take a prospect submission through sourced research, a trustworthy report, delivery, report chat, and correctly attributed CRM activity.

Using Gemini or Groq does not prevent this from being a real product. The product's own value must come from evidence collection, company identity resolution, durable workflows, permissions, useful recommendations, and measured sales outcomes. More agent prompts or an in-house language model are not release goals.

Initial scope: one sales organization with authenticated staff and separately scoped prospect access. Do not add multi-tenant infrastructure until serving multiple organizations is required. Preserve existing records and routes where practical; migrate data explicitly rather than resetting the database.

## Implementation rules

## Local implementation progress — 5 November 2026

The local code for phases 1–5 is implemented: scoped access and safe scraping; one Prisma client/schema and validated jobs; transactional intake and dispatch reconciliation; evidence-backed research and explicit review failures; private PDF storage and separate email status; repaired chat/fallback/history; prospect-only experimental scoring; conservative discovery and monitoring; recorded CRM metrics and staff sales outcomes. Repeated form submissions use an idempotency key. Legacy public PDF URLs are disabled.

Phase 6 includes focused regression tests, CI, an environment template, migration SQL, and deployment instructions. A normal local production build has completed, type checks pass, and lint has zero errors (remaining image/unused-code warnings are non-blocking). Twenty regression tests and fourteen anonymous HTTP access checks passed. A local desktop/mobile browser smoke check passed sign-in rendering, three form steps, consent opt-in, runtime-error checks, and horizontal overflow checks. Browser/Playwright were unavailable, so this used the already-installed Puppeteer; no form was submitted and no paid provider or outreach was called.

These are local checks, not proof that all release gates are complete. Database migrations have **not** been applied to the configured database. Staging still needs a schema comparison/baseline, private shared-drive setup, staff/signing secrets, provider-key and webhook checks, real designated test-recipient delivery, worker-interruption integration tests, and workload/cost measurements. A replacement project-local native Python environment now passes five tests, including loading the saved model; localhost HTTP health, scoring, and invalid-input checks also pass. Independent model accuracy evaluation remains unverified. Docker is optional for isolated database tests and is not required for application startup. A previous isolated migration-preservation check passed on synthetic records; the complete staging workflow has not yet passed end to end. Do not mark the project production-ready until these gates pass. See `DEPLOYMENT.md` for the exact migration and validation sequence.

Email recovery now leaves pre-dispatch storage outages pending for retry, while ambiguous provider responses remain uncertain to prevent automatic duplicate outreach. Regression checks cover concurrent retry, accepted-email preservation, and unsubscribed leads. The default development command starts web and worker; the experimental scorer has its own native command. CI installs Python dependencies before running scorer tests.

The next recovery checks added stored lead/company and exact-attempt identity enforcement, recovery of retained failed delivery jobs, and tests for resuming an already saved PDF checkpoint. All 24 regression tests and lint for the changed files pass. The optional native artifact test also passes: it runs the real PDF generator and private file storage with a fault injected after the artifact checkpoint, verifying one research pass, one PDF render, and one captured email. Its database and provider operations are simulated. The full HTTP staging workflow remains unrun because the isolated PostgreSQL/Redis services are unavailable; no production database was used instead.

### Rules followed during implementation

The next validation step now has one command, `npm run test:staging`, plus a GitHub Actions staging job with disposable PostgreSQL/pgvector and Redis services. The runner checks migration preservation, starts the fixture-backed web/worker/Redis bridge, runs the HTTP workflow, and cleans up its processes. It refuses remote database endpoints and occupied app ports, invalidates stale passing summaries, and redacts configured secrets from failure diagnostics. Local prerequisite checks correctly refuse to proceed while the isolated database is absent. CI results must be checked after publication; this addition alone does not establish that the full workflow passes.

Durable follow-up scheduling is now implemented locally. Report acceptance and the three consented follow-up tasks commit in one transaction. Due tasks recover after queue outages; atomic claims and recorded uncertain states prevent blind resend after interrupted dispatch. Consent is checked again at send time, and messages over 24 hours late expire. Historical reports are not enrolled and old untracked queue jobs cannot send. The new additive migration has not been applied to a database. The schema validates, client generation and type checking pass, and 33 regression tests pass using controlled database/provider doubles. Real database migration and Redis integration checks remain outstanding.

- Keep Next.js, PostgreSQL/pgvector, BullMQ/Redis, and the existing Node worker. Read the installed Next.js guides before changing framework code.
- Use one authoritative Prisma schema and shared, validated job/report contracts. Add only the small shared modules needed by actual callers.
- Keep report generation, verification, PDF availability, and email delivery as separate recorded results. A skipped or failed step must not report success.
- External services may fail. Persist enough state to retry the failed operation without repeating successful delivery or creating duplicate work.
- Treat user input, fetched websites, and model output as untrusted. Website content must be evidence, not executable instructions.
- Add focused tests for security, state transitions, data writes, failure handling, and changed contracts. Do not add tests that merely repeat markup.
- Do not send real outreach or run paid research as part of default automated tests. Use local fixtures and provider doubles; run explicitly scoped staging checks separately.

## Phase 1 — Secure and repair the existing path

Priority: release blocking. Audit findings 1–6, 9–13, 17–18.

1. Protect staff pages and every staff API with session and permission checks. Use scoped, expiring prospect access for report pages, PDFs, status, streams, and chat. Preserve intended team sharing through explicit access rules.
2. Replace raw HTML chat rendering with safe Markdown. Reject client-supplied system roles and validate chat request shape and length.
3. Restrict scraping to public HTTP/HTTPS targets. Validate resolved addresses and redirects, intercept unsafe browser requests, and document the worker network restriction required in deployment.
4. Add request limits and job/model budgets to report submission, chat, discovery, and monitor triggers. Use bounded timeouts for external calls; avoid unlimited producer waits when Redis is unavailable.
5. Generate both database clients from the root schema. Add and review migrations; verify both processes see the same models. Never reset existing data to fix schema drift.
6. Link reports to their originating request/lead. Carry real lead/report IDs, canonical persona, structured challenge tags, and free-text context through inbound, retry, discovery, and monitoring payloads.
7. Repair report links, follow-up scheduling, contact mapping, history loading, and object-to-text embedding formatting. Rebuild affected embeddings through a scoped repair operation.
8. Replace worker-local PDF serving with persistent object storage. Store the object reference and authorize downloads. Choose the storage service from the existing deployment account rather than adding a new platform by default.
9. Correct streaming fallback at the actual provider failure boundary. Handle failures before output begins; surface mid-answer failures without silently combining answers from different models.

Exit checks:

- An anonymous caller cannot list, delete, retry, or monitor CRM records. A prospect cannot read a different report or chat.
- Internal addresses, redirects to internal addresses, and unsafe browser subrequests are rejected in controlled fixtures.
- A fixture submission creates correctly linked records and one processable job; both clients support discovery models.
- Generated links use real IDs; chat history survives reload; indexed sections contain actual text.
- A PDF written by the worker is retrievable from a separate web process after worker restart.
- A simulated initial provider failure follows the configured fallback order and returns a valid answer or explicit failure.

## Phase 2 — Make processing and delivery dependable

Priority: release blocking. Audit findings 5–7, 10–11, 15.

1. Commit related lead/report/request writes in a transaction. Record dispatch intent durably with the report, and reconcile records whose enqueue step failed. Use stable job IDs and a guard against concurrent active generation.
2. Define legal generation states and separate verification, artifact, and delivery states. Persist useful failure reasons and attempt counts.
3. Reuse successful company research only under a documented freshness rule. Keep prospect-specific challenges, access, recommendations, and delivery separate from reusable research. Never treat failed work as a valid cache hit.
4. Retry failed steps with bounded backoff. Reconcile worker crashes and interrupted jobs. Prevent duplicate email through delivery records and provider idempotency where supported.
5. Check Resend's returned error objects as well as thrown exceptions. Record provider acceptance separately from delivered, bounced, or failed events. Schedule follow-ups only for valid, eligible recipients, and check unsubscribe status at send time.
6. Correct monitoring payloads. Add a recurring schedule, deduplicate observed signals, and prevent repeated unchanged signals from causing re-audit loops.

Exit checks:

- Redis failure after database commit is recoverable and does not create permanent pending work.
- Killing a worker at each major boundary does not lose the request or duplicate successful delivery.
- Failed email does not turn the whole report into a failure or falsely claim delivery.
- Repeating a submission or monitor event does not start duplicate active work.
- Follow-ups use the correct lead and report and stop after unsubscribe.

## Phase 3 — Build the evidence-backed intelligence core

Priority: required before marketing reports as verified. Audit findings 7–8, 13, 16.

1. Resolve the company's identity against its domain. Do not accept the first name match or invent a domain as verified identity.
2. Capture useful public page text and metadata. Start with a small bounded set of relevant pages, such as home, about, product, and pricing. Apply crawl limits and isolate failures.
3. Store source URL, retrieval time, available publication date, and supporting excerpts. Separate observed facts, prospect statements, inferences, and recommendations.
4. Require factual report claims to reference stored evidence. Treat unsupported claims as unknown or clearly labelled estimates. Never replace a missing publication date with today's date.
5. Make specialist work depend on actual missing evidence. Retain parallel agents only where they improve measured coverage or quality. Cap reflection/rewrite attempts and total model usage.
6. Run verification against original evidence, rather than treating other agents' assertions as proof. A verifier outage produces an unverified result or retry, never a perfect score.
7. Generate persona-specific recommendations tied to the prospect's stated challenge. Keep uncertainty labels in the web report, email, and PDF.
8. Ground preview in retrieved evidence and cache it with an expiry. Return an honest insufficient-data response when appropriate.
9. Verify discovery filters against actual records. Count distinct corroborating sources, preserve unknown size/region values, and queue only candidates meeting explicit rules.

Exit checks:

- Every factual claim labelled verified has a valid supporting source reference.
- A fictional company and a website with little information produce insufficient-data results rather than fabricated funding, scores, or news.
- Similar company names do not cause identity mixing.
- Conflicting or stale evidence is visible; verification failure cannot become successful verification.
- Persona and challenge changes affect recommendations without changing established company facts.
- Discovery rejects a candidate that does not meet requested region/size criteria; unknown is not treated as a match.

## Phase 4 — Correct report chat and intent attribution

Priority: required for useful CRM signals. Audit findings 9, 12, 14, 17–18, 20.

1. Persist source-aware report chunks and search only within the authorized report. Replace old embeddings safely when a report version changes.
2. Build chat context from validated server-side report data and bounded conversation history. Cite report evidence and say when an answer is unavailable.
3. Keep generation quality, readiness scores, engagement, and intent probability in separate fields with clear units. Use atomic changes where counters are needed.
4. Attribute prospect activity to the correct authenticated/scoped lead session. Staff chat must not change prospect buying intent. Shared report activity must not overwrite every contact at a company.
5. Record scoring availability and model version. An unavailable scorer is unknown, not positive buying intent. Alert on a meaningful threshold crossing with deduplication.
6. Keep the existing classifier experimental until evaluated. Compare it with a transparent baseline on independently labelled examples; do not assume a custom model is needed.

Exit checks:

- Reloaded history displays correctly and retrieval never crosses report access boundaries.
- Chat answers can identify their supporting report/source passages.
- Repeated greetings do not create HOT leads; staff testing does not score prospects.
- Concurrent messages preserve updates; a scoring outage creates no invented intent increase.
- Scoring evaluation reports precision, recall, false positives, and probability calibration on independent data.

## Phase 5 — Make the CRM reflect real outcomes

Priority: required for a trustworthy dashboard. Audit findings 12–14, 19.

1. Return explicit lead/contact/report data instead of compatibility placeholders. Paginate report lists and bound stage/history payloads.
2. Normalize persona values and show generation, verification, PDF, and delivery status independently.
3. Record report views, downloads, prospect conversations, and staff-confirmed outcomes. Define what each metric counts and which date range/time zone it uses.
4. Replace random conversion rates, fixed trends, and decorative sparklines with actual event aggregations. Show unavailable metrics honestly until tracking exists.
5. Generate trend summaries only from measured, sufficiently sized data. Keep discovery research separate from consented inbound outreach eligibility.

Exit checks:

- Known fixture events produce exact expected totals, conversion rates, and persona breakdowns.
- Report count and unique lead count remain distinct.
- Every displayed trend comes from a recorded calculation; small/empty data sets do not imply unsupported conclusions.

## Phase 6 — Validate and release the complete workflow

1. Add documented startup and deployment instructions for web, worker, database migrations, Redis, storage, Chromium, and optional scoring. Provide a complete secret-free environment example and startup validation.
2. Keep automated checks network-independent where practical. Fix relevant lint errors, use one report/job contract, and remove stale duplicated definitions after checking their callers.
3. Add a reproducible CI path for schema/client validation, types, lint, focused tests, and production build. Make build font handling reliable in restricted environments.
4. Run a staging workflow with designated test recipients and controlled research targets. Verify delivery, report access, download, citations, chat, attribution, and follow-up eligibility.
5. Measure completion time, failure rate, per-report model/crawl cost, and queue behavior at an agreed launch workload. Set launch budgets and timeouts from those results rather than invented targets.
6. Release behind controlled access first. Align README and homepage claims with verified behavior; expand access after the workflow meets its checks.

Release gate: a real authorized prospect can submit once, receive a sourced report, open its working PDF and chat, and generate correctly attributed CRM activity; failures are visible and recoverable without data leakage or duplicate outreach.

## Deliberately deferred

- Training an in-house language model, adding an agent framework, splitting more microservices, and redesigning the interface.
- Multi-organization tenancy, broad autonomous outbound campaigns, and additional model/provider choices.
- Claims of accurate buying probability, verified intelligence, or conversion improvement until measured.

## Current verification baseline

The audit at commit c2d2f95508a5e085f83ae1b79410b80bb5c5519f found that TypeScript passed; lint reported 86 errors and 51 warnings; production build failed while fetching Google Fonts in the local environment. Isolated checks reproduced missing discovery models in the worker client, undefined email identifiers, object serialization in report chunks, and streaming failures escaping the fallback catch. Live infrastructure, paid provider behavior, email/Slack delivery, browser/device QA, and load performance remain unverified.
