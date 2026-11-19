const log = require( './log' )
const windows = require( './windows' )
const register = require( './register' )
const ipc = require( './ipc' )
const crossover = require( './crossover' )
const { checkboxTrue } = require( '../config/utils' )
const { app, ipcMain } = require( 'electron' )
const preferences = require( './preferences' ).init()
const accessibility = require( './accessibility' )
const banner = require( './banner' )
const reviewPrompt = require( './review-prompt' )
const { firstLaunch } = require( './first-launch' )

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

		// Shortcuts are already registered: syncSettings() above clears and
		// registers them. Registering again here made every one fail as "claimed
		// by another app" and raised the conflict notice on each launch. Nobody
		// saw that before 3.4.10 because this function almost never ran.

		// Restore lock state
		crossover.lockWindow( preferences.value( 'hidden.locked' ) )

		// Show onboarding overlay on first launch
		// An install that has run before doesn't get the tour (see first-launch.js)
		if ( !preferences.value( 'hidden.onboardingCompleted' ) && !firstLaunch( app.getPath( 'userData' ) ) ) {

			preferences.value( 'hidden.onboardingCompleted', true )

		}

		if ( !options?.triggeredByReset && !preferences.value( 'hidden.onboardingCompleted' ) ) {

			if ( windows.win && windows.win.webContents ) {

				windows.win.webContents.send( 'show_onboarding' )

			}

		}

		// Check review prompt (not on settings reset; deferred so lock state is applied first)
		if ( !options?.triggeredByReset ) {

			if ( windows.win ) {

				try {

					reviewPrompt.check( windows.win )
					banner.init( windows.win )

				} catch ( error ) {

					log.error( error )

				}

			}

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

				// First boot: wait for renderer to finish loading.
				// did-finish-load can fire before we get here while isLoading()
				// is still true, and then it never fires again: setup never ran,
				// so the saved lock state, the review prompt and the announcement
				// were all skipped. did-stop-loading always follows.
				// setupLockState runs once, whichever comes first.
				windows.win.webContents.once( 'did-finish-load', scheduleSetup )
				windows.win.webContents.once( 'did-stop-loading', scheduleSetup )

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
