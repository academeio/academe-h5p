# Academe H5P Server — Setup Notes

## Status: WIP — jQuery.ui scope issue not yet resolved

## What works
- Server starts, finds all 215 activities
- `H5PPlayer.render()` produces complete HTML with proper dependency tree
- Text-only types (Blanks, Crossword, Flashcards) render correctly
- URL routing works (`/play/{slug}`, `/core/...`, `/libraries/...`)

## What doesn't work yet
- **jQuery.ui scope**: ImageSequencing/DragText/DragQuestion show `$.tooltip is not a function`
  - jQuery.ui JS (255KB) loads successfully
  - But tooltip/draggable/sortable don't attach to the H5P jQuery instance
  - Root cause: H5P core loads its own jQuery, then library JS files load
    but jQuery.ui may attach to window.jQuery before H5P replaces it
- **External image URLs**: content.json with CDN URLs (assets.academe.org.in)
  are not handled by FileContentStorage — images need to be local or
  the content.json needs to use relative paths

## Architecture
- Express server on port 3200
- @lumieducation/h5p-server 10.0.4 (player only, no editor)
- H5P core files: h5p-php-library (cloned from GitHub)
- Content: ../h5p/activities/{slug}/ (symlinked content.json)
- Libraries: ../h5p/libs/ (84 libraries)

## Next steps
1. Debug jQuery.ui scope issue — may need to check H5P core version compatibility
   or add jQuery.ui to the H5P core bundle
2. Handle external image URLs in content (proxy or rewrite)
3. Deploy to Railway at h5p.cbme.in
4. Add contentUserData routes (state persistence)
5. Wire up xAPI for grade passback
