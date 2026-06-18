# ArthAI - AI Intelligence CRM & Autonomous Multi-Agent Pipeline

ArthAI is a full-fledged AI platform and advanced Intelligence CRM designed to generate automated, deep-dive intelligence reports for inbound leads. Built around an autonomous multi-agent pipeline, ArthAI dynamically scrapes websites, orchestrates specialized parallel AI agents to research and analyze data, verifies facts to prevent hallucinations, and synthesizes deep strategic insights using Google's Gemini models.

---

## 🚀 Key Features

### 1. Autonomous Multi-Agent Intelligence Engine
- **Parallel Research Agents**: Specialized agents (Research, Financial, Tech, Market) run concurrently to gather domain-specific intelligence.
- **Adaptive Tier Detection**: Dynamically queries the web to classify if a company is a funded scale-up vs an obscure entity, hot-swapping the underlying system prompts to either leverage pre-trained LLM knowledge or strictly adhere to scraped data.
- **Strict Data Sanitization**: A robust pre-processing layer that automatically strips marketing tracking parameters (e.g. `utm_`, `gclid`) from ingested URLs, and intercepts internal AI confidence markers (`ESTIMATED`, `~`) to ensure a polished final PDF.
- **Visual Intelligence**: Uses Puppeteer and Gemini Vision to assess design maturity, UX quality, and conversion gaps from live website screenshots.
- **Verification Agent**: An uncompromising post-processing agent that audits claims against raw data to detect and eliminate hallucinations.

### 2. Intelligent Lead Generation & Live Preview
- **Inbound Pipeline**: Users submit their URL and pain points. The system validates the input and dispatches a background job via BullMQ.
- **Live Preview Engine**: The homepage features an instant AI-powered live preview that returns 3 highly specific factual insights about a company without requiring an account.

### 3. Automated Outreach & Slack Integration
- Integrated with **Resend**, the system automatically generates a personalized HTML email once the report completes.
- The email contains the prospect's AI Readiness Scores, their top identified opportunity, and a PDF attachment of the full report.
- **Real-Time Slack Alerts**: The system pushes instant notifications to your designated Slack channel whenever a new Intelligence Report is successfully generated and delivered.

### 4. Interactive "Chat with your Report" (RAG)
- Uses **pgvector** and `text-embedding-004` to semantically chunk and index the generated report.
- The lead (or sales rep) can open a sleek React Chat UI to dynamically interrogate the intelligence report.
- **Multi-Provider Fallback Cascade**: Uses a robust fallback chain integrating both **Google Gemini** and **Groq (Llama 3.3 70B)**. If one provider hits a hard rate limit or quota ceiling, the system gracefully falls back to the next available model.
- **Interactive Provider Selection**: A sleek UI toggle allows users to seamlessly hot-swap the underlying brain between Google Gemini and Groq's insanely fast Llama 3.3.
- Features a robust backend context-fallback so the AI never misses base insights if RAG vectorization fails.

### 5. Dynamic Intent Scoring (Real-time Buying Signals)
- Every message sent in the interactive chat is analyzed by the backend.
- **ML-Powered Lead Scoring Model**: Replaces keyword-based heuristics with a Logistic Regression classifier (trained on synthetic B2B SaaS data via Gemini) running on a standalone Python FastAPI microservice. It analyzes session context and language features to output a highly accurate 0.0–1.0 intent probability per message.
- These scores are bubbled up to the dashboard, tagging the lead with a 🔥 HOT signal for the sales team.
- **Slack Fire Alarms**: Whenever a high-intent signal is detected, a priority alert is immediately dispatched to your Slack channel so sales reps can strike while the iron is hot.

### 6. Premium "Notion-Style" CRM Dashboard
- **Analytics Tab**: Custom SVG sparklines, 24/7 submission heatmaps, persona conversion tracking, and an AI-generated daily Trend Feed.
- **Leads & Reports Tab**: A smooth split-pane UI where clicking a lead reveals their submitted context, pipeline status, automated AI insights, AI reasoning logic, and their real-time Intent Score.
- **Integrated Report Viewer**: A powerful dual-pane interface allowing parallel interaction with the generated PDF (left) and the AI Chat UI (right).

---

## 🏗️ System Architecture

ArthAI utilizes a robust, decoupled architecture to handle heavy AI workloads efficiently without blocking the user interface:

```mermaid
graph TD
    %% User Interfaces
    subgraph User Interface Layer
    UI_Public(Public Landing & Form)
    UI_Dashboard(Internal CRM Dashboard)
    UI_Chat(Interactive RAG Chat)
    end
    
    %% API Gateway & Backend
    subgraph Next.js Backend
    API_Leads[/api/leads]
    API_Chat[/api/chat]
    end
    
    %% Async Workers & Queues
    subgraph Async Worker Pipeline
    BullMQ([Redis / BullMQ])
    NodeWorker(Node.js Worker)
    Puppeteer(Puppeteer / Cheerio)
    end
    
    %% AI & Data Stores
    subgraph Data & AI Layer
    DB[(PostgreSQL + pgvector)]
    ML(Python FastAPI ML Intent Scorer)
    Gemini(Google Gemini AI)
    Groq(Groq Llama 3)
    Resend(Resend Email API)
    Slack(Slack API)
    end

    %% Flow
    UI_Public -->|Submits Lead| API_Leads
    API_Leads -->|Saves raw data| DB
    API_Leads -->|Enqueues Job| BullMQ
    
    BullMQ -->|Consumes Job| NodeWorker
    NodeWorker <-->|Scrapes website & PDF| Puppeteer
    NodeWorker <-->|Researches & Validates| Gemini
    NodeWorker -->|Saves Report & Vector Embeddings| DB
    NodeWorker -->|Sends Report| Resend
    NodeWorker -->|Schedules Follow-up Sequence| BullMQ
    NodeWorker -->|Alerts| Slack
    
    UI_Chat -->|Queries & Context| API_Chat
    API_Chat <-->|Semantic Search| DB
    API_Chat <-->|Generates Response| Gemini
    API_Chat <-->|Fallback Generation| Groq
    
    %% Intent Flow
    API_Chat -->|Live Chat Messages| ML
    ML -->|Intent Score 0.0-1.0| DB
    ML -->|Triggers Fire Alarm if HOT| Slack
    
    UI_Dashboard <-->|Reads leads, scores, CRM data| DB

    %% Styling
    classDef ui fill:#C58B45,stroke:#1b1b1b,stroke-width:2px,color:#fff;
    classDef api fill:#FAFAF8,stroke:#1b1b1b,stroke-width:2px;
    classDef worker fill:#5C7A62,stroke:#1b1b1b,stroke-width:2px,color:#fff;
    classDef db fill:#27272A,stroke:#1b1b1b,stroke-width:2px,color:#fff;
    classDef ext fill:#1b1b1b,stroke:#C58B45,stroke-width:2px,color:#fff;
    
    class UI_Public,UI_Dashboard,UI_Chat ui;
    class API_Leads,API_Chat api;
    class BullMQ,NodeWorker,Puppeteer worker;
    class DB,ML db;
    class Gemini,Groq,Resend,Slack ext;
```

1. **Next.js Web Tier**: Handles incoming traffic, serves the premium internal dashboard, manages public lead-facing interactive report views, and handles real-time streaming API routes.
2. **Redis Task Queue (BullMQ)**: Incoming requests are placed on a persistent queue, decoupling slow web scraping and LLM generation times from the frontend UI.
3. **Autonomous Node.js Worker**: A standalone process that consumes the queue, fetches external enrichment data (Clearbit, DuckDuckGo, Wikipedia), scrapes websites via Cheerio/Puppeteer, and orchestrates the massive multi-agent workflow.
4. **Python ML Microservice (FastAPI)**: A dedicated `localhost:8001` endpoint that runs a pre-trained scikit-learn Logistic Regression model to classify live prospect intent probability in real time.
5. **PostgreSQL + pgvector Database**: Acts as the central nervous system, storing Leads, CRM metrics, pipeline states, chat histories, and vector embeddings natively via Prisma.

## 📂 Folder Structure
```text
arth.ai/
├── app/               # Next.js App Router (Frontend, API routes, Dashboard)
├── components/        # React components (Radix UI, Framer Motion, Tailwind)
├── ml/                # Python FastAPI Microservice (Scikit-Learn Intent Scorer)
├── prisma/            # PostgreSQL Schema & Migrations
├── public/            # Static assets & locally generated PDFs
└── worker/            # Autonomous Node.js/BullMQ Worker (Scraping, AI Agents)
```

---

## 🛠️ Technology Stack Used

### Core Frameworks
- **Next.js 16 (App Router + Turbopack)**: Core React framework for the frontend and API routes.
- **Node.js**: Powers the separate background worker process.
- **Python 3.11 & FastAPI**: High-performance backend running the ML intent scoring microservice.

### Database & Caching
- **PostgreSQL**: Primary relational database.
- **Prisma ORM**: Type-safe database client and schema management.
- **Redis (ioredis) & BullMQ**: In-memory datastore and queue for managing background jobs.

### AI & Data Enrichment
- **Google Generative AI (Gemini 1.5, 2.0, 2.5 Flash/Pro)**: The core intelligence engine.
- **Groq (Llama 3.3 70B)**: Ultra-fast open-source LLM integration for fallback redundancy and user choice.
- **pgvector**: Postgres extension used for vector embeddings and Semantic Search.
- **Scikit-Learn**: Machine learning library used for the Logistic Regression intent classifier model.
- **Vercel AI SDK**: Standardized streaming, UI hooks, and structured data extraction.
- **Puppeteer & Cheerio**: Headless Chrome for complex website scraping, website screenshotting, and PDF generation.
### Integrations & Notifications
- **Resend**: Automated transactional email delivery.
- **Slack API**: Real-time push notifications for report completion and high-intent buying signals.

### Frontend UI & Styling
- **Tailwind CSS v4**
- **Glassmorphic Aesthetics**: Built with deep aesthetic focus, featuring rich dark-mode palettes, dynamic background glow animations, and frosted glass (backdrop-blur) components for a truly premium "Wow" factor.
- **Framer Motion**: Complex layout animations, staggered waterfalls, and slide-in panels.
- **Radix UI & Lucide Icons**
