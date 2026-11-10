const { app, session } = require( 'electron' )

// CrossOver only renders local files and needs no browser permissions.
// Deny all permission requests (geolocation, notifications, camera, etc.)
// to prevent unexpected OS prompts, particularly on Windows. (#471)
// Accessing session.defaultSession before the 'ready' event throws and
// crashes the main process, so installation always defers until ready. (#529)
const init = () => app.whenReady().then( () => {

	session.defaultSession.setPermissionRequestHandler( ( _webContents, _permission, callback ) => {

		callback( false )

	} )

	session.defaultSession.setPermissionCheckHandler( () => false )

} )

module.exports = { init }
