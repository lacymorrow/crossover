// Run with: npm run test:unit (node --test, no Electron)
const assert = require( 'node:assert/strict' )
const { test } = require( 'node:test' )
const { isFirstLaunch } = require( '../../src/main/first-launch' )

test( 'isFirstLaunch: userData created by this process means a new install', () => {

	const now = 1_800_000_000_000
	assert.equal( isFirstLaunch( { birthtimeMs: now - 2000, now, uptimeMs: 5000 } ), true )
	assert.equal( isFirstLaunch( { birthtimeMs: now - 12_000, now, uptimeMs: 5000 } ), true, 'inside the slack' )

} )

test( 'isFirstLaunch: an older userData folder is an existing install', () => {

	const now = 1_800_000_000_000
	assert.equal( isFirstLaunch( { birthtimeMs: now - 86_400_000, now, uptimeMs: 5000 } ), false )

} )

test( 'isFirstLaunch: no usable birth time shows onboarding', () => {

	assert.equal( isFirstLaunch( { birthtimeMs: 0 } ), true )
	assert.equal( isFirstLaunch( { birthtimeMs: Number.NaN } ), true )

} )
