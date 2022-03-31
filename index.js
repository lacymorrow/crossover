const process = require( 'process' )
const { version } = require( './package.json' )

// CLI version
const args = new Set( process.argv.filter( ( element, i ) => ( ( i > 0 && i < 4 ) && String( element ).toLowerCase() ) ) )

if ( args.has( '--version' ) || args.has( '-v' ) ) {

    process.stdout.write( version )
    process.exit()

}

console.log( `CrossOver ${version}` )

if ( args.length > 0 ) {

    console.log( 'Arguments:', args )

}

if ( args.has( '--debug' ) || args.has( '-d' ) ) {

    console.log( '<Development Mode>' )
    process.env.NODE_ENV = 'development'
    process.env.ELECTRON_IS_DEV = 1

}

if ( args.has( '--reset' ) || args.has( '-r' ) ) {

    console.log( '<Reset App>' )
    process.env.CROSSOVER_RESET = true

}

// App entry
const main = require( './src/index.js' )

main()
