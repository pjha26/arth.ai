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

function toTitleCase(str) {
  if (!str) return "";
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function injectData(template, lead, enriched, report) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const scores = report.auditScores;
  const companyName = toTitleCase(lead.companyName);

  const painPointsHtml = (report.painPoints || [])
    .slice(0, 3)
    .map(
      (p) => `
    <div class="card pain-card">
      <div class="pain-icon">⚡</div>
      <div class="pain-text">${escapeHtml(p)}</div>
    </div>`
    )
    .join("");

  const opportunitiesHtml = (report.aiOpportunities || [])
    .map(
      (opp, i) => {
        const borderClass = opp.impact.toLowerCase() === 'high' ? 'high' : 'medium';
        return `
    <div class="card opp-card ${borderClass}">
      <div class="opp-num">${String(i + 1).padStart(2, "0")}</div>
      <div class="opp-content">
        <div class="opp-title">${escapeHtml(opp.title)}</div>
        <div class="opp-desc">${escapeHtml(opp.description)}</div>
      </div>
      <div class="impact-badge ${borderClass}">${opp.impact.toUpperCase()} IMPACT</div>
    </div>`;
      }
    )
    .join("");

  const stepsHtml = (report.recommendedNextSteps || [])
    .map(
      (step, i) => `
    <div class="card step-card">
      <div class="step-num">${i + 1}</div>
      <div class="step-text">${escapeHtml(step)}</div>
    </div>`
    )
    .join("");

  const logoHtml = enriched.logo
    ? `<img src="${enriched.logo}" alt="${escapeHtml(companyName)} logo" onerror="this.style.display='none'" />`
    : `<div>${companyName.slice(0, 2).toUpperCase()}</div>`;

  const renderMetaItem = (label, value) => {
    if (!value || value.toLowerCase() === 'unknown') return '';
    return `<div class="meta-item"><div class="meta-label">${label}</div><div class="meta-value">${escapeHtml(value)}</div></div>`;
  };

  const metaItems = [
    renderMetaItem('Industry', lead.industry),
    renderMetaItem('Company Size', lead.companySize),
    renderMetaItem('Report Date', date)
  ].filter(Boolean).join('');
  const metaStripHtml = metaItems ? `<div class="meta-strip">${metaItems}</div>` : '';

  return template
    .replace(/\{\{COMPANY_NAME\}\}/g, escapeHtml(companyName))
    .replace(/\{\{FULL_NAME\}\}/g, escapeHtml(lead.fullName))
    .replace(/\{\{EMAIL\}\}/g, escapeHtml(lead.email))
    .replace(/\{\{WEBSITE\}\}/g, escapeHtml(lead.website))
    .replace(/\{\{META_STRIP_HTML\}\}/g, metaStripHtml)
    .replace(/\{\{LOGO_HTML\}\}/g, logoHtml)
    .replace(/\{\{EXECUTIVE_SUMMARY\}\}/g, escapeHtml(report.executiveSummary))
    .replace(/\{\{MARKET_POSITION\}\}/g, escapeHtml(report.marketPosition))
    .replace(/\{\{DIGITAL_PRESENCE\}\}/g, escapeHtml(report.digitalPresence))
    .replace(/\{\{PAIN_POINTS_HTML\}\}/g, painPointsHtml)
    .replace(/\{\{OPPORTUNITIES_HTML\}\}/g, opportunitiesHtml)
    .replace(/\{\{STEPS_HTML\}\}/g, stepsHtml)
    .replace(/\{\{SCORE_DIGITAL\}\}/g, scores.digitalReadiness || 0)
    .replace(/\{\{SCORE_AUTOMATION\}\}/g, scores.automationPotential || 0)
    .replace(/\{\{SCORE_GROWTH\}\}/g, scores.growthIndex || 0)
    .replace(
      /\{\{SCORE_OVERALL\}\}/g,
      Math.round(
        ((scores.digitalReadiness || 0) + (scores.automationPotential || 0) + (scores.growthIndex || 0)) / 3
      )
    )
    .replace(/\{\{REASON_DIGITAL\}\}/g, escapeHtml(scores.digitalReadinessReason || ""))
    .replace(/\{\{REASON_AUTOMATION\}\}/g, escapeHtml(scores.automationPotentialReason || ""))
    .replace(/\{\{REASON_GROWTH\}\}/g, escapeHtml(scores.growthIndexReason || ""));
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
