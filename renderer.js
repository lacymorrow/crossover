window.pickr;
(() => {
	const { ipcRenderer } = require("electron");
	const Pickr = require('@simonwep/pickr');
	pickr = Pickr.create({
	    el: '.color-picker',
	    theme: 'nano', // or 'monolith', or 'nano'

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
	});

	if (process.env.NODE_ENV !== "development")
		window.__static = require("path")
			.join(__dirname, "/static")
			.replace(/\\/g, "\\\\");

	const crosshairEl = document.querySelector("#crosshair");
	const crosshairsInput = document.querySelector("#crosshairs");
	const crosshairImg = document.querySelector("#crosshairImg");

	const opacityInput = document.querySelector("#setting-opacity");
	const opacityOutput = document.querySelector("#output-opacity");

	const sizeInput = document.querySelector("#setting-size");
	const sizeOutput = document.querySelector("#output-size");

	// Util
	const debounce = (func, delay) => {
		let debounceTimer;
		return function() {
			const context = this;
			const args = arguments;
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => func.apply(context, args), delay);
		};
	};

	// Crosshair
	crosshairsInput.addEventListener("change", e => {
		let crosshair = crosshairsInput.value;
		crosshairImg.src = `static/crosshairs/${crosshair}.png`;
		ipcRenderer.send("set_crosshair", crosshairsInput.value);
	});

	// Color
	dColorInput = debounce(val => {
		ipcRenderer.send("set_color", val);
	}, 1000);
	pickr.on('change', (color, instance) => {
		let hex = color.toHEXA().toString()
		document.querySelector('.sight').style.setProperty(`--sight-background`, `${hex}`);
		dColorInput(hex);
	})

	// Opacity
	dOpacityInput = debounce(val => {
		ipcRenderer.send("set_opacity", val);
	}, 1000);
	opacityInput.addEventListener("input", e => {
		opacityOutput.innerText = e.target.value;
		crosshairImg.style = `opacity: ${e.target.value / 100}`;
		dOpacityInput(e.target.value);
	});

	// Size
	dSizeInput = debounce(val => {
		ipcRenderer.send("set_size", val);
	}, 1000);
	sizeInput.addEventListener("input", e => {
		sizeOutput.innerText = e.target.value;
		crosshairEl.style = `width: ${e.target.value}px;height: ${e.target.value}px`;
		dSizeInput(e.target.value);
	});

	// Sight
	let sightInputs = document.querySelectorAll('.radio')
	for (var i = 0; i < sightInputs.length; i++) {
	    sightInputs[i].addEventListener('change', function(e) {
			ipcRenderer.send("set_sight", e.target.value);
	    });
	}
})();
