const {ipcRenderer} = require('electron')

const crosshairWrapper = document.getElementById('crosshair')
const crosshairsInput = document.getElementById('crosshairs')
const crosshairImg = document.getElementById('crosshairImg')

const opacityInput = document.getElementById('setting-opacity')
const opacityOutput = document.getElementById('output-opacity')

const sizeInput = document.getElementById('setting-size')
const sizeOutput = document.getElementById('output-size')

const debounce = (func, delay) => {
    let debounceTimer
    return function() {
        const context = this
        const args = arguments
            clearTimeout(debounceTimer)
                debounceTimer
            = setTimeout(() => func.apply(context, args), delay)
    }
}

crosshairsInput.addEventListener('change', (e) => {
	let crosshair = crosshairsInput.value
	crosshairImg.src = `static/crosshairs/${crosshair}.png`;
	ipcRenderer.send('set_crosshair', crosshairsInput.value)
});

dOpacityInput = debounce((val) => {
	ipcRenderer.send('set_opacity', val)
}, 1000)
opacityInput.addEventListener('input', (e) => {
	opacityOutput.innerText = e.target.value;
	crosshairImg.style = `opacity: ${e.target.value/100}`;
	dOpacityInput(e.target.value)
});

dSizeInput = debounce((val) => {
	ipcRenderer.send('set_size', val)
}, 1000)
sizeInput.addEventListener('input', (e) => {
	sizeOutput.innerText = e.target.value;
	crosshairWrapper.style = `width: ${e.target.value}px`;
	dSizeInput(e.target.value)
});
