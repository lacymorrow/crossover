const path = require('path')

const config = {

	retries: process.env.CI ? 2 : 0,

	testDir: 'test',
	outputDir: 'test/results',

	timeout: 10_000,

	workers: 1,

	// shard: { total: 1, current: 1 },

	expect: {

		toMatchSnapshot: { threshold: 0.1 },

	},

	projects: [
		{
			name: 'chromium', // We use 'chromium' here to share screenshots with chromium.
			metadata: {
				platform: process.platform,
				headful: true,
				browserName: 'electron',
				channel: undefined,
				mode: 'default',
				video: false,
			},
		},
	],

	use: {
		browserName: 'chromium',
		coverageName: 'electron',
		SlowMo: 100,
		headless: false,
		ignoreHTTPSErrors: true,
		screenshot: 'on',
		trace: 'on',
		video: 'on-first-retry',
		viewport: { width: 1280, height: 720 },
	},
}

export default config
