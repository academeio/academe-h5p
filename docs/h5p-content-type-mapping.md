# H5P Content Type Mapping for CBME Medical Education

> **Purpose:** Map H5P content types to medical education use cases, NMC competency domains, Bloom's taxonomy levels, and content types (SDL, PBL, MCQ, Assignment). Used by the orchestrator to auto-select appropriate H5P interactions for each module.
>
> **Last updated:** 22-03-2026

---

## Priority Tiers

### Tier 1 — High Impact, Build First (10 types)

These directly enhance medical education and map to specific pedagogical needs.

| # | H5P Type | Medical Education Use Case | Bloom's Levels | NMC Domains | Content Types | Example |
|---|----------|--------------------------|----------------|-------------|---------------|---------|
| 1 | **Image Hotspots** | Anatomy labeling — click regions to reveal structure names, clinical significance. Radiology — identify pathological findings on X-rays, CT scans. Histology — identify cell types, tissue layers. | Remember, Understand | K, KH | SDL, Assignment | Click on a heart diagram → reveals "Left anterior descending artery — supplies anterior 2/3 of interventricular septum" |
| 2 | **Find the Hotspot** | Anatomy identification — student must locate specific structures. Radiology — find the fracture, identify the pathology. Surface anatomy — locate pulse points, nerve blocks. | Apply, Analyze | KH, SH | SDL, Assignment, MCQ | "Find McBurney's point on this abdomen" — student clicks the correct location |
| 3 | **Find Multiple Hotspots** | Complex anatomy — locate ALL branches of the brachial plexus. Pathology — identify all abnormal findings on a blood smear. Radiology — mark all fracture lines. | Apply, Analyze | KH, SH | Assignment | "Identify all 5 groups of axillary lymph nodes on this diagram" |
| 4 | **Drag and Drop** | Label anatomy diagrams — drag labels to correct structures. Classify — drag diseases into correct categories. Physiology — drag ions to correct compartments (ICF vs ECF). Biochemistry — drag enzymes to correct pathway steps. | Apply, Understand | K, KH | SDL, Assignment | Drag "Diaphysis", "Epiphysis", "Metaphysis" labels onto a long bone diagram |
| 5 | **Branching Scenario** | Clinical reasoning PBL — patient presents, student chooses history questions, investigations, management. Differential diagnosis — branch based on findings. Emergency protocols — ACLS/BLS decision trees. | Analyze, Evaluate | KH, SH, P | PBL, Assignment | Patient with chest pain → choose ECG/Troponin/Echo → interpret results → diagnose → manage |
| 6 | **Agamotto (Image Sequence)** | Embryology — progressive development stages. Ossification — stages of bone formation. Pathology progression — disease staging. Dissection layers — superficial to deep. Histology staining — progressive staining steps. | Understand, Remember | K, KH | SDL | Endochondral ossification: cartilage model → primary centre → secondary centre → growth plate → mature bone |
| 7 | **Interactive Video** | Procedure demonstrations with embedded questions — "What nerve is at risk here?" during a surgical video. Dissection walkthroughs — pause at key structures. Clinical examination technique — embedded checkpoints. | Understand, Apply | KH, SH | SDL, Assignment | Shoulder examination video — pauses at each test, asks "What does a positive Neer's test indicate?" |
| 8 | **Course Presentation** | Comprehensive topic presentations with embedded interactions — replaces static SDL pages with interactive slides. Each slide can contain hotspots, drag-and-drop, MCQs. Ideal for complex multi-part topics. | All levels | All | SDL | "Heart & Pericardium" as an interactive presentation with anatomy hotspots, drag-label exercises, and embedded self-check questions |
| 9 | **Flashcards** | Rapid recall practice — anatomy structures, drug names, enzyme classifications. Anki-style spaced repetition preparation. Medical terminology. Competency code recall. | Remember | K | SDL, Revision | Front: "What is the blood supply of the femoral head?" Back: "Medial circumflex femoral artery (retinacular branches)" |
| 10 | **Timeline** | Disease history — evolution of understanding (e.g., history of anaesthesia). Embryology timelines — week-by-week development. Drug development milestones. NMC curriculum evolution. | Remember, Understand | K | SDL | "Timeline of embryological development: Week 1-8, major events and teratogenic windows" |

---

### Tier 2 — Valuable, Build Second (8 types)

Useful for specific content types but not universally applicable.

| # | H5P Type | Medical Education Use Case | Bloom's Levels | NMC Domains | Content Types |
|---|----------|--------------------------|----------------|-------------|---------------|
| 11 | **Accordion** | Expandable sections — differential diagnosis lists, drug classifications, muscle attachments by region. Structured information that students explore at their own pace. | Remember, Understand | K | SDL |
| 12 | **Image Juxtaposition** | Before/after comparisons — normal vs pathological tissue. Pre/post treatment images. Microscopy at different magnifications. Radiological comparison (inspiration vs expiration chest X-ray). | Analyze | KH | SDL, PBL |
| 13 | **Image Sequencing** | Procedural steps — arrange steps of CPR in correct order. Biochemical pathways — arrange glycolysis steps. Embryology — arrange developmental stages chronologically. | Apply, Understand | K, KH | Assignment |
| 14 | **Drag the Words** | Biochemistry — complete pathway descriptions by dragging enzyme/substrate names. Pharmacology — drag drug names into mechanism descriptions. Fill-in-the-blank with drag for anatomical descriptions. | Remember, Understand | K, KH | SDL, MCQ |
| 15 | **Mark the Words** | Identify key terms in clinical scenarios — mark the symptoms, mark the risk factors. Pharmacology — mark the side effects in a drug description. | Understand, Analyze | K, KH | SDL, MCQ |
| 16 | **Sort the Paragraphs** | Clinical management — arrange treatment steps in correct priority. ABCDE approach ordering. Procedure steps — correct sequence of examination. | Apply | KH, SH | Assignment |
| 17 | **Interactive Book** | Full module as an interactive book — chapters with embedded interactions, glossary, summary. Could replace the entire SDL page structure with a single rich interactive. | All levels | All | SDL |
| 18 | **Summary** | End-of-module summation — student selects correct summary statements from lists. Tests overall comprehension of a topic. | Evaluate | KH | SDL |

---

### Tier 3 — Niche/Future (8 types)

Useful in specific contexts but lower priority.

| # | H5P Type | Medical Education Use Case | Bloom's | Content Types |
|---|----------|--------------------------|---------|---------------|
| 19 | **Memory Game** | Pair structures with functions, pair drugs with mechanisms, pair diseases with pathology images | Remember | Revision |
| 20 | **Crossword** | Medical terminology review — anatomical terms, drug names, enzyme names | Remember | Revision |
| 21 | **Image Pairing** | Match histology images to tissue types, match X-rays to diagnoses, match instruments to procedures | Remember, Apply | Assignment |
| 22 | **Essay** | Reflective writing with AI-based keyword feedback — student writes a clinical reflection, H5P checks for key concepts | Evaluate, Create | Assignment |
| 23 | **Documentation Tool** | Structured clinical notes — guided SOAP note writing, history taking templates | Apply, Create | Assignment |
| 24 | **Questionnaire** | Student feedback collection — module evaluation, teaching quality survey | — | Meta |
| 25 | **Virtual Tour (360)** | Virtual anatomy lab tour, hospital department orientation, simulation centre walkthrough | Understand | SDL |
| 26 | **Audio Recorder** | Pronunciation practice — medical terminology, patient communication skills | Apply | SH, P |

---

### Not Recommended for Medical Education (12 types)

| H5P Type | Reason |
|----------|--------|
| Advent Calendar | Seasonal novelty, not educational |
| AR Scavenger | Requires AR-capable devices, complex setup |
| Arithmetic Quiz | Not relevant to medical curriculum |
| Chart | We generate better charts via Claude Viz engine |
| Collage | Decorative, no educational interaction |
| Cornell Notes | Students have their own note-taking tools |
| Dictation | Not relevant to our English-medium curriculum |
| Find the Words | Too gamified for medical education |
| Game Map | Complex to author, niche use |
| Impressive Presentation | Alpha quality, not production-ready |
| KewAr Code | QR codes are a delivery mechanism, not content |
| Personality Quiz | Not relevant to competency-based education |

---

## Mapping to Three Delivery Modes

| Delivery Mode | Best H5P Types | Rationale |
|---------------|----------------|-----------|
| **SDL (Independent)** | Image Hotspots, Agamotto, Accordion, Flashcards, Timeline, Course Presentation, Drag and Drop | Self-paced exploration, no instructor needed |
| **Flipped Classroom** | Interactive Video, Branching Scenario, Course Presentation | Pre-class preparation with embedded interactions |
| **Face-to-Face** | Find the Hotspot (live quiz), Memory Game (group activity), Virtual Tour (lab orientation) | Instructor-facilitated interactive sessions |

---

## Mapping to NMC Competency Domains

| Domain | Level | Best H5P Types | Why |
|--------|-------|----------------|-----|
| **K (Knowledge)** | Remember, Understand | Flashcards, Accordion, Drag the Words, Timeline, Agamotto | Factual recall and basic comprehension |
| **KH (Know-How)** | Apply, Analyze | Image Hotspots, Drag and Drop, Find Hotspot, Interactive Video, Branching Scenario | Application of knowledge to visual/clinical contexts |
| **SH (Show-How)** | Analyze, Evaluate | Branching Scenario, Find Multiple Hotspots, Sort Paragraphs, Interactive Video | Demonstration of clinical reasoning and procedural knowledge |
| **P (Performance)** | Create, Evaluate | Branching Scenario (complex), Documentation Tool, Essay | Closest H5P gets to performance — real performance needs F2F |

---

## Orchestrator Auto-Selection Logic

When generating a module, the orchestrator should select H5P types based on:

### Input signals
1. **Competency domain levels** (K/KH/SH/P) from Neon
2. **Topic subject** (AN/PY/BI/PA/PH/MI)
3. **Content type being generated** (SDL/PBL/Assignment)
4. **Available images** in the content library
5. **Bloom's range** from the capsule metadata

### Selection rules

```
FOR EACH content block in a module:

  IF block has anatomical diagram or image:
    → Image Hotspots (label the structures)
    → Drag and Drop (drag labels onto image)

  IF block describes a progression/sequence:
    → Agamotto (overlay image sequence)
    → Image Sequencing (arrange in order)
    → Timeline (if chronological)

  IF block covers classification/categories:
    → Drag and Drop (sort items into categories)
    → Accordion (expandable category details)

  IF block has clinical scenario:
    → Branching Scenario (decision tree)
    → Find the Hotspot (locate finding on image)

  IF topic is procedural (SH/P domain):
    → Interactive Video (if video available)
    → Sort the Paragraphs (order procedure steps)
    → Branching Scenario (decision pathway)

  IF block introduces terminology:
    → Flashcards (term → definition)
    → Drag the Words (fill-in terminology)

  FOR every module (universal):
    → Flashcards (key terms from glossary)
    → Course Presentation (if topic has 5+ content blocks)
```

### Generation pipeline

```
Topic + Competencies (Neon)
    │
    ├── Analyze content blocks → select H5P types
    ├── Generate H5P content JSON via Claude API
    │   (prompt includes: H5P type spec, medical content, image URLs)
    ├── Package as .h5p file using H5P-Nodejs-library
    ├── Export as standalone HTML
    ├── Upload to Cloudflare Pages (interactives.cbme.in)
    └── Add External URL to Canvas module
```

### Prompt template for Claude API

```
Generate H5P content of type "{h5p_type}" for the following medical education context:

Topic: {topic_name}
Section: {block_heading}
Content: {block_content}
Competency: {competency_code} - {competency_text}
Domain: {domain_level}
Images available: {image_urls}

Return valid H5P content.json for the {h5p_type} content type.
Include: {specific_requirements_per_type}
```

---

## Subject-Specific H5P Recommendations

### Anatomy (AN)
- **Primary:** Image Hotspots (structure identification), Drag and Drop (label diagrams), Find Hotspot (locate structures), Agamotto (dissection layers)
- **Secondary:** Find Multiple Hotspots (complex regions), Image Juxtaposition (normal vs variant anatomy)
- **Unique:** Virtual Tour (360° cadaver/prosection views — future)

### Physiology (PY)
- **Primary:** Agamotto (process sequences — cardiac cycle phases, action potential stages), Interactive Video (experiment demonstrations), Branching Scenario (clinical physiology reasoning)
- **Secondary:** Image Sequencing (pathway steps), Drag and Drop (ion channel mechanisms)
- **Unique:** Chart integration (dose-response curves, oxygen dissociation curve interactive)

### Biochemistry (BI)
- **Primary:** Drag and Drop (pathway enzymes/substrates), Agamotto (reaction sequences), Flashcards (enzyme classifications, amino acids)
- **Secondary:** Image Sequencing (metabolic pathway steps), Sort Paragraphs (reaction order)
- **Unique:** Mark the Words (identify substrates/products in pathway descriptions)

### Pathology (PA) — Future
- **Primary:** Image Hotspots (histopathology identification), Find Hotspot (gross pathology), Image Juxtaposition (normal vs pathological), Branching Scenario (diagnostic reasoning)

### Pharmacology (PH) — Future
- **Primary:** Flashcards (drug classifications), Drag and Drop (mechanism sorting), Branching Scenario (treatment algorithms), Agamotto (drug action mechanisms)

---

## Implementation Priority

| Phase | H5P Types | Scope |
|-------|-----------|-------|
| **Phase 1** | Image Hotspots, Drag and Drop, Flashcards | Auto-generate for all 15 pilot modules |
| **Phase 2** | Agamotto, Branching Scenario, Find Hotspot | Add to modules with suitable content |
| **Phase 3** | Interactive Video, Course Presentation, Timeline | Rich media integration |
| **Phase 4** | All Tier 2 types | Full coverage |
