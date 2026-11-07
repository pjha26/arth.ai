# ArthAI deployment and validation

The implementation is for one sales organization. Staff use an eight-hour signed session with a team password; prospects use seven-day report-scoped links. This is intentionally a small-team setup. Give individual staff identities through a managed identity provider before requiring individual audit trails or serving multiple organizations.

## Install and configure

Use Node 22 and Python 3.11 or later. From the repository root, run `npm ci`, then `npm --prefix worker ci`. The root Prisma schema and generated root client are authoritative for both processes. Worker deployment must include the root package, `shared/`, `prisma/`, and `worker/`; deploying the worker folder alone is unsupported.

Copy `.env.example` to `.env.local` and fill its values. Do not commit real values. Generate `AUTH_SECRET` using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; use the same value on web and worker. Set a unique team password of at least 16 characters. Changing the signing secret invalidates every staff session and prospect link. Team access fails closed when configuration is missing.

Configure `NEXT_PUBLIC_APP_URL` to the canonical HTTPS web origin. Browser mutation origins are checked against this configured origin, including behind a reverse proxy with an internal request hostname. Client-supplied Host/forwarded-host headers cannot expand the allowlist. Vercel's trusted client-IP header is used for per-IP limits; other hosts share a conservative fallback bucket until a trusted proxy-specific identity source is configured. Redis rate-limit failure returns 503 rather than making paid endpoints unlimited.

For production PDF storage, use a private Google Drive **shared-drive folder** that the service account can write to. Service accounts generally cannot own files in an ordinary personal Drive folder. Set the existing service-account credentials and folder ID, ensure there are no inherited public permissions, and test upload and download as separate processes. The application does not publish files. Local development can set `REPORT_STORAGE=local`; files go to `.data/reports`, never `public/`. Local storage is rejected in production.

Chromium needs its normal sandbox support. Install its OS dependencies and run the worker as a non-root user; do not add `--no-sandbox` to bypass deployment problems. Block worker access to private, loopback, link-local, and cloud-metadata network destinations at the network layer too. The primary scraper pins validated public DNS at socket creation, checks every redirect, and bounds response size. Optional static screenshots disable JavaScript and all browser network requests. They do not measure the interactive site's performance or conversion behavior.

## Preserve and migrate existing data

**Do not reset or force-push the database schema.** Migrations are supplied but are not automatically applied by the web build.

1. Back up the database. Stop old workers and pause intake during deployment. Inventory old queue jobs; their earlier payload shape is incompatible with the new validated contract. Do not replay them automatically against guessed lead associations.
2. On a new empty database, run `npm run db:deploy` to apply the baseline, core, and durable-follow-up migrations.
3. On an existing database with no Prisma migration history, compare its schema with `20261104000000_baseline/migration.sql` first. If it matches, mark that baseline applied using `npx prisma migrate resolve --applied 20261104000000_baseline`, then run `npm run db:deploy`. If it differs, reconcile the differences on a database copy before baselining; do not mark an unmatched baseline applied. The old worker schema lacked discovery tables and nullable contacts, so it may not match.
4. Run `npm run db:generate`. The core migration preserves historical score values in legacy fields because the old scores mixed engagement with readiness and intent. Existing reports stay unverified and without a guessed requester relationship. Existing contact intent estimates are archived and cleared.
5. Map legacy reports to original leads only when the original association is known. Until then, they are staff-only, have no newly issued prospect link, and are not automatically emailed. Old chat messages retain actor `legacy` and are not mixed into new prospect conversations.
6. Existing local PDFs are not automatically uploaded or publicized. Legacy `/reports/*` URLs are disabled. Reprocess or migrate a specific old report only after its requester and private storage are established. Do not erase originals until the migration has been checked.

The dispatch reconciler recovers newly saved pending reports every minute. Stable job IDs include the report attempt. Generation retries reuse reviewed analysis and an existing PDF checkpoint. Failed generations can be retried by staff. Missing evidence stays an explicit failure, not a template report.

## Run and check

- Web: `npm run dev:web`, or production `npm run build` followed by `npm start`.
- Worker: `npm --prefix worker start` (bootstrap loads root `.env.local` before provider modules).
- Development: `npm run dev` starts web and worker. The experimental scorer is optional and runs separately with `npm run dev:ml`; it remains disabled unless `ENABLE_INTENT_SCORING=true`. Use a private scorer service URL in production.
- Local checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:ml` with the ML virtual environment installed.
- Native artifact check: `npm run test:artifacts` runs the actual Chromium PDF generator and private local storage, injects a failure after the PDF checkpoint, then verifies resume and one captured email. Its database and providers are test doubles; it needs no Docker or live credentials. The PDF and result are saved under `.data/artifact-check/`. This does not replace real database, Redis, provider, or process-kill staging tests.
- Offline model evaluation: from `ml/`, run `python evaluate.py --data /path/to/independently-labelled-messages.csv`. The CSV must contain `message,label`. Do not use training samples or generated synthetic samples to claim launch accuracy. Inspect precision, recall, and Brier score against the keyword baseline.

Configure Resend's signed webhook at `/api/webhooks/resend` with `RESEND_WEBHOOK_SECRET`. Provider acceptance is shown as `accepted`, never `delivered`; signed delivery/bounce/failure events update it. A dispatch interrupted after possible provider acceptance is `uncertain` and requires provider-log review before any manual resend. Do not blindly reset it to pending. Follow-ups require explicit opt-in, a valid email, successful initial acceptance, and no unsubscribe. No email is sent by the default test suite.

A PDF storage failure before dispatch leaves email `pending` with an error and lets the queue retry. Only failures after claiming dispatch become `uncertain`; a successful provider acceptance is retained even if a later notification fails.

Pending delivery reconciliation also retries retained failed delivery jobs, so an exhausted queue job cannot permanently block recovery after storage returns. New failed delivery jobs are removed to allow later reconciliation. Only reports still marked `pending` for delivery enter this path; `uncertain` messages require review. Worker report jobs must match the stored report's lead, company, and exact attempt job ID before writing research.

Follow-ups are durable database tasks, unique per report and stage. When the first email is accepted, the same transaction saves consented tasks due after 2, 5, and 10 days. The worker queues up to 50 due tasks every minute and rechecks consent, unsubscribe, recipient, and original report delivery before sending. Tasks more than 24 hours overdue are skipped to prevent a burst after a long outage. A dispatch is claimed once; provider-response failures and dispatches left in progress for ten minutes become `uncertain` and need provider-log review. Acceptance means provider acceptance, not confirmed delivery of the follow-up.

Apply `20261106000000_durable_followups` before starting the updated worker. It adds a new table without enrolling historical reports. Row-level security denies direct public client access; the backend Prisma role must own the table or have `BYPASSRLS`. Existing queue-only follow-ups lack durable task IDs and are deliberately ignored: inspect old jobs/provider logs before explicitly rescheduling any outreach. The old lead-level stage fields remain for historical data; the task table now determines whether a follow-up has been accepted. The new migration still requires validation on a database copy.

### Native Python setup (no Docker)

On Windows with Python 3.11 or 3.12 installed:

```powershell
py -3.12 -m venv .data/ml-venv
.data/ml-venv/Scripts/python.exe -m pip install -r ml/requirements.txt
npm run test:ml
npm run dev:ml
```

On macOS/Linux use `python3.12 -m venv .data/ml-venv`, then `.data/ml-venv/bin/python -m pip install -r ml/requirements.txt`. The npm commands select this project-local environment on both platforms. An existing environment can be selected with an absolute `ML_PYTHON` environment variable. Do not reuse `ml/venv` if its base Python installation has moved. The saved model requires the pinned scikit-learn version; passing these tests does not establish prediction accuracy.

### Optional isolated database tests

Docker is only an optional local test tool, not an application or deployment requirement. `compose.staging.yml` provides disposable PostgreSQL/pgvector and Redis services; it does not change the configured Supabase database. With Docker available, run `npm run staging:init`, `npm run staging:up`, and `npm run test:migrations` to check preservation of synthetic legacy records. `npm run staging:migrate` applies migrations only to that local staging database. `npm run staging:down` stops the services while retaining their data volume. Keep `.env.staging` private and preserve its generated credentials while reusing that volume. Full provider delivery and worker-interruption checks remain separate release gates.

With those isolated services running, `npm run test:staging` runs migration-preservation checks, applies staging migrations, starts the web/worker/Redis REST test bridge, executes the HTTP workflow, and stops the processes it started. Existing services on the app/bridge ports cause an explicit refusal. Database URLs outside the guarded localhost staging ports are rejected. Results and private diagnostic logs go under `.data/staging/`; a stale passing workflow summary is removed before each attempt. The test uses simulated research/email providers and never validates real provider delivery.

GitHub Actions provisions disposable PostgreSQL/pgvector and Redis services for the same command. Its test database password is a public fixture used only in that isolated job; no production secrets are required. Only sanitized validation summaries are uploaded. Local services may also be provided natively on the documented ports, without Docker. `STAGING_DB_PASSWORD` can set the initial disposable database password when creating a fresh `.env.staging`; existing staging credentials are preserved.

Discovery uses actual Google Places business records and their website/address fields; it requires `GOOGLE_PLACES_API_KEY`. It does not invent domains or mark unknown size as a match. Keyword filters are a conservative initial matching method, not semantic or independent business verification. Staff can register 1–10 company IDs for daily monitoring with `POST /api/admin/trigger-monitor`. It is opt-in, not enabled for every company by default. Monitoring compares dated source excerpts and does not equate market news with a contact's buying intent.

## Staging release checklist

Use designated test recipients and controlled company sites. First check staff login/logout and anonymous rejection of CRM, deletion, retry, PDF, stream, and chat routes. Check that a prospect link cannot access another report and that expired links fail.

Submit a controlled company with a known challenge and persona. Verify stored original excerpts, source references, report uncertainty, working private PDF, email acceptance/webhook status, chat history, and prospect-only event attribution. Repeat with an unavailable website, insufficient evidence, a Redis outage, provider quota errors, worker interruption, and a storage outage. Check recovery without duplicate generation or outreach.

The analytics window is 30 days in UTC. PDF-download conversion means engagement, not a sale. Staff activity is excluded. Research scores are AI assessments, not measured performance. Intent probabilities are experimental, separate from readiness, and unavailable if the scorer fails. Establish an independently labelled evaluation set before enabling sales alerts in production.

Before public release, measure queue completion time, failure rate, crawl/model cost per report, and behavior under the intended launch workload. Default limits are deliberately conservative (100 new reports/day globally; 3/hour per trusted IP or shared fallback). Adjust them from measured cost and capacity. Run a browser/device review and staging integration checks; unit tests alone do not establish production readiness.

Provider references: [Google model availability](https://ai.google.dev/gemini-api/docs/models), [embedding lifecycle](https://ai.google.dev/gemini-api/docs/deprecations), and [Places Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search). Model names are configurable because availability is account-dependent; Gemini 2.5 access is limited for new accounts. Discovery uses the current Places API with an explicit field mask, not the legacy endpoints.
