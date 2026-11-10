const path = require( 'path' )

const MAIN_DIR = path.resolve( 'src/main' )
const UIOHOOK = path.resolve( 'node_modules/uiohook-napi' )

const RIGHT_MOUSE_BUTTON = 2

// The hook itself is verified against real input separately; these tests drive
// our own listeners, so accessibility must not short-circuit.
const stubAccessibility = async electronApp => electronApp.evaluate( async ( _electron, { mainDir } ) => {

	const accessibility = process.mainModule.require( `${mainDir}/accessibility.js` )
	accessibility.checkAccessibilityPermissions = () => true

}, { mainDir: MAIN_DIR } )

// Applies preferences, then re-locks so the iohook listeners re-register.
const configure = async ( electronApp, values ) => electronApp.evaluate( async ( _electron, { mainDir, values } ) => {

	const preferences = process.mainModule.require( `${mainDir}/preferences.js` ).init()
	const crossover = process.mainModule.require( `${mainDir}/crossover.js` )

	crossover.toggleWindowLock( false )

	for ( const [ key, value ] of Object.entries( values ) ) {

		preferences.value( key, value )

	}

	crossover.toggleWindowLock( true )

	return preferences.value( 'hidden.locked' )

}, { mainDir: MAIN_DIR, values } )

// Closes every duplicate, then creates `count` fresh ones.
const setDuplicateCount = async ( electronApp, count ) => electronApp.evaluate( async ( _electron, { mainDir, count } ) => {

	const crossover = process.mainModule.require( `${mainDir}/crossover.js` )
	const windows = process.mainModule.require( `${mainDir}/windows.js` )

	// Duplicates can only be created while unlocked. Tear the old ones down by
	// hand rather than through closeAllShadows(), whose dereference runs on a
	// later 'closed' event and so is not settled by the time we read the set.
	crossover.toggleWindowLock( false )

	for ( const shadow of [ ...windows.shadowWindows ] ) {

		shadow.destroy()

	}

	windows.shadowWindows.clear()

	for ( let i = 0; i < count; i++ ) {

		// eslint-disable-next-line no-await-in-loop
		await crossover.initShadowWindow()

	}

	crossover.toggleWindowLock( true )

	return windows.shadowWindows.size

}, { mainDir: MAIN_DIR, count } )

const emit = async ( electronApp, event, payload ) => electronApp.evaluate( async ( _electron, { uiohookPath, event, payload } ) => {

	const { uIOhook } = process.mainModule.require( uiohookPath )
	uIOhook.emit( event, payload )

}, { uiohookPath: UIOHOOK, event, payload } )

// Evaluates `expression` in every crosshair window: main first, then duplicates.
// A fix that only reaches windows.win shows up here as a one-element answer
// among many, which is the whole point of these tests.
const everyCrosshair = async ( electronApp, expression ) => electronApp.evaluate( async ( _electron, { mainDir, expression } ) => {

	const windows = process.mainModule.require( `${mainDir}/windows.js` )
	const all = [ windows.win, ...windows.shadowWindows ].filter( win => win && !win.isDestroyed() )

	return Promise.all( all.map( async win => win.webContents.executeJavaScript( expression ) ) )

}, { mainDir: MAIN_DIR, expression } )

// `display: none` is how the hidden class takes a crosshair off screen.
const displays = async electronApp => everyCrosshair( electronApp, 'getComputedStyle( document.body ).display' )

const widths = async electronApp => everyCrosshair( electronApp, 'getComputedStyle( document.querySelector( "#crosshair" ) ).width' )

const tilts = async electronApp => everyCrosshair( electronApp, 'getComputedStyle( document.documentElement ).getPropertyValue( "--tilt-angle" ).trim()' )

module.exports = {
	MAIN_DIR,
	RIGHT_MOUSE_BUTTON,
	UIOHOOK,
	configure,
	displays,
	emit,
	everyCrosshair,
	setDuplicateCount,
	stubAccessibility,
	tilts,
	widths,
}
