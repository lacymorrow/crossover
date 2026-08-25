const fs = require( 'fs' )
const path = require( 'path' )
const { expect, test } = require( '@playwright/test' )
const config = require( '../src/config/config.js' )

const SRC_DIR = path.resolve( 'src' )

const collectSourceFiles = dir => fs.readdirSync( dir, { withFileTypes: true } )
	.flatMap( entry => {

		const fullPath = path.join( dir, entry.name )
		if ( entry.isDirectory() ) {

			return collectSourceFiles( fullPath )

		}

		return entry.name.endsWith( '.js' ) ? [ fullPath ] : []

	} )

// Regression test for #529: menu.js destructured TROUBLESHOOTING_URL and
// COMPATIBILITY_URL from config.js before they existed, crashing the main
// process on startup. Every key destructured from config must be exported.
test( 'All constants destructured from config are exported', async () => {

	const requirePattern = /const\s*{([^}]+)}\s*=\s*require\(\s*'[./]+config\/config'\s*\)/g

	for ( const file of collectSourceFiles( SRC_DIR ) ) {

		const source = fs.readFileSync( file, 'utf8' )
		for ( const match of source.matchAll( requirePattern ) ) {

			const keys = match[1].split( ',' ).map( key => key.trim() ).filter( Boolean )
			for ( const key of keys ) {

				expect( config[key], `${key} destructured in ${path.relative( SRC_DIR, file )} must be exported from config.js` ).toBeDefined()

			}

		}

	}

} )

test( 'Exported URL constants are valid URLs', async () => {

	const urlKeys = Object.keys( config ).filter( key => key.endsWith( '_URL' ) )
	expect( urlKeys.length ).toBeGreaterThan( 0 )

	for ( const key of urlKeys ) {

		expect( () => new URL( config[key] ), `${key} must be a parseable URL` ).not.toThrow()

	}

} )
