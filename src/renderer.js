/* global feather, Pickr */

( () => {

	// DOM elements
	const centerer = document.querySelector( '.center-me' )
	const dragDrop = document.querySelector( '#drag-file' )
	const crosshairElement = document.querySelector( '#crosshair' )
	const crosshairImg = document.querySelector( '#crosshairImg' )
	const opacityInput = document.querySelector( '#setting-opacity' )
	const opacityOutput = document.querySelector( '#output-opacity' )
	const selectCrosshairBtn = document.querySelector( '#select-crosshair-button' )
	const sizeInput = document.querySelector( '#setting-size' )
	const sizeOutput = document.querySelector( '#output-size' )
	const systemModifier = document.querySelector( '#system-modifier' )

	// OS Specific
	if (window.crossover.isMacOs){
		
		// Set class
		document.body.classList.add('mac')

		// Set System Modifier on first load
		systemModifier.textContent = 'OPTION'

	} else {
		systemModifier.textContent = 'ALT'
	}

	// Render icons
	if ( feather ) {

		feather.replace()

	}

	// Create color picker
	const pickr = Pickr.create( {
		el: '.color-picker',
		theme: 'nano', // Or 'monolith', or 'nano'
		closeOnScroll: true,
		position: 'right-start',

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
			opacity: true,
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

	const setCrosshair = crosshair => {

		if ( crosshair === 'none' ) {

			crosshairImg.style.display = 'none'

		} else {

			crosshairImg.src = crosshair
			crosshairImg.style.display = 'block'

		}

	}

	window.crossover.receive( 'set_crosshair', arg => {

		setCrosshair( arg )

	} )

	const setCustomImage = filepath => {

		crosshairImg.src = filepath
		crosshairImg.style.display = 'block'

	}

	window.crossover.receive( 'set_custom_image', arg => {

		setCustomImage( arg )

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

		window.pickr.setColor( color )
		setColor( color )

	}

	const setColor = color => {

		document
			.querySelector( '.sight' )
			.style.setProperty( '--sight-background', `${color}` )

	}

	window.pickr
		.on( 'change', color => {

			setColor( stripHex( color ) )

		} )
		.on( 'save', color => {

			window.window.pickr.hide()

			window.crossover.send( 'save_color', stripHex( color ) )

		} )
		.on( 'show', () => {

			document.body.classList.add( 'window.pickr-open' )

		} )
		.on( 'hide', () => {

			document.body.classList.remove( 'window.pickr-open' )

		} )

	window.crossover.receive( 'load_color', arg => {

		loadColor( arg )

	} )

	// Opacity
	const dOpacityInput = window.crossover.debounce( value => {

		window.crossover.send( 'save_opacity', value )

	}, 1000 )

	const setOpacity = opacity => {

		opacityInput.value = opacity
		opacityOutput.textContent = opacity
		crosshairImg.style.opacity = `${opacity / 100}`
		document.querySelector( '.sight' ).style.opacity = `${opacity / 100}`
		dOpacityInput( opacity )

	}

	opacityInput.addEventListener( 'input', event => {

		setOpacity( event.target.value )

	} )

	window.crossover.receive( 'set_opacity', arg => {

		setOpacity( arg )

	} )

	// Size
	const dSizeInput = window.crossover.debounce( value => {

		window.crossover.send( 'save_size', value )

	}, 1000 )

	const setSize = size => {

		sizeInput.value = size
		sizeOutput.textContent = size
		crosshairElement.style = `width: ${size}px;height: ${size}px;`
		dSizeInput( size )

	}

	sizeInput.addEventListener( 'input', event => {

		setSize( event.target.value )

	} )

	window.crossover.receive( 'set_size', arg => {

		setSize( arg )

	} )

	// Sight
	const setSight = sight => {

		document.querySelector( '.sight' ).classList.remove( 'dot', 'cross', 'off' )
		document.querySelector( '.sight' ).classList.add( sight )
		document.querySelector( `.radio.${sight} input` ).checked = true
		window.crossover.send( 'save_sight', sight )

	}

	const sightInputs = document.querySelectorAll( '.radio' )
	for ( const element of sightInputs ) {

		element.addEventListener( 'change', event => {

			setSight( event.target.value )

		} )

	}

	window.crossover.receive( 'set_sight', arg => {

		setSight( arg )

	} )

	// Lock
	window.crossover.receive( 'lock_window', arg => {

		window.pickr.hide()
		if ( arg ) {

			document.body.classList.remove( 'draggable' )

		} else {

			document.body.classList.add( 'draggable' )

		}

	} )

	// Center window on double click
	centerer.addEventListener( 'dblclick', () => {

		window.crossover.send( 'center_window' )

	} )

	crosshairElement.addEventListener( 'dblclick', () => {

		window.crossover.send( 'open_chooser', crosshairImg.src )

	} )

	// Button to open crosshair chooser
	selectCrosshairBtn.addEventListener( 'click', () => {

		// Send open request with current crosshair
		window.crossover.send( 'open_chooser', crosshairImg.src )

	} )

	// Drag and drop Custom Image
	// for drop events to fire, must cancel dragover and dragleave events
	dragDrop.addEventListener( 'dragover', event => {

		event.preventDefault()
		dragDrop.classList.add( 'dropping' )

	} )

	dragDrop.addEventListener( 'dragleave', event => {

		event.preventDefault()

		// Prevent flickering on Windows
		if ( event.target === dragDrop ) {

			dragDrop.classList.remove( 'dropping' )

		}

	} )

	dragDrop.addEventListener( 'dragend', event => {

		event.preventDefault()
		dragDrop.classList.remove( 'dropping' )

	} )

	dragDrop.addEventListener( 'drop', event => {

		event.preventDefault()
		dragDrop.classList.remove( 'dropping' )

		// Send file path to main
		window.crossover.send( 'save_custom_image', event.dataTransfer.files[0].path )

	} )

} )()
