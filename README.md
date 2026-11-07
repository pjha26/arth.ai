# ArthAI — evidence-backed company research and CRM

ArthAI researches a prospect's public company website, builds a source-backed report for their persona and stated challenge, and provides private PDF delivery and report chat. The CRM keeps research assessments, buying-intent estimates, delivery status, and staff-confirmed sales outcomes separate.

The implementation has unit checks and a CI workflow using isolated PostgreSQL/Redis and simulated research/email providers. Production migration, real provider delivery, report-quality evaluation, and release validation remain outstanding. An existing deployed site does not automatically include changes on a review branch.

## Main workflow

1. A prospect submits their website, persona, and challenges. A client submission ID prevents an accidental resend from creating a second report for identical input.
2. PostgreSQL saves a lead and private report in one transaction. BullMQ processes it; a worker reconciliation loop recovers failed queue dispatch.
3. A bounded scraper validates public network destinations and redirects, extracts page text, and collects up to four relevant same-site sources. It records URLs, excerpts, and retrieval times without inventing publication dates.
4. Three parallel research tasks examine products, visible technology, and market statements from those sources. A writer tailors recommendations to the prospect, and a separate review checks the report against original evidence. Unsupported quotes or missing review cause an explicit failure, not a generic success report.
5. Puppeteer renders the report PDF. Production files live in a private Google Drive shared-drive folder and are read through authorized API routes. Local development can use `.data/reports`.
6. Resend sends the requested report with a scoped, expiring access link. Acceptance and delivery are separate states. Consented follow-up tasks are saved with acceptance in a database transaction and recovered by the worker after queue outages. Uncertainty about provider acceptance requires review before resending.
7. Report chat uses server-owned conversation history and authorized report context. Semantic retrieval is filtered by report and embedding model. Initial streaming failures can fall back between configured Gemini and Groq providers.

## Product boundaries

- Staff CRM routes require a signed team session. Prospects receive seven-day bearer links scoped to one report; forwarding a link intentionally shares access to that report. Legacy reports require a confirmed original lead before prospect access can be issued.
- Website statements are self-reported evidence. AI review reduces unsupported output but does not establish independent verification of a company's claims.
- Readiness scores and proposed opportunities are assessments, not measured conversion rates, performance benchmarks, or guaranteed savings.
- Optional visual analysis uses a static snapshot with scripts and remote assets blocked. It does not measure the live site's interactive UX or conversion performance.
- Intent scoring is experimental and disabled by default. It updates the prospect who chatted, not every contact at the company; staff chat does not score prospects. An unavailable scorer produces no invented probability or score increase.
- Discovery uses Google Places API (New) website/address records, conservative website matching, and explicit filters. It does not invent domains or treat unknown employee count as a match. Discovery alone does not create an eligible outreach recipient.
- Monitoring is registered explicitly by staff, compares dated source excerpts, and avoids repeated unchanged signals. Company news is not treated as an individual's buying intent.
- CRM charts use recorded data over 30 days in UTC. A PDF download is engagement, not a sale; sales outcomes are recorded by staff.

## Run locally

See [deployment and migration instructions](DEPLOYMENT.md) before using an existing database.

```sh
npm ci
npm --prefix worker ci
# Configure .env.local using .env.example; migrate a development database first.
npm run db:generate
npm run dev:web
# In another terminal:
npm --prefix worker start
```

The root Prisma schema/client is authoritative. Include the root package and `shared/` when deploying the worker. Never generate a separate worker schema.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The default tests use controlled fixtures and simulated providers; they do not send outreach or perform paid research. `npm run dev` starts web and worker; the optional scorer runs separately with `npm run dev:ml`. Native Python setup, optional Docker database tests, and independent intent-model evaluation are described in [DEPLOYMENT.md](DEPLOYMENT.md). Docker is not required to run or deploy ArthAI.

Rebuild embeddings for explicit completed reports after confirming their original lead relationships:

```sh
node --env-file=.env.local scripts/reindex-report.mjs REPORT_UUID
```

This command calls the configured embedding provider and writes only the supplied reports' embeddings. Old vectors from another model are excluded from retrieval until rebuilt.

## Layout

- `app/`: pages, staff authentication, scoped access, CRM, API routes, provider webhook
- `shared/`: validated contracts, source checks, authorization tokens, safe network access, storage, analytics
- `worker/`: durable generation, dispatch reconciliation, delivery, consented follow-ups, discovery, monitoring
- `prisma/`: authoritative schema, baseline, and additive migrations
- `ml/`: optional experimental intent scorer and offline evaluation
- `tests/`: security, contracts, evidence, chat streaming, extraction, and pipeline recovery regressions

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for scope, acceptance criteria, and work that still requires staging evidence. No in-house language model or additional agent framework is required for the core product.
