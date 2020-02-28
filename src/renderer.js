( () => {

	const path = require( 'path' )
	const { ipcRenderer } = require( 'electron' )
	const { is } = require( 'electron-util' )
	const Pickr = require( '@simonwep/pickr' )
	const { debounce, prettyFilename } = require( './util' )

	const dragger = document.querySelector( '.drag-me' )
	const crosshairEl = document.querySelector( '#crosshair' )
	const crosshairsInput = document.querySelector( '#crosshairs' )
	const crosshairImg = document.querySelector( '#crosshairImg' )
	const opacityInput = document.querySelector( '#setting-opacity' )
	const opacityOutput = document.querySelector( '#output-opacity' )
	const sizeInput = document.querySelector( '#setting-size' )
	const sizeOutput = document.querySelector( '#output-size' )

	if ( !is.development ) {

		window.__static = path
			.join( __dirname, '/static' )
			.replace( /\\/g, '\\\\' )

	}

	const pickr = Pickr.create( {
		el: '.color-picker',
		theme: 'nano', // Or 'monolith', or 'nano'

		swatches: [
			'rgba(244, 67, 54, 1)',
			'rgba(233, 30, 99, 0.95)',
			'rgba(156, 39, 176, 0.9)',
			'rgba(103, 58, 183, 0.85)',
			'rgba(63, 81, 181, 0.8)',
			'rgba(33, 150, 243, 0.75)',
			'rgba(3, 169, 244, 0.7)',
			'rgba(0, 188, 212, 0.7)',
			'rgba(0, 150, 136, 0.75)',
			'rgba(76, 175, 80, 0.8)',
			'rgba(139, 195, 74, 0.85)',
			'rgba(205, 220, 57, 0.9)',
			'rgba(255, 235, 59, 0.95)',
			'rgba(255, 193, 7, 1)'
		],

		components: {
			// Main components
			preview: true,
			opacity: false,
			hue: true,

			// Input / output Options
			interaction: {
				hex: false,
				rgba: false,
				hsla: false,
				hsva: false,
				cmyk: false,
				input: true,
				clear: false,
				save: true
			}
		}
	} )
	window.pickr = pickr

	// Create option elements
	const newOption = option => {

		const opt = document.createElement( 'OPTION' )
		opt.textContent = prettyFilename( option )
		opt.value = option

		return opt

	}

	// Setup optgroup elements
	const createOptGroup = files => {

		const gr = document.createElement( 'OPTGROUP' )
		let label = path.dirname( files[0] )
		if (label.indexOf('/') === 0) {
			label = label.slice(1)
		}
		gr.label = label

		for ( let i = 0; i < files.length; i++ ) {

			if ( typeof files[i] === 'string' ) {

				console.log(files[i])
				const opt = newOption( files[i] )
				gr.append( opt )

			}

		}

		crosshairsInput.append( gr )

	}

	const setSelected = crosshair => {

		for ( let i = 0; i < crosshairsInput.options.length; i++ ) {

			if ( crosshairsInput.options[i].value === crosshair ) {

				crosshairsInput.options[i].selected = true
				break

			}

		}

	}

	// Crosshair Images -> <select> input
	const loadCrosshairs = crosshairsObj => {

		const { crosshairs, current } = crosshairsObj

		// Set the image src before loading the list
		setCrosshair( current )

		crosshairsInput.options.length = 0
		crosshairsInput.options[0] = new Option( '-----', 'none' )
		for ( let i = 0; i < crosshairs.length; i++ ) {

			if ( typeof crosshairs[i] === 'string' ) {

				const opt = newOption( crosshairs[i] )
				crosshairsInput.append( opt )

			} else if ( typeof crosshairs[i] === 'object' ) {

				createOptGroup( crosshairs[i] )

			}

		}

		setSelected( current )

	}

	const setCrosshair = crosshair => {

		if ( crosshairsInput.value === 'none' ) {

			crosshairImg.style.display = 'none'

		} else {

			crosshairImg.src = path.join( 'static/crosshairs/', crosshair )
			crosshairImg.style.display = 'block'

		}

		for ( let i = 0; i < crosshairsInput.options.length; i++ ) {

			if ( crosshairsInput.options[i].value === crosshair ) {

				crosshairsInput.options[i].selected = true

			}

		}

		ipcRenderer.send( 'save_crosshair', crosshairsInput.value )

	}

	crosshairsInput.addEventListener( 'change', e => {

		setCrosshair( e.target.value )

	} )

	ipcRenderer.on( 'load_crosshairs', ( event, arg ) => {

		loadCrosshairs( arg )

	} )

	// Color
	const stripHex = color => {

		const hex = color.toHEXA().toString()
		if ( hex.length > 7 ) {

			return hex.slice( 0, 7 )

		}

		return hex

	}

	const loadColor = color => {

		pickr.setColor( color )
		setColor( color )

	}

	const setColor = color => {

		document
			.querySelector( '.sight' )
			.style.setProperty( '--sight-background', `${color}` )

	}

	pickr
		.on( 'change', color => {

			setColor( stripHex( color ) )

		} )
		.on( 'save', color => {

			pickr.hide()

			ipcRenderer.send( 'save_color', stripHex( color ) )

		} )
		.on( 'show', () => {

			document.body.classList.add( 'pickr-open' )

		} )
		.on( 'hide', () => {

			document.body.classList.remove( 'pickr-open' )

		} )

	ipcRenderer.on( 'load_color', ( event, arg ) => {

		loadColor( arg )

	} )

	// Opacity
	const dOpacityInput = debounce( val => {

		ipcRenderer.send( 'save_opacity', val )

	}, 1000 )

	const setOpacity = opacity => {

		opacityInput.value = opacity
		opacityOutput.innerText = opacity
		crosshairImg.style.opacity = `${opacity / 100}`
		document.querySelector( '.sight' ).style.opacity = `${opacity / 100}`
		dOpacityInput( opacity )

	}

	opacityInput.addEventListener( 'input', e => {

		setOpacity( e.target.value )

	} )

	ipcRenderer.on( 'set_opacity', ( event, arg ) => {

		setOpacity( arg )

	} )

	// Size
	const dSizeInput = debounce( val => {

		ipcRenderer.send( 'save_size', val )

	}, 1000 )

	const setSize = size => {

		sizeInput.value = size
		sizeOutput.innerText = size
		crosshairEl.style = `width: ${size}px;height: ${size}px;`
		dSizeInput( size )

	}

	sizeInput.addEventListener( 'input', e => {

		setSize( e.target.value )

	} )

	ipcRenderer.on( 'set_size', ( event, arg ) => {

		setSize( arg )

	} )

	// Sight
	const setSight = sight => {

		document.querySelector( '.sight' ).classList.remove( 'dot', 'cross', 'off' )
		document.querySelector( '.sight' ).classList.add( sight )
		document.querySelector( `.radio.${sight} input` ).checked = true
		ipcRenderer.send( 'save_sight', sight )

	}

	const sightInputs = document.querySelectorAll( '.radio' )
	for ( let i = 0; i < sightInputs.length; i++ ) {

		sightInputs[i].addEventListener( 'change', e => {

			setSight( e.target.value )

		} )

	}

	ipcRenderer.on( 'set_sight', ( event, arg ) => {

		setSight( arg )

	} )

	// Lock
	ipcRenderer.on( 'lock_window', ( event, arg ) => {

		pickr.hide()
		if ( arg ) {

			document.body.classList.remove( 'draggable' )

		} else {

			document.body.classList.add( 'draggable' )

		}

	} )

	// Center window
	dragger.addEventListener( 'dblclick', () => {

		ipcRenderer.send( 'center_window' )

	} )

} )()
