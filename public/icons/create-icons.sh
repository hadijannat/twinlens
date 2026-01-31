#!/bin/bash
set -euo pipefail

ICON_SVG="icon.svg"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert is required to generate PNGs from ${ICON_SVG}" >&2
  exit 1
fi

rsvg-convert -w 16 -h 16 "${ICON_SVG}" -o icon-16.png
rsvg-convert -w 48 -h 48 "${ICON_SVG}" -o icon-48.png
rsvg-convert -w 128 -h 128 "${ICON_SVG}" -o icon-128.png

echo "Icons generated from ${ICON_SVG}"
