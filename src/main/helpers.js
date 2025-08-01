const fs = require( 'fs' )
const path = require( 'path' )
const { __crosshairs } = require( './paths' )

const getCrosshairImages = async () => {

	// How many levels deep to recurse
	const crosshairsObject = await getImages( __crosshairs, 2 )

	return crosshairsObject

}

const getImages = async ( directory, level ) => {

	const crosshairs = []

	try {

		const dir = await fs.promises.readdir( directory )

		for ( let i = 0, filepath;
			( filepath = dir[i] ); i++ ) {

			const stat = fs.lstatSync( path.join( directory, filepath ) )

			if ( stat.isDirectory() && level > 0 ) {


				const next = await getImages( path.join( directory, filepath ), level - 1 )
				crosshairs.push( next )

			} else if ( stat.isFile() && !/^\..*|.*\.docx$/.test( filepath ) ) {

				// Filename
				crosshairs.push( path.join( directory, filepath ) )

			}

		}

		return crosshairs

	} catch ( error ) {

		throw new Error( `Promise Errored: ${error}`, directory )

	}

}

const helpers = {
	getImages,
	getCrosshairImages,
}

module.exports = helpers
