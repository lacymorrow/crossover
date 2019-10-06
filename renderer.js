const {ipcRenderer} = require('electron')

const crosshairsInput = document.getElementById('crosshairs')
const crosshairImg = document.getElementById('crosshairImg')

const opacityInput = document.getElementById('setting-opacity')
const opacityOutput = document.getElementById('output-opacity')

const widthInput = document.getElementById('setting-width')
const widthOutput = document.getElementById('output-width')

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})

crosshairsInput.addEventListener('change', (e) => {
	let crosshair = crosshairsInput.value
	crosshairImg.src = `static/crosshairs/${crosshair}.png`;
	ipcRenderer.send('set_crosshair', crosshairsInput.value)
});

opacityInput.addEventListener('change', (e) => {
	console.log(e.target.value)
	opacityOutput.innerText = e.target.value;
	ipcRenderer.send('set_opacity', e.target.value)
});

widthInput.addEventListener('change', (e) => {
	console.log(e.target.value)
	widthOutput.innerText = e.target.value;
	ipcRenderer.send('set_size', e.target.value)
});
