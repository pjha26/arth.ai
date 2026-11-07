# ArthAI core implementation plan

## Product decision

Build a dependable, evidence-backed company research and lead workflow for a sales team. The first complete release must take a prospect submission through sourced research, a trustworthy report, delivery, report chat, and correctly attributed CRM activity.

Using Gemini or Groq does not prevent this from being a real product. The product's own value must come from evidence collection, company identity resolution, durable workflows, permissions, useful recommendations, and measured sales outcomes. More agent prompts or an in-house language model are not release goals.

Initial scope: one sales organization with authenticated staff and separately scoped prospect access. Do not add multi-tenant infrastructure until serving multiple organizations is required. Preserve existing records and routes where practical; migrate data explicitly rather than resetting the database.

## Implementation progress (7 November 2026)

The remaining code and controlled-validation work has been implemented and pushed in focused commits on `codex/core-workflow-staging`. These changes are not merged into the production branch. Production data has not been migrated, and no real outreach or model generation was performed by the automated tests or read-only preflight.

| Plan area | Implemented and checked | Still needs real-world evidence |
| --- | --- | --- |
| Security and contracts | Scoped access, safe scraping, one dependency/schema/client set, patched Next.js/dependencies, origin checks, private PDFs, bounded status/history, startup validation | Production credentials and actual database-copy comparison |
| Durable workflow | Transactional intake, queue reconciliation, reviewed/PDF checkpoints, fresh public-excerpt reuse, separate email states, durable consented follow-ups, indexed signed receipts | Designated-recipient delivery and private shared-drive upload/download |
| Evidence core | Bounded original sources, identity checks, quote validation, independent AI review, persona/challenge-specific output, explicit insufficient-evidence/quota/verifier failures | Human review of factual accuracy, useful recommendations, conflicts, and quality on known companies |
| Chat and intent | Scoped retrieval/history, streaming fallback, saved-message ordering, explicit unavailable/disabled state, durable alert deduplication, independent evaluation tooling | Independently labelled held-out messages; scoring remains experimental and off by default |
| CRM and metrics | Recorded outcomes, correct active-state filtering, separate engagement/readiness/intent, measured model usage and completion timing, account-rate cost estimates | Verified rate card and an agreed real-provider workload |
| Validation and release | CI schema/types/lint/build/tests, service-backed HTTP workflow, real worker termination checks, failure scenarios, five-report capacity smoke, desktop/mobile browser checks, read-only readiness command | Owner-managed service configuration, backup/copy validation, real delivery/quality/load checks before a controlled production release |

Local regression checks now include 52 Node tests and 11 Python tests. The native PDF test renders a real private PDF, resumes a saved checkpoint, captures one email, and proves the browser cannot fetch a private-network logo. CI uses real disposable PostgreSQL/pgvector and Redis, with simulated generation/email/scoring providers. It checks original and follow-up receipts, unsubscribe/bounce/complaint handling, chat attribution, operational metrics, and the completion/CRM UI. The browser path uses the existing Puppeteer dependency because Browser and Playwright are unavailable; desktop and mobile viewports are 1365x900 and 390x844. Screenshots are CI artifacts, not committed files.

The recovery suite sends actual SIGKILL to its worker after research, PDF persistence, accepted email, and simulated provider acceptance before a response. It checks one provider attempt and the correct recoverable or uncertain state. Additional scenarios cover insufficient evidence, private redirects, quota failures, and verifier outages. The five-report workload records actual fixture-worker timings at concurrency two; it does not establish paid-provider latency, launch capacity, or real cost. Cost stays unknown without account-specific rates or usage.

Compatible dependency updates and two scoped transitive overrides cleared the npm advisories observed during this implementation. The worker uses the root installation, avoiding older duplicate libraries. Experimental fitting no longer generates synthetic labels with a paid model or overwrites the checked-in model; evaluation rejects duplicate examples and known training overlap and reports false positives/calibration against a keyword baseline.

`npm run release:check:live` checked configured services without modifying them. Model metadata was accessible. Signing/staff/canonical URL, explicit private-storage, and email/webhook settings were incomplete; database migration history, Redis, Drive, and sender readiness could not be verified. This is not a production approval. No further code can substitute for those service settings, a designated recipient, independent evaluation data, and an agreed real-provider workload. Those details are not needed to use the controlled development/staging workflow, and can be supplied later. See `DEPLOYMENT.md` and the private ignored `.data/release-check.json`.

## Implementation rules

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
