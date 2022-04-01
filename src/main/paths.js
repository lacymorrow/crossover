const path = require( 'path' )
const { app } = require( 'electron' )

const __app = app.getAppPath()
const __src = path.join( __app, 'src' )
const __main = path.join( __src, 'main' )
const __renderer = path.join( __src, 'renderer' )
const __static = path.join( __src, 'static' )

const paths = { __app, __src, __static, __main, __renderer }

module.exports = paths
