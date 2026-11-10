#!/bin/bash
# Import the Developer ID certificate (CSC_LINK, base64 .p12) into a throwaway
# keychain that codesign can use without prompting. electron-builder then finds
# the identity by CSC_NAME. Replaces electron-builder's own temp keychain, which
# fails on GitHub's macOS runners ("SecKeychainUnlock: ... not correct").
set -euo pipefail

: "${CSC_LINK:?CSC_LINK secret is missing}"
: "${CSC_KEY_PASSWORD:?CSC_KEY_PASSWORD secret is missing}"

keychain="$RUNNER_TEMP/signing.keychain-db"
keychain_password="$(openssl rand -hex 24)"
cert="$RUNNER_TEMP/cert.p12"

printf '%s' "$CSC_LINK" | base64 --decode > "$cert"

security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 21600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$cert" -P "$CSC_KEY_PASSWORD" -A -f pkcs12 -k "$keychain"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$keychain_password" "$keychain" >/dev/null

# Put it first in the search list, keeping the existing keychains
# shellcheck disable=SC2046
security list-keychains -d user -s "$keychain" $(security list-keychains -d user | tr -d '"')
rm -f "$cert"

security find-identity -v -p codesigning "$keychain"
