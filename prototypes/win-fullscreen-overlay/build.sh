#!/usr/bin/env bash
#
# Cross-compiles both probe variants for Windows x64 from macOS or Linux.
#
#   brew install mingw-w64      # macOS
#   apt install mingw-w64       # Debian/Ubuntu
#
# Output lands in dist/. Neither binary is signed here: signing is a Windows
# step (signtool) and happens on the test machine, see README.md.

set -euo pipefail

cd "$( dirname "$0" )"

CC=${CC:-x86_64-w64-mingw32-gcc}
WINDRES=${WINDRES:-x86_64-w64-mingw32-windres}

if ! command -v "$CC" >/dev/null 2>&1; then
	echo "error: $CC not found. Install mingw-w64 first." >&2
	exit 1
fi

mkdir -p dist

build_variant() {
	local name=$1

	echo "building $name..."
	"$WINDRES" -I src "src/overlay-$name.rc" -o "dist/overlay-$name.res.o"
	"$CC" \
		-O2 \
		-Wall \
		-Wextra \
		-DPROBE_BUILD_NAME="\"$name\"" \
		-o "dist/crossover-overlay-$name.exe" \
		src/overlay.c \
		"dist/overlay-$name.res.o" \
		-mwindows \
		-lgdi32 \
		-luser32
	rm -f "dist/overlay-$name.res.o"
}

build_variant uiaccess
build_variant plain

# The adversary needs no manifest: it is deliberately an ordinary topmost
# window, which is the thing a UIAccess window is supposed to outrank.
echo "building adversary..."
"$CC" \
	-O2 \
	-Wall \
	-Wextra \
	-o dist/crossover-overlay-adversary.exe \
	src/adversary.c \
	-mwindows \
	-lgdi32 \
	-luser32

echo
echo "built:"
ls -la dist/*.exe
