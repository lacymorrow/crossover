const path = require( 'path' )
const { app } = require( 'electron' )

const __static = path.join( app.getAppPath(), 'src', 'static' )

module.exports = __static
