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
const { firstLaunch } = require( './first-launch' )

// Flip only with Lacy's sign-off on the redesigned prompts
const PROMPTS_APPROVED = false

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
		// Onboarding, the review prompt and the announcement are all off until
		// Lacy has approved a redesign (2026-11-19: they overlap each other and
		// the window's buttons). Before 3.4.10 a startup race hid all three, so
		// nobody had seen them live. The announcement also stays off remotely
		// (announcement.json), and PROMPTS_APPROVED gates it here as well.
		if ( PROMPTS_APPROVED && !options?.triggeredByReset ) {

			if ( !preferences.value( 'hidden.onboardingCompleted' ) && !firstLaunch( app.getPath( 'userData' ) ) ) {

				preferences.value( 'hidden.onboardingCompleted', true )

			}

			if ( !preferences.value( 'hidden.onboardingCompleted' ) && windows.win && windows.win.webContents ) {

				windows.win.webContents.send( 'show_onboarding' )

			}

		}

		// Announcement (not on settings reset; deferred so lock state is applied first)
		if ( PROMPTS_APPROVED && !options?.triggeredByReset ) {

			if ( windows.win ) {

				try {

					// The review prompt stays off in 3.4.x. It was written for
					// this spot but never ran in a release (the startup race
					// above), nobody has seen it live, and it sits over the
					// chooser and settings buttons until dismissed. Turning it
					// on is a feature, and v3 takes fixes only.
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
