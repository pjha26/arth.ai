# ArthAI - Intelligence CRM

ArthAI is an advanced, AI-powered Intelligence CRM designed to generate automated, deep-dive intelligence reports for inbound leads. By analyzing a prospect's company website and stated challenges, ArthAI automatically synthesizes strategic insights, technology stacks, and industry benchmarks using Google's Gemini 2.5 Pro.

---

## 🌊 Complete Website Workflow

1. **Inbound Lead Submission (Landing Page)**
   - Prospects visit the landing page and submit their Company URL, Persona (e.g., Founder, CTO), and specific pain points.
   - The Next.js API validates this data via **Zod** and enqueues a processing job in a background Redis queue.
   - A shell record is created in the PostgreSQL database (via Prisma) with a "Processing" status.

2. **Background Processing Pipeline (BullMQ + Puppeteer Worker)**
   - A separate Node.js worker picks up the job, keeping the main Next.js thread unblocked.
   - **Puppeteer & Cheerio** scrape the prospect's live website to extract real-time context, meta tags, text content, and underlying technology signatures.
   - **Clearbit & Wikipedia APIs** fetch fallback context, logo imagery, and Wikipedia summaries for instant context building.

3. **AI Intelligence Engine (Gemini 2.5 Pro)**
   - The scraped HTML and prospect pain points are fed into **Gemini 2.5 Pro** via the `@ai-sdk/google` integration.
   - Gemini synthesizes the data into structured JSON, providing:
     - Technical stack analysis.
     - Pain point validation and tailored strategic advice.
     - An "Intent Score" calculating how likely the lead is to convert.
     - Custom industry benchmarks.

4. **PDF Generation & Storage**
   - The structured JSON is formatted into a beautiful HTML template.
   - Puppeteer renders the HTML and generates a downloadable PDF file, saving it locally to `public/reports`.
   - The database is updated to mark the pipeline status as "Done".

5. **Intelligence CRM Dashboard (Sales / Admin View)**
   - Sales reps access the CRM at `/dashboard`, which features a premium, Notion-style split-pane interface.
   - **Live Polling:** If reports are generating, the dashboard polls every 5 seconds to provide live pipeline status updates.
   - **Analytics Tab:** Provides high-level metrics, industry breakdown bars, persona performance cards, a 24/7 submission heatmap, and an AI-generated daily Trend Feed.
   - **Leads & Reports Tab:** Shows a robust list/grid of all inbound leads. Clicking a lead smoothly slides in a 30% detail panel revealing the pipeline status, AI insights, and a one-click PDF download button.

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
- **Google Generative AI (Gemini 2.5 Pro)**: The core intelligence engine powering the insights.
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

### 1. Fully Autonomous Intelligence Pipeline
- Zero manual input required from sales reps; the system works 24/7.
- Dedicated Worker architecture ensures the website remains incredibly fast even when processing dozens of concurrent reports.

### 2. Beautiful Analytics Dashboard
- Custom SVG sparklines and animated metric counters.
- **AI Trend Feed**: Synthesizes the database of leads into readable, actionable insights (e.g., "SaaS companies are trending up this week").
- **Submission Heatmap**: A custom 7x24 grid visualizing exactly when prospects submit leads.
- **Industry & Persona Breakdowns**: Auto-aggregates data into visual progress bars and colored cards.

### 3. "Notion-Style" CRM Interface
- **70/30 Split Pane Layout**: Smoothly transitions to reveal a detail panel without jarring page reloads.
- **Grid vs List Toggle**: Switch between a compact table view and a Kanban-style card grid.
- **Toolbar & Filtering**: Filter prospects instantly by Name, Email, Status, or Industry.

### 4. Snappy Micro-Interactions
- **Optimistic Deletion**: Deleting a lead removes it instantly from the UI, making the app feel incredibly responsive.
- **Framer Motion Waterfalls**: Rows cascade onto the screen smoothly.
- **Floating Bulk Actions**: Selecting checkboxes summons a slick dark-mode action bar for mass-downloads or deletions.
- **Live State Sync**: Processing leads pulse with an amber dot, and transition to a green dot the second the AI completes the task without requiring a manual refresh.

### 5. Advanced PDF Generation
- Fully automated, styled HTML-to-PDF rendering via Puppeteer, completely invisible to the user.
- Downloads are immediately accessible via `/api/leads/[id]/download`.
