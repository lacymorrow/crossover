#!/usr/bin/env bash
# Build the CrossOver snap from snap/snapcraft.yaml (#598).
# Needs an Ubuntu 22.04 host: --destructive-mode builds on the host, and the
# host must match the core22 base. Output: dist/crossover_<version>_amd64.snap
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")

npx electron-builder --linux dir --x64 --publish never

sed -i "s/^version: .*/version: '$VERSION'/" snap/snapcraft.yaml
sudo snap install snapcraft --classic
sudo snapcraft pack --destructive-mode --output "dist/crossover_${VERSION}_amd64.snap"
sudo chown "$(id -u):$(id -g)" dist/*.snap
ls -lh dist/*.snap
