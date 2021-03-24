/* global feather, Pickr */

( () => {

	// DOM elements
	const wrapperElement = document.querySelector( '#settings-container' )
	const opacityInput = document.querySelector( '#setting-opacity' )
	const opacityOutput = document.querySelector( '#output-opacity' )
	const selectCrosshairBtn = document.querySelector( '#select-crosshair-button' )
	const sizeInput = document.querySelector( '#setting-size' )
	const sizeOutput = document.querySelector( '#output-size' )
	const systemModifier = document.querySelector( '#system-modifier' )
	const closeBtn = document.querySelector( '.close-button' )

	// OS Specific
	if ( window.crossover.isMacOs ) {

		// Set class
		document.body.classList.add( 'mac' )

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

	}

	const setColor = color => {

		window.crossover.send( 'save_color', color )

	}

	window.pickr
		.on( 'change', color => {

			setColor( stripHex( color ) )

		} )
		.on( 'save', color => {

			window.pickr.hide()

			setColor( stripHex( color ) )

		} )
		.on( 'show', () => {

			document.body.classList.add( 'pickr-open' )

		} )
		.on( 'hide', () => {

			document.body.classList.remove( 'pickr-open' )

		} )

	window.crossover.receive( 'set_color', arg => {

		loadColor( arg )

	} )

	// Opacity
	const setOpacity = opacity => {

		opacityInput.value = opacity
		opacityOutput.textContent = opacity
		window.crossover.send( 'save_opacity', opacity )

	}

	opacityInput.addEventListener( 'input', event => {

		setOpacity( event.target.value )

	} )

	window.crossover.receive( 'set_opacity', arg => {

		setOpacity( arg )

	} )

	// Size
	const setSize = size => {

		sizeInput.value = size
		sizeOutput.textContent = size
		window.crossover.send( 'save_size', size )

	}

	sizeInput.addEventListener( 'input', event => {

		setSize( event.target.value )

	} )

	window.crossover.receive( 'set_size', arg => {

		setSize( arg )

	} )

	// Sight
	const setSight = sight => {

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

	// // Custom keybinds
	// const recordShortcut = () => {

	// 	Mousetrap.record( sequence => {

	// 		// Sequence is an array like ['ctrl+k', 'c']
	// 		alert( 'You pressed: ' + sequence.join( ' ' ) )

	// 	} )

	// }

	// Close
	closeBtn.addEventListener( 'click', () => {

		window.crossover.send( 'close_settings' )

	} )

	// Button to open crosshair chooser
	selectCrosshairBtn.addEventListener( 'click', () => {

		// Send open request with current crosshair
		window.crossover.send( 'open_chooser' )

	} )

	// Drag and drop Custom Image
	let eventCounter = 0 // I kind of hate this but it works
	document.addEventListener( 'dragenter', event => {

		event.preventDefault()

		// Highlight potential drop target when the draggable element enters it
		eventCounter++
		wrapperElement.classList.add( 'dropping' )

	}, false )

	document.addEventListener( 'dragover', event => {

		event.preventDefault()
		wrapperElement.classList.add( 'dropping' )

	}, false )

	document.addEventListener( 'dragleave', event => {
		event.preventDefault()
		eventCounter--
		if ( eventCounter === 0 || window.crossover.isMacOs ) {

			wrapperElement.classList.remove( 'dropping' )

		}

	} )

	document.addEventListener( 'dragend', event => {

		event.preventDefault()
		eventCounter = 0
		wrapperElement.classList.remove( 'dropping' )

	}, false )

	document.addEventListener( 'drop', event => {

		event.preventDefault()
		eventCounter = 0
		wrapperElement.classList.remove( 'dropping' )

		// Send file path to main
		window.crossover.send( 'save_custom_image', event.dataTransfer.files[0].path )

	}, false )

} )()
