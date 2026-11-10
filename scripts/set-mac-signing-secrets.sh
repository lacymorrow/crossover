#!/bin/bash
# set-mac-signing-secrets.sh: put Developer ID signing + notarization secrets on
# this repo so release.yml and release-v4.yml produce signed, notarized Mac builds.
#
# Run it yourself (it needs you): macOS asks before exporting the signing key.
# Nothing is printed or written to disk outside a temp dir that is wiped on exit.
#
#   scripts/set-mac-signing-secrets.sh [owner/repo]
set -euo pipefail

REPO="${1:-lacymorrow/crossover}"
TEAM_ID="DPFY6AHP57"
IDENTITY="Developer ID Application: Lacy Morrow (${TEAM_ID})"

security find-identity -v -p codesigning | grep -q "$IDENTITY" \
	|| { echo "Missing keychain identity: $IDENTITY" >&2; exit 1; }

tmp="$(mktemp -d)"
# Delete outright: a key export must never sit in the Trash
trap 'rm -rf "$tmp"' EXIT

read -r -p "Apple ID email: " apple_id
read -r -s -p "App-specific password (appleid.apple.com > Sign-In and Security): " app_password
echo

echo "Checking notarization credentials..."
xcrun notarytool history --apple-id "$apple_id" --team-id "$TEAM_ID" --password "$app_password" >/dev/null \
	|| { echo "Apple rejected those credentials. Nothing was changed." >&2; exit 1; }

p12_password="$(openssl rand -base64 24)"
echo "macOS will ask to export your Developer ID keys. Click Allow (or Always Allow)."
# Exports every identity in the login keychain: the Developer ID Application and
# Installer pair. electron-builder picks the Application one.
security export -k "$HOME/Library/Keychains/login.keychain-db" -t identities -f pkcs12 \
	-P "$p12_password" -o "$tmp/cert.p12"

base64 -i "$tmp/cert.p12" | gh secret set CSC_LINK -R "$REPO"
printf '%s' "$p12_password" | gh secret set CSC_KEY_PASSWORD -R "$REPO"
printf '%s' "$apple_id" | gh secret set APPLE_ID -R "$REPO"
printf '%s' "$app_password" | gh secret set APPLE_APP_SPECIFIC_PASSWORD -R "$REPO"
printf '%s' "$TEAM_ID" | gh secret set APPLE_TEAM_ID -R "$REPO"

echo "Done. Secrets on $REPO:"
gh secret list -R "$REPO"
