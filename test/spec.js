const electronPath = require('electron') // Require Electron from the binaries included in node_modules.
const path = require('path')
const {Application} = require('spectron')
const test = require('ava')

test.before(t => {
	t.context.app = new Application({
		path: electronPath,
		args: [path.join(__dirname, '..')]
	})
	return t.context.app.start()
})

test.after(t => {
	if (t.context.app && t.context.app.isRunning()) {
		return t.context.app.stop()
	}
})

test('shows an initial window', async t => {
	const count = await t.context.app.client.getWindowCount()
	t.is(count, 1)
})

test('is properly visible', async t => {
	t.plan(3)

	const focused = await t.context.app.browserWindow.isFocused()
	t.is(focused, true)

	const minimized = await t.context.app.browserWindow.isMinimized()
	t.is(minimized, false)

	const visible = await t.context.app.browserWindow.isVisible()
	t.is(visible, true)
})

test('has working devtools', async t => {
	const open = await t.context.app.browserWindow.isDevToolsOpened()
	t.is(open, false)
	// t.context.app.browserWindow.webContents.openDevTools()
	// open = await t.context.app.browserWindow.isDevToolsOpened()
	// t.is(open, true)
})

test('has working window bounds', async t => {
	t.plan(4)
	const bounds = await t.context.app.browserWindow.getBounds()
	t.true(bounds.width > 0)
	t.true(bounds.height > 0)

	bounds.x += 10
	bounds.y += 10
	t.context.app.browserWindow.setBounds({x: bounds.x, y: bounds.y})
	const newBounds = await t.context.app.browserWindow.getBounds()

	t.is(newBounds.x, bounds.x)
	t.is(newBounds.y, bounds.y)
})
