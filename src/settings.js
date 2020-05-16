( () => {

	// Crosshair Images -> <select> input
	const loadCrosshairs = crosshairsObject => {

		const { crosshairs, current } = crosshairsObject

		// Set the image src before loading the list
		setCrosshair( current )

		crosshairsInput.options.length = 0
		crosshairsInput.options[0] = new Option( '-----', 'none' )
		for ( const element of crosshairs ) {

			if ( typeof element === 'string' ) {

				const opt = newOption( element )
				crosshairsInput.append( opt )
				console.log(opt)

			} else if ( typeof element === 'object' ) {

				createOptGroup( element )

			}

		}

		setSelected( current )


	}

	const setCrosshair = crosshair => {

		if ( crosshairsInput.value === 'none' ) {

			crosshairImg.style.display = 'none'

		} else {

			crosshairImg.src = `static/crosshairs/${crosshair}`
			crosshairImg.style.display = 'block'

		}

		for ( let i = 0; i < crosshairsInput.options.length; i++ ) {

			if ( crosshairsInput.options[i].value === crosshair ) {

				crosshairsInput.options[i].selected = true

			}

		}

		window.crossover.send( 'save_crosshair', 'bull-ring-post' )

	}

	window.crossover.receive( 'load_crosshairs', data => {

		console.log( `Loaded crosshairsObject: ${data}` )
		loadCrosshairs( data )

	} )

} )()
