# H5P Content Type Reference — CBME Pipeline

> 25 runnable types installed, 84 total libraries.
> Generated: 11-04-2026

## Quick Reference: Auto-Generation Feasibility

| Tier | Types | Generation Approach |
|------|-------|-------------------|
| **Tier 1: Text-only** | DragText, MarkTheWords, Blanks, Crossword, Flashcards, DialogCards, Summary, SortParagraphs, TrueFalse, MultiChoice | AI generates structured text. No images/coordinates needed. |
| **Tier 2: Image + metadata** | ImageSequencing, ImagePair, MemoryGame, ImageJuxtaposition, Timeline | Existing manifest images + AI-generated metadata. No coordinates. |
| **Tier 3: Image + coordinates** | ImageHotspots, ImageHotspotQuestion, ImageMultipleHotspotQuestion, DragQuestion | Vision AI analyses image → outputs x/y coordinates. |
| **Tier 4: Complex/composite** | BranchingScenario, GameMap, Column, QuestionSet, CoursePresentation, InteractiveVideo | AI generates structure; embeds Tier 1-3 types as sub-content. |

---

## Group 1: Image-Based Types

### 1. H5P.ImageHotspots (Exploratory)
- **Machine name:** `H5P.ImageHotspots` v1.10
- **Student does:** Taps hotspot icons on a diagram → popup shows educational content
- **Graded:** No — purely exploratory
- **content.json:**
  ```json
  {
    "image": { "path": "url", "width": 1024, "height": 1024, "alt": "..." },
    "iconType": "icon", "icon": "plus", "color": "#7c3aed",
    "hotspots": [{
      "position": { "x": 25.5, "y": 30.0 },
      "header": "Structure Name",
      "content": [{ "library": "H5P.Text 1.1", "params": { "text": "<p>...</p>" } }]
    }]
  }
  ```
- **Auto-gen input:** 1 image + vision AI → 4-5 hotspot positions + educational text
- **CBME use:** "Describe boundaries and contents" competencies (K domain)

### 2. H5P.ImageMultipleHotspotQuestion (Graded)
- **Machine name:** `H5P.ImageMultipleHotspotQuestion` v1.0
- **Student does:** Clicks on image to find ALL correct hotspot regions. Gets "found 2 of 4" feedback. Incorrect clicks give wrong feedback.
- **Graded:** Yes — score = correct hotspots found / total correct
- **content.json:**
  ```json
  {
    "imageMultipleHotspotQuestion": {
      "backgroundImageSettings": {
        "questionTitle": "Find the muscles",
        "backgroundImage": { "path": "url" }
      },
      "hotspotSettings": {
        "taskDescription": "Click on all flexor muscles",
        "hotspotName": "muscles",
        "numberHotspots": 4,
        "hotspot": [{
          "userSettings": { "correct": true, "feedbackText": "Correct!" },
          "computedSettings": { "x": 30, "y": 40, "width": 15, "height": 20, "figure": "rectangle" }
        }]
      }
    }
  }
  ```
- **Auto-gen input:** 1 image + vision AI → bounding boxes (x,y,w,h %) + correct/incorrect flags + feedback
- **CBME use:** "Identify" competencies — "Identify all the branches of the axillary artery"

### 3. H5P.ImageHotspotQuestion (Single-answer, Graded)
- **Machine name:** `H5P.ImageHotspotQuestion` v1.8
- **Student does:** Clicks ONCE on an image to find ONE correct region. Pass/fail.
- **Graded:** Yes — max score always 1
- **content.json:** Same structure as ImageMultipleHotspotQuestion but only one click allowed
- **Auto-gen input:** 1 image + vision AI → correct region bbox + 2-3 distractor regions
- **CBME use:** "Point to X on this diagram" — quick identification checks

### 4. H5P.ImagePair (Graded)
- **Machine name:** `H5P.ImagePair` v1.4
- **Student does:** Two columns of shuffled images. Drag/click to match pairs.
- **Graded:** Yes — score = correct pairs / total pairs
- **content.json:**
  ```json
  {
    "taskDescription": "Match the structures",
    "cards": [{
      "image": { "path": "gross-anatomy.jpg" },
      "imageAlt": "Biceps gross anatomy",
      "match": { "path": "histology-slide.jpg" },
      "matchAlt": "Striated muscle histology"
    }]
  }
  ```
- **Auto-gen input:** N pairs of related images (same-size, 1:1 ratio). No coordinates needed.
- **CBME use:** Match histology → gross anatomy, match nerve → innervation territory

### 5. H5P.ImageSequencing (Graded)
- **Machine name:** `H5P.ImageSequencing` v1.1
- **Student does:** Shuffled image cards → drag into correct chronological/logical order
- **Graded:** Yes — score = cards in correct position / total cards
- **content.json:**
  ```json
  {
    "taskDescription": "Arrange in developmental order",
    "sequenceImages": [
      { "image": { "path": "stage1.jpg" }, "imageDescription": "Primitive heart tube" },
      { "image": { "path": "stage2.jpg" }, "imageDescription": "Cardiac loop" },
      { "image": { "path": "stage3.jpg" }, "imageDescription": "Four-chambered heart" }
    ]
  }
  ```
  **Note:** Array order = correct order. Library shuffles at runtime.
- **Auto-gen input:** 3+ images in correct sequence + descriptions. No coordinates.
- **CBME use:** Embryological stages, metabolic pathway steps, surgical procedure sequences

### 6. H5P.ImageJuxtaposition (Exploratory)
- **Machine name:** `H5P.ImageJuxtaposition` v1.5
- **Student does:** Draggable slider reveals before/after image comparison
- **Graded:** No — visualization tool only
- **content.json:**
  ```json
  {
    "taskDescription": "<p>Compare normal vs pathological</p>",
    "imageBefore": {
      "imageBefore": { "library": "H5P.Image 1.1", "params": { "file": { "path": "normal.jpg" }, "alt": "Normal" } },
      "labelBefore": "Normal"
    },
    "imageAfter": {
      "imageAfter": { "library": "H5P.Image 1.1", "params": { "file": { "path": "pathological.jpg" }, "alt": "Abnormal" } },
      "labelAfter": "Pathological"
    },
    "behavior": { "startingPosition": 50, "sliderOrientation": "horizontal" }
  }
  ```
- **Auto-gen input:** 2 same-dimension images + 2 labels
- **CBME use:** Normal vs pathological X-ray/CT, pre/post treatment, H&E vs special stain

---

## Group 2: Text/Labeling Types

### 7. H5P.DragQuestion (Graded — Image Labels)
- **Machine name:** `H5P.DragQuestion` v1.15
- **Student does:** Drags text labels onto correct positions on a background image
- **Graded:** Yes — per-label scoring with optional penalties
- **content.json:** See earlier analysis — elements[] with x/y %, dropZones[] with x/y %, correctElements[] mapping
- **Auto-gen input:** 1 image + vision AI → structure positions + label names
- **CBME use:** "Identify and describe" competencies — label anatomy diagrams

### 8. H5P.DragText (Graded — Text Gaps)
- **Machine name:** `H5P.DragText` v1.10
- **Student does:** Paragraph with gaps → drag correct words into blanks. Distractors available.
- **Graded:** Yes — score per correctly placed word
- **content.json:**
  ```json
  {
    "taskDescription": "Drag the words into the correct boxes",
    "textField": "The *brachial plexus* is formed by the ventral rami of *C5-T1*. The *axillary nerve* supplies the deltoid muscle.",
    "distractors": "*femoral nerve* *L2-L4*"
  }
  ```
  **Format:** `*word*` marks draggable. `*word:hint*` adds a tip. Distractors use same `*word*` format.
- **Auto-gen input:** AI writes paragraph with key terms asterisk-marked + generates distractors. **Extremely easy.**
- **CBME use:** "Describe" competencies — clinical anatomy descriptions with key terms removed

### 9. H5P.Blanks (Graded — Type-in Gaps)
- **Machine name:** `H5P.Blanks` v1.14
- **Student does:** Text with blank fields → types correct word(s). Supports multiple correct answers per blank.
- **Graded:** Yes — score per correctly filled blank
- **content.json:**
  ```json
  {
    "text": "The *brachial/brachial plexus* is formed by ventral rami of *C5-T1*.",
    "behaviour": { "caseSensitive": false, "showSolutionsRequiresInput": true }
  }
  ```
  **Format:** `*answer*` or `*answer1/answer2*` for alternatives
- **Auto-gen input:** AI writes text with blanked key terms. **Trivially easy.**
- **CBME use:** "Describe" and "Explain" competencies — recall key anatomical facts

### 10. H5P.MarkTheWords (Graded — Word Selection)
- **Machine name:** `H5P.MarkTheWords` v1.11
- **Student does:** Reads paragraph → clicks/taps on correct words. Wrong clicks penalized.
- **Graded:** Yes — score = correct words selected - incorrect selections (min 0)
- **content.json:**
  ```json
  {
    "taskDescription": "Click on all anatomical structures mentioned",
    "textField": "<p>The *brachial* plexus gives rise to the *musculocutaneous*, *median*, *ulnar*, *radial*, and *axillary* nerves.</p>"
  }
  ```
  **Format:** `*word*` marks correct words to select. Single words only, not phrases.
- **Auto-gen input:** AI writes paragraph with key terms asterisk-marked. **Trivially easy.**
- **CBME use:** "Identify" key structures/terms in clinical descriptions

### 11. H5P.SortParagraphs (Graded — Ordering)
- **Machine name:** `H5P.SortParagraphs` v0.11
- **Student does:** Shuffled text paragraphs → drag into correct logical/chronological order
- **Graded:** Yes — scoring modes: one-point-per-paragraph OR all-or-nothing per correct position
- **content.json:**
  ```json
  {
    "taskDescription": "Arrange the steps in the correct order",
    "paragraphs": [
      { "text": "Step 1: Patient presents with chest pain" },
      { "text": "Step 2: Order ECG and cardiac enzymes" },
      { "text": "Step 3: Administer aspirin and nitroglycerin" }
    ]
  }
  ```
  **Note:** Array order = correct order. Shuffled at runtime.
- **Auto-gen input:** Ordered list of text paragraphs. **Very easy.**
- **CBME use:** "Demonstrate" procedural knowledge — order clinical steps, metabolic pathways

---

## Group 3: Cards/Memory/Word Games

### 12. H5P.Flashcards (Graded)
- **Machine name:** `H5P.Flashcards` v1.7
- **Student does:** Sees image and/or question → types answer → gets immediate correct/incorrect feedback
- **Graded:** Yes — score = correctly answered cards / total
- **content.json:**
  ```json
  {
    "description": "Medical terminology flashcards",
    "cards": [{
      "text": "What muscle is the primary flexor of the forearm?",
      "answer": "Biceps brachii/brachialis",
      "image": { "path": "biceps.jpg" },
      "tip": { "tip": "<p>Two-headed muscle on anterior arm</p>" }
    }]
  }
  ```
  **Note:** `answer` supports alternatives with `/` separator
- **Auto-gen input:** List of Q&A pairs with optional images + tips. **Very easy.**
- **CBME use:** Medical terminology, drug mechanisms, structure-function recall

### 13. H5P.Dialogcards (Exploratory)
- **Machine name:** `H5P.Dialogcards` v1.9
- **Student does:** Flip cards — front has question/image, back has answer. Self-paced review. Optionally can be "repetition mode" (Leitner system).
- **Graded:** No — self-assessment only (student self-rates "got it" / "not yet")
- **content.json:**
  ```json
  {
    "description": "Review key anatomy concepts",
    "dialogs": [{
      "text": "What passes through the carpal tunnel?",
      "answer": "Median nerve + 4 FDS tendons + 4 FDP tendons",
      "image": { "path": "carpal-tunnel.jpg" },
      "tips": { "front": "Think of 1+4+4" }
    }],
    "behaviour": { "enableRetry": true, "scaleTextToFitImage": true }
  }
  ```
- **Auto-gen input:** List of front/back text pairs + optional images. **Very easy.**
- **CBME use:** Spaced repetition review of key concepts, mnemonics

### 14. H5P.MemoryGame (Graded)
- **Machine name:** `H5P.MemoryGame` v1.3
- **Student does:** Classic memory card game — flip two cards, find matching pairs. Timer + move counter.
- **Graded:** Yes — reports number of cards turned (lower = better)
- **content.json:**
  ```json
  {
    "cards": [{
      "image": { "path": "structure.jpg" },
      "imageAlt": "Deltoid muscle",
      "match": { "path": "function.jpg" },
      "matchAlt": "Shoulder abduction",
      "description": "Deltoid - abducts the shoulder"
    }],
    "behaviour": { "useGrid": true, "allowRetry": true }
  }
  ```
  If `match` is omitted, both cards show the same image.
- **Auto-gen input:** N pairs of images OR N image+match image pairs. **Easy with existing images.**
- **CBME use:** Match muscle → action, nerve → territory, enzyme → pathway

### 15. H5P.Crossword (Graded)
- **Machine name:** `H5P.Crossword` v0.5
- **Student does:** Traditional crossword puzzle — reads clues, types answers into grid
- **Graded:** Yes — score = correctly filled words / total words
- **content.json:**
  ```json
  {
    "taskDescription": "<p>Complete the crossword</p>",
    "words": [
      { "clue": "Largest artery in the body", "answer": "AORTA" },
      { "clue": "Nerve that supplies the diaphragm", "answer": "PHRENIC" },
      { "clue": "Bone of the upper arm", "answer": "HUMERUS" }
    ],
    "behaviour": { "enableRetry": true, "enableSolutionsButton": true }
  }
  ```
  **Note:** Grid layout is auto-computed from answers. No coordinates needed.
- **Auto-gen input:** List of clue-answer pairs (min 2). **Trivially easy to generate with AI.**
- **CBME use:** Medical terminology reinforcement, anatomy vocabulary

---

## Group 4: Assessment Types

### 16. H5P.MultiChoice (Graded)
- **Machine name:** `H5P.MultiChoice` v1.16
- **Student does:** Sees question with answer options (radio buttons or checkboxes). Per-option feedback + tips.
- **Graded:** Yes — per-option scoring or single-point
- **content.json:**
  ```json
  {
    "question": "<p>Which ligament prevents anterior displacement of the tibia?</p>",
    "answers": [
      { "text": "<p>ACL</p>", "correct": true, "tipsAndFeedback": { "chosenFeedback": "Correct!" } },
      { "text": "<p>PCL</p>", "correct": false, "tipsAndFeedback": { "chosenFeedback": "PCL prevents posterior displacement" } }
    ],
    "behaviour": { "type": "auto", "singlePoint": true, "randomAnswers": true }
  }
  ```
- **Auto-gen input:** Question + options + correct flags + feedback. **Trivially easy.**
- **CBME use:** Quick knowledge checks within H5P containers (Column, QuestionSet)

### 17. H5P.TrueFalse (Graded)
- **Machine name:** `H5P.TrueFalse` v1.8
- **Student does:** Reads a statement, clicks True or False. Immediate feedback.
- **Graded:** Yes — always 0 or 1 point
- **content.json:**
  ```json
  {
    "question": "<p>The left recurrent laryngeal nerve loops around the aortic arch.</p>",
    "correct": "true",
    "behaviour": { "feedbackOnCorrect": "Correct!", "feedbackOnWrong": "The right loops around the subclavian." }
  }
  ```
- **Auto-gen input:** Statement + true/false + feedback. **Simplest H5P type to generate.**
- **CBME use:** Quick concept checks, fact verification

### 18. H5P.Summary (Graded)
- **Machine name:** `H5P.Summary` v1.10
- **Student does:** Shown sets of statements sequentially. Must select the correct one from each set. Correct picks build a growing summary. Wrong picks marked, student retries.
- **Graded:** Yes — 1 point per set, penalty for wrong attempts
- **content.json:**
  ```json
  {
    "intro": "Choose the correct statement.",
    "summaries": [
      { "summary": [
        "The brachial plexus is formed by ventral rami of C5-T1",
        "The brachial plexus is formed by dorsal rami of C3-C7",
        "The brachial plexus originates from the sacral plexus"
      ]},
      { "summary": [
        "The upper trunk is formed by C5 and C6",
        "The upper trunk is formed by C8 and T1"
      ]}
    ]
  }
  ```
  **Note:** First statement in each set is always the correct one.
- **Auto-gen input:** Key summary statements + 2-3 distractors per statement. **Very easy.**
- **CBME use:** End-of-topic reinforcement — student builds a summary of key learning points

### 19. H5P.QuestionSet (Container, Graded)
- **Machine name:** `H5P.QuestionSet` v1.20
- **Student does:** Sequence of mixed question types with progress indicator. Intro page → questions → results.
- **Graded:** Yes — aggregated scores from all child questions, pass/fail percentage
- **content.json:**
  ```json
  {
    "introPage": { "showIntroPage": true, "title": "Self-Assessment Quiz" },
    "questions": [
      { "library": "H5P.MultiChoice 1.16", "params": { ... } },
      { "library": "H5P.TrueFalse 1.8", "params": { ... } },
      { "library": "H5P.DragText 1.10", "params": { ... } }
    ],
    "passPercentage": 60,
    "randomQuestions": true,
    "poolSize": 7
  }
  ```
  Supports: MultiChoice, TrueFalse, DragQuestion, Blanks, MarkTheWords, DragText, Essay
- **Auto-gen input:** Child questions (already generatable) + metadata. **Easy container.**
- **CBME use:** Combined assessment mixing different interaction types per topic

---

## Group 5: Complex/Container Types

### 20. H5P.BranchingScenario (Complex, Graded)
- **Machine name:** `H5P.BranchingScenario` v1.8
- **Student does:** Navigate a decision tree — each node shows content + choices that branch to different paths. Choose-your-own-adventure format. Different paths lead to different endings with different scores.
- **Graded:** Configurable — static score per end screen, dynamic from interactions, or unscored
- **content.json structure:**
  ```json
  {
    "branchingScenario": {
      "startScreen": { "startScreenTitle": "Clinical Case", "startScreenSubtitle": "..." },
      "content": [
        {
          "type": { "library": "H5P.AdvancedText 1.1", "params": { "text": "<p>Case vignette...</p>" } },
          "nextContentId": 1,
          "showContentTitle": true
        },
        {
          "type": { "library": "H5P.BranchingQuestion 1.0", "params": {
            "branchingQuestion": {
              "question": "<p>What investigation do you order first?</p>",
              "alternatives": [
                { "text": "ECG", "nextContentId": 2 },
                { "text": "Chest X-ray", "nextContentId": 4 },
                { "text": "Send home", "nextContentId": -1, "feedback": { "endScreenScore": 0 } }
              ]
            }
          }},
          "nextContentId": -1
        }
      ],
      "endScreens": [
        { "endScreenTitle": "Excellent!", "endScreenScore": 10 },
        { "endScreenTitle": "Suboptimal", "endScreenScore": 5 }
      ],
      "scoringOptionGroup": { "scoringOption": "static-end-score" }
    }
  }
  ```
  **Key:** `content[]` is a flat array of nodes. `nextContentId` = index in the array (-1 = end). BranchingQuestion nodes have `alternatives[]` each pointing to different `nextContentId`.
- **Auto-gen input:** Clinical scenario + decision tree (nodes + edges + content per node + end scores). **Complex but high-value for PBL.**
- **CBME use:** **PBL clinical decision trees** — "Patient presents with X, you choose to..."

### 21. H5P.InteractiveVideo (Complex, Graded)
- **Machine name:** `H5P.InteractiveVideo` v1.26
- **Student does:** Watches video with embedded interactions at specific timestamps (quizzes, hotspots, text)
- **content.json:** Video source + interactions[] each with timestamp + H5P sub-content
- **CBME use:** Annotated surgical/clinical procedure videos (future — needs video source)

### 22. H5P.GameMap (Complex, Graded)
- **Machine name:** `H5P.GameMap` v1.5
- **Student does:** Navigate a visual map with stages (nodes). Each stage contains an exercise. Stages unlock based on progress/score.
- **content.json:** Background image + elements[] (stages with x/y positions) + paths[] (connections) + contentsList[] (embedded H5P per stage)
- **Auto-gen input:** Map background + node positions + embedded content per stage. **Most complex type.**
- **CBME use:** Gamified anatomy learning journey — "Explore the upper limb" with progressive stages

### 23. H5P.Column (Container)
- **Machine name:** `H5P.Column` v1.18
- **Student does:** Scrolls through stacked content items (any H5P types vertically arranged)
- **content.json:** `content[]` each a library reference to any H5P type
- **CBME use:** **Essential container** — combine exploration + assessment in one capsule

### 24. H5P.CoursePresentation (Container, Graded)
- **Machine name:** `H5P.CoursePresentation` v1.25
- **Student does:** Interactive slide deck with embedded questions, images, text on each slide
- **CBME use:** Interactive lecture slides with embedded self-checks

### 25. H5P.Timeline (Exploratory)
- **Machine name:** `H5P.Timeline` v1.1
- **Student does:** Navigates a horizontal timeline with events. Each event has headline, text, and optional media (YouTube, images, Wikipedia links).
- **Graded:** No — purely informational/exploratory
- **content.json:**
  ```json
  {
    "timeline": {
      "headline": "History of Anatomy",
      "text": "<p>Key milestones in anatomical discovery</p>",
      "date": [
        {
          "startDate": "1543",
          "headline": "De Humani Corporis Fabrica",
          "text": "<p>Vesalius publishes the first comprehensive anatomy textbook</p>",
          "asset": { "media": "https://en.wikipedia.org/wiki/De_Humani_Corporis_Fabrica" }
        },
        {
          "startDate": "1628",
          "headline": "Blood Circulation Discovered",
          "text": "<p>William Harvey describes the circulatory system</p>"
        }
      ],
      "era": [
        { "startDate": "1500", "endDate": "1700", "headline": "Renaissance Anatomy" }
      ]
    }
  }
  ```
  **Date format:** "YYYY,MM,DD" — minimum year required, month/day optional.
- **Auto-gen input:** Chronological events with dates + descriptions. **Very easy.**
- **CBME use:** Embryological timelines, disease progression stages, drug discovery history

---

## Content Markup Cheat Sheet

| Type | Markup Format | Example |
|------|--------------|---------|
| DragText | `*word*` = draggable, `*word:tip*` = with tip | `The *brachial:palpated for BP* artery...` |
| Blanks | `*answer*` or `*alt1/alt2:hint*` | `The *sinoatrial/SA* node...` |
| MarkTheWords | `*word*` = correct word to click | `The *vagus* nerve innervates...` |
| Crossword | `clue` + `answer` pairs | `{ clue: "Largest artery", answer: "AORTA" }` |

## Auto-Generation Feasibility Matrix

| Type | Input Needed | Feasibility | Graded? |
|------|-------------|-------------|---------|
| DragText | Text + key terms | ★★★★★ | Yes |
| Blanks | Text + key terms | ★★★★★ | Yes |
| MarkTheWords | Text + target words | ★★★★★ | Yes |
| TrueFalse | Statement + T/F | ★★★★★ | Yes |
| Crossword | Clue-answer pairs | ★★★★★ | Yes |
| Flashcards | Q&A pairs + images | ★★★★★ | Yes |
| DialogCards | Front/back pairs | ★★★★★ | No |
| SortParagraphs | Ordered steps | ★★★★★ | Yes |
| Summary | Key statements + distractors | ★★★★☆ | Yes |
| MultiChoice | Question + options | ★★★★☆ | Yes |
| ImageSequencing | Ordered images + descriptions | ★★★★☆ | Yes |
| ImageJuxtaposition | 2 comparison images | ★★★★☆ | No |
| Timeline | Dated events + text | ★★★★☆ | No |
| ImagePair | Paired images | ★★★☆☆ | Yes |
| MemoryGame | Image pairs (images required) | ★★★☆☆ | Completion |
| Column | Ordered sub-content | ★★★★★ | Depends |
| QuestionSet | Child questions | ★★★★☆ | Yes |
| ImageHotspots | Image + vision AI coords | ★★★☆☆ | No |
| ImageHotspotQuestion | Image + vision AI bbox | ★★★☆☆ | Yes |
| ImageMultipleHotspotQuestion | Image + vision AI bboxes | ★★★☆☆ | Yes |
| DragQuestion | Image + vision AI positions | ★★☆☆☆ | Yes |
| BranchingScenario | Decision tree design | ★★☆☆☆ | Config |
| CoursePresentation | Slide layout + content | ★★☆☆☆ | Config |
| GameMap | Map image + stage design | ★☆☆☆☆ | Yes |
| InteractiveVideo | Video + timed interactions | ★☆☆☆☆ | Yes |

## Competency-to-Type Mapping Rules

(To be completed after competency analysis — Step 2)
