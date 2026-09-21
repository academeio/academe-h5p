#!/usr/bin/env bash
# Fails if any Academe customisation to the H5P player libraries is missing.
# Run from anywhere; checks ../../libs relative to this script.
set -u
L="$(cd "$(dirname "$0")/../../libs" && pwd)"
fail=0
check() { if eval "$2" >/dev/null 2>&1; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
check "H5P.Video-1.7 exists"                    "test -d '$L/H5P.Video-1.7'"
check "Video 1.7 html5.js has hls.js wiring"     "grep -q 'self.setAudioTrack = function' '$L/H5P.Video-1.7/scripts/html5.js'"
check "Video 1.7 vendors hls.min.js"             "test -s '$L/H5P.Video-1.7/scripts/vendor/hls.min.js'"
check "Video 1.7 library.json preloads hls.js"   "grep -q 'scripts/vendor/hls.min.js' '$L/H5P.Video-1.7/library.json'"
check "IV 1.28 audio-picker.js present"          "test -s '$L/H5P.InteractiveVideo-1.28/scripts/audio-picker.js'"
check "IV 1.28 library.json preloads picker"     "grep -q 'scripts/audio-picker.js' '$L/H5P.InteractiveVideo-1.28/library.json'"
check "IV 1.28 caption CSS override"             "grep -q 'academe-caption-override' '$L/H5P.InteractiveVideo-1.28/dist/h5p-interactive-video.css'"
check "jQuery.ui global shim"                    "grep -q 'H5P jQuery.ui shim' '$L/jQuery.ui-1.10/js/jquery-ui.min.js'"
exit $fail
