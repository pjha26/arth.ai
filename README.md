# ArthAI - AI Intelligence CRM & Autonomous Multi-Agent Pipeline

ArthAI is a full-fledged AI platform and advanced Intelligence CRM designed to generate automated, deep-dive intelligence reports for inbound leads. Built around an autonomous multi-agent pipeline, ArthAI dynamically scrapes websites, orchestrates specialized AI agents to research and analyze data, and synthesizes deep strategic insights using Google's Gemini 2.5 Pro.

---

## 🏗️ System Architecture

ArthAI utilizes a robust, decoupled architecture to handle AI workloads efficiently without blocking the user interface:

1. **Next.js Web Tier**: Handles incoming traffic, serves the premium dashboard, and manages real-time streaming API routes (including the Live Preview Demo and Report Chat).
2. **Redis Task Queue (BullMQ)**: Incoming requests are placed on a persistent queue, decoupling slow web scraping and LLM generation times from the frontend UI.
3. **Autonomous Node.js Worker**: A standalone process that consumes the queue and orchestrates a multi-agent workflow:
   - **Research Agent**: Scrapes the web using Puppeteer/Cheerio and fetches external metadata via Clearbit and Wikipedia APIs.
   - **Analysis Agent**: Evaluates the raw data against the prospect's stated pain points to synthesize structured JSON intelligence.
   - **Vectorization Agent**: Chunks the generated report into semantic blocks and embeds them into `pgvector` for conversational RAG interactions.
4. **PostgreSQL + pgvector Database**: Acts as the central nervous system, storing Leads, CRM metrics, pipeline states, and vector embeddings natively via Prisma.

---

## 🌊 Complete Website Workflow

1. **Inbound Lead Submission (Landing Page)**
   - Prospects visit the landing page and submit their Company URL, Persona (e.g., Founder, CTO), and specific pain points.
   - The Next.js API validates this data via **Zod** and enqueues a processing job in the Redis queue.

2. **Background Processing Pipeline**
   - The dedicated Node.js worker picks up the job.
   - Puppeteer & Cheerio scrape the live website for real-time context.
   - Clearbit & Wikipedia APIs fetch fallback context and logos.

3. **AI Intelligence Engine (Gemini 2.5 Pro)**
   - The scraped HTML and prospect pain points are fed into **Gemini 2.5 Pro** via the `@ai-sdk/google` integration.
   - Gemini synthesizes the data into structured JSON, providing:
     - Technical stack analysis.
     - Pain point validation and tailored strategic advice.
     - An "Intent Score" calculating how likely the lead is to convert.
     - Custom industry benchmarks.

4. **RAG Vectorization & PDF Generation**
   - The structured JSON is formatted into a beautiful HTML template and rendered to PDF via Puppeteer.
   - The report is simultaneously chunked and embedded via Gemini `text-embedding-004` into `pgvector`.
   - The database is updated to mark the pipeline status as "Done".

5. **Intelligence CRM Dashboard (Sales / Admin View)**
   - Sales reps access the CRM at `/dashboard`, featuring a premium, Notion-style split-pane interface.
   - **Analytics Tab:** Provides high-level metrics, industry breakdown bars, persona performance cards, a 24/7 submission heatmap, and an AI-generated daily Trend Feed.
   - **Leads & Reports Tab:** Shows a robust list/grid of all inbound leads. Clicking a lead smoothly slides in a detail panel revealing AI insights, a one-click PDF download, and a native **Report Chat** UI.

---

## 🛠️ Technology Stack Used

### Core Frameworks
- **Next.js 16 (App Router + Turbopack)**: Core React framework for the frontend and API routes.
- **React 19**: UI component library.
- **Node.js**: powers the separate background worker process.

### Database & Caching
- **PostgreSQL**: Primary relational database.
- **Prisma ORM**: Type-safe database client and schema management.
- **Redis (ioredis)**: In-memory datastore used exclusively for job queuing.
- **BullMQ**: Robust Redis-based queue for managing long-running background jobs.

### AI & Data Enrichment
- **Google Generative AI (Gemini 2.5 Pro / Flash)**: The core intelligence engine powering the insights.
- **pgvector**: Postgres extension used for vector embeddings and Semantic Search.
- **RAG (Retrieval-Augmented Generation)**: Vectorizes the generated reports to allow conversational querying (Report Chat) of the insights directly from the dashboard.
- **Vercel AI SDK (`ai` & `@ai-sdk/google`)**: Standardized streaming and structured data extraction from Gemini.
- **Puppeteer**: Headless Chrome for complex website scraping and PDF generation.
- **Cheerio**: Lightweight HTML parser for static site scraping.
- **Clearbit API**: Used to fetch high-quality company logos and instant metadata.

### Frontend UI & Styling
- **Tailwind CSS v4**: Utility-first CSS framework for rapid styling.
- **Framer Motion**: Complex layout animations, staggered waterfalls, and slide-in panels.
- **TanStack Table (React Table v8)**: Headless logic for filtering, sorting, and bulk selections.
- **Radix UI**: Headless, accessible primitives (specifically Tooltips).
- **Date-Fns**: Lightweight date and time formatting.
- **Custom Fonts**: Fraunces (Serif/Display) and DM Sans (Body).

---

## ✨ Features Implemented

### 1. Autonomous Multi-Agent Pipeline
- The core of ArthAI is a complex pipeline where a specialized Research Agent and Analysis Agent collaborate to generate insights without human intervention.
- The pipeline isolates heavy, long-running AI inferences from the web interface using a dedicated BullMQ worker.

### 2. RAG & Conversational Report Chat
- Integrated **Retrieval-Augmented Generation (RAG)** pipeline using `pgvector` and Gemini's embeddings.
- Every generated AI report is chunked, embedded, and stored natively, allowing users to "chat with the report" and ask deeply specific context-aware questions right from the dashboard.
- Chat history is persisted in Postgres for natural, flowing conversations.

### 3. Interactive Live Preview Engine
- Integrated directly into the landing page to instantly demonstrate the platform's value.
- Streams live, AI-generated intelligence about any inputted company using Vercel AI SDK and Gemini Flash without requiring a signup.

### 4. Beautiful Analytics Dashboard
- Custom SVG sparklines and animated metric counters.
- **AI Trend Feed**: Synthesizes the database of leads into readable, actionable insights (e.g., "SaaS companies are trending up this week").
- **Submission Heatmap**: A custom 7x24 grid visualizing exactly when prospects submit leads.
- **Industry & Persona Breakdowns**: Auto-aggregates data into visual progress bars and colored cards.

### 5. "Notion-Style" CRM Interface
- **70/30 Split Pane Layout**: Smoothly transitions to reveal a detail panel without jarring page reloads.
- **Grid vs List Toggle**: Switch between a compact table view and a Kanban-style card grid.
- **Toolbar & Filtering**: Filter prospects instantly by Name, Email, Status, or Industry.

### 6. Snappy Micro-Interactions
- **Optimistic Deletion**: Deleting a lead removes it instantly from the UI, making the app feel incredibly responsive.
- **Framer Motion Waterfalls**: Rows cascade onto the screen smoothly.
- **Floating Bulk Actions**: Selecting checkboxes summons a slick dark-mode action bar for mass-downloads or deletions.
- **Live State Sync**: Processing leads pulse with an amber dot, and transition to a green dot the second the AI completes the task without requiring a manual refresh.

### 7. Advanced PDF Generation
- Fully automated, styled HTML-to-PDF rendering via Puppeteer, completely invisible to the user.
- Downloads are immediately accessible via `/api/leads/[id]/download`.
