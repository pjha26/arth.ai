# ArthAI - AI Intelligence CRM & Autonomous Multi-Agent Pipeline

ArthAI is a full-fledged AI platform and advanced Intelligence CRM designed to generate automated, deep-dive intelligence reports for inbound leads. Built around an autonomous multi-agent pipeline, ArthAI dynamically scrapes websites, orchestrates specialized parallel AI agents to research and analyze data, verifies facts to prevent hallucinations, and synthesizes deep strategic insights using Google's Gemini 2.5 Pro and Flash.

---

## 🏗️ System Architecture

ArthAI utilizes a robust, decoupled architecture to handle heavy AI workloads efficiently without blocking the user interface:

1. **Next.js Web Tier**: Handles incoming traffic, serves the premium internal dashboard, manages public lead-facing interactive report views, and handles real-time streaming API routes (including the Live Preview Demo and Report Chat).
2. **Redis Task Queue (BullMQ)**: Incoming requests are placed on a persistent queue, decoupling slow web scraping and LLM generation times from the frontend UI.
3. **Autonomous Node.js Worker**: A standalone process that consumes the queue and orchestrates a massive multi-agent workflow:
   - **Visual Agent**: Uses Puppeteer and Gemini Vision to assess design maturity, UX quality, and conversion gaps from live website screenshots.
   - **Parallel Research Agents**: Specialized agents (Research, Financial, Tech, Market) run concurrently to gather domain-specific intelligence.
   - **Synthesis & Verification**: A Writer agent drafts the report, followed by a strict Verification Agent that audits claims against raw data to detect and eliminate hallucinations.
   - **Vectorization Agent**: Chunks the generated report into semantic blocks and embeds them into `pgvector` for conversational RAG interactions.
4. **PostgreSQL + pgvector Database**: Acts as the central nervous system, storing Leads, CRM metrics, pipeline states, chat histories, and vector embeddings natively via Prisma.

---

## 🌊 Complete Website Workflow

1. **Inbound Lead Submission (Landing Page)**
   - Prospects visit the landing page and submit their Company URL, Persona (e.g., Founder, CTO), and specific pain points.
   - The Next.js API validates this data via **Zod** and enqueues a processing job in the Redis queue.

2. **Background Processing Pipeline (Enrichment)**
   - The dedicated Node.js worker picks up the job.
   - Puppeteer & Cheerio scrape the live website for real-time text context and capture an above-the-fold screenshot.
   - Clearbit & Wikipedia APIs fetch fallback context and logos.

3. **Multi-Agent Intelligence Engine (Gemini 2.5 Pro & Flash)**
   - Specialized agents process the data in parallel (`Promise.all`), extracting technical stack analysis, funding stage, competitor positioning, and visual UX intelligence.
   - The Synthesis Agent formats the data into structured JSON, providing custom industry benchmarks and an "Intent Score".
   - The Verification Agent cross-checks the draft against source data, marking unsupported claims as "ESTIMATED".

4. **Delivery & Post-Generation Engagement**
   - The structured JSON is formatted into a beautiful HTML template and rendered to a PDF via Puppeteer.
   - An intelligent delivery email is sent to the prospect containing their AI readiness scores, top opportunity, a PDF download link, and a CTA to **"Chat With Your Report"**.
   - The report is simultaneously chunked and embedded via Gemini `text-embedding-004` into `pgvector`.

5. **Live Report Chat (Lead View)**
   - The lead clicks the link in their email to access a sleek, public-facing web view (`/report/[id]`).
   - Using `@ai-sdk/react`, the lead can chat directly with their generated intelligence in real time. 
   - Every message sent by the lead is saved to the database, allowing ArthAI to learn what the prospect cares about.

6. **Intelligence CRM Dashboard (Internal View)**
   - Sales reps access the CRM at `/dashboard`, featuring a premium, Notion-style split-pane interface.
   - **Analytics Tab:** Provides high-level metrics, industry breakdown bars, persona performance cards, a 24/7 submission heatmap, and an AI-generated daily Trend Feed.
   - **Leads & Reports Tab:** Shows a robust list/grid of all inbound leads. Clicking a lead smoothly slides in a detail panel revealing AI insights (including Visual Intelligence and AI Reasoning), a one-click PDF download, and an internal Report Chat UI.

---

## 🛠️ Technology Stack Used

### Core Frameworks
- **Next.js 16 (App Router + Turbopack)**: Core React framework for the frontend and API routes.
- **React 19**: UI component library.
- **Node.js**: Powers the separate background worker process.

### Database & Caching
- **PostgreSQL**: Primary relational database.
- **Prisma ORM**: Type-safe database client and schema management.
- **Redis (ioredis)**: In-memory datastore used exclusively for job queuing.
- **BullMQ**: Robust Redis-based queue for managing long-running background jobs.

### AI & Data Enrichment
- **Google Generative AI (Gemini 2.5 Pro / Flash)**: The core intelligence engine powering the multi-agent pipeline and vision models.
- **pgvector**: Postgres extension used for vector embeddings and Semantic Search.
- **RAG (Retrieval-Augmented Generation)**: Vectorizes the generated reports to allow conversational querying of the insights directly from the dashboard or public lead view.
- **Vercel AI SDK (`ai` & `@ai-sdk/react`)**: Standardized streaming, UI hooks, and structured data extraction from Gemini.
- **Puppeteer**: Headless Chrome for complex website scraping, website screenshotting, and PDF generation.
- **Cheerio**: Lightweight HTML parser for static site scraping.
- **Langfuse**: Observability platform utilized to trace generative spans, score confidence, and track hallucination rates.

### Frontend UI & Styling
- **Tailwind CSS v4**: Utility-first CSS framework for rapid styling.
- **Framer Motion**: Complex layout animations, staggered waterfalls, and slide-in panels.
- **TanStack Table (React Table v8)**: Headless logic for filtering, sorting, and bulk selections.
- **Radix UI**: Headless, accessible primitives.

---

## ✨ Features Implemented

### 1. Autonomous Parallel Multi-Agent Pipeline
- The core of ArthAI utilizes specialized agents (Research, Financial, Tech, Market, Visual) that run simultaneously via `Promise.all` to slash generation time.
- A dedicated Synthesis Agent drafts the report, exposing its chain-of-thought ("AI Reasoning") directly to the user.

### 2. Hallucination Detection & Confidence Scoring
- An uncompromising Verification Agent runs immediately after the draft is finalized. It cross-checks all factual claims against the source data, removing or explicitly flagging any AI hallucinations (`~` or `ESTIMATED:`).
- Hallucination rates and confidence scores are tracked via Langfuse telemetry.

### 3. Multimodal Website Analysis (Vision AI)
- Uses Puppeteer to capture above-the-fold screenshots of inbound leads.
- A native Visual Agent uses Gemini's multimodal vision capabilities to assess Design Maturity, UX Quality, and Conversion Gaps.

### 4. Post-Generation Delivery & Live Report Chat
- Transforms static PDFs into live conversations. Leads receive a dynamic email containing a custom "Chat with your report" link.
- A sleek, public-facing React Chat UI allows the lead to interrogate their own data in real-time.
- Chat history is persisted in Postgres, creating a compounding intelligence loop.

### 5. Interactive Live Preview Engine
- Integrated directly into the landing page to instantly demonstrate the platform's value.
- Streams live, AI-generated intelligence about any inputted company using Vercel AI SDK and Gemini Flash without requiring a signup.

### 6. Premium "Notion-Style" CRM Interface & Analytics
- **70/30 Split Pane Layout**: Smoothly transitions to reveal a detail panel without jarring page reloads.
- **Analytics Tab**: Features custom SVG sparklines, a 24/7 Submission Heatmap, and an AI-generated daily Trend Feed.
- **Snappy Micro-Interactions**: Optimistic deletion, Framer Motion waterfalls, floating bulk action bars, and live state syncing via database polling.
