# Academe customisations to the H5P player — DO NOT LOSE

We changed stock H5P libraries to add **multi-audio (language switching) and multi-language captions** to Interactive Videos.
**Replacing any of these libraries with a stock copy from the H5P hub or GitHub silently removes those features.** Nothing errors: the video still plays, but the audio-language picker disappears and HLS multi-audio stops working.

This folder is the recovery kit. Every file here was verified on 21-09-2026 to reproduce exactly what's in `libs/`.
Run `./verify.sh` after any library upgrade, and before deploying.

## What we changed

| # | Library | Change | Commit(s) | Recovery file |
|---|---|---|---|---|
| 1 | **H5P.Video-1.7** (our fork, made from stock **1.6.66**) | `scripts/html5.js`: when the source is an HLS playlist, attach hls.js, emit `audioTracks` / `audioTrack` events, add `getAudioTracks` / `setAudioTrack` / `getAudioTrack` and error recovery. Safari uses native HLS. | `82213bef` | `01-video-html5-hls.patch` (applies to stock 1.6.x `html5.js`) |
| 2 | H5P.Video-1.7 | `library.json`: version bumped to 1.7.0, and `scripts/vendor/hls.min.js` added to `preloadedJs` | `82213bef` | `02-video-library-json.patch` |
| 3 | H5P.Video-1.7 | `scripts/vendor/hls.min.js` = **hls.js 1.5.20** (unmodified, from npm) | `82213bef` | `npm pack hls.js@1.5.20` → `dist/hls.min.js` |
| 4 | **H5P.InteractiveVideo-1.28** | New `scripts/audio-picker.js`: the 🎧 "Audio language" chooser in the control bar. It listens for `audioTracks` from H5P.Video-1.7. | `82213bef`, `6702dec9` (centred icon) | `03-iv-audio-picker.js` (full file, ours) |
| 5 | H5P.InteractiveVideo-1.28 | `library.json`: `scripts/audio-picker.js` added to `preloadedJs` | `82213bef` | `03-iv-library-json.patch` |
| 6 | H5P.InteractiveVideo-1.28 | `dist/h5p-interactive-video.css`: compact WebVTT captions (`video::cue` 65 %, dark background) | `b1068a0f` | `04-iv-caption-css.patch` |
| 7 | **jQuery.ui-1.10** | 2-line shim that re-exposes `H5P.jQuery` as global `jQuery`, so jQuery UI attaches | `55280042` | `05-jqueryui-global-shim.patch` |

Related pieces outside `libs/` (already versioned with their own files, listed here for completeness):
- `preview/h5p-host.mjs`: host-page `video::cue` caption sizing (`ca46d89a`), plus the self-hosted h5p-standalone 3.8.2 runtime (`39064b7c`).
- `preview/_worker.js`: same-origin `/cc/*` proxy to R2 for the per-language caption files, with CORS and cache headers (`69310c79`, `927682bf`, `f5d1456c`).
- canvascbme `lib/h5p-iv.mjs`: declares `H5P.Video 1.7` in an IV's `h5p.json` whenever the IV has an HLS URL, and writes the per-language caption tracks into `content.json`.

The multiple caption tracks themselves are native Interactive Video `textTracks`. Our part is generating them, serving them through `/cc/`, and styling them.

## Upgrading safely

**H5P.Video (upstream 1.6.x patch release):** never download "1.7" from anywhere, because it only exists here.
1. Put the new stock 1.6.x in a scratch dir.
2. `patch -p0 scripts/html5.js < 01-video-html5-hls.patch`, then resolve any rejects by hand.
3. Apply `02-video-library-json.patch` (keep `majorVersion 1, minorVersion 7`, bump `patchVersion`) and copy in `scripts/vendor/hls.min.js`.
4. Replace `libs/H5P.Video-1.7` with the result. Run `./verify.sh`, then do one multi-audio IV smoke test in Chrome **and** Safari.

**hls.js:** replace `libs/H5P.Video-1.7/scripts/vendor/hls.min.js`, update the version in row 3 and in canvascbme `docs/34-open-source-inventory.md`, and run the same smoke test.

**H5P.InteractiveVideo (patch release, e.g. 1.28.35 → 1.28.37):**
1. Drop in the stock files.
2. Copy `03-iv-audio-picker.js` back to `scripts/audio-picker.js`.
3. Re-apply `03-iv-library-json.patch` and `04-iv-caption-css.patch` (`git apply`). If `dist/` was rebuilt upstream, re-add the two CSS lines by hand.
4. Run `./verify.sh`.

A new **minor** (e.g. 1.29) is a new directory. Apply the same steps there, then repoint the activities.

**jQuery.ui:** re-apply `05-jqueryui-global-shim.patch` after any replacement.

After any of these, refresh the recovery files from the new `libs/` (so the patches keep matching) and commit.

## Where copies live (backup)

- git: `academeio/academe-h5p` on GitHub, `main`. Every commit above was pushed (HEAD `908c4291` = origin/main on 21-09-2026).
- Deployed: each per-subject Pages site ships `libs/` (the live copy). (The R2/Hetzner off-site archive covers media assets. The code lives in git.)
