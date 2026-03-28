import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, 'temporary screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Get next screenshot number (auto-increment, never overwrite)
function getNextNumber() {
  const files = fs.readdirSync(SCREENSHOTS_DIR);
  const nums = files
    .map(f => {
      const match = f.match(/^screenshot-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

async function takeScreenshot() {
  const url = process.argv[2] || 'http://localhost:3000';
  const label = process.argv[3] || '';
  const num = getNextNumber();
  const filename = label
    ? `screenshot-${num}-${label}.png`
    : `screenshot-${num}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);

  console.log(`Capturing: ${url}`);
  console.log(`Saving to: ${filepath}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for fonts to load
  await new Promise(r => setTimeout(r, 1000));

  // Trigger all reveal animations so full-page screenshot shows all content
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  });

  // Wait for reveal transitions to complete
  await new Promise(r => setTimeout(r, 800));

  // Take full-page screenshot
  await page.screenshot({
    path: filepath,
    fullPage: true,
    type: 'png',
  });

  await browser.close();
  console.log(`Screenshot saved: ${filename}`);
}

takeScreenshot().catch(err => {
  console.error('Screenshot failed:', err.message);
  process.exit(1);
});
