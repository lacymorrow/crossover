const log = require( 'electron-log' )
const unhandled = require( 'electron-unhandled' )
const { debugInfo, openNewGitHubIssue } = require( './util' )

// Const { openReportCrashDialog } = require( './dialog.js' )

const reportBody = error => `
	<!-- Please succinctly describe your issue and steps to reproduce it. Screenshots are worth a hundred bug reports! -->


	---
	${error && `
	${error}:
	${error.stack}

	---`}

	${debugInfo()}`

const init = async () => {

	// unhandledRejection : This will catch any thrown errors, or non fatal errors you have successfully handled via throw.
	// uncaughtException : This only catches fatal errors or errors that would crash your node instance

	// Report unhandled errors
	await unhandled( {
		showDialog: false, // default: only in production
		logger: log.warn,
		reportButton( error ) {

			openNewGitHubIssue( {
				user: 'lacymorrow',
				repo: 'crossover',
				body: reportBody( error ),
			} )

		},
	} )

	// log.catchErrors( {
	// 	showDialog: true,
	// 	onError(error, versions, submitIssue) {
	// 		openReportCrashDialog({error, versions, submitIssue})
	// 	}
	// } )

}

const errorHandling = { init, reportBody }

module.exports = errorHandling
