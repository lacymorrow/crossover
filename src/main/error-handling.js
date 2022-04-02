const log = require( 'electron-log' )
const unhandled = require( 'electron-unhandled' )
const { debugInfo, openNewGitHubIssue } = require( 'electron-util' )

// Const { openReportCrashDialog } = require( './dialog.js' )

const reportBody = error => `
	<!-- Please succinctly describe your issue and steps to reproduce it. Screenshots are worth a hundred bug reports! -->


	---
	${error && `
	${error}:
	${error.stack}

	---`}

	${debugInfo()}`

const init = () => {

	// Catch unhandled errors
	unhandled( {
		// ShowDialog: true, // default: only in production
		logger: log.warn,
		reportButton( error ) {

			openNewGitHubIssue( {
				user: 'lacymorrow',
				repo: 'crossover',
				body: reportBody( error ),
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

const errorHandling = { init, reportBody }

module.exports = errorHandling
