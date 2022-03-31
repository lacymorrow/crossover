const config = {

	retries: 0,

	testDir: 'test',
	outputDir: 'test/results'

	timeout: 10_000,

	workers: process.env.CI ? 2 : undefined,

	expect: {

		toMatchSnapshot: {threshold: 0.1},

	},

	use: {
		slowMo: 100,
		headless: false,
		ignoreHTTPSErrors: true,
		screenshot: 'on',
		trace: 'on',
		video: 'on-first-retry',
		viewport: { width: 1280, height: 720 },
	},
}

const metadata = {
  platform: process.platform,
  headful: true,
  browserName: 'electron',
  channel: undefined,
  mode: 'default',
  video: false,
};

config.projects.push({
  name: 'chromium',  // We use 'chromium' here to share screenshots with chromium.
  use: {
    browserName: 'chromium',
    coverageName: 'electron',
  },
  testDir: path.join(config.testDir, 'electron'),
  metadata,
});

config.projects.push({
  name: 'chromium',  // We use 'chromium' here to share screenshots with chromium.
  use: {
    browserName: 'chromium',
    coverageName: 'electron',
  },
  testDir: path.join(config.testDir, 'page'),
  metadata,
});

export default config
