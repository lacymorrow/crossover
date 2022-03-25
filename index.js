/* eslint unicorn/prefer-module: 0 */

// CLI version
const args = process.argv.map((e,i)=>(0 < i && i < 4) && String(e).toLowerCase())
if (args.includes('--version') || args.includes('-v')) {
	const version = require('./package.json').version
	process.stdout.write(version)
	process.exit()
}

// App entry
const main = require( './src/index.js' )
main()
