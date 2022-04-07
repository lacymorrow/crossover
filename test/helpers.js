const { _electron: electron } = require( 'playwright' )

let electronApp

const CHOOSER_WINDOW = 'Crosshairs'
const SETTINGS_WINDOW = 'Preferences'

const delays = {
	short: 500,
	medium: 1000,
	long: 5000,
}

// eslint-disable-next-line no-promise-executor-return
const wait = ms => new Promise( r => setTimeout( r, ms ) )

const startApp = async () => {

	// Todo: test on packaged build
	// // Find the latest build in the out directory
	// const latestBuild = findLatestBuild()
	// // Parse the directory and find paths and other info
	// const appInfo = parseElectronApp( latestBuild )
	// Set the CI environment variable to true
	// process.env.CI = 'e2e'
	// electronApp = await electron.launch( {
	// 	args: [ appInfo.main ],
	// 	executablePath: appInfo.executable,
	// } )

	process.env.CI = 'e2e'

	electronApp = await electron.launch( { args: [ '.' ] } )

	electronApp.on( 'window', async page => {

		// console.log( `Window opened: ${page.url()}` )

		// Capture errors
		page.on( 'pageerror', error => {

			console.error( error )

		} )
		// Capture console messages
		page.on( 'console', _message => {

			if ( process.env.NODE_ENV === 'development' ) {

				console.warn( _message )

			}

		} )

	} )

	const mainPage = await electronApp.firstWindow()

	// Await mainPage.screenshot( {
	// 	path: 'test/screenshots/start.png',
	// } )

	await wait( delays.short )

	return { electronApp, mainPage, page: mainPage }

}

const closeApp = async () => {

	try {

		await electronApp.close()

	} catch ( error ) {

		console.error( 'App was already closed:', error )

	}

}

const focusedMinimizedVisible = async ( { electronApp, windowName } ) => electronApp.evaluate( async ( { BrowserWindow }, windowName ) => {

	console.log( windowName )
	const windows = await BrowserWindow.getAllWindows()
	const win = windows.find( w => w.title === windowName )
	win?.focus()

	return { focused: win.isFocused(), minimized: win.isMinimized(), visible: win.isVisible() }

}, windowName )

const getBounds = async ( { electronApp, windowName } ) => electronApp.evaluate( async ( { BrowserWindow }, windowName ) => BrowserWindow.getAllWindows().filter( w => w.title === windowName )[0].getBounds(), windowName )

// This injects a box into the page that moves with the mouse;
// via https://github.com/puppeteer/puppeteer/issues/4378#issuecomment-499726973
function visualMouseCode() {

	console.log( '* VISUAL MOUSE *' )
	const box = document.createElement( 'puppeteer-mouse-pointer' )
	const styleElement = document.createElement( 'style' )
	styleElement.innerHTML = `
        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 10px;
          height: 10px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        puppeteer-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        puppeteer-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        puppeteer-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
      `
	document.head.append( styleElement )
	document.body.append( box )
	document.addEventListener( 'mousemove', event => {

		box.style.left = event.pageX + 'px'
		box.style.top = event.pageY + 'px'
		updateButtons( event.buttons )

	}, true )
	document.addEventListener( 'mousedown', event => {

		updateButtons( event.buttons )
		box.classList.add( 'button-' + event.which )

	}, true )
	document.addEventListener( 'mouseup', event => {

		updateButtons( event.buttons )
		box.classList.remove( 'button-' + event.which )

	}, true )
	function updateButtons( buttons ) {

		for ( let i = 0; i < 5; i++ ) {

			// eslint-disable-next-line no-bitwise
			box.classList.toggle( 'button-' + i, buttons & ( 1 << i ) )

		}

	}

}

const visualMouse = async mainPage => {

	await mainPage.addScriptTag( { content: `(${visualMouseCode})()` } )

}

module.exports = {
	CHOOSER_WINDOW,
	SETTINGS_WINDOW,
	closeApp,
	delays,
	focusedMinimizedVisible,
	getBounds,
	startApp,
	visualMouse,
	wait,
}
