# Academe H5P — Documentation Index

> Open-source H5P adapted for medical education (CBME)

## Documents

| # | Document | Description |
|---|----------|-------------|
| 00 | [Index](00-index.md) | This file — maps all docs |
| 01 | [Roadmap](01-roadmap.md) | Feature roadmap and release plan |
| 02 | [Architecture](02-architecture.md) | System architecture and data flow |
| 03 | [Content Type Reference](03-content-type-reference.md) | Schema docs for all 25 H5P types |
| 04 | [Progress Report](04-progress-report.md) | What's built, what's working, what's next |
| 05 | [Competency Mapping](05-competency-mapping.md) | NMC competency → H5P type selection rules |

## Quick Links

- **Activities**: `activities/` — 215 H5P content packages
- **Libraries**: `libs/` — 84 H5P runtime libraries
- **Server**: `server/` — @lumieducation/h5p-server (player-only)
- **Scripts**: `scripts/` — generation and orchestration pipelines
- **Preview**: https://academe-learn.pages.dev/h5p/viewer/

## Relationship to Parent Project

Academe H5P is a sub-project of [canvascbme](https://github.com/academeio/canvascbme). It generates interactive H5P activities from capsule manifests and serves them for embedding in Canvas LMS pages.

Data flows:
```
canvascbme manifests (Neon DB)
  → academe-h5p/scripts (type selection + content generation)
  → academe-h5p/activities (H5P content packages)
  → academe-h5p/server (player server on Railway)
  → Canvas pages (iframe embed or ExternalUrl)
```
