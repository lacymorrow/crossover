const { injectAxe, checkA11y, getViolations, reportViolations } = require( 'axe-playwright' )
const { ElectronApplication, Page, _electron: electron } = require( 'playwright' )
const { expect, test } = require( '@playwright/test' )
const { startApp, wait } = require( './helpers.js' )

// Breakpoint: await mainPage.pause()

let electronApp
let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	electronApp = app.electronApp
	mainPage = app.mainPage
	await injectAxe( mainPage )

} )

test.afterEach( async () => await wait( 500 ) )

test.afterAll( async () => {

	await electronApp.close()

} )

test( 'Check A11y simple', async () => {

	test.fixme()
	await checkA11y( mainPage )

} )

test( 'Check A11y AXE', async () => {

	test.fixme()
	await checkA11y( mainPage, null, {
		axeOptions: {
			runOnly: {
				type: 'tag',
				values: [ 'wcag2a' ],
			},
		},
	} )

} )

// Test( 'Report A11y Violations', async () => {
// 	const violations = await getViolations(mainPage, null, {
// 	  axeOptions: {
// 	    runOnly: {
// 	      type: 'tag',
// 	      values: ['wcag2a'],
// 	    },
// 	  },
// 	})

// 	reportViolations(violations, new YourAwesomeCsvReporter('accessibility-report.csv'))

// 	expect(violations.length).toBe(0)
// } )
