#!/usr/bin/env bash
# Install a CrossOver Linux package the way a user would, launch it under a
# display server, and check the crosshair window shows up and stays up.
#
#   linux-smoke.sh <deb|appimage|pacman|snap> <x11|wayland> <pkg-dir> <out-dir>
#
# Runs as root inside a distro container (snap runs on the runner itself).
# Exit 0 = installed, launched, window present after SETTLE seconds.
set -euo pipefail

KIND=$1 SESSION=$2 PKG_DIR=$(realpath "$3") OUT=$(realpath -m "$4")
SETTLE=${SETTLE:-15}
mkdir -p "$OUT"
LOG="$OUT/app.log"

say() { printf '\n== %s\n' "$*"; }

distro() { . /etc/os-release; echo "$ID"; }

install_tools() {
	say "Install display + inspection tools ($(distro), $SESSION)"
	case "$(distro)" in
		ubuntu | debian)
			export DEBIAN_FRONTEND=noninteractive
			apt-get update -qq
			local pkgs=(xvfb x11-utils imagemagick procps)
			if [[ $SESSION == wayland ]]; then pkgs+=(sway grim xwayland); fi
			apt-get install -y -qq "${pkgs[@]}" >/dev/null
			;;
		fedora)
			local pkgs=(xorg-x11-server-Xvfb xwininfo ImageMagick procps-ng
				gtk3 nss alsa-lib libXScrnSaver libXtst at-spi2-core libdrm mesa-libgbm)
			if [[ $SESSION == wayland ]]; then pkgs+=(sway grim xorg-x11-server-Xwayland); fi
			dnf install -y -q "${pkgs[@]}" >/dev/null
			;;
		arch)
			pacman -Syu --noconfirm --needed -q xorg-server-xvfb xorg-xwininfo imagemagick procps-ng >/dev/null
			if [[ $SESSION == wayland ]]; then pacman -S --noconfirm --needed -q sway grim xorg-xwayland >/dev/null; fi
			;;
		*) echo "unknown distro $(distro)"; exit 2 ;;
	esac
}

install_app() {
	say "Install $KIND package"
	case $KIND in
		deb) apt-get install -y -qq "$PKG_DIR"/*.deb >/dev/null; APP=(/opt/CrossOver/crossover) ;;
		pacman) pacman -U --noconfirm "$PKG_DIR"/*.pacman >/dev/null; APP=(/opt/CrossOver/crossover) ;;
		appimage)
			local img; img=$(ls "$PKG_DIR"/*.AppImage); chmod +x "$img"
			# No FUSE in containers; this is what users without FUSE do too.
			APP=("$img" --appimage-extract-and-run)
			;;
		snap) snap install --dangerous "$PKG_DIR"/*.snap; APP=(/snap/bin/crossover) ;;
	esac
}

start_display() {
	# Snaps insist on /run/user/<uid>, so use it everywhere.
	export XDG_RUNTIME_DIR=/run/user/$(id -u); mkdir -p -m 700 "$XDG_RUNTIME_DIR"
	if [[ $SESSION == x11 ]]; then
		say "Start Xvfb"
		Xvfb :99 -screen 0 1920x1080x24 >"$OUT/display.log" 2>&1 &
		export DISPLAY=:99
		sleep 2
	else
		say "Start headless sway (Wayland + XWayland)"
		mkdir -p ~/.config/sway
		printf 'xwayland enable\noutput HEADLESS-1 resolution 1920x1080\n' >~/.config/sway/config
		# Fedora ships sway with file capabilities, which containers refuse to
		# exec. A plain copy drops them.
		cp "$(command -v sway)" /usr/local/bin/sway-plain
		WLR_BACKENDS=headless WLR_RENDERER=pixman WLR_LIBINPUT_NO_DEVICES=1 \
			sway-plain --unsupported-gpu >"$OUT/display.log" 2>&1 &
		for _ in $(seq 20); do
			WAYLAND_DISPLAY=$(ls "$XDG_RUNTIME_DIR" 2>/dev/null | grep -m1 '^wayland-[0-9]$' || true)
			[[ -n $WAYLAND_DISPLAY ]] && break; sleep 0.5
		done
		[[ -n ${WAYLAND_DISPLAY:-} ]] || { echo "sway never came up"; cat "$OUT/display.log"; exit 1; }
		export WAYLAND_DISPLAY SWAYSOCK; SWAYSOCK=$(ls "$XDG_RUNTIME_DIR"/sway-ipc.* | head -1)
		export XDG_SESSION_TYPE=wayland
		# A desktop session exports DISPLAY for XWayland; CrossOver relaunches
		# itself on X11 (#456), so it needs it too. sway starts XWayland lazily.
		for _ in $(seq 20); do
			X=$(ls /tmp/.X11-unix 2>/dev/null | grep -m1 '^X[0-9]' || true)
			[[ -n $X ]] && break; sleep 0.5
		done
		[[ -n $X ]] || { echo "XWayland socket never appeared"; cat "$OUT/display.log"; exit 1; }
		export DISPLAY=:${X#X}
	fi
}

windows() {
	# CrossOver is an X11 client in both sessions (on Wayland it runs through
	# XWayland, #456), so ask the X server. Headless sway can't prove the
	# crosshair is drawn on a real compositor; the library VMs cover that.
	xwininfo -root -tree 2>/dev/null | grep -i crossover || true
}

screenshot() {
	if [[ $SESSION == x11 ]]; then import -window root "$OUT/screen.png" || true
	else grim "$OUT/screen.png" || true; fi
}

install_tools
install_app
start_display

say "Launch: ${APP[*]}"
# --no-sandbox: root in a container has no usable Chromium sandbox.
"${APP[@]}" --no-sandbox >"$LOG" 2>&1 &
PID=$!
sleep "$SETTLE"
screenshot

say "Windows after ${SETTLE}s"
WIN=$(windows); echo "${WIN:-<none>}"

ALIVE=1; kill -0 "$PID" 2>/dev/null || ALIVE=0
say "App log (tail)"; tail -40 "$LOG" || true

if [[ $ALIVE == 0 ]]; then echo "FAIL: app exited"; exit 1; fi
if [[ -z $WIN ]]; then echo "FAIL: no CrossOver window"; exit 1; fi
# Hide-on-ADS, follow-mouse and hide-key modes all ride on uiohook-napi.
if grep -q 'Failed to load uiohook-napi' "$LOG"; then
	echo "FAIL: mouse/keyboard hooks did not load"; grep -A1 'Failed to load uiohook-napi' "$LOG"; exit 1
fi
echo "PASS: $KIND on $(distro) $SESSION"
kill "$PID" 2>/dev/null || true
