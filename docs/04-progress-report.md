# Academe H5P — Progress Report

> Last updated: 11-04-2026

## Summary

| Metric | Value |
|--------|-------|
| H5P libraries installed | 84 |
| Content types supported | 25 (runnable) |
| Activities generated | 215 |
| Topics covered | 103 (79 AN + 12 PY + 13 BI) |
| Activities per topic | ~2 (competency-selected types) |
| Preview site | academe-learn.pages.dev/h5p/viewer/ |
| Server | Scaffolded, not yet deployed |

## Activity Type Distribution

| Type | Count | Status |
|------|-------|--------|
| Fill in the Blanks | 74 | Working |
| Crossword | 50 | Working |
| Sort Paragraphs | 34 | Working (icon fix applied) |
| Flashcards | 27 | Working |
| Mark the Words | 8 | Working |
| Summary | 7 | Working |
| Image Hotspots | 13 | Working (legacy from Session 7) |
| Drag & Drop Labels | 1 | jQuery.ui broken |
| Drag the Words | 1 | jQuery.ui broken |
| Image Sequencing | 1 | PoC (images generated, jQuery.ui issue) |

## Working vs Blocked

**Working (9 types, 213 activities):**
Blanks, Crossword, Flashcards, SortParagraphs, MarkTheWords, Summary, MultiChoice, TrueFalse, DialogCards

**Blocked by jQuery.ui scope (5 types):**
DragText, DragQuestion, ImageSequencing, ImagePair, MemoryGame
- Root cause: h5p-standalone and h5p-server both load jQuery.ui but it doesn't attach to the H5P-internal jQuery instance
- Impact: Any type needing $.draggable, $.sortable, or $.tooltip fails

## Timeline

| Date | Milestone |
|------|-----------|
| 11-04-2026 AM | Installed 25 H5P types, 84 libraries |
| 11-04-2026 AM | Built competency-driven type selector |
| 11-04-2026 PM | Tier 1 batch: 200 activities across 103 topics |
| 11-04-2026 PM | ImageSequencing PoC: 5 Gemini embryology images on R2 |
| 11-04-2026 PM | H5P server scaffolded with @lumieducation/h5p-server |
| 11-04-2026 PM | Canvas iframe embed confirmed working |
| 11-04-2026 PM | Academe H5P branding applied |

## Known Issues

1. **jQuery.ui scope** — blocks 5 content types. Needs investigation of H5P core jQuery loading order.
2. **External image URLs** — ImageSequencing uses CDN URLs in content.json but h5p-server expects local files.
3. **AdGuard blocks Neon** — `*.neon.tech` must be whitelisted in AdGuard DNS settings.
4. **FontAwesome alias** — H5P types use `H5PFontAwesome4` font-family name; requires compat CSS patch in FontAwesome-4.5 library.
