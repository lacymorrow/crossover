const fs = require( 'fs' )
const path = require( 'path' )
const { __static } = require( './paths' )

const crosshairsPath = path.join( __static, 'crosshairs' )

const getCrosshairImages = async () => {

	// How many levels deep to recurse
	const crosshairsObject = await getImages( crosshairsPath, 2 )

	return crosshairsObject

}

const getImages = ( directory, level ) => new Promise( ( resolve, reject ) => {

	const crosshairs = []
	fs.promises.readdir( directory, async ( error, dir ) => {

		if ( error ) {

			reject( new Error( `Promise Errored: ${error}`, directory ) )

		}

		for ( let i = 0, filepath;
			( filepath = dir[i] ); i++ ) {

			const stat = fs.lstatSync( path.join( directory, filepath ) )

			if ( stat.isDirectory() && level > 0 ) {

				// eslint-disable-next-line no-await-in-loop
				const next = await getImages( path.join( directory, filepath ), level - 1 )
				crosshairs.push( next )

			} else if ( stat.isFile() && !/^\..*|.*\.docx$/.test( filepath ) ) {

				// Filename
				crosshairs.push( path.join( directory, filepath ) )

			}

		}

		resolve( crosshairs )

	} )

} )

const helpers = {
	getImages,
	getCrosshairImages,
}

module.exports = helpers
