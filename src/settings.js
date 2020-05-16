( () => {

	// DOM elements
	const chooserElement = document.querySelector( '#crosshair-chooser' )

	// Crosshair Images -> <select> input
	const loadCrosshairs = crosshairsObject => {

		const { crosshairs, current } = crosshairsObject

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

		// Remove path
		string = string.split( '/' ).pop()

		// Remove extension
		string = string.split( '.' ).shift()

		string = string
			.split( '-' )
			.map( w => w[0].toUpperCase() + w.slice( 1 ).toLowerCase() )
			.join( ' ' )

		return string

	}

	// Create option elements
	const createImage = file => {

		const name = prettyFilename( file )
		const img = document.createElement( 'IMG' )
		img.alt = name
		img.draggable = false
		img.title = name
		img.src = window.crossover.path.join( 'static/crosshairs/', file )
		img.addEventListener( 'click', () => {

			setCrosshair( file )

		} )

		return img

	}

	// Setup optgroup elements
	const createGroup = files => {

		const group = document.createElement( 'DIV' )

		// Split path into name
		let label = window.crossover.path.dirname( files[0] )

		// Remove slash
		if ( label.indexOf( '/' ) === 0 ) {

			label = label.slice( 1 )

		}

		group.title = label

		for ( const element of files ) {

			if ( typeof element === 'string' ) {

				const img = createImage( element )
				group.append( img )

			}

		}

		chooserElement.append( group )

	}

	const setCrosshair = crosshair => {

		window.crossover.send( 'save_crosshair', crosshair )

	}

	window.crossover.receive( 'load_crosshairs', data => {

		console.log( `Loaded crosshairsObject: ${JSON.stringify(data)}` )
		loadCrosshairs( data )

	} )

} )()
