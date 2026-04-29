import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshots = [
	{ file: 'screenshot-1-hero.html', output: 'screenshot-1-hero.png' },
	{ file: 'screenshot-2-chooser.html', output: 'screenshot-2-chooser.png' },
	{ file: 'screenshot-3-custom-drop.html', output: 'screenshot-3-custom-drop.png' },
	{ file: 'screenshot-4-multimonitor.html', output: 'screenshot-4-multimonitor.png' },
	{ file: 'screenshot-5-duplicates.html', output: 'screenshot-5-duplicates.png' },
	{ file: 'screenshot-6-settings.html', output: 'screenshot-6-settings.png' },
];

async function capture() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: 1,
	});

	for (const { file, output } of screenshots) {
		const page = await context.newPage();
		const filePath = join(__dirname, file);
		await page.goto(`file://${filePath}`);
		await page.waitForTimeout(500);
		await page.screenshot({
			path: join(__dirname, output),
			type: 'png',
			fullPage: false,
		});
		console.log(`Captured: ${output}`);
		await page.close();
	}

	await browser.close();
	console.log('All screenshots captured.');
}

capture().catch(console.error);
