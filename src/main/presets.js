const log = require( './log' )
const preferences = require( './preferences' ).init()
const sound = require( './sound' )

/**
 * Crosshair presets: named snapshots of a crosshair "loadout".
 *
 * Only the crosshair and actions groups are captured. Keybinds, system settings
 * and the hidden group are deliberately left out: a preset that rewrote your
 * keybinds could rebind the cycle key out from under you mid-game.
 */
const PRESET_GROUPS = [ 'crosshair', 'actions' ]

// Position is per-session, not part of a loadout. Cycling presets must never
// teleport the crosshair away from where the player put it.
const EXCLUDED_KEYS = [ 'positionX', 'positionY' ]

const MAX_PRESETS = 10

// The preset we last pushed into preferences. Used to tell a preset change
// apart from an ordinary settings save, so editing the crosshair size doesn't
// snap straight back to the active preset.
//
// Seeded at load rather than on first use. electron-preferences overwrites its
// store before it emits 'save', so once the handler runs the store can no
// longer say which preset was active beforehand. Seeding late would read back
// the name the user just picked, mistake it for the old one, and swallow the
// first pick of every launch.
let applied = preferences.value( 'presets.active' ) || ''

const list = () => preferences.value( 'hidden.presets' ) || []

const activeName = () => preferences.value( 'presets.active' ) || ''

const notify = ( title, body, cue = 'DONE' ) => {

	sound.play( cue )

	// Required lazily: notification pulls in the renderer window.
	require( './notification' )( { title, body } )

}

/**
 * Snapshot the settings a preset owns, minus the per-session keys.
 */
const capture = () => {

	const settings = {}

	for ( const group of PRESET_GROUPS ) {

		settings[group] = { ...preferences.value( group ) }

		for ( const key of EXCLUDED_KEYS ) {

			delete settings[group][key]

		}

	}

	return settings

}

/**
 * Name an unnamed preset "Preset 1", "Preset 2", ... skipping taken names.
 */
const nextDefaultName = () => {

	const taken = new Set( list().map( preset => preset.name ) )
	let index = list().length + 1

	while ( taken.has( `Preset ${index}` ) ) {

		index++

	}

	return `Preset ${index}`

}

/**
 * Save the current settings under `name`, overwriting a preset of the same name.
 *
 * @returns {{status: string, name: string}} status is 'saved', 'updated' or 'full'
 */
const save = name => {

	const presets = list()
	const presetName = ( name || '' ).trim() || nextDefaultName()
	const existing = presets.findIndex( preset => preset.name === presetName )
	const preset = { name: presetName, settings: capture() }

	if ( existing === -1 && presets.length >= MAX_PRESETS ) {

		log.warn( `Preset limit reached (${MAX_PRESETS})` )
		notify( 'Preset Limit Reached', `CrossOver holds ${MAX_PRESETS} presets. Delete one to make room.`, 'ERROR' )

		return { status: 'full', name: presetName }

	}

	if ( existing === -1 ) {

		presets.push( preset )

	} else {

		presets[existing] = preset

	}

	log.info( `Save preset: ${presetName}` )

	preferences.value( [
		{ key: 'hidden.presets', value: presets },
		{ key: 'presets.active', value: presetName },
		{ key: 'presets.name', value: '' },
	] )

	applied = presetName

	const status = existing === -1 ? 'saved' : 'updated'

	notify(
		status === 'saved' ? 'Preset Saved' : 'Preset Replaced',
		status === 'saved' ? `${presetName} is ready. Press the Next Preset keybind to switch to it.` : `${presetName} now uses your current settings.`,
	)

	return { status, name: presetName }

}

/**
 * Write a preset's settings into preferences and push them to every window.
 */
const apply = name => {

	const preset = list().find( item => item.name === name )

	if ( !preset ) {

		log.warn( `Preset not found: ${name}` )

		return false

	}

	log.info( `Apply preset: ${name}` )

	const values = [ { key: 'presets.active', value: preset.name } ]

	for ( const group of PRESET_GROUPS ) {

		for ( const [ key, value ] of Object.entries( preset.settings[group] || {} ) ) {

			if ( !EXCLUDED_KEYS.includes( key ) ) {

				values.push( { key: `${group}.${key}`, value } )

			}

		}

	}

	applied = preset.name
	preferences.value( values )

	// Required lazily: crossover requires presets for its keyboard shortcut.
	require( './crossover' ).syncSettings()

	notify( 'Preset Applied', preset.name )

	return preset.name

}

const remove = name => {

	const presets = list()
	const remaining = presets.filter( preset => preset.name !== name )

	if ( remaining.length === presets.length ) {

		notify( 'Nothing to Delete', 'Pick a preset first.', 'ERROR' )

		return false

	}

	log.info( `Delete preset: ${name}` )

	// Clear the selection instead of promoting whatever preset is left. Naming a
	// preset active without applying its settings leaves the dropdown lying about
	// the crosshair on screen, and since the dropdown would already be showing
	// that name it can never fire a change event, so the user cannot pick it back.
	applied = ''
	preferences.value( [
		{ key: 'hidden.presets', value: remaining },
		{ key: 'presets.active', value: '' },
	] )

	notify( 'Preset Deleted', `${name} is gone.` )

	return name

}

/**
 * Advance to the next preset, wrapping around. The hotkey path.
 */
const cycle = () => {

	const presets = list()

	if ( presets.length === 0 ) {

		notify( 'No Presets Yet', 'Save one from Preferences > Presets to switch between crosshairs.', 'ERROR' )

		return false

	}

	const current = presets.findIndex( preset => preset.name === activeName() )
	const next = presets[( current + 1 ) % presets.length]

	return apply( next.name )

}

/**
 * The preferences window reads its section config once per load, so the saved
 * presets have to be written into the dropdown's options before it renders.
 */
const refreshOptions = () => {

	const section = preferences.options?.sections?.find( item => item.id === 'presets' )

	if ( !section ) {

		return

	}

	const field = section.form.groups
		.flatMap( group => group.fields )
		.find( item => item.key === 'active' )

	if ( !field ) {

		return

	}

	const presets = list()

	// electron-preferences already renders a "-- Select One --" placeholder, so an
	// empty list needs no filler option. The help text carries the empty state.
	field.options = presets.map( preset => ( { label: preset.name, value: preset.name } ) )
	field.help = presets.length > 0
		? 'Picking a preset applies it right away.'
		: 'Save your first preset below and it shows up here.'

}

/**
 * Apply a preset the user picked from the dropdown. Called on every preferences
 * save, so it has to ignore saves that didn't change the active preset.
 */
const handleSelection = active => {

	if ( !active || active === applied ) {

		return false

	}

	return apply( active )

}

const presets = {
	MAX_PRESETS,
	activeName,
	apply,
	cycle,
	handleSelection,
	list,
	refreshOptions,
	remove,
	save,
}

module.exports = presets
