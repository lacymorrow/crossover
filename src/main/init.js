const log = require( './log' )
const windows = require( './windows' )
const register = require( './register' )
const ipc = require( './ipc' )
const crossover = require( './crossover' )
const { checkboxTrue } = require( '../config/utils' )
const { ipcMain } = require( 'electron' )
const preferences = require( './preferences' ).init()
const accessibility = require( './accessibility' )
const reviewPrompt = require( './review-prompt' )

const init = async options => {

	log.info( 'Init', options )

	// Initialize accessibility check on first boot
	if ( !options?.triggeredByReset ) {

		// Check accessibility permissions before starting any input hooks
		await accessibility.initializeAccessibilityCheck()

	}

	// Cleanup (if reset)
	// TODO explicitly remove channels
	// ipcMain.removeAllListeners()

	// Todo see if this conditional is needed to prevent multiple ipc
	if ( options?.triggeredByReset ) {

		windows.center()

	} else {

		// First boot
		// IPC
		ipc.init()

	}

	// Reset some preferences for app startup
	preferences.value( 'hidden.showSettings', false )
	preferences.value( 'hidden.tilted', false )
	preferences.value( 'hidden.reticleHidden', false )

	// Start unlocked?
	if ( checkboxTrue( preferences.value( 'app.startUnlocked' ), 'startUnlocked' ) ) {

		preferences.value( 'hidden.locked', false )

	}

	/* Create main window */

	await windows.init()
	// Log.info( windows.win.getNativeWindowHandle() )

	// Sync Settings
	crossover.syncSettings()

	crossover.resetPosition()

	// Set lock state after renderer is ready
	// Using did-finish-load ensures the renderer's IPC listeners are registered
	// before we send lock_window. The 400ms timeout was unreliable on Windows (#480).
	let lockStateInitialized = false
	const setupLockState = () => {

		if ( lockStateInitialized ) {

			return

		}

		lockStateInitialized = true

		// Keyboard shortcuts (delay from did-finish-load avoids the reset loop)
		crossover.registerKeyboardShortcuts()

		// Restore lock state
		crossover.lockWindow( preferences.value( 'hidden.locked' ) )

		// Show onboarding overlay on first launch
		if ( !options?.triggeredByReset && !preferences.value( 'hidden.onboardingCompleted' ) ) {

			if ( windows.win && windows.win.webContents ) windows.win.webContents.send( 'show_onboarding' )

		}

		// Check review prompt (not on settings reset; deferred so lock state is applied first)
		if ( !options?.triggeredByReset ) {

			if ( windows.win ) reviewPrompt.check( windows.win ).catch( log.error )

		}

		ipcMain.once( 'init', () => {

			log.info( 'INIT TRIGGERED' )
			init( { triggeredByReset: true } )

		} )

	}

	if ( windows.win && windows.win.webContents ) {

		if ( options?.triggeredByReset ) {

			// Reset case: page is already loaded, small delay to avoid the reset loop
			setTimeout( setupLockState, 100 )

		} else {

			const scheduleSetup = () => setTimeout( setupLockState, 50 )

			if ( windows.win.webContents.isLoading() ) {

				// First boot: wait for renderer to finish loading
				windows.win.webContents.once( 'did-finish-load', scheduleSetup )

			} else {

				// Page already loaded
				scheduleSetup()

			}

		}

	} else {

		// Fallback
		setTimeout( setupLockState, 400 )

	}

	// Spawn chooser window (if resetting it may exist)
	if ( !windows.chooserWindow ) {

		await windows.createChooser( preferences.value( 'crosshair.crosshair' ) )

	}

	// Window Events after windows are created
	register.events()

}

module.exports = init
