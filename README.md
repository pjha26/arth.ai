# ArthAI

[**Live deployment**](https://arth-ai-nu.vercel.app/) · [Request a report](https://arth-ai-nu.vercel.app/form) · [View the sample report](https://arth-ai-nu.vercel.app/#sample-report)

ArthAI is an inbound research and CRM platform. A prospect shares a company website, their role, and a business challenge. ArthAI researches public sources and creates a private report with cited findings, evidence gaps, and practical next steps. Staff can track the request, delivery status, and sales outcome in the CRM.

## How it works

1. **Capture the request.** The form saves the lead and report together in PostgreSQL. A submission ID lets the browser retry without creating a duplicate report for the same request.
2. **Collect evidence.** A BullMQ worker reads up to four relevant pages from the company site and records their URLs, excerpts, and retrieval dates.
3. **Generate and check the report.** Gemini researches the company from several angles, writes recommendations for the prospect's challenge, and checks the draft against the original excerpts. If the evidence is insufficient, the pipeline records that outcome.
4. **Deliver it privately.** Puppeteer renders a PDF, and Resend can deliver it with a report-scoped access link. The report also supports follow-up questions in chat.
5. **Follow up in the CRM.** Staff track report and email status, review inbound leads, and record sales outcomes. Automated follow-up requires opt-in. Optional Slack alerts use experimental prospect-intent scoring.

The landing-page sample illustrates the link between a finding, its source quote, and a recommended next step. It uses a fictional company.

## Run locally

You'll need Node.js **22.12 or later**, PostgreSQL with **pgvector**, and Redis with both a connection URL and a REST endpoint for rate limits. Configure Gemini for report generation and Resend for email delivery. The optional Python intent scorer has its own setup.

1. Install the dependencies from the repository root:

   ```sh
   npm ci
   npm --prefix worker ci
   ```

2. Copy [`.env.example`](.env.example) to `.env.local` and fill in the settings. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` for this local address. The web app and worker share the same signing secret. Use `REPORT_STORAGE=local` to store development PDFs under `.data/reports`.

3. Apply migrations to a **new development database** and start the app:

   ```sh
   node --env-file=.env.local ./node_modules/prisma/build/index.js migrate deploy
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). The request form is at `/form`, and staff sign in at `/login`.

`npm run dev` starts the web app and worker together. To run them separately, use `npm run dev:web` and `npm --prefix worker start`. For existing databases, production storage, worker deployment, and optional services, follow [DEPLOYMENT.md](DEPLOYMENT.md).

## Stack and repository layout

| Directory | Role |
| --- | --- |
| `app/`, `components/` | Next.js and React frontend, report chat, staff CRM, and API routes |
| `worker/` | BullMQ and Redis job processing, research, report generation, delivery, and recovery |
| `shared/` | Evidence validation, scoped access, storage, and other web and worker contracts |
| `prisma/` | Shared PostgreSQL schema and migrations |
| `ml/` | Optional experimental intent scoring and offline evaluation |
| `tests/` | Pipeline, access, delivery, and browser regression checks |

The report pipeline uses Gemini through the AI SDK. Report chat can fall back between Gemini and Groq when configured. Production PDFs use private Google Drive storage. The landing page uses Framer Motion and supports reduced motion.

## Testing and report quality

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

GitHub Actions also runs the workflow against isolated PostgreSQL and Redis with simulated providers. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to run that suite locally.

Live report accuracy is still being evaluated. The [pilot runner](scripts/report-quality-pilot.mjs) saves source excerpts and review templates. A reviewer checks whether each cited excerpt supports its claim, and the [benchmark](scripts/report-quality-benchmark.mjs) summarizes claim support, citation coverage, and case outcomes. Company statements remain self-reported, and recommendations and readiness scores are assessments.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for scope and remaining validation.
