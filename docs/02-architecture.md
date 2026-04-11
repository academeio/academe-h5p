# Academe H5P — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION                        │
│                                                              │
│  Neon DB (manifests) → Type Selector → AI Generation         │
│       ↓                    ↓                ↓                │
│  Topic content        Competency      Subagent (text)        │
│  + images             verb analysis   Gemini (images)        │
│                            ↓                ↓                │
│                    type-selection-plan    content.json        │
│                                              ↓               │
│                                    h5p/activities/{slug}/    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     HOSTING & DELIVERY                       │
│                                                              │
│  Option A: Cloudflare Pages (current)                        │
│    h5p-standalone player → academe-learn.pages.dev           │
│    Works for: Blanks, Crossword, Flashcards, Summary         │
│    Broken for: DragText, DragQuestion, ImageSequencing       │
│                                                              │
│  Option B: H5P Server on Railway (target)                    │
│    @lumieducation/h5p-server → h5p.cbme.in                   │
│    Works for: ALL types (proper dependency loading)          │
│    Status: scaffolded, text types verified                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                     CANVAS LMS INTEGRATION                   │
│                                                              │
│  Tier 1 (simple): <iframe> embedded in Canvas page HTML      │
│  Tier 2+ (complex): ExternalUrl module item (new tab)        │
│                                                              │
│  Canvas courses: MGMCRI=834, SSSMCRI=837, Santosh=838       │
│  Iframe embed confirmed working (CSP allows our domains)     │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
academe-h5p/
├── activities/          # 215 H5P content packages
│   └── {slug}/
│       ├── h5p.json           # metadata + dependencies
│       ├── content.json       # symlink → content/content.json
│       └── content/
│           └── content.json   # H5P content parameters
├── libs/                # 84 H5P runtime libraries
│   └── {MachineName-Major.Minor}/
│       ├── library.json
│       ├── *.js, *.css
│       └── fonts/, images/
├── server/              # @lumieducation/h5p-server
│   ├── server.mjs
│   ├── package.json
│   └── node_modules/
├── scripts/             # Generation pipelines
│   ├── h5p-type-selector.mjs    # Competency → type mapping
│   ├── h5p-generate-tier1.mjs   # Extract/apply for text types
│   ├── h5p-apply-tier1.mjs      # Batch results → H5P files
│   ├── h5p-precis.mjs           # Image Hotspots/DragQuestion
│   └── gen-embryo-sequence.mjs  # Tier 2 ImageSequencing PoC
├── preview/             # Viewer page template
│   └── h5p-host.mjs
├── output/
│   ├── extract/         # Batch task files
│   └── orchestration/   # items.jsonl for Session A
└── docs/                # This documentation
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @lumieducation/h5p-server | 10.0.4 | H5P player engine |
| @lumieducation/h5p-express | 10.0.5 | Express routes |
| h5p-standalone | 3.8.2 | Client-side player (CDN) |
| h5p-php-library | latest | H5P core JS/CSS files |
| @google/genai | latest | Gemini image generation |

## Image Pipeline

Custom images generated for Tier 2+ activities:
1. Subagent designs the activity (stages, prompts)
2. Gemini (`gemini-2.5-flash-image`) generates PNGs
3. Upload to R2 (`academe-assets` bucket)
4. Public URL: `https://assets.academe.org.in/h5p/...`

Hard rule: NO hibbertmed images. All images purpose-built for each activity.
