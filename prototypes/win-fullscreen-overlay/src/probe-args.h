/*
 * Probe command-line options (LAC-5181).
 *
 * Deliberately free of windows.h so the parsing can be tested on the dev
 * machine: see test/probe-args-test.c.
 *
 * Why the probe takes options at all: filling the test matrix means a human at
 * the test box photographing a monitor, and every photo has to answer two
 * columns at once -- did the plain topmost window draw, and did the UIAccess
 * one. Running both variants together only works if they are visually
 * distinct, so colour and position are run-time options rather than
 * compile-time ones. That keeps the manifest the single difference between the
 * two binaries, which is the whole point of the A/B.
 */

#ifndef CROSSOVER_PROBE_ARGS_H
#define CROSSOVER_PROBE_ARGS_H

#include <stddef.h>
#include <wchar.h>

#define PROBE_OFFSET_LIMIT 8192

typedef struct
{
	unsigned char r;
	unsigned char g;
	unsigned char b;
	int offset_x;
	int offset_y;
	int quit_vk;
	int reassert;
} probe_options;

typedef struct
{
	const wchar_t *name;
	unsigned char r;
	unsigned char g;
	unsigned char b;
} probe_tint;

static const probe_tint probe_tints[] = {
	{ L"green",   0,   255, 0   },
	{ L"magenta", 255, 0,   255 },
	{ L"cyan",    0,   255, 255 },
	{ L"yellow",  255, 255, 0   },
	{ L"red",     255, 0,   0   },
	{ L"white",   255, 255, 255 }
};

/*
 * reassert defaults on, which is deliberately NOT what CrossOver v4 does.
 *
 * The probe re-applies HWND_TOPMOST on a 1 Hz timer. v4 calls Electron's
 * setAlwaysOnTop once at window creation (src/main/windows.js) and never again.
 * So the "plain topmost" probe is strictly stronger than the product it was
 * introduced to stand in for, and the 2026-10-24 pass could not have told the
 * two apart: it read "plain topmost wins" in all five games and concluded the
 * games were not exclusive fullscreen, when a one-shot topmost window might
 * well have lost in the same trial.
 *
 * --no-reassert is the v4-parity build. Running it as a third crosshair is what
 * separates "Windows beat us" from "we stopped asking".
 */
static void probe_options_default( probe_options *options )
{
	options->r = 0;
	options->g = 255;
	options->b = 0;
	options->offset_x = 0;
	options->offset_y = 0;
	options->quit_vk = 'Q';
	options->reassert = 1;
}

/*
 * RegisterHotKey is global, so two probes asking for the same combination means
 * the second one silently gets none (err=1409 on otto). That would leave a
 * crosshair on screen that cannot be dismissed from inside a fullscreen game,
 * so each variant takes its own key.
 */
static int probe_parse_quit_key( const wchar_t *text, int *out )
{
	if ( !text[ 0 ] || text[ 1 ] )
	{
		return -1;
	}

	wchar_t key = text[ 0 ];

	if ( key >= L'a' && key <= L'z' )
	{
		key = (wchar_t) ( key - L'a' + L'A' );
	}

	if ( ( key < L'A' || key > L'Z' ) && ( key < L'0' || key > L'9' ) )
	{
		return -1;
	}

	*out = (int) key;
	return 0;
}

static int probe_parse_tint( const wchar_t *name, probe_options *options )
{
	size_t count = sizeof( probe_tints ) / sizeof( probe_tints[ 0 ] );

	for ( size_t i = 0; i < count; i++ )
	{
		if ( wcscmp( name, probe_tints[ i ].name ) == 0 )
		{
			options->r = probe_tints[ i ].r;
			options->g = probe_tints[ i ].g;
			options->b = probe_tints[ i ].b;
			return 0;
		}
	}

	return -1;
}

static int probe_parse_offset( const wchar_t *text, int *out )
{
	wchar_t *end = NULL;
	long value = wcstol( text, &end, 10 );

	/* Reject "left" and "12px" alike: anything the whole string is not. */
	if ( end == text || ( end && *end != L'\0' ) )
	{
		return -1;
	}

	if ( value < -PROBE_OFFSET_LIMIT || value > PROBE_OFFSET_LIMIT )
	{
		return -1;
	}

	*out = (int) value;
	return 0;
}

/*
 * Returns 0 on success, -1 on any bad input. Failing loudly matters here: a
 * probe that quietly ignored --tint would paint two identical crosshairs in the
 * same place, and the resulting photo would look like a clean result while
 * proving nothing.
 */
static int probe_options_parse( int argc, wchar_t **argv, probe_options *options )
{
	for ( int i = 1; i < argc; i++ )
	{
		const wchar_t *flag = argv[ i ];
		int has_value = ( i + 1 ) < argc;

		if ( wcscmp( flag, L"--tint" ) == 0 )
		{
			if ( !has_value || probe_parse_tint( argv[ ++i ], options ) != 0 )
			{
				return -1;
			}
		}
		else if ( wcscmp( flag, L"--offset-x" ) == 0 )
		{
			if ( !has_value || probe_parse_offset( argv[ ++i ], &options->offset_x ) != 0 )
			{
				return -1;
			}
		}
		else if ( wcscmp( flag, L"--offset-y" ) == 0 )
		{
			if ( !has_value || probe_parse_offset( argv[ ++i ], &options->offset_y ) != 0 )
			{
				return -1;
			}
		}
		else if ( wcscmp( flag, L"--quit-key" ) == 0 )
		{
			if ( !has_value || probe_parse_quit_key( argv[ ++i ], &options->quit_vk ) != 0 )
			{
				return -1;
			}
		}
		else if ( wcscmp( flag, L"--no-reassert" ) == 0 )
		{
			options->reassert = 0;
		}
		else
		{
			return -1;
		}
	}

	return 0;
}

#endif /* CROSSOVER_PROBE_ARGS_H */
