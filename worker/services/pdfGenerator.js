import puppeteer from "puppeteer";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Generates a PDF report Buffer using Puppeteer.
 * Renders the HTML template with injected lead/report data.
 */
export async function generatePDF(lead, enriched, report) {
  const templatePath = join(__dirname, "../templates/report.html");
  let template = readFileSync(templatePath, "utf-8");

  // Inject data into template
  template = injectData(template, lead, enriched, report);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(template, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function injectData(template, lead, enriched, report) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scores = report.auditScores;

  const painPointsHtml = report.painPoints
    .map(
      (p) => `
    <div class="pain-item">
      <span class="pain-icon">⚡</span>
      <span>${escapeHtml(p)}</span>
    </div>`
    )
    .join("");

  const opportunitiesHtml = report.aiOpportunities
    .map(
      (opp, i) => `
    <div class="opportunity-card">
      <div class="opp-header">
        <div class="opp-number">${String(i + 1).padStart(2, "0")}</div>
        <div class="opp-title">${escapeHtml(opp.title)}</div>
        <div class="impact-badge ${opp.impact.toLowerCase()}">${opp.impact} Impact</div>
      </div>
      <p class="opp-desc">${escapeHtml(opp.description)}</p>
    </div>`
    )
    .join("");

  const stepsHtml = report.recommendedNextSteps
    .map(
      (step, i) => `
    <div class="step-item">
      <div class="step-num">${i + 1}</div>
      <p>${escapeHtml(step)}</p>
    </div>`
    )
    .join("");

  const logoHtml = enriched.logo
    ? `<img src="${enriched.logo}" alt="${escapeHtml(lead.companyName)} logo" class="company-logo" onerror="this.style.display='none'" />`
    : `<div class="logo-fallback">${lead.companyName.slice(0, 2).toUpperCase()}</div>`;

  return template
    .replace(/\{\{COMPANY_NAME\}\}/g, escapeHtml(lead.companyName))
    .replace(/\{\{FULL_NAME\}\}/g, escapeHtml(lead.fullName))
    .replace(/\{\{EMAIL\}\}/g, escapeHtml(lead.email))
    .replace(/\{\{INDUSTRY\}\}/g, escapeHtml(lead.industry))
    .replace(/\{\{COMPANY_SIZE\}\}/g, escapeHtml(lead.companySize))
    .replace(/\{\{WEBSITE\}\}/g, escapeHtml(lead.website))
    .replace(/\{\{DATE\}\}/g, date)
    .replace(/\{\{LOGO_HTML\}\}/g, logoHtml)
    .replace(/\{\{EXECUTIVE_SUMMARY\}\}/g, escapeHtml(report.executiveSummary))
    .replace(/\{\{MARKET_POSITION\}\}/g, escapeHtml(report.marketPosition))
    .replace(/\{\{DIGITAL_PRESENCE\}\}/g, escapeHtml(report.digitalPresence))
    .replace(/\{\{PAIN_POINTS_HTML\}\}/g, painPointsHtml)
    .replace(/\{\{OPPORTUNITIES_HTML\}\}/g, opportunitiesHtml)
    .replace(/\{\{STEPS_HTML\}\}/g, stepsHtml)
    .replace(/\{\{SCORE_DIGITAL\}\}/g, scores.digitalReadiness)
    .replace(/\{\{SCORE_AUTOMATION\}\}/g, scores.automationPotential)
    .replace(/\{\{SCORE_GROWTH\}\}/g, scores.growthIndex)
    .replace(
      /\{\{SCORE_OVERALL\}\}/g,
      Math.round(
        (scores.digitalReadiness + scores.automationPotential + scores.growthIndex) / 3
      )
    )
    .replace(/\{\{REASON_DIGITAL\}\}/g, escapeHtml(scores.digitalReadinessReason || ""))
    .replace(/\{\{REASON_AUTOMATION\}\}/g, escapeHtml(scores.automationPotentialReason || ""))
    .replace(/\{\{REASON_GROWTH\}\}/g, escapeHtml(scores.growthIndexReason || ""))
    .replace(/\{\{DESCRIPTION\}\}/g, escapeHtml(enriched.description || ""));
}

function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
