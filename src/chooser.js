/* global feather */

( () => {

	// Loaded indicator
	let loaded = false

	// DOM elements
	const containerElement = document.querySelector( '#chooser-container' )
	const chooserElement = document.querySelector( '#crosshair-chooser' )
	const closeBtn = document.querySelector( '.close-button' )

	// Render icons
	if ( feather ) {

		feather.replace()

	}

	// Crosshair Images -> <select> input
	const loadCrosshairs = crosshairsObject => {

		const { crosshairs, current } = crosshairsObject

		// Create "No crosshair" option

		for ( const element of crosshairs ) {

			if ( typeof element === 'string' ) {

				const img = createImage( element, current )
				chooserElement.append( img )

			} else if ( typeof element === 'object' ) {

				createGroup( element, current )

			}

		}

		loaded = true

	}

	// Title Case and spacing
	function prettyFilename( string ) {

		// Remove path and extension
		string = window.crossover.path.parse( string ).name

		string = string
			.split( '-' )
			.map( w => w[0].toUpperCase() + w.slice( 1 ).toLowerCase() )
			.join( ' ' )

		return string

	}

	// Create option elements
	const createImage = ( file, current ) => {

		const name = prettyFilename( file )
		const div = document.createElement( 'DIV' )
		const p = document.createElement( 'P' )
		const img = document.createElement( 'IMG' )

		div.classList.add( 'crosshair-option' )
		p.textContent = name

		img.alt = name
		img.draggable = false
		img.src = file

		if ( current === file ) {

			img.classList = 'current'

		}

		img.addEventListener( 'click', event => {

			setCrosshair( file )

			// Set 'selected' border color
			const current = document.querySelector( '.current' )
			if ( current ) {

				current.classList.remove( 'current' )

			}

			event.target.classList.add( 'current' )

		} )

		div.append( img, p )

		return div

	}

	// Setup optgroup elements
	const createGroup = ( files, current ) => {

		const group = document.createElement( 'DIV' )
		const title = document.createElement( 'P' )

		// Split path into name and remove slashes
		let label = window.crossover.path.dirname( files[0] )
		label = window.crossover.path.parse( label ).name

		for ( const element of files ) {

			if ( typeof element === 'string' ) {

				const img = createImage( element, current )
				group.append( img )

			}

		}

		// Text replacement on first group'
		title.textContent = ( label === 'Actual' ) ? 'Real Crosshairs' : label
		title.classList.add( 'group-label' )

		chooserElement.append( title )
		chooserElement.append( group )

	}

	const setCrosshair = crosshair => {

		window.crossover.send( 'save_crosshair', crosshair )

	}

	window.crossover.receive( 'load_crosshairs', data => {

		// Console.log( `Loaded crosshairsObject: ${JSON.stringify( data )}` )
		loadCrosshairs( data )

	} )

	// Close window
	closeBtn.addEventListener( 'click', () => {

		window.crossover.send( 'close_chooser' )

	} )

	// Drag and drop Custom Image
	let eventCounter = 0 // I kind of hate this but it works
	document.addEventListener( 'dragenter', event => {

		event.preventDefault()

		// Highlight potential drop target when the draggable element enters it
		eventCounter++
		containerElement.classList.add( 'dropping' )

	}, false )
	// For drop events to fire, must cancel dragover and dragleave events
	document.addEventListener( 'dragover', event => {

		event.preventDefault()
		containerElement.classList.add( 'dropping' )

	} )

	document.addEventListener( 'dragleave', event => {

		event.preventDefault()
		eventCounter--
		if ( eventCounter === 0 || window.crossover.isMacOs ) {

			containerElement.classList.remove( 'dropping' )

		}

	} )

	document.addEventListener( 'dragend', event => {

		event.preventDefault()
		containerElement.classList.remove( 'dropping' )

	} )

	document.addEventListener( 'drop', event => {

		event.preventDefault()
		containerElement.classList.remove( 'dropping' )

		// Send file path to main
		window.crossover.send( 'save_custom_image', event.dataTransfer.files[0].path )

	} )

	setTimeout( () => {

		if ( !loaded ) {

			console.log( 'Fallback' )
			window.crossover.send( 'get_crosshairs' )

		}

	}, 5000 )

} )()
