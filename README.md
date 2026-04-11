# Academe H5P

Open-source H5P interactive activities adapted for Competency-Based Medical Education (CBME).

Built on [H5P](https://h5p.org) — extends the open-source interactive content framework with intelligent competency-driven activity selection and AI-powered content generation for medical education.

## What is this?

Academe H5P generates interactive learning activities (crosswords, flashcards, fill-in-the-blanks, image sequencing, and more) from medical education content, automatically matched to NMC CBME competencies. Activities are served via an H5P player and embedded in Canvas LMS courses.

## Features

- **25 H5P content types** installed and ready
- **Competency-driven selection** — NMC competency verbs automatically mapped to best H5P type
- **AI content generation** — subagent-driven generation from capsule content (zero API cost on Max plan)
- **Custom image pipeline** — Gemini generates purpose-built medical diagrams for each activity
- **Canvas LMS integration** — iframe embed for simple types, ExternalUrl for complex types
- **Academe H5P branding** — consistent viewer template with type-specific badges

## Content Types

| Tier | Types | Status |
|------|-------|--------|
| Tier 1 (text) | Blanks, Crossword, Flashcards, SortParagraphs, MarkTheWords, Summary | Working |
| Tier 2 (image) | ImageSequencing, ImageJuxtaposition, Timeline, MemoryGame | PoC |
| Tier 3 (vision) | ImageHotspots, DragQuestion, FindMultipleHotspots | Planned |
| Tier 4 (complex) | BranchingScenario, GameMap, InteractiveVideo | Planned |

## Quick Start

```bash
# Preview existing activities
open https://academe-learn.pages.dev/h5p/viewer/

# Run type selector
node scripts/h5p-type-selector.mjs --subject AN

# Generate Tier 1 activities
node scripts/h5p-generate-tier1.mjs --subject AN --extract
# (run subagents to populate results)
node scripts/h5p-apply-tier1.mjs

# Start H5P server locally
cd server && npm install && node server.mjs
# Visit http://localhost:3200/play/{activity-slug}
```

## Documentation

See [docs/00-index.md](docs/00-index.md) for full documentation.

## Part of

[Academe Capsules](https://github.com/academeio/canvascbme) — CBME content engine for Canvas LMS.

## License

MIT
