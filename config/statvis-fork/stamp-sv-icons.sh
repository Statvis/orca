#!/usr/bin/env bash
# Stamps the SV badge onto every macOS app icon in place. Run before packaging a Statvis fork build.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

swiftc -O "$repo_root/config/statvis-fork/stamp-sv-icon.swift" -o "$work_dir/stamp-sv-icon"

for icon in resources/build/icon.png resources/icon.png resources/icon-dev.png \
  resources/app-icons/orca-blue.png resources/app-icons/orca-watercolor.png; do
  "$work_dir/stamp-sv-icon" "$repo_root/$icon" "$repo_root/$icon"
done

iconset="$work_dir/icon.iconset"
mkdir "$iconset"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$repo_root/resources/build/icon.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$repo_root/resources/build/icon.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$repo_root/resources/build/icon.icns"
echo "Stamped SV badge onto macOS app icons."
