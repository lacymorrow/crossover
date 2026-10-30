/*
 * CrossOver fullscreen-overlay probe (LAC-5181, track B).
 *
 * A deliberately tiny Win32 overlay: a layered, click-through, topmost window
 * that paints a crosshair and nothing else. Two binaries are built from this
 * one source, differing only in their manifest's uiAccess flag, so a test run
 * can compare "plain topmost" against "UIAccess topmost" with every other
 * variable held still.
 *
 * It never touches the game: no hooks, no injection, no swapchain. It only
 * asks Windows for a window and draws into it.
 */

#include <windows.h>
#include <shellapi.h>
#include <stdio.h>

#include "probe-args.h"

#define PROBE_CLASS L"CrossOverOverlayProbe"
#define OVERLAY_SIZE 160
#define TOPMOST_TIMER_ID 1
#define TOPMOST_TIMER_MS 1000
#define QUIT_HOTKEY_ID 1

static FILE *g_log;

static void probe_log( const char *fmt, ... )
{
	if ( !g_log )
	{
		return;
	}

	SYSTEMTIME now;
	GetLocalTime( &now );
	fprintf( g_log, "[%02d:%02d:%02d] ", now.wHour, now.wMinute, now.wSecond );

	va_list args;
	va_start( args, fmt );
	vfprintf( g_log, fmt, args );
	va_end( args );

	fputc( '\n', g_log );
	fflush( g_log );
}

#define PROBE_WIDEN2( x ) L##x
#define PROBE_WIDEN( x ) PROBE_WIDEN2( x )

/*
 * One log file per probe on screen, never one shared between them. Every probe
 * in a trial runs at the same time, so a shared log cannot be read back per
 * variant: whichever process wrote last owns the final "uiaccess=" line. That
 * is not theoretical. The 2026-10-24 pass recorded uiaccess=DENIED for both
 * probes in all five trials because the reader took the last line of the shared
 * file, while the log itself showed the UIAccess build reporting GRANTED every
 * time.
 *
 * The build name alone is not enough to separate them: plain and v4parity are
 * the same binary, started twice, once re-asserting topmost and once not. The
 * suffix is what keeps those two apart.
 */
static void open_log( const wchar_t *suffix )
{
	wchar_t path[ MAX_PATH ];
	DWORD len = GetEnvironmentVariableW( L"CROSSOVER_PROBE_LOG", path, MAX_PATH );

	if ( len == 0 || len >= MAX_PATH )
	{
		wchar_t temp[ MAX_PATH ];
		if ( GetTempPathW( MAX_PATH, temp ) == 0 )
		{
			return;
		}

		_snwprintf( path, MAX_PATH, L"%scrossover-overlay-probe-%s%s.log", temp,
			PROBE_WIDEN( PROBE_BUILD_NAME ), suffix );
		path[ MAX_PATH - 1 ] = L'\0';
	}

	g_log = _wfopen( path, L"a" );
}

/*
 * The question track B exists to answer is whether this process actually got
 * UIAccess. Windows silently drops the request when the binary is unsigned or
 * runs from outside a secure path, so asking the token is the only honest
 * check -- the manifest alone proves nothing.
 */
static void log_uiaccess_state( void )
{
	HANDLE token;
	if ( !OpenProcessToken( GetCurrentProcess(), TOKEN_QUERY, &token ) )
	{
		probe_log( "uiaccess=unknown (OpenProcessToken failed, err=%lu)", GetLastError() );
		return;
	}

	DWORD ui_access = 0;
	DWORD returned = 0;

	if ( GetTokenInformation( token, TokenUIAccess, &ui_access, sizeof( ui_access ), &returned ) )
	{
		probe_log( "uiaccess=%s", ui_access ? "GRANTED" : "DENIED" );
	}
	else
	{
		probe_log( "uiaccess=unknown (GetTokenInformation failed, err=%lu)", GetLastError() );
	}

	CloseHandle( token );
}

static int clamp( int value, int low, int high )
{
	if ( value < low )
	{
		return low;
	}

	if ( value > high )
	{
		return high;
	}

	return value;
}

static void set_pixel( unsigned char *bits, int stride, int x, int y, unsigned char r, unsigned char g, unsigned char b )
{
	if ( x < 0 || y < 0 || x >= OVERLAY_SIZE || y >= OVERLAY_SIZE )
	{
		return;
	}

	/* Top-down 32bpp BGRA, premultiplied alpha. Fully opaque, so the colour
	   channels are already their own premultiplied values. */
	unsigned char *px = bits + ( y * stride ) + ( x * 4 );
	px[ 0 ] = b;
	px[ 1 ] = g;
	px[ 2 ] = r;
	px[ 3 ] = 255;
}

#define MAX_CROSSHAIR_POINTS 512

/* Collects the lit pixels first so the black halo can be laid down in a
   separate pass. Drawing halo-then-fill per pixel does not work: the next
   pixel's halo paints over the previous pixel's fill, and the crosshair comes
   out almost entirely black. */
static int collect_crosshair_points( POINT *points, int capacity )
{
	const int centre = OVERLAY_SIZE / 2;
	const int gap = 8;
	const int arm = 44;
	int count = 0;

	for ( int i = gap; i <= arm && count + 4 <= capacity; i++ )
	{
		for ( int t = 0; t < 2 && count + 4 <= capacity; t++ )
		{
			points[ count ].x = centre - i; points[ count ].y = centre + t; count++;
			points[ count ].x = centre + i; points[ count ].y = centre + t; count++;
			points[ count ].x = centre + t; points[ count ].y = centre - i; count++;
			points[ count ].x = centre + t; points[ count ].y = centre + i; count++;
		}
	}

	for ( int dy = -1; dy <= 1; dy++ )
	{
		for ( int dx = -1; dx <= 1; dx++ )
		{
			if ( count < capacity )
			{
				points[ count ].x = centre + dx;
				points[ count ].y = centre + dy;
				count++;
			}
		}
	}

	return count;
}

static void draw_crosshair( unsigned char *bits, int stride, const probe_options *options )
{
	POINT points[ MAX_CROSSHAIR_POINTS ];
	int count = collect_crosshair_points( points, MAX_CROSSHAIR_POINTS );

	/* Pass 1: black halo, so the crosshair stays readable on a bright scene. */
	for ( int i = 0; i < count; i++ )
	{
		for ( int dy = -1; dy <= 1; dy++ )
		{
			for ( int dx = -1; dx <= 1; dx++ )
			{
				set_pixel( bits, stride, points[ i ].x + dx, points[ i ].y + dy, 0, 0, 0 );
			}
		}
	}

	/* Pass 2: the tinted fill, now that no halo can land on top of it. The
	   tint is what tells the two probe variants apart in a photo. */
	for ( int i = 0; i < count; i++ )
	{
		set_pixel( bits, stride, points[ i ].x, points[ i ].y, options->r, options->g, options->b );
	}
}

static BOOL paint_overlay( HWND hwnd, const probe_options *options )
{
	BITMAPINFO bmi;
	ZeroMemory( &bmi, sizeof( bmi ) );
	bmi.bmiHeader.biSize = sizeof( BITMAPINFOHEADER );
	bmi.bmiHeader.biWidth = OVERLAY_SIZE;
	bmi.bmiHeader.biHeight = -OVERLAY_SIZE; /* negative height => top-down */
	bmi.bmiHeader.biPlanes = 1;
	bmi.bmiHeader.biBitCount = 32;
	bmi.bmiHeader.biCompression = BI_RGB;

	HDC screen_dc = GetDC( NULL );
	if ( !screen_dc )
	{
		return FALSE;
	}

	void *bits = NULL;
	HBITMAP bitmap = CreateDIBSection( screen_dc, &bmi, DIB_RGB_COLORS, &bits, NULL, 0 );
	if ( !bitmap || !bits )
	{
		ReleaseDC( NULL, screen_dc );
		return FALSE;
	}

	ZeroMemory( bits, (size_t) OVERLAY_SIZE * OVERLAY_SIZE * 4 );
	draw_crosshair( (unsigned char *) bits, OVERLAY_SIZE * 4, options );

	HDC mem_dc = CreateCompatibleDC( screen_dc );
	HGDIOBJ previous = SelectObject( mem_dc, bitmap );

	POINT src = { 0, 0 };
	SIZE size = { OVERLAY_SIZE, OVERLAY_SIZE };
	BLENDFUNCTION blend;
	blend.BlendOp = AC_SRC_OVER;
	blend.BlendFlags = 0;
	blend.SourceConstantAlpha = 255;
	blend.AlphaFormat = AC_SRC_ALPHA;

	BOOL ok = UpdateLayeredWindow( hwnd, screen_dc, NULL, &size, mem_dc, &src, 0, &blend, ULW_ALPHA );
	if ( !ok )
	{
		probe_log( "UpdateLayeredWindow failed, err=%lu", GetLastError() );
	}

	SelectObject( mem_dc, previous );
	DeleteDC( mem_dc );
	DeleteObject( bitmap );
	ReleaseDC( NULL, screen_dc );

	return ok;
}

static void assert_topmost( HWND hwnd )
{
	SetWindowPos( hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE );
}

static LRESULT CALLBACK window_proc( HWND hwnd, UINT msg, WPARAM wparam, LPARAM lparam )
{
	switch ( msg )
	{
		case WM_TIMER:
			if ( wparam == TOPMOST_TIMER_ID )
			{
				assert_topmost( hwnd );
			}

			return 0;

		case WM_HOTKEY:
			if ( wparam == QUIT_HOTKEY_ID )
			{
				probe_log( "quit hotkey pressed" );
				PostQuitMessage( 0 );
			}

			return 0;

		case WM_CLOSE:
			PostQuitMessage( 0 );
			return 0;

		case WM_DESTROY:
			PostQuitMessage( 0 );
			return 0;

		default:
			return DefWindowProcW( hwnd, msg, wparam, lparam );
	}
}

int WINAPI WinMain( HINSTANCE instance, HINSTANCE previous, LPSTR command_line, int show )
{
	(void) previous;
	(void) command_line;
	(void) show;

	/* Arguments are parsed before the log is opened, because --no-reassert
	   decides which log file this process owns. GetCommandLineW rather than the
	   ANSI command_line WinMain was handed: the parser is wide so the same code
	   can be tested off-Windows. */
	probe_options options;
	probe_options_default( &options );

	int argc = 0;
	wchar_t **argv = CommandLineToArgvW( GetCommandLineW(), &argc );

	/* Captured here: opening the log and querying the token below both clobber
	   the thread's last-error value before it could otherwise be reported. */
	DWORD argv_err = argv ? 0 : GetLastError();
	int args_ok = 0;

	if ( argv )
	{
		args_ok = probe_options_parse( argc, argv, &options ) == 0;
		LocalFree( argv );
	}

	open_log( options.reassert ? L"" : L"-once" );
	probe_log( "---- probe start (build=%s) ----", PROBE_BUILD_NAME );
	log_uiaccess_state();

	if ( !argv )
	{
		probe_log( "CommandLineToArgvW failed, err=%lu", argv_err );
		return 1;
	}

	if ( !args_ok )
	{
		probe_log( "bad arguments. usage: --tint <green|magenta|cyan|yellow|red|white> --offset-x <n> --offset-y <n> --quit-key <A-Z|0-9> [--no-reassert]" );
		return 2;
	}

	probe_log( "options tint=%u,%u,%u offset=%d,%d quit=ctrl+alt+shift+%c reassert=%s", options.r, options.g, options.b, options.offset_x, options.offset_y, (char) options.quit_vk, options.reassert ? "1hz" : "once (v4 parity)" );

	WNDCLASSEXW wc;
	ZeroMemory( &wc, sizeof( wc ) );
	wc.cbSize = sizeof( wc );
	wc.lpfnWndProc = window_proc;
	wc.hInstance = instance;
	wc.hCursor = LoadCursor( NULL, IDC_ARROW );
	wc.lpszClassName = PROBE_CLASS;

	if ( !RegisterClassExW( &wc ) )
	{
		probe_log( "RegisterClassExW failed, err=%lu", GetLastError() );
		return 1;
	}

	/* Centre on the primary display. Multi-monitor placement is a v4 concern,
	   not something this probe needs to answer. */
	int screen_w = GetSystemMetrics( SM_CXSCREEN );
	int screen_h = GetSystemMetrics( SM_CYSCREEN );
	int x = ( ( screen_w - OVERLAY_SIZE ) / 2 ) + options.offset_x;
	int y = ( ( screen_h - OVERLAY_SIZE ) / 2 ) + options.offset_y;

	/* An offset that walked the crosshair off screen would read in a photo as
	   "the overlay lost", which is the one wrong answer this test must not
	   produce. Clamp instead. */
	x = clamp( x, 0, screen_w - OVERLAY_SIZE );
	y = clamp( y, 0, screen_h - OVERLAY_SIZE );

	HWND hwnd = CreateWindowExW(
		WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW,
		PROBE_CLASS,
		L"CrossOver overlay probe",
		WS_POPUP,
		x, y, OVERLAY_SIZE, OVERLAY_SIZE,
		NULL, NULL, instance, NULL );

	if ( !hwnd )
	{
		probe_log( "CreateWindowExW failed, err=%lu", GetLastError() );
		return 1;
	}

	if ( !paint_overlay( hwnd, &options ) )
	{
		probe_log( "initial paint failed" );
	}

	ShowWindow( hwnd, SW_SHOWNA );
	assert_topmost( hwnd );

	/* With --no-reassert the window asks for topmost once and then lets the
	   system do what it likes, which is v4's actual behaviour. See probe-args.h. */
	if ( options.reassert )
	{
		SetTimer( hwnd, TOPMOST_TIMER_ID, TOPMOST_TIMER_MS, NULL );
	}

	/* Two probes run at once during a matrix trial, so each needs its own key:
	   RegisterHotKey is global and the second claim on a combination fails with
	   ERROR_HOTKEY_ALREADY_REGISTERED (1409). */
	if ( !RegisterHotKey( hwnd, QUIT_HOTKEY_ID, MOD_CONTROL | MOD_ALT | MOD_SHIFT, (UINT) options.quit_vk ) )
	{
		probe_log( "quit hotkey ctrl+alt+shift+%c unavailable, err=%lu (use run-probe.ps1 -Action stop)", (char) options.quit_vk, GetLastError() );
	}
	else
	{
		probe_log( "quit hotkey: ctrl+alt+shift+%c", (char) options.quit_vk );
	}

	probe_log( "overlay up at %d,%d size %d", x, y, OVERLAY_SIZE );

	MSG msg;
	while ( GetMessageW( &msg, NULL, 0, 0 ) > 0 )
	{
		TranslateMessage( &msg );
		DispatchMessageW( &msg );
	}

	UnregisterHotKey( hwnd, QUIT_HOTKEY_ID );
	probe_log( "---- probe exit ----" );

	if ( g_log )
	{
		fclose( g_log );
	}

	return 0;
}
