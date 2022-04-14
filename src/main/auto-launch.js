const { WindowsStoreAutoLaunch } = require( 'electron-winstore-auto-launch' )

const init = () => {

	// // Attempts to enable the task
	WindowsStoreAutoLaunch.enable()

	// // Attempts to disable the task
	// WindowsStoreAutoLaunch.disable()

	// // Returns the current status of the task
	// WindowsStoreAutoLaunch.getStatus()

	// // Returns an IList/Array of all startupTasks registered in the manifest
	// WindowsStoreAutoLaunch.getStartupTasks()

	// // Returns the first found startupTask
	// WindowsStoreAutoLaunch.getStartupTask()

}

const autoLaunch = {
	init,
}

module.exports = autoLaunch
