/*
 * Z-band adversary for the LAC-5181 overlay probe.
 *
 * Stands in for a game that holds a fullscreen always-on-top window: an opaque
 * borderless window covering the primary display, WS_EX_TOPMOST, re-asserting
 * itself on a timer the way games commonly do.
 *
 * This isolates one question that needs no game at all: does a UIAccess window
 * sit in a higher z-band than an ordinary topmost window from another process?
 * If the UIAccess probe cannot beat this, it will not beat a real game either,
 * and track B is dead before anyone installs anything.
 *
 * It is NOT a substitute for exclusive-fullscreen testing. A real
 * exclusive-fullscreen game stops DWM composition entirely, which this window
 * does not do.
 */

#include <windows.h>

#define ADVERSARY_CLASS L"CrossOverZBandAdversary"
#define TOPMOST_TIMER_ID 1
#define TOPMOST_TIMER_MS 500
#define QUIT_HOTKEY_ID 1

static LRESULT CALLBACK window_proc( HWND hwnd, UINT msg, WPARAM wparam, LPARAM lparam )
{
	switch ( msg )
	{
		case WM_PAINT:
		{
			PAINTSTRUCT ps;
			HDC dc = BeginPaint( hwnd, &ps );

			/* Dark red: unmistakable behind a green crosshair, and clearly not
			   anything else that might be on the desktop. */
			HBRUSH brush = CreateSolidBrush( RGB( 90, 0, 0 ) );
			FillRect( dc, &ps.rcPaint, brush );
			DeleteObject( brush );

			EndPaint( hwnd, &ps );
			return 0;
		}

		case WM_TIMER:
			if ( wparam == TOPMOST_TIMER_ID )
			{
				SetWindowPos( hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE );
			}

			return 0;

		case WM_HOTKEY:
			if ( wparam == QUIT_HOTKEY_ID )
			{
				PostQuitMessage( 0 );
			}

			return 0;

		case WM_CLOSE:
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

	WNDCLASSEXW wc;
	ZeroMemory( &wc, sizeof( wc ) );
	wc.cbSize = sizeof( wc );
	wc.lpfnWndProc = window_proc;
	wc.hInstance = instance;
	wc.hCursor = LoadCursor( NULL, IDC_ARROW );
	wc.lpszClassName = ADVERSARY_CLASS;

	if ( !RegisterClassExW( &wc ) )
	{
		return 1;
	}

	HWND hwnd = CreateWindowExW(
		WS_EX_TOPMOST,
		ADVERSARY_CLASS,
		L"CrossOver z-band adversary",
		WS_POPUP,
		0, 0,
		GetSystemMetrics( SM_CXSCREEN ),
		GetSystemMetrics( SM_CYSCREEN ),
		NULL, NULL, instance, NULL );

	if ( !hwnd )
	{
		return 1;
	}

	ShowWindow( hwnd, SW_SHOW );
	SetWindowPos( hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE );
	SetTimer( hwnd, TOPMOST_TIMER_ID, TOPMOST_TIMER_MS, NULL );
	RegisterHotKey( hwnd, QUIT_HOTKEY_ID, MOD_CONTROL | MOD_ALT | MOD_SHIFT, 'A' );

	MSG msg;
	while ( GetMessageW( &msg, NULL, 0, 0 ) > 0 )
	{
		TranslateMessage( &msg );
		DispatchMessageW( &msg );
	}

	UnregisterHotKey( hwnd, QUIT_HOTKEY_ID );
	return 0;
}
