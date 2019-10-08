;(() => {
	const {ipcRenderer} = require('electron')
	const Pickr = require('@simonwep/pickr')
	const {debounce} = require('./util')
	const pickr = Pickr.create({
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
	})
	window.pickr = pickr

	if (process.env.NODE_ENV !== 'development')
		window.__static = require('path')
			.join(__dirname, '/static')
			.replace(/\\/g, '\\\\')

	const crosshairEl = document.querySelector('#crosshair')
	const crosshairsInput = document.querySelector('#crosshairs')
	const crosshairImg = document.querySelector('#crosshairImg')

	const opacityInput = document.querySelector('#setting-opacity')
	const opacityOutput = document.querySelector('#output-opacity')

	const sizeInput = document.querySelector('#setting-size')
	const sizeOutput = document.querySelector('#output-size')

	// Crosshair
	crosshairsInput.addEventListener('change', () => {
		const crosshair = crosshairsInput.value

		if (crosshairsInput.value === 'none') {
			crosshairImg.style.display = 'none'
		} else {
			crosshairImg.src = `static/crosshairs/${crosshair}.png`
			crosshairImg.style.display = 'block'
		}

		ipcRenderer.send('set_crosshair', crosshairsInput.value)
	})

	// Color
	const stripHex = color => {
		const hex = color.toHEXA().toString()
		if (hex.length > 7) {
			return hex.slice(0, 7)
		}

		return hex
	}

	pickr
		.on('change', color => {
			document
				.querySelector('.sight')
				.style.setProperty(`--sight-background`, `${stripHex(color)}`)
		})
		.on('save', color => {
			ipcRenderer.send('set_color', stripHex(color))
		})

	// Opacity
	const dOpacityInput = debounce(val => {
		ipcRenderer.send('set_opacity', val)
	}, 1000)
	opacityInput.addEventListener('input', e => {
		opacityOutput.innerText = e.target.value
		crosshairImg.style.opacity = `${e.target.value / 100}`
		document.querySelector('.sight').style.opacity = `${e.target.value / 100}`
		dOpacityInput(e.target.value)
	})

	// Size
	const dSizeInput = debounce(val => {
		ipcRenderer.send('set_size', val)
	}, 1000)
	sizeInput.addEventListener('input', e => {
		sizeOutput.innerText = e.target.value
		crosshairEl.style = `width: ${e.target.value}px;height: ${e.target.value}px`
		dSizeInput(e.target.value)
	})

	// Sight
	const sightInputs = document.querySelectorAll('.radio')
	for (let i = 0; i < sightInputs.length; i++) {
		sightInputs[i].addEventListener('change', e => {
			ipcRenderer.send('set_sight', e.target.value)
		})
	}
})()
