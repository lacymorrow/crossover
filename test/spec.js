const electronPath = require( 'electron' ) // Require Electron from the binaries included in node_modules.
const path = require( 'path' )
const { Application } = require( 'spectron' )
const test = require( 'ava' )

const delay = time => new Promise( resolve => {

	setTimeout( resolve, time )

} )

test.before( t => {

	t.context.app = new Application( {
		path: electronPath,
		args: [ path.join( __dirname, '..' ) ]
	} )

	return t.context.app.start()

} )

test.after.always( t => {

	if ( t.context.app && t.context.app.isRunning() ) {

		return t.context.app.stop()

	}

} )

test( 'shows an initial window', async t => {

	const count = await t.context.app.client.getWindowCount()
	t.is( count, 2 )

} )
