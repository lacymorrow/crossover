// const fetch = require( 'node-fetch' )
const got = require( 'got' )
const { ALERT_URL } = require( '../config/config' )
const log = require( './log' )
const notification = require( './notification' )

const init = async () => {

	log.info( 'Checking GitHub for alerts…' )
	const message = await got.get( ALERT_URL ).catch( error => {

		log.info( 'No alerts found.', error )

	} )

	if ( message ) {

		console.log( `Creating noti: ${message.body}`, message.body )

		notification( { title: 'CrossOver: Developer Update', body: message.body } )

	}

	// We phone github here
	// const message = fetch( ALERT_URL )
	// 	.then( console.log )
	// 	.catch( console.error )

	// console.log( message )

}

const alert = {
	init,
}
module.exports = alert
