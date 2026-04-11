# Academe H5P — Roadmap

## Vision
Interactive medical education activities powered by H5P, intelligently matched to NMC CBME competencies and embedded in Canvas LMS courses.

## Phases

### Phase 1: Foundation (DONE — 11-04-2026)
- [x] Install 25 H5P content types (84 runtime libraries)
- [x] Build competency-driven type selector (verb analysis → H5P type)
- [x] Generate Tier 1 activities (text-only: Blanks, Crossword, Flashcards, SortParagraphs, MarkTheWords, Summary)
- [x] Deploy 200 activities to Cloudflare Pages preview
- [x] Confirm Canvas iframe embedding works
- [x] Brand as "Academe H5P"
- [x] Create viewer index page

### Phase 2: Server Infrastructure (IN PROGRESS)
- [x] Scaffold @lumieducation/h5p-server (player-only)
- [x] Text-only types render correctly on server
- [ ] Fix jQuery.ui scope issue for drag/sequence types
- [ ] Deploy to Railway at h5p.cbme.in
- [ ] Add contentUserData routes for state persistence
- [ ] Wire up xAPI event reporting

### Phase 3: Tier 2 — Image-Based Activities
- [x] ImageSequencing PoC (embryology, 5 Gemini-generated images)
- [ ] Batch ImageSequencing for 12 topics
- [ ] ImageJuxtaposition for 6 histology topics
- [ ] Timeline for 8 embryology/development topics
- [ ] MemoryGame for 3 matching topics
- [ ] Custom image generation pipeline (Gemini + R2)

### Phase 4: Tier 3 — Vision AI Activities
- [ ] ImageHotspots with vision-analysed coordinates
- [ ] DragQuestion (label diagrams) with vision AI
- [ ] ImageMultipleHotspotQuestion (find structures)
- [ ] ImageHotspotQuestion (single find)

### Phase 5: Tier 4 — Complex Activities
- [ ] BranchingScenario for PBL cases
- [ ] GameMap for gamified anatomy journeys
- [ ] Column containers (combine Tier 1-3 types)
- [ ] QuestionSet (mixed assessment sets)
- [ ] CoursePresentation (interactive slides)
- [ ] InteractiveVideo (annotated procedures — needs video source)

### Phase 6: Canvas Integration
- [ ] Deploy ExternalUrl items to Canvas courses (834, 837, 838)
- [ ] Embed Tier 1 iframes in manifest HTML pages
- [ ] xAPI grade passback via LTI
- [ ] Student progress tracking

### Phase 7: Scale & Quality
- [ ] QA pipeline for generated content accuracy
- [ ] A/B test H5P engagement vs plain pages
- [ ] Expand to PY and BI subjects fully
- [ ] Faculty review workflow
- [ ] Upstream library update tracking

## Content Type Priority

| Priority | Types | Status |
|----------|-------|--------|
| P0 | Blanks, Crossword, Flashcards | Working |
| P0 | SortParagraphs, MarkTheWords, Summary | Working |
| P1 | ImageSequencing, Timeline | PoC done |
| P1 | ImageJuxtaposition, MemoryGame | Not started |
| P2 | ImageHotspots, DragQuestion | jQuery.ui blocked |
| P2 | BranchingScenario, GameMap | Design needed |
| P3 | InteractiveVideo, CoursePresentation | Needs video/slides |
