/*
	Developer Alerts

	If a file named CROSSOVER_ALERT is found in the root of the main branch, users will see the alert pop up in a dialog.

	Todo: Markdown
*/
const got = require( 'got' )
const { ALERT_URL } = require( '../config/config' )
const { checkboxTrue } = require( '../config/utils' )
const dialog = require( './dialog' )
const log = require( './log' )
const preferences = require( './preferences' ).init()

const init = async () => {

	if ( !checkboxTrue( preferences.value( 'app.alerts' ), 'alerts' ) ) {

		return

	}

	// We phone github here
	const message = await got.get( ALERT_URL ).catch( error => {

		log.info( 'No alerts found.', error )

	} )

	if ( message.body ) {

		// notification( { title: 'CrossOver: Developer Update', body: message.body } )

		dialog.openAlertDialog( message.body )

	}

}

const alert = {
	init,
}
module.exports = alert
