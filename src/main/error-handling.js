const log = require( 'electron-log' )
const unhandled = require( 'electron-unhandled' )
const { debugInfo, openNewGitHubIssue } = require( 'electron-util' )

// Const { openReportCrashDialog } = require( './dialog.js' )

const errorHandling = () => {

	// Catch unhandled errors
	unhandled( {
		// ShowDialog: true, // default: only in production
		logger: log.warn,
		reportButton( error ) {

			openNewGitHubIssue( {
				user: 'lacymorrow',
				repo: 'crossover',
				body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${debugInfo()}`,
			} )

		},
	} )

	// Log.catchErrors( {
	// 	showDialog: true,
	// 	onError(error, versions, submitIssue) {
	// 		openReportCrashDialog({error, versions, submitIssue})
	// 	}
	// } )

}

module.exports = errorHandling
