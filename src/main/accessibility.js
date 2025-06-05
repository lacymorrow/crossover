const { app, dialog, shell } = require( 'electron' )
const { is } = require( './util' )
const log = require( './log' )
const preferences = require( './preferences' ).init()

let accessibilityCheckPromise = null

/**
 * Check if accessibility permissions are granted on macOS
 * Returns true on non-macOS platforms
 */
const checkAccessibilityPermissions = () => {

	if ( !is.macos ) {

		return true

	}

	// Use systemPreferences to check accessibility permissions
	const { systemPreferences } = require( 'electron' )

	try {

		// This will return true if accessibility is enabled
		return systemPreferences.isTrustedAccessibilityClient( false )

	} catch ( error ) {

		log.warn( 'Error checking accessibility permissions:', error )

		return false

	}

}

/**
 * Request accessibility permissions with user dialog
 */
const requestAccessibilityPermissions = async () => {

	if ( !is.macos ) {

		return true

	}

	// Check if we're already in the process of requesting permissions
	if ( accessibilityCheckPromise ) {

		return accessibilityCheckPromise

	}

	const { systemPreferences } = require( 'electron' )

	try {

		// First check if already granted
		if ( systemPreferences.isTrustedAccessibilityClient( false ) ) {

			return true

		}

		// Create a promise to handle the permission request flow
		accessibilityCheckPromise = new Promise( resolve => {

			const handlePermissionRequest = async () => {

				// Show explanation dialog first
				const result = await dialog.showMessageBox( {
					type: 'info',
					title: 'Accessibility Permission Required',
					message: 'CrossOver needs accessibility permissions to capture mouse and keyboard events.',
					detail: 'This allows features like:\n• Mouse follow mode\n• Hide crosshair on mouse/key press\n• Resize crosshair when aiming\n• Tilt crosshair controls\n\nClick "Open System Preferences" to grant permissions, then restart CrossOver.',
					buttons: [
						'Open System Preferences', 'Skip for Now', 'Quit',
					],
					defaultId: 0,
					cancelId: 1,
				} )

				switch ( result.response ) {

				case 0: // Open System Preferences
					// Try to prompt for accessibility (this will open System Preferences)
					systemPreferences.isTrustedAccessibilityClient( true )

					// Also open System Preferences directly to the right pane
					try {

						await shell.openExternal( 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility' )

					} catch ( error ) {

						log.warn( 'Could not open System Preferences directly:', error )

					}

					// Show follow-up dialog
					setTimeout( async () => {

						const followUpResult = await dialog.showMessageBox( {
							type: 'question',
							title: 'Restart Required',
							message: 'After granting accessibility permissions in System Preferences, CrossOver needs to restart.',
							detail: 'Have you granted accessibility permissions to CrossOver?',
							buttons: [ 'Restart Now', 'I\'ll Restart Later' ],
							defaultId: 0,
						} )

						if ( followUpResult.response === 0 ) {

							app.relaunch()
							app.quit()

						} else {

							// Save a flag to check permissions on next startup
							preferences.value( 'hidden.needsAccessibilityCheck', true )
							resolve( false )

						}

					}, 2000 )
					break

				case 1: // Skip for Now
					preferences.value( 'hidden.accessibilitySkipped', true )
					resolve( false )
					break

				case 2: // Quit
					app.quit()
					resolve( false )
					break

				default:
					resolve( false )
					break

				}

			}

			handlePermissionRequest().catch( error => {

				log.error( 'Error in permission request handler:', error )
				resolve( false )

			} )

		} )

		const result = await accessibilityCheckPromise
		accessibilityCheckPromise = null

		return result

	} catch ( error ) {

		log.error( 'Error requesting accessibility permissions:', error )
		accessibilityCheckPromise = null

		return false

	}

}

/**
 * Show a notification that accessibility features are disabled
 */
const showAccessibilityDisabledNotification = () => {

	const notification = require( './notification' )
	notification( {
		title: 'Accessibility Features Disabled',
		body: 'Some CrossOver features require accessibility permissions. Enable them in System Preferences > Security & Privacy > Accessibility.',
	} )

}

/**
 * Check if we should skip accessibility checks (user chose to skip)
 */
const shouldSkipAccessibilityCheck = () => preferences.value( 'hidden.accessibilitySkipped' ) === true

/**
 * Reset accessibility preferences (for settings reset)
 */
const resetAccessibilityPreferences = () => {

	preferences.value( 'hidden.accessibilitySkipped', false )
	preferences.value( 'hidden.needsAccessibilityCheck', false )

}

/**
 * Initialize accessibility check on app startup
 */
const initializeAccessibilityCheck = async () => {

	if ( !is.macos ) {

		return true

	}

	// Check if we need to recheck permissions after restart
	if ( preferences.value( 'hidden.needsAccessibilityCheck' ) ) {

		preferences.value( 'hidden.needsAccessibilityCheck', false )

		if ( checkAccessibilityPermissions() ) {

			const notification = require( './notification' )
			notification( {
				title: 'Accessibility Enabled',
				body: 'CrossOver can now use advanced input features!',
			} )

			return true

		}

	}

	// If user hasn't explicitly skipped, and permissions aren't granted, ask
	if ( !shouldSkipAccessibilityCheck() && !checkAccessibilityPermissions() ) {

		return requestAccessibilityPermissions()

	}

	return checkAccessibilityPermissions()

}

const accessibility = {
	checkAccessibilityPermissions,
	requestAccessibilityPermissions,
	showAccessibilityDisabledNotification,
	shouldSkipAccessibilityCheck,
	resetAccessibilityPreferences,
	initializeAccessibilityCheck,
}

module.exports = accessibility
