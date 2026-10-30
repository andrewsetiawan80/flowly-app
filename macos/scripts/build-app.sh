#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
app_output="${1:?Pass an absolute output directory}"
mkdir -p "$app_output"
swift build -c release
app_path="$app_output/Flowly.app"
mkdir -p "$app_path/Contents/MacOS" "$app_path/Contents/Resources"
bin_path="$(swift build -c release --show-bin-path)"
cp "$bin_path/Flowly" "$app_path/Contents/MacOS/Flowly"
cp Resources/Info.plist "$app_path/Contents/Info.plist"
icon_set=".build/Flowly.iconset"
mkdir -p "$icon_set"
for size in 16 32 128 256 512; do
 sips -z "$size" "$size" ../public/logo.png --out "$icon_set/icon_${size}x${size}.png" >/dev/null
 double_size=$((size * 2))
 sips -z "$double_size" "$double_size" ../public/logo.png --out "$icon_set/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$icon_set" -o "$app_path/Contents/Resources/Flowly.icns"
codesign --force --deep --sign - "$app_path"
codesign --verify --deep --strict "$app_path"
printf 'Built %s\n' "$app_path"
