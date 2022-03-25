/* eslint unicorn/prefer-module: 0 */

const process = require('process');

// CLI version
const args = new Set( process.argv.map( ( element, i ) => ( i > 0 && i < 4 ) && String( element ).toLowerCase() ) )
if ( args.has( '--version' ) || args.has( '-v' ) ) {

	const { version } = require( './package.json' )
	process.stdout.write( version )
	process.exit()

}

// App entry
const main = require( './src/index.js' )

main()
