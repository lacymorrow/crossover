#!/usr/bin/env bash
#
# Runs the host-compilable prototype tests. No Windows and no test box needed.

set -euo pipefail

cd "$( dirname "$0" )"

CC_HOST=${CC_HOST:-cc}
out=$( mktemp -d )
trap 'rm -rf "$out"' EXIT

"$CC_HOST" -O1 -Wall -Wextra -Werror -o "$out/probe-args-test" probe-args-test.c
"$out/probe-args-test"

# The PowerShell scripts are run by hand at the Windows test box, so a syntax
# error there costs a trip to the machine. Parse-check them here when a
# PowerShell is available: pwsh on macOS/Linux parses them fine, nothing is
# executed and nothing Windows-specific is touched.
if command -v pwsh >/dev/null 2>&1; then
	echo
	pwsh -NoProfile -File lint-scripts.ps1
else
	echo
	echo "note: pwsh not on PATH, skipping the PowerShell parse check."
	echo "      brew install --cask powershell  (or run test/lint-scripts.ps1 on the test box)"
fi
