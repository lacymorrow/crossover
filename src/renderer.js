/* global feather, randomColor */

( () => {

	// try {

	// 	window.crossover.unhandled( {
	// 		reportButton( error ) {

	// 			window.crossover.openNewGitHubIssue( {
	// 				user: 'lacymorrow',
	// 				repo: 'crossover',
	// 				body: `\`\`\`\n${error.stack}\n\`\`\`\n\n---\n\n${window.crossover.debugInfo()}`,
	// 			} )

	// 		},
	// 	} )

	// } catch ( error ) {

	// 	console.log( error )

	// }

	// DOM elements
	const background = document.querySelector( '.background' )
	const closeBtn = document.querySelector( '.close-button' )
	const infoBtn = document.querySelector( '.info-button' )
	const centerBtn = document.querySelector( '.center-button' )
	const settingsBtn = document.querySelector( '.settings-button' )
	const container = document.querySelector( '.container' )
	const crosshairElement = document.querySelector( '#crosshair' )
	const crosshairImg = document.querySelector( '#crosshairImg' )

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

	// Sounds
	window.crossover.receive( 'preload_sounds', arg => {

		window.crossover.preload( arg )

	} )

	window.crossover.receive( 'play_sound', arg => {

		window.crossover.play( arg )

	} )

	// Notifications
	window.crossover.receive( 'notify', arg => {

		if (!arg.title || !arg.body) {
			console.error('Invalid Notification, title and body are required.')
			return;
		}

		const notif = new window.Notification( arg.title, {
			body: arg.body,
			silent: arg.silent // We'll play our own sound
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
				alpha: 0.5, // E.g. 'rgba(9, 1, 107, 0.5)',
			} )

		}

		document.body.classList.add( arg )

	} )

	window.crossover.receive( 'set_crosshair', arg => {

		setCrosshair( arg )

	} )

	// Color
	const setColor = color => {

		document
			.querySelector( '.sight' )
			.style.setProperty( '--sight-fill', `${color}` )

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
	window.crossover.receive( 'lock_window', lock => {

		if ( lock ) {

			document.body.classList.remove( 'draggable' )

		} else {

			document.body.classList.add( 'draggable' )

		}

	} )

	// Tilt
	window.crossover.receive( 'tilt', arg => {

		crosshairElement.style.setProperty( '--tilt-angle', `${Number.parseInt( arg, 10 )}deg` )

	} )

	// Untilt
	window.crossover.receive( 'untilt', () => {

		crosshairElement.style.setProperty( '--tilt-angle', '0deg' )

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
