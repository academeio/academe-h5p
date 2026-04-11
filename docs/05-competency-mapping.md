# Academe H5P — Competency-to-Type Mapping

## Mapping Rules

The type selector (`scripts/h5p-type-selector.mjs`) analyses NMC competency text to select the best H5P types per topic.

### Verb Patterns (priority order)

| Pattern | Verb Examples | H5P Types | Rationale |
|---------|--------------|-----------|-----------|
| identify_describe | "Identify & describe", "Describe & identify" | ImageHotspots, DragQuestion, ImageMultipleHotspotQuestion, MarkTheWords | Visual identification + labeling |
| demonstrate | "Demonstrate", "Show how" | DragQuestion, SortParagraphs, ImageHotspots | Active skill demonstration |
| explain_basis | "Explain anatomical basis", "Explain mechanism" | Summary, DragText, TrueFalse | Understanding + reasoning |
| explain | "Explain" (general) | Summary, TrueFalse, DragText, Flashcards | Conceptual understanding |
| microanatomical | "microanatom", "histolog", "microscop" | ImageHotspots, ImageJuxtaposition, MemoryGame, Flashcards | Image comparison + identification |
| development | "development", "embryolog", "formation & fate" | SortParagraphs, ImageSequencing, Timeline, DragText | Sequential ordering + timeline |
| draw | "Draw", "sketch", "chart" | DragQuestion, SortParagraphs | Constructive labeling |
| identify_only | "Identify" (without describe) | ImageMultipleHotspotQuestion, ImageHotspotQuestion, MarkTheWords | Find/locate structures |
| describe_recall | "Describe" (general) | DragText, Blanks, Flashcards, Crossword | Knowledge recall + terminology |
| enumerate | "Enumerate", "list", "classify" | Crossword, MarkTheWords, Flashcards, DragText | Terminology + categorization |

### Subject Modifiers

| Subject | Boosted Types | Always Include |
|---------|--------------|----------------|
| AN (Anatomy) | ImageHotspots, DragQuestion, ImageMultipleHotspotQuestion | Crossword |
| PY (Physiology) | DragText, SortParagraphs, Summary | Flashcards |
| BI (Biochemistry) | SortParagraphs, DragText, ImageSequencing | Crossword |

### Domain/Level Adjustments

- K/S domain → +0.5 to image-based types (ImageHotspots, DragQuestion, ImageMultipleHotspotQuestion)
- SH level → +0.3 to graded/skill types (DragQuestion, SortParagraphs, ImageMultipleHotspotQuestion)

### Selection Algorithm

1. Score each H5P type based on verb pattern matches across all competencies in the topic
2. Apply subject-level boosts
3. Apply domain/level adjustments
4. Rank by score descending
5. Select top types ensuring tier diversity (max 2 from same tier, max 5 total)

### Output

Plan stored at `output/extract/type-selection-plan.json` — 105 topics with selected types and scores.

## Distribution (actual)

| Type | Topics Selected | % |
|------|----------------|---|
| Blanks (was DragText) | 74 | 72% |
| Crossword | 50 | 49% |
| SortParagraphs | 34 | 33% |
| Flashcards | 27 | 26% |
| ImageSequencing | 12 | 12% |
| MarkTheWords | 8 | 8% |
| Timeline | 8 | 8% |
| Summary | 7 | 7% |
| ImageJuxtaposition | 6 | 6% |
| MemoryGame | 3 | 3% |
