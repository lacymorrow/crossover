( () => {

	// DOM elements
	const chooserElement = document.querySelector( '#crosshair-chooser' )

	// Crosshair Images -> <select> input
	const loadCrosshairs = crosshairsObject => {

		const { crosshairs } = crosshairsObject

		// Create "No crosshair" option

		for ( const element of crosshairs ) {

			if ( typeof element === 'string' ) {

				const img = createImage( element )
				chooserElement.append( img )

			} else if ( typeof element === 'object' ) {

				createGroup( element )

			}

		}

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
	const createImage = file => {

		const name = prettyFilename( file )
		const div = document.createElement( 'DIV' )
		const p = document.createElement( 'P' )
		const img = document.createElement( 'IMG' )

		div.classList = 'crosshair-option'
		p.textContent = name

		img.alt = name
		img.draggable = false
		img.src = window.crossover.path.join( 'static/crosshairs/', file )
		img.addEventListener( 'click', () => {

			setCrosshair( file )

		} )

		div.append( img, p )

		return div

	}

	// Setup optgroup elements
	const createGroup = files => {

		const group = document.createElement( 'DIV' )
		const title = document.createElement( 'P' )

		// Split path into name
		let label = window.crossover.path.dirname( files[0] )

		// Remove slash
		if ( label.indexOf( '/' ) === 0 ) {

			label = label.slice( 1 )

		}

		for ( const element of files ) {

			if ( typeof element === 'string' ) {

				const img = createImage( element )
				group.append( img )

			}

		}

		title.classList = 'group-label'
		title.textContent = label

		chooserElement.append( title )
		chooserElement.append( group )

	}

	const setCrosshair = crosshair => {

		window.crossover.send( 'save_crosshair', crosshair )

	}

	window.crossover.receive( 'load_crosshairs', data => {

		console.log( `Loaded crosshairsObject: ${JSON.stringify( data )}` )
		loadCrosshairs( data )

	} )

} )()
