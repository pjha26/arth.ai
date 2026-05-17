# Arth.ai - AI Intelligence Audits

Arth.ai is a SaaS platform designed for B2B intelligence gathering and personalized reporting. It allows users to submit leads and instantly generates tailored PDF intelligence reports by scraping public company data, enriching it with AI (Anthropic Claude), and rendering beautiful PDFs via Puppeteer.

## Key Features

- **Dynamic Landing Page**: Adaptive user experiences depending on the chosen persona (Founder, CTO, Marketer).
- **Automated Lead Enrichment**: Collects basic information and processes it through a background pipeline.
- **AI-Powered Analysis**: Uses Anthropic's Claude to generate insights based on company profiles.
- **Background PDF Generation**: A BullMQ-powered background worker uses Puppeteer to render a real, downloadable PDF report.
- **Real-Time Dashboard**: Automatically polling dashboard to track the status of lead reports, download generated PDFs, and manage data.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS.
- **Backend**: Next.js Serverless Routes, Prisma ORM (SQLite).
- **Background Worker**: Node.js, BullMQ, Redis (Upstash).
- **AI Integration**: Anthropic SDK.
- **PDF Generation**: Puppeteer.

## Architecture

1. **Web App (`/app`)**: Handles UI, form submissions, and database operations via Prisma.
2. **API Routes (`/app/api`)**: Endpoint logic for adding leads, polling statuses, deleting leads, and downloading PDFs.
3. **Background Worker (`/worker`)**: A standalone process that subscribes to the BullMQ queue, executes AI enrichment tasks, and generates the final PDF.

## Prerequisites

- Node.js (v18+)
- Redis database (e.g., Upstash) for BullMQ
- Anthropic API Key

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# Redis for BullMQ (Important: use rediss:// for secure Upstash connection)
UPSTASH_REDIS_URL="rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT:PORT"

# AI Integration
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

## Installation & Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   cd worker && npm install
   cd ..
   ```

2. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Run the Application & Worker**
   We use `concurrently` to run both the Next.js frontend and the background worker simultaneously.
   ```bash
   npm run dev
   ```

   This command will start:
   - Next.js development server at `http://localhost:3000`
   - Background BullMQ worker for processing reports.

## Project Structure

- `app/`: Next.js application routes (Landing Page, Form, Dashboard).
- `app/api/`: Server-side API logic.
- `lib/`: Shared utilities, Prisma client, and validation logic.
- `worker/`: BullMQ processor and job handlers (`enrichment.js`, `pdfGenerator.js`).
- `prisma/`: Database schema and migrations.

## Design System
The project follows the "Ivory & Saffron" design language, providing a premium, quiet, and intelligence-focused aesthetic.

## Future Enhancements
- User Authentication (NextAuth / Clerk).
- Report sharing via email using Resend.
- Advanced analytics on dashboard.
