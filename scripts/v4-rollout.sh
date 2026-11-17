#!/usr/bin/env bash
# Set how many v3 installs (and older v4 installs) get CrossOver 4 automatically.
#
#   scripts/v4-rollout.sh <percent> [tag]
#
#   percent  0-100. 0 is the kill switch: no new automatic downloads, and the
#            3.4.10 "Update" button stops too. "none" drops the field, which
#            means everyone (used for pre-releases, which only opted-in
#            installs see).
#   tag      release to edit. Defaults to the GitHub "Latest" release, which
#            must be a v4 release.
#
# Rewrites latest.yml (Windows), latest-mac.yml and latest-linux.yml:
#   stagingPercentage      the rollout share (electron-updater >= 4 reads it)
#   minimumSystemVersion   compared by electron-updater 6.3.0+ against
#                          os.release(): Darwin 21.0.0 = macOS 12,
#                          NT 10.0.0 = Windows 10. 3.3.x and older ignore it.
# latest-linux.yml gets stagingPercentage only. os.release() there is the
# kernel version, so an OS floor would block everyone. v3 on Linux never
# installs updates itself, but its "update available" dialog follows staging.
#
# Needs gh (authenticated with write access to lacymorrow/crossover) and python3.
# See docs/v4-rollout.md.
set -euo pipefail

REPO="${V4_ROLLOUT_REPO:-lacymorrow/crossover}"
PERCENT="${1:-}"
TAG="${2:-}"

if [[ -z "$PERCENT" ]]; then
	sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
	exit 2
fi

if [[ "$PERCENT" != "none" ]] && ! [[ "$PERCENT" =~ ^[0-9]+$ && "$PERCENT" -le 100 ]]; then
	echo "percent must be 0-100 or none, got: $PERCENT" >&2
	exit 2
fi

if [[ -z "$TAG" ]]; then
	TAG="$(gh release view --repo "$REPO" --json tagName --jq .tagName)"
fi

if ! [[ "$TAG" =~ ^v4\. ]]; then
	echo "refusing to edit $TAG: not a v4 release" >&2
	exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

edit() {
	local file="$1" minimum="$2"
	gh release download "$TAG" --repo "$REPO" --pattern "$file" --dir "$WORK" --clobber
	python3 - "$WORK/$file" "$minimum" "$PERCENT" <<'PY'
import sys
path, minimum, percent = sys.argv[1:]
lines = open(path).read().splitlines()
drop = ("minimumSystemVersion:", "stagingPercentage:")
kept = [line for line in lines if not line.startswith(drop)]
if not any(line.startswith("version: 4.") for line in kept):
    sys.exit(f"{path}: not a v4 update file")
if minimum != "-":
    kept.append(f"minimumSystemVersion: {minimum}")
if percent != "none":
    kept.append(f"stagingPercentage: {percent}")
open(path, "w").write("\n".join(kept) + "\n")
PY
	gh release upload "$TAG" --repo "$REPO" --clobber "$WORK/$file"

	# Read it back: the release page is what every install reads
	local check="$WORK/check"
	mkdir -p "$check"
	gh release download "$TAG" --repo "$REPO" --pattern "$file" --dir "$check" --clobber
	if [[ "$minimum" != "-" ]]; then
		grep -qx "minimumSystemVersion: $minimum" "$check/$file"
	elif grep -q '^minimumSystemVersion:' "$check/$file"; then
		echo "$file must not have minimumSystemVersion" >&2
		exit 1
	fi
	if [[ "$PERCENT" == "none" ]]; then
		if grep -q '^stagingPercentage:' "$check/$file"; then
			echo "$file still has stagingPercentage" >&2
			exit 1
		fi
	else
		grep -qx "stagingPercentage: $PERCENT" "$check/$file"
	fi
	echo "$TAG $file: minimumSystemVersion $minimum, stagingPercentage $PERCENT"
}

edit latest.yml 10.0.0
edit latest-mac.yml 21.0.0
edit latest-linux.yml -
