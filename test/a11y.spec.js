const { injectAxe, checkA11y } = require( 'axe-playwright' )
const { test } = require( '@playwright/test' )
const { closeApp, startApp, wait, delays } = require( './helpers.js' )

// Breakpoint: await mainPage.pause()

let mainPage

test.beforeAll( async () => {

	const app = await startApp()
	mainPage = app.mainPage
	await injectAxe( mainPage )

} )

test.afterEach( async () => wait( delays.short ) )
test.afterAll( closeApp )

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
