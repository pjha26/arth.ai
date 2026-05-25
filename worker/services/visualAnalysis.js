import puppeteer from "puppeteer";

export async function captureWebsiteScreenshot(url) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Load page, wait for network idle with 15s timeout
    await page.goto(url, { waitUntil: "networkidle2", timeout: 15000 });

    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 80,
      fullPage: false // Only above the fold
    });

    return screenshotBuffer.toString("base64");
  } catch (err) {
    console.warn(`[VisualAnalysis] Screenshot failed for ${url}:`, err.message);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
