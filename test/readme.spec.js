const fs = require( 'fs' )
const { test, expect } = require( '@playwright/test' )
const path = require( 'path' )

const __static = path.resolve( 'src', 'static' )

test.beforeAll( async () => {

	// const app = await startApp()
	// mainPage = app.mainPage
	// await injectAxe( mainPage )

} )

// test.afterEach( async () => wait( delays.short ) )
// test.afterAll( closeApp )

test( 'Check logo', async () => {

	const file = fs.existsSync( path.join( __static, 'icons', 'icon.png' ) )
	expect( file, 'The icon in the github readme' ).toBe( true )

} )

test( 'Check demo images', async () => {

	let file = fs.existsSync( path.join( __static, 'meta', 'patreon-button.webp' ) )
	expect( file, 'An image in the github readme' ).toBe( true )

	file = fs.existsSync( path.join( __static, 'meta', 'demo-main.png' ) )
	expect( file, 'An image in the github readme' ).toBe( true )

	file = fs.existsSync( path.join( __static, 'meta', 'demo-duplicate.png' ) )
	expect( file, 'An image in the github readme' ).toBe( true )

	file = fs.existsSync( path.join( __static, 'meta', 'demo-chooser.png' ) )
	expect( file, 'An image in the github readme' ).toBe( true )

	file = fs.existsSync( path.join( __static, 'meta', 'demo-settings.png' ) )
	expect( file, 'An image in the github readme' ).toBe( true )

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
