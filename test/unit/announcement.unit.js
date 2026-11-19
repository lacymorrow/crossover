// Run with: npm run test:unit (node --test, no Electron)
const assert = require( 'node:assert/strict' )
const { test } = require( 'node:test' )
const { actionFor, shouldShow } = require( '../../src/main/announcement-logic' )

const now = 1_000_000
const base = { announcement: { id: 'v4' }, supported: true, rolledBack: false, declined: false, snoozedUntil: 0, now, locked: false }

test( 'shouldShow: unlocked, supported, not snoozed or declined', () => {

	assert.equal( shouldShow( base ), true )
	assert.equal( shouldShow( { ...base, snoozedUntil: now - 1 } ), true, 'snooze over' )

} )

test( 'shouldShow: each reason to stay quiet', () => {

	assert.equal( shouldShow( { ...base, locked: true } ), false, 'locked' )
	assert.equal( shouldShow( { ...base, snoozedUntil: now + 1 } ), false, 'snoozed' )
	assert.equal( shouldShow( { ...base, declined: true } ), false, 'declined' )
	assert.equal( shouldShow( { ...base, supported: false } ), false, 'unsupported' )
	assert.equal( shouldShow( { ...base, rolledBack: true } ), false, 'came back from v4' )
	assert.equal( shouldShow( { ...base, announcement: null } ), false, 'no announcement' )
	assert.equal( shouldShow( { ...base, backgroundV4Ready: true } ), false, 'background v4 already downloaded' )

} )

test( 'actionFor: primary button per state', () => {

	const inPlace = { canUpdateInPlace: true, actionType: 'update-v4' }
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'offer', ...inPlace } ), 'start-update' )
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'offer', canUpdateInPlace: false, actionType: 'update-v4' } ), 'open-url' )
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'offer', canUpdateInPlace: true, actionType: 'url' } ), 'open-url' )
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'downloading', ...inPlace } ), 'none' )
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'ready', ...inPlace } ), 'install' )
	assert.equal( actionFor( { channel: 'announcement_primary', state: 'failed', ...inPlace } ), 'open-url' )

} )

test( 'actionFor: Later and Never update', () => {

	for ( const state of [ 'offer', 'failed' ] ) {

		assert.equal( actionFor( { channel: 'announcement_later', state } ), 'snooze' )
		assert.equal( actionFor( { channel: 'announcement_never', state } ), 'decline' )

	}

	// Ready installs on quit and a download carries on: Later only closes
	assert.equal( actionFor( { channel: 'announcement_later', state: 'ready' } ), 'close' )
	assert.equal( actionFor( { channel: 'announcement_later', state: 'downloading' } ), 'close' )
	assert.equal( actionFor( { channel: 'announcement_never', state: 'ready' } ), 'close' )
	assert.equal( actionFor( { channel: 'bogus', state: 'offer' } ), 'none' )

} )

test( 'placeBeside: sits to the right of the crosshair, never over it', () => {

	const { placeBeside } = require( '../../src/main/announcement-logic' )
	const workArea = { x: 0, y: 25, width: 1600, height: 975 }
	const size = { width: 456, height: 624 }
	const anchor = { x: 709, y: 445, width: 182, height: 110 } // Default: screen center
	const spot = placeBeside( anchor, workArea, size )
	assert.equal( spot.x, anchor.x + anchor.width )
	assert.ok( spot.x >= anchor.x + anchor.width || spot.x + size.width <= anchor.x, 'no horizontal overlap' )
	assert.ok( spot.y >= workArea.y && spot.y + size.height <= workArea.y + workArea.height, 'inside the work area' )

} )

test( 'placeBeside: goes left when the right side has no room', () => {

	const { placeBeside } = require( '../../src/main/announcement-logic' )
	const workArea = { x: 0, y: 0, width: 1600, height: 1000 }
	const size = { width: 456, height: 624 }
	const anchor = { x: 1400, y: 20, width: 182, height: 110 }
	const spot = placeBeside( anchor, workArea, size )
	assert.equal( spot.x + size.width, anchor.x )
	assert.equal( spot.y, 0, 'clamped to the top edge' )

} )

test( 'placeBeside: no crosshair window, or no room anywhere, centers', () => {

	const { placeBeside } = require( '../../src/main/announcement-logic' )
	const size = { width: 456, height: 624 }
	assert.deepEqual( placeBeside( null, { x: 0, y: 0, width: 1000, height: 800 }, size ), { x: 272, y: 88 } )
	const tiny = { x: 0, y: 0, width: 500, height: 640 }
	assert.deepEqual( placeBeside( { x: 160, y: 265, width: 182, height: 110 }, tiny, size ), { x: 22, y: 8 } )

} )
