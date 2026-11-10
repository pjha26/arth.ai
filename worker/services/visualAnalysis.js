import puppeteer from 'puppeteer';
import { fetchPublicPage } from '../../shared/network.js';

export async function captureWebsiteScreenshot(url) {
  if (process.env.ENABLE_VISUAL_ANALYSIS !== 'true') return null;
  let browser;
  try {
    const { html } = await fetchPublicPage(url);
    browser = await puppeteer.launch({ headless: true, args: ['--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', request => void request.abort());
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    return Buffer.from(await page.screenshot({ type: 'jpeg', quality: 75 })).toString('base64');
  } catch (error) {
    console.warn('Static visual snapshot unavailable:', error.message);
    return null;
  } finally { await browser?.close(); }
}
