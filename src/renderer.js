/* global feather, randomColor */

( () => {

	// DOM elements
	const wrapper = document.querySelector( '.crosshair-wrapper' )
	const background = document.querySelector( '.background' )
	const closeBtn = document.querySelector( '.close-button' )
	const centerBtn = document.querySelector( '.center-button' )
	const settingsBtn = document.querySelector( '.settings-button' )
	const container = document.querySelector( '.container' )
	const crosshairElement = document.querySelector( '#crosshair' )
	const crosshairImg = document.querySelector( '#crosshairImg' )

	// OS Specific
	if ( window.crossover.isMacOs ) {

		// Set class
		document.body.classList.add( 'mac' )

	} else if ( window.crossover.isLinux ) {

		// Set class
		document.body.classList.add( 'linux' )

	}

	// Render icons
	if ( feather ) {

		feather.replace()

	}

	const setCrosshair = crosshair => {

		if ( crosshair === 'none' ) {

			crosshairImg.style.display = 'none'

		} else {

			crosshairImg.src = crosshair
			crosshairImg.style.display = 'block'

		}

	}

	window.crossover.receive( 'add_class', arg => {

		// Trigger things
		if ( arg === 'shadow' ) {

			// This is a child window
			background.style.background = randomColor( {
				luminosiy: 'light',
				format: 'rgba',
				alpha: 0.5 // E.g. 'rgba(9, 1, 107, 0.5)',
			} )

		}

		document.body.classList.add( arg )

	} )

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
	const setColor = color => {

		document
			.querySelector( '.sight' )
			.style.setProperty( '--sight-background', `${color}` )

	}

	window.crossover.receive( 'set_color', arg => {

		setColor( arg )

	} )

	// Opacity
	const setOpacity = opacity => {

		crosshairImg.style.opacity = `${opacity / 100}`
		document.querySelector( '.sight' ).style.opacity = `${opacity / 100}`

	}

	window.crossover.receive( 'set_opacity', arg => {

		setOpacity( arg )

	} )

	// Size
	const setSize = size => {

		crosshairElement.style = `width: ${size}px;height: ${size}px;`

	}

	window.crossover.receive( 'set_size', arg => {

		setSize( arg )

	} )

	// Sight
	const setSight = sight => {

		document.querySelector( '.sight' ).classList.remove( 'dot', 'cross', 'off' )
		document.querySelector( '.sight' ).classList.add( sight )

	}

	window.crossover.receive( 'set_sight', arg => {

		setSight( arg )

	} )

	// Lock
	window.crossover.receive( 'lock_window', arg => {

		if ( arg ) {

			document.body.classList.remove( 'draggable' )

		} else {

			document.body.classList.add( 'draggable' )

		}

	} )

	// Close window
	closeBtn.addEventListener( 'click', () => {

		if ( document.body.classList.contains( 'shadow' ) ) {

			window.crossover.send( 'close_window' )

		} else {

			// This is the main window
			window.crossover.send( 'quit' )

		}

	} )

	// Open settings window
	settingsBtn.addEventListener( 'click', () => {

		window.crossover.send( 'open_settings' )

	} )

	// Open Chooser
	const dOpenChooser = window.crossover.debounce( () => {

		window.crossover.send( 'open_chooser', crosshairImg.src )

	}, 300 )

	centerBtn.addEventListener( 'click', () => {

		dOpenChooser()

	} )

	// Center window on double click
	centerBtn.addEventListener( 'dblclick', () => {

		dOpenChooser( { abort: true } )
		window.crossover.send( 'center_window' )

	} )

	crosshairElement.addEventListener( 'dblclick', () => {

		window.crossover.send( 'center_window' )

	} )

	// Drag and drop Custom Image
	// for drop events to fire, must cancel dragover and dragleave events
	wrapper.addEventListener( 'dragover', event => {

		event.preventDefault()
		container.classList.add( 'dropping' )

	} )

	wrapper.addEventListener( 'dragleave', event => {

		event.preventDefault()

		// Prevent flickering on Windows
		if ( window.crossover.isMacOs ) {

			container.classList.remove( 'dropping' )

		} else if ( event.target === wrapper ) {

			container.classList.remove( 'dropping' )

		}

	} )

	wrapper.addEventListener( 'dragend', event => {

		event.preventDefault()
		container.classList.remove( 'dropping' )

	} )

	wrapper.addEventListener( 'drop', event => {

		event.preventDefault()
		container.classList.remove( 'dropping' )

		// Send file path to main
		window.crossover.send( 'save_custom_image', event.dataTransfer.files[0].path )

	} )

} )()
