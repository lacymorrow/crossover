#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * Validates critical aspects before release
 */

const fs = require( 'fs' )
const path = require( 'path' )
const { execSync } = require( 'child_process' )

class ProductionValidator {

	constructor() {

		this.errors = []
		this.warnings = []
		this.passed = []
	
	}

	log( level, message ) {

		const timestamp = new Date().toISOString()
		console.log( `[${timestamp}] ${level.toUpperCase()}: ${message}` )
	
	}

	error( message ) {

		this.errors.push( message )
		this.log( 'error', message )
	
	}

	warning( message ) {

		this.warnings.push( message )
		this.log( 'warning', message )
	
	}

	pass( message ) {

		this.passed.push( message )
		this.log( 'pass', message )
	
	}

	/**
	 * Check package.json for production readiness
	 */
	validatePackageJson() {

		this.log( 'info', 'Validating package.json...' )

		try {

			const packageJson = JSON.parse( fs.readFileSync( 'package.json', 'utf8' ) )

			// Required fields
			const requiredFields = [
				'name', 'version', 'description', 'author', 'license'
			]
			for ( const field of requiredFields ) {

				if ( !packageJson[field] ) {

					this.error( `Missing required field in package.json: ${field}` )
				
				} else {

					this.pass( `package.json has required field: ${field}` )
				
				}
			
			}

			// Version format
			if ( packageJson.version && !/^\d+\.\d+\.\d+/.test( packageJson.version ) ) {

				this.error( `Invalid version format: ${packageJson.version}` )
			
			} else {

				this.pass( `Valid version format: ${packageJson.version}` )
			
			}

			// Build configuration
			if ( !packageJson.build ) {

				this.error( 'Missing electron-builder configuration in package.json' )
			
			} else {

				this.pass( 'Electron-builder configuration found' )
			
			}

		} catch ( error ) {

			this.error( `Failed to read package.json: ${error.message}` )
		
		}
	
	}

	/**
	 * Check for security vulnerabilities
	 */
	validateSecurity() {

		this.log( 'info', 'Checking for security vulnerabilities...' )

		try {

			execSync( 'npm audit --audit-level=high', { stdio: 'pipe' } )
			this.pass( 'No high-severity security vulnerabilities found' )
		
		} catch ( error ) {

			this.warning( 'Security vulnerabilities detected - run "npm audit fix"' )
		
		}
	
	}

	/**
	 * Validate code quality
	 */
	validateCodeQuality() {

		this.log( 'info', 'Validating code quality...' )

		try {

			// Run linting
			execSync( 'npm run lint:src', { stdio: 'pipe' } )
			this.pass( 'Source code passes linting checks' )
		
		} catch ( error ) {

			this.error( 'Source code has linting errors' )
		
		}

		// Check for TODO comments (warnings only)
		try {

			const output = execSync( 'grep -r "TODO\\|FIXME\\|HACK" src/ || true', { encoding: 'utf8' } )
			const lines = output.trim().split( '\n' ).filter( line => line.length > 0 )
			if ( lines.length > 0 ) {

				this.warning( `Found ${lines.length} TODO/FIXME/HACK comments in source code` )
			
			} else {

				this.pass( 'No TODO/FIXME/HACK comments found' )
			
			}
		
		} catch ( error ) {
			// Ignore grep errors
		}
	
	}

	/**
	 * Validate build assets
	 */
	validateAssets() {

		this.log( 'info', 'Validating required assets...' )

		const requiredAssets = [
			'src/static/icons/icon.png',
			'src/static/icons/icon.ico',
			'src/static/icons/icon.icns'
		]

		for ( const asset of requiredAssets ) {

			if ( fs.existsSync( asset ) ) {

				this.pass( `Required asset found: ${asset}` )
			
			} else {

				this.error( `Missing required asset: ${asset}` )
			
			}
		
		}

		// Check crosshair assets
		const crosshairDir = 'src/static/crosshairs'
		if ( fs.existsSync( crosshairDir ) ) {

			const crosshairs = fs.readdirSync( crosshairDir, { withFileTypes: true } )
				.filter( dirent => dirent.isDirectory() )

			if ( crosshairs.length > 0 ) {

				this.pass( `Found ${crosshairs.length} crosshair categories` )
			
			} else {

				this.warning( 'No crosshair categories found' )
			
			}
		
		} else {

			this.error( 'Crosshairs directory not found' )
		
		}
	
	}

	/**
	 * Validate dependencies
	 */
	validateDependencies() {

		this.log( 'info', 'Validating dependencies...' )

		try {

			execSync( 'npm run check:deps', { stdio: 'pipe' } )
			this.pass( 'No unused dependencies found' )
		
		} catch ( error ) {

			this.warning( 'Unused dependencies detected' )
		
		}

		try {

			execSync( 'npm run check:circular', { stdio: 'pipe' } )
			this.pass( 'No circular dependencies found' )
		
		} catch ( error ) {

			this.error( 'Circular dependencies detected' )
		
		}
	
	}

	/**
	 * Validate build process
	 */
	validateBuild() {

		this.log( 'info', 'Validating build process...' )

		try {

			// Test pack (build without distribution)
			execSync( 'npm run pack', { stdio: 'pipe' } )
			this.pass( 'Build pack process completed successfully' )

			// Check if dist directory was created
			if ( fs.existsSync( 'dist' ) ) {

				this.pass( 'Build output directory created' )
			
			} else {

				this.error( 'Build output directory not found' )
			
			}
		
		} catch ( error ) {

			this.error( `Build process failed: ${error.message}` )
		
		}
	
	}

	/**
	 * Validate electron configuration
	 */
	validateElectronConfig() {

		this.log( 'info', 'Validating Electron configuration...' )

		// Check main entry point
		if ( fs.existsSync( 'index.js' ) ) {

			this.pass( 'Main entry point (index.js) found' )
		
		} else {

			this.error( 'Main entry point (index.js) not found' )
		
		}

		// Check main process files
		const mainFiles = [
			'src/main/crossover.js',
			'src/main/windows.js',
			'src/main/init.js'
		]

		for ( const file of mainFiles ) {

			if ( fs.existsSync( file ) ) {

				this.pass( `Main process file found: ${file}` )
			
			} else {

				this.error( `Main process file missing: ${file}` )
			
			}
		
		}

		// Check renderer files
		const rendererFiles = [
			'src/renderer/renderer.js',
			'src/renderer/styles/dist/index.css'
		]

		for ( const file of rendererFiles ) {

			if ( fs.existsSync( file ) ) {

				this.pass( `Renderer file found: ${file}` )
			
			} else {

				this.error( `Renderer file missing: ${file}` )
			
			}
		
		}
	
	}

	/**
	 * Run all validations
	 */
	async runAllValidations() {

		console.log( '🔍 Starting Production Readiness Validation...\n' )

		this.validatePackageJson()
		this.validateSecurity()
		this.validateCodeQuality()
		this.validateAssets()
		this.validateDependencies()
		this.validateElectronConfig()

		// Only run build validation if no critical errors
		if ( this.errors.length === 0 ) {

			this.validateBuild()
		
		} else {

			this.warning( 'Skipping build validation due to critical errors' )
		
		}

		this.printSummary()
	
	}

	/**
	 * Print validation summary
	 */
	printSummary() {

		console.log( '\n' + '='.repeat( 60 ) )
		console.log( '📊 PRODUCTION READINESS SUMMARY' )
		console.log( '='.repeat( 60 ) )

		console.log( `✅ Passed: ${this.passed.length}` )
		console.log( `⚠️  Warnings: ${this.warnings.length}` )
		console.log( `❌ Errors: ${this.errors.length}` )

		if ( this.errors.length > 0 ) {

			console.log( '\n🚨 CRITICAL ERRORS:' )
			this.errors.forEach( ( error, index ) => {

				console.log( `${index + 1}. ${error}` )
			
			} )
		
		}

		if ( this.warnings.length > 0 ) {

			console.log( '\n⚠️  WARNINGS:' )
			this.warnings.forEach( ( warning, index ) => {

				console.log( `${index + 1}. ${warning}` )
			
			} )
		
		}

		console.log( '\n' + '='.repeat( 60 ) )

		if ( this.errors.length === 0 ) {

			console.log( '🎉 PRODUCTION READY! No critical errors found.' )
			process.exit( 0 )
		
		} else {

			console.log( '🛑 NOT PRODUCTION READY! Please fix critical errors.' )
			process.exit( 1 )
		
		}
	
	}

}

// Run validation if called directly
if ( require.main === module ) {

	const validator = new ProductionValidator()
	validator.runAllValidations().catch( error => {

		console.error( 'Validation failed:', error )
		process.exit( 1 )
	
	} )

}

module.exports = ProductionValidator
