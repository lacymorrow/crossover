/* global feather, inlineSVG, randomColor */

// Todo: better error handling for img onError

( () => {

	// DOM elements
	const background = document.querySelector( '.background' )
	const closeBtn = document.querySelector( '.close-button' )
	const infoBtn = document.querySelector( '.info-button' )
	const centerBtn = document.querySelector( '.center-button' )
	const settingsBtn = document.querySelector( '.settings-button' )
	const container = document.querySelector( '.container' )
	const crosshairElement = document.querySelector( '#crosshair' )
	let crosshairImg = document.querySelector( '#crosshairImg' )

	const img = document.createElement( 'IMG' )
	img.id = 'crosshairImg'
	img.draggable = false
	img.addEventListener( 'error', event => console.log( event ) )
	img.src = '../static/crosshairs/Actual/leupold-dot.png'

	// OS Specific
	if ( window.crossover?.isMacOs ) {

		// Set class
		document.body.classList.add( 'mac' )

	} else if ( window.crossover?.isLinux ) {

		// Set class
		document.body.classList.add( 'linux' )

	}

	// Render icons
	if ( feather ) {

		feather.replace()

	}

	window.crossover.receive( 'set_properties', arg => {

		for ( const [ key, value ] of Object.entries( arg ) ) {

			console.log( 'Setting:', key, value )
			document.documentElement.style.setProperty( key, value )

		}

	} )

	window.crossover.receive( 'add_class', arg => {

		// Trigger things
		if ( arg === 'shadow' ) {

			// This is a child window being instantiated
			background.style.background = randomColor( {
				luminosiy: 'light',
				format: 'rgba',
				alpha: 0.5, // E.g. 'rgba(9, 1, 107, 0.5)',
			} )

		}

		document.body.classList.add( arg )

	} )

	// Sounds
	window.crossover.receive( 'preload_sounds', arg => {

		window.crossover.preload( arg )

	} )

	window.crossover.receive( 'play_sound', arg => {

		window.crossover.play( arg )

	} )

	// Notifications
	window.crossover.receive( 'notify', arg => {

		if ( !arg.title || !arg.body ) {

			console.error( 'Invalid Notification, title and body are required.' )

			return

		}

		const notif = new window.Notification( arg.title, {
			body: arg.body,
			silent: arg.silent, // We'll play our own sound
		} )

		// If the user clicks in the Notifications Center, show the app
		notif.addEventListener( 'click', () => {

			window.crossover.send( 'focusWindow' )

		} )

	} )

	// Auto Update info
	window.crossover.receive( 'update_available', () => {

		// Change top-left icon
		infoBtn.querySelector( '.move-icon' ).classList.add( 'd-none' )
		infoBtn.querySelector( '.info-icon' ).classList.remove( 'd-none' )

	} )

	// Crosshair
	const setCrosshair = crosshair => {

		// Don't set if same image already set
		if ( document.querySelector( '#crosshairImg' ).dataset.src === crosshair ) {

			return

		}

		// Reset to IMG element if SVG
		if ( document.querySelector( 'svg#crosshairImg' ) ) {

			document.querySelector( '#crosshairImg' ).remove()
			crosshairElement.prepend( img.cloneNode( true ) )

		}

		crosshairImg = document.querySelector( '#crosshairImg' )

		// Hide if no crosshair selected
		if ( crosshair === 'none' ) {

			crosshairImg.style.display = 'none'

		}

		// Set image
		crosshairImg.src = crosshair
		crosshairImg.dataset.src = crosshair
		crosshairImg.style.display = 'block'

		// Inline if SVG
		if ( crosshair.split( '.' ).pop() === 'svg' ) {

			inlineSVG.init( {
				svgSelector: '#crosshairImg', // the class attached to all images that should be inlined
			}, () => {

				console.log( 'SVG inlined' )

			} )

		}

	}

	window.crossover.receive( 'set_crosshair', arg => {

		setCrosshair( arg )

	} )

	// Sight
	const setReticle = reticle => {

		document.querySelector( '.reticle' ).classList.remove( 'dot', 'cross', 'off' )
		document.querySelector( '.reticle' ).classList.add( reticle )

	}

	window.crossover.receive( 'set_reticle', arg => {

		setReticle( arg )

	} )

	// Lock
	window.crossover.receive( 'lock_window', lock => {

		if ( lock ) {

			document.body.classList.remove( 'draggable' )

		} else {

			document.body.classList.add( 'draggable' )

		}

	} )

	/* Event Listeners */
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

	let eventCounter = 0 // I kind of hate this but it works
	document.addEventListener( 'dragenter', event => {

		event.preventDefault()

		// Highlight potential drop target when the draggable element enters it
		eventCounter++
		container.classList.add( 'dropping' )

	}, false )

	document.addEventListener( 'dragover', event => {

		event.preventDefault()
		container.classList.add( 'dropping' )

	}, false )

	document.addEventListener( 'dragleave', event => {

		event.preventDefault()
		eventCounter--
		if ( eventCounter === 0 ) {

			container.classList.remove( 'dropping' )

		}

	}, false )

	document.addEventListener( 'dragend', event => {

		event.preventDefault()
		eventCounter = 0
		container.classList.remove( 'dropping' )

	}, false )

	document.addEventListener( 'drop', event => {

		event.preventDefault()
		eventCounter = 0
		container.classList.remove( 'dropping' )

		// Send file path to main
		window.crossover.send( 'save_custom_image', event.dataTransfer.files[0].path )

	}, true )

} )()
