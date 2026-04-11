#!/usr/bin/env node
/**
 * H5P Type Selector — analyses NMC competencies per topic and recommends
 * the best H5P content types for each topic's Interactive Precis.
 *
 * Verb-based mapping from NMC competency text to H5P types:
 *   - "Identify" → image-based (DragQuestion, ImageMultipleHotspotQuestion, MarkTheWords)
 *   - "Describe" → text recall (DragText, Blanks, Flashcards, Crossword)
 *   - "Demonstrate" → active (DragQuestion, SortParagraphs)
 *   - "Explain" → understanding (Summary, TrueFalse, DragText)
 *   - "microanatomical" / histology → ImageHotspots, ImageJuxtaposition
 *   - "development" / embryology → ImageSequencing, SortParagraphs, Timeline
 *   - "Draw" / construct → BranchingScenario (future)
 *
 * Usage:
 *   node scripts/pipeline/h5p-type-selector.mjs --subject AN
 *   node scripts/pipeline/h5p-type-selector.mjs --subject AN --topic-id 1
 *   node scripts/pipeline/h5p-type-selector.mjs              # all subjects
 */
import { createClient, getArg, hasFlag } from './lib.mjs';

const subjectFilter = getArg('subject');
const topicIdFilter = getArg('topic-id') ? parseInt(getArg('topic-id'), 10) : null;

// ── H5P type definitions with metadata ─────────────────────────────

const H5P_TYPES = {
  // Tier 1: Text-only (trivially auto-generatable)
  DragText:       { machine: 'H5P.DragText', tier: 1, graded: true,  label: 'Drag the Words' },
  Blanks:         { machine: 'H5P.Blanks', tier: 1, graded: true,  label: 'Fill in the Blanks' },
  MarkTheWords:   { machine: 'H5P.MarkTheWords', tier: 1, graded: true,  label: 'Mark the Words' },
  Crossword:      { machine: 'H5P.Crossword', tier: 1, graded: true,  label: 'Crossword' },
  Flashcards:     { machine: 'H5P.Flashcards', tier: 1, graded: true,  label: 'Flashcards' },
  DialogCards:    { machine: 'H5P.Dialogcards', tier: 1, graded: false, label: 'Dialog Cards' },
  SortParagraphs: { machine: 'H5P.SortParagraphs', tier: 1, graded: true,  label: 'Sort the Paragraphs' },
  TrueFalse:      { machine: 'H5P.TrueFalse', tier: 1, graded: true,  label: 'True/False' },
  Summary:        { machine: 'H5P.Summary', tier: 1, graded: true,  label: 'Summary' },
  MultiChoice:    { machine: 'H5P.MultiChoice', tier: 1, graded: true,  label: 'Multiple Choice' },

  // Tier 2: Image + metadata (no coordinates needed)
  ImageSequencing:     { machine: 'H5P.ImageSequencing', tier: 2, graded: true,  label: 'Image Sequencing' },
  ImageJuxtaposition:  { machine: 'H5P.ImageJuxtaposition', tier: 2, graded: false, label: 'Image Juxtaposition' },
  ImagePair:           { machine: 'H5P.ImagePair', tier: 2, graded: true,  label: 'Image Pairing' },
  MemoryGame:          { machine: 'H5P.MemoryGame', tier: 2, graded: true,  label: 'Memory Game' },
  Timeline:            { machine: 'H5P.Timeline', tier: 2, graded: false, label: 'Timeline' },

  // Tier 3: Image + vision AI coordinates
  ImageHotspots:                 { machine: 'H5P.ImageHotspots', tier: 3, graded: false, label: 'Image Hotspots' },
  DragQuestion:                  { machine: 'H5P.DragQuestion', tier: 3, graded: true,  label: 'Drag & Drop Labels' },
  ImageMultipleHotspotQuestion:  { machine: 'H5P.ImageMultipleHotspotQuestion', tier: 3, graded: true, label: 'Find Multiple Hotspots' },
  ImageHotspotQuestion:          { machine: 'H5P.ImageHotspotQuestion', tier: 3, graded: true,  label: 'Find the Hotspot' },

  // Tier 4: Complex containers
  Column:            { machine: 'H5P.Column', tier: 4, graded: null,  label: 'Column (Container)' },
  QuestionSet:       { machine: 'H5P.QuestionSet', tier: 4, graded: true,  label: 'Question Set' },
  BranchingScenario: { machine: 'H5P.BranchingScenario', tier: 4, graded: true,  label: 'Branching Scenario' },
};

// ── Verb pattern matchers ──────────────────────────────────────────

const VERB_PATTERNS = [
  {
    id: 'identify_describe',
    test: (text) => /\b(identify\s*[&,]\s*describe|describe\s*[&,]\s*identify)\b/i.test(text),
    types: ['ImageHotspots', 'DragQuestion', 'ImageMultipleHotspotQuestion', 'MarkTheWords'],
    reason: 'Identify & describe → visual identification + labeling',
  },
  {
    id: 'demonstrate',
    test: (text) => /\b(demonstrate|show how)\b/i.test(text),
    types: ['DragQuestion', 'SortParagraphs', 'ImageHotspots'],
    reason: 'Demonstrate → active skill demonstration',
  },
  {
    id: 'explain_basis',
    test: (text) => /\bexplain\b.*\b(basis|mechanism|cause|pathogenesis|why)\b/i.test(text),
    types: ['Summary', 'DragText', 'TrueFalse'],
    reason: 'Explain anatomical/clinical basis → understanding + reasoning',
  },
  {
    id: 'explain',
    test: (text) => /\bexplain\b/i.test(text) && !/\b(basis|mechanism)\b/i.test(text),
    types: ['Summary', 'TrueFalse', 'DragText', 'Flashcards'],
    reason: 'Explain → conceptual understanding',
  },
  {
    id: 'microanatomical',
    test: (text) => /\b(microanatom|histolog|microscop)/i.test(text),
    types: ['ImageHotspots', 'ImageJuxtaposition', 'MemoryGame', 'Flashcards'],
    reason: 'Histology/microanatomy → image comparison + identification',
  },
  {
    id: 'development',
    test: (text) => /\b(development|embryolog|formation\s*[&,]?\s*fate|congenital|teratogen)/i.test(text),
    types: ['SortParagraphs', 'ImageSequencing', 'Timeline', 'DragText'],
    reason: 'Development/embryology → sequential ordering + timeline',
  },
  {
    id: 'draw',
    test: (text) => /\b(draw|sketch|chart|diagram)\b/i.test(text),
    types: ['DragQuestion', 'SortParagraphs'],
    reason: 'Draw/chart → constructive labeling',
  },
  {
    id: 'identify_only',
    test: (text) => /\bidentify\b/i.test(text) && !/\bdescribe\b/i.test(text),
    types: ['ImageMultipleHotspotQuestion', 'ImageHotspotQuestion', 'MarkTheWords'],
    reason: 'Identify → find/locate specific structures',
  },
  {
    id: 'describe_recall',
    test: (text) => /\bdescribe\b/i.test(text),
    types: ['DragText', 'Blanks', 'Flashcards', 'Crossword'],
    reason: 'Describe → knowledge recall + terminology',
  },
  {
    id: 'enumerate',
    test: (text) => /\b(enumerate|list|classify|categorize|name)\b/i.test(text),
    types: ['Crossword', 'MarkTheWords', 'Flashcards', 'DragText'],
    reason: 'Enumerate/list → terminology + categorization',
  },
];

// ── Subject-level modifiers ────────────────────────────────────────

const SUBJECT_MODIFIERS = {
  AN: {  // Anatomy — image-heavy, structural identification
    boost: ['ImageHotspots', 'DragQuestion', 'ImageMultipleHotspotQuestion'],
    always: ['Crossword'],  // anatomy terminology crossword always useful
  },
  PY: {  // Physiology — mechanisms, processes, pathways
    boost: ['DragText', 'SortParagraphs', 'Summary'],
    always: ['Flashcards'],  // physiology key terms always useful
  },
  BI: {  // Biochemistry — pathways, reactions, metabolic sequences
    boost: ['SortParagraphs', 'DragText', 'ImageSequencing'],
    always: ['Crossword'],  // biochemistry terminology
  },
};

// ── Analyse one topic ──────────────────────────────────────────────

function analyseTopicCompetencies(topic, competencies, subject) {
  const typeScores = {};  // type → score
  const matchReasons = [];

  // Score each competency's verb patterns
  for (const comp of competencies) {
    const text = comp.competency_text;
    for (const pattern of VERB_PATTERNS) {
      if (pattern.test(text)) {
        for (const type of pattern.types) {
          typeScores[type] = (typeScores[type] || 0) + 1;
        }
        matchReasons.push({
          code: comp.competency_code,
          pattern: pattern.id,
          reason: pattern.reason,
          types: pattern.types,
        });
        break; // first matching pattern wins per competency
      }
    }
  }

  // Apply subject-level boosts
  const mods = SUBJECT_MODIFIERS[subject];
  if (mods) {
    for (const type of (mods.boost || [])) {
      typeScores[type] = (typeScores[type] || 0) + 0.5;
    }
    for (const type of (mods.always || [])) {
      typeScores[type] = (typeScores[type] || 0) + 0.3;
    }
  }

  // Domain-level adjustments
  const domains = [...new Set(competencies.map(c => c.domain))];
  const levels = [...new Set(competencies.map(c => c.competency_level))];

  // K/S domain → boost image-based types
  if (domains.includes('K/S')) {
    for (const type of ['ImageHotspots', 'DragQuestion', 'ImageMultipleHotspotQuestion']) {
      typeScores[type] = (typeScores[type] || 0) + 0.5;
    }
  }

  // SH level → boost graded/skill types
  if (levels.includes('SH')) {
    for (const type of ['DragQuestion', 'SortParagraphs', 'ImageMultipleHotspotQuestion']) {
      typeScores[type] = (typeScores[type] || 0) + 0.3;
    }
  }

  // Sort by score descending
  const ranked = Object.entries(typeScores)
    .sort((a, b) => b[1] - a[1])
    .map(([type, score]) => ({ type, score: Math.round(score * 10) / 10, ...H5P_TYPES[type] }));

  // Select top types: pick highest-scoring from each tier (max 4-5 types)
  const selected = [];
  const tiersSeen = new Set();

  for (const entry of ranked) {
    if (selected.length >= 5) break;
    // Always include top scorer
    if (selected.length === 0) {
      selected.push(entry);
      tiersSeen.add(entry.tier);
      continue;
    }
    // Ensure diversity: don't pick more than 2 from same tier
    const sameCount = selected.filter(s => s.tier === entry.tier).length;
    if (sameCount < 2 && entry.score > 0.5) {
      selected.push(entry);
      tiersSeen.add(entry.tier);
    }
  }

  return {
    topic_id: topic.topic_id,
    topic_name: topic.topic_name,
    subject,
    comp_count: competencies.length,
    domains: domains.join(', '),
    levels: levels.join(', '),
    selected_types: selected,
    all_scores: ranked.slice(0, 10),
    match_reasons: matchReasons,
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const client = createClient();
  await client.connect();

  // Fetch all topics with their competencies
  const { rows } = await client.query(`
    SELECT s.code as subject, t.id as topic_id, t.name as topic_name,
      c.competency_code, c.competency_text, c.domain, c.competency_level
    FROM subjects s
    JOIN topics t ON t.subject_id = s.id
    JOIN competencies c ON c.topic_id = t.id
    WHERE c.deleted_at IS NULL
      ${subjectFilter ? `AND s.code = '${subjectFilter}'` : `AND s.code IN ('AN', 'PY', 'BI')`}
      ${topicIdFilter ? `AND t.id = ${topicIdFilter}` : ''}
    ORDER BY s.code, t.id, c.competency_code
  `);

  // Group by topic
  const topicMap = {};
  for (const row of rows) {
    const key = `${row.subject}-${row.topic_id}`;
    if (!topicMap[key]) {
      topicMap[key] = {
        topic_id: row.topic_id,
        topic_name: row.topic_name,
        subject: row.subject,
        competencies: [],
      };
    }
    topicMap[key].competencies.push(row);
  }

  const results = [];
  for (const [, topic] of Object.entries(topicMap)) {
    const analysis = analyseTopicCompetencies(topic, topic.competencies, topic.subject);
    results.push(analysis);
  }

  await client.end();

  // Output
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`H5P Type Selector — ${results.length} topics analysed`);
  console.log(`${'═'.repeat(70)}\n`);

  // Summary table
  const subjectSummary = {};
  for (const r of results) {
    if (!subjectSummary[r.subject]) subjectSummary[r.subject] = { topics: 0, typeUsage: {} };
    subjectSummary[r.subject].topics++;
    for (const t of r.selected_types) {
      subjectSummary[r.subject].typeUsage[t.type] = (subjectSummary[r.subject].typeUsage[t.type] || 0) + 1;
    }
  }

  for (const [subject, summary] of Object.entries(subjectSummary)) {
    console.log(`\n${subject} (${summary.topics} topics):`);
    const sorted = Object.entries(summary.typeUsage).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sorted) {
      const pct = Math.round(count / summary.topics * 100);
      console.log(`  ${H5P_TYPES[type]?.label?.padEnd(30) || type.padEnd(30)} ${count}/${summary.topics} (${pct}%)`);
    }
  }

  // Per-topic detail
  console.log(`\n${'─'.repeat(70)}`);
  for (const r of results) {
    console.log(`\n[${r.subject}] ${r.topic_name} (${r.comp_count} competencies, ${r.domains})`);
    for (const t of r.selected_types) {
      const gradeTag = t.graded === true ? '★' : t.graded === false ? '○' : '◆';
      console.log(`  ${gradeTag} ${t.label} (score: ${t.score}, tier ${t.tier})`);
    }
  }

  // Write JSON plan
  const fs = await import('fs');
  const outPath = 'output/h5p-extract/type-selection-plan.json';
  fs.mkdirSync('output/h5p-extract', { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n\nPlan written to ${outPath}`);
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
