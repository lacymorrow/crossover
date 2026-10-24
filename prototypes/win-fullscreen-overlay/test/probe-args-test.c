/*
 * Host-compilable tests for the probe's argument parser (LAC-5181).
 *
 * The parser lives in a header with no Windows dependencies on purpose: the
 * probe itself can only run on the test box, but the one piece of it with
 * branching logic can be checked anywhere, including on a mac.
 */

#include <stdio.h>
#include <string.h>
#include <wchar.h>

#include "../src/probe-args.h"

static int g_failures;

static void check( int condition, const char *what )
{
	if ( condition )
	{
		printf( "ok   %s\n", what );
	}
	else
	{
		printf( "FAIL %s\n", what );
		g_failures++;
	}
}

static int parse( probe_options *options, int argc, wchar_t **argv )
{
	probe_options_default( options );
	return probe_options_parse( argc, argv, options );
}

int main( void )
{
	probe_options options;

	/* Defaults: the green centred crosshair the probe has always drawn, so an
	   existing invocation with no arguments behaves exactly as before. */
	probe_options_default( &options );
	check( options.r == 0 && options.g == 255 && options.b == 0, "default tint is green" );
	check( options.offset_x == 0 && options.offset_y == 0, "default offset is centred" );

	/* One photo has to answer both matrix columns, which means the two
	   variants must be distinguishable by colour and by position. */
	wchar_t *magenta[] = { L"probe.exe", L"--tint", L"magenta" };
	check( parse( &options, 3, magenta ) == 0, "named tint parses" );
	check( options.r == 255 && options.g == 0 && options.b == 255, "magenta is magenta" );

	wchar_t *offset[] = { L"probe.exe", L"--offset-x", L"-240", L"--offset-y", L"60" };
	check( parse( &options, 5, offset ) == 0, "offsets parse" );
	check( options.offset_x == -240, "negative offset-x survives" );
	check( options.offset_y == 60, "positive offset-y survives" );

	wchar_t *combined[] = { L"probe.exe", L"--tint", L"cyan", L"--offset-x", L"120" };
	check( parse( &options, 5, combined ) == 0, "tint and offset combine" );
	check( options.b == 255 && options.g == 255 && options.r == 0, "cyan is cyan" );
	check( options.offset_x == 120, "offset survives alongside tint" );

	/* Each variant needs its own quit hotkey. RegisterHotKey is global, so two
	   probes asking for the same combination means the second one silently gets
	   no hotkey at all (observed on otto: err=1409), leaving a crosshair that
	   cannot be dismissed from inside a fullscreen game. */
	probe_options_default( &options );
	check( options.quit_vk == 'Q', "default quit key is Q" );

	wchar_t *quit_w[] = { L"probe.exe", L"--quit-key", L"W" };
	check( parse( &options, 3, quit_w ) == 0, "quit key parses" );
	check( options.quit_vk == 'W', "quit key is W" );

	wchar_t *quit_lower[] = { L"probe.exe", L"--quit-key", L"w" };
	check( parse( &options, 3, quit_lower ) == 0, "lowercase quit key parses" );
	check( options.quit_vk == 'W', "lowercase quit key is upcased to W" );

	wchar_t *quit_digit[] = { L"probe.exe", L"--quit-key", L"1" };
	check( parse( &options, 3, quit_digit ) == 0, "digit quit key parses" );
	check( options.quit_vk == '1', "digit quit key is 1" );

	wchar_t *quit_long[] = { L"probe.exe", L"--quit-key", L"QQ" };
	check( parse( &options, 3, quit_long ) != 0, "multi-character quit key is rejected" );

	wchar_t *quit_punct[] = { L"probe.exe", L"--quit-key", L"-" };
	check( parse( &options, 3, quit_punct ) != 0, "non-alphanumeric quit key is rejected" );

	/* Bad input must fail loudly. A probe that silently ignores --tint would
	   produce two identical crosshairs and a photo that proves nothing. */
	wchar_t *unknown[] = { L"probe.exe", L"--colour", L"green" };
	check( parse( &options, 3, unknown ) != 0, "unknown flag is rejected" );

	wchar_t *bad_tint[] = { L"probe.exe", L"--tint", L"chartreuse" };
	check( parse( &options, 3, bad_tint ) != 0, "unknown tint name is rejected" );

	wchar_t *missing[] = { L"probe.exe", L"--tint" };
	check( parse( &options, 2, missing ) != 0, "missing tint value is rejected" );

	wchar_t *not_a_number[] = { L"probe.exe", L"--offset-x", L"left" };
	check( parse( &options, 3, not_a_number ) != 0, "non-numeric offset is rejected" );

	wchar_t *out_of_range[] = { L"probe.exe", L"--offset-x", L"99999" };
	check( parse( &options, 3, out_of_range ) != 0, "absurd offset is rejected" );

	printf( "\n%s\n", g_failures ? "FAILED" : "all probe-args tests passed" );
	return g_failures ? 1 : 0;
}
