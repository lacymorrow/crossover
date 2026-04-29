import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const file = process.argv[2];
const output = process.argv[3];

if (!file || !output) {
	console.error('Usage: node capture-single.mjs <input.html> <output.png>');
	process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({
	viewport: { width: 1920, height: 1080 },
	deviceScaleFactor: 1,
});
await page.goto(`file://${join(__dirname, file)}`);
await page.waitForTimeout(500);
await page.screenshot({
	path: join(__dirname, output),
	type: 'png',
	fullPage: false,
});
console.log(`Captured: ${output}`);
await browser.close();
