#!/usr/bin/env node
/**
 * H5P Tier 1 Generator — generates text-based H5P activities from manifest content.
 *
 * Reads the type-selection-plan.json, extracts manifest text for each topic,
 * and outputs a tasks JSON for agent-driven content generation.
 *
 * Modes:
 *   --extract   Dump manifest text + selected types to tasks JSON
 *   --apply     Read agent-analysed results and write H5P activity files
 *
 * Usage:
 *   node scripts/pipeline/h5p-generate-tier1.mjs --subject AN --extract
 *   node scripts/pipeline/h5p-generate-tier1.mjs --subject AN --apply
 *   node scripts/pipeline/h5p-generate-tier1.mjs --subject AN --topic-id 1 --extract
 */
import fs from 'fs';
import path from 'path';
import {
  createClient, readManifest, saveManifest, getInstitutionMapping,
  getArg, hasFlag, env,
} from './lib.mjs';

const subjectCode = getArg('subject');
const topicIdArg = getArg('topic-id') ? parseInt(getArg('topic-id'), 10) : null;
const extractOnly = hasFlag('extract');
const applyOnly = hasFlag('apply');

const H5P_BASE = path.resolve('h5p/activities');
const EXTRACT_DIR = path.resolve('output/h5p-extract');
const VIEWER_BASE = 'https://academe-learn.pages.dev/h5p/viewer';
const PLAN_FILE = path.join(EXTRACT_DIR, 'type-selection-plan.json');

// Tier 1 type keys (text-only, no images/coordinates needed)
const TIER1_TYPES = new Set([
  'DragText', 'Blanks', 'MarkTheWords', 'Crossword', 'Flashcards',
  'DialogCards', 'SortParagraphs', 'TrueFalse', 'Summary', 'MultiChoice',
]);

// H5P type → folder suffix and h5p.json metadata
const TYPE_META = {
  DragText:       { suffix: 'drag-text', machine: 'H5P.DragText', major: 1, minor: 10, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }, { machineName: 'jQuery.ui', majorVersion: 1, minorVersion: 10 }] },
  Blanks:         { suffix: 'blanks', machine: 'H5P.Blanks', major: 1, minor: 14, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
  MarkTheWords:   { suffix: 'mark-words', machine: 'H5P.MarkTheWords', major: 1, minor: 11, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
  Crossword:      { suffix: 'crossword', machine: 'H5P.Crossword', major: 0, minor: 5, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'H5P.Image', majorVersion: 1, minorVersion: 1 }, { machineName: 'H5P.MaterialDesignIcons', majorVersion: 1, minorVersion: 0 }] },
  Flashcards:     { suffix: 'flashcards', machine: 'H5P.Flashcards', major: 1, minor: 7, deps: [{ machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'H5P.FontIcons', majorVersion: 1, minorVersion: 0 }, { machineName: 'H5P.Components', majorVersion: 1, minorVersion: 0 }] },
  DialogCards:    { suffix: 'dialog-cards', machine: 'H5P.Dialogcards', major: 1, minor: 9, deps: [{ machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'H5P.Audio', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.Components', majorVersion: 1, minorVersion: 0 }] },
  SortParagraphs: { suffix: 'sort-paragraphs', machine: 'H5P.SortParagraphs', major: 0, minor: 11, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
  TrueFalse:      { suffix: 'true-false', machine: 'H5P.TrueFalse', major: 1, minor: 8, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
  Summary:        { suffix: 'summary', machine: 'H5P.Summary', major: 1, minor: 10, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
  MultiChoice:    { suffix: 'multichoice', machine: 'H5P.MultiChoice', major: 1, minor: 16, deps: [{ machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 }, { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 }, { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 }] },
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractManifestText(manifest) {
  const sections = [];
  for (const page of (manifest.pages || [])) {
    if (['glossary', 'classroom'].includes(page.slot)) continue;
    const text = stripHtml(page.body_html);
    if (text.length > 50) {
      sections.push({ slot: page.slot, title: page.title || '', text });
    }
  }
  return sections;
}

// ── Extract mode ────────────────────────────────────────────────────

async function runExtract() {
  if (!fs.existsSync(PLAN_FILE)) {
    console.error('Run h5p-type-selector.mjs first to generate the plan.');
    process.exit(1);
  }

  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf-8'));
  const client = createClient();
  await client.connect();

  let mapping;
  try {
    mapping = await getInstitutionMapping(client, subjectCode || 'AN');
  } catch (e) {
    // If no subject specified, get all
    mapping = [];
    for (const code of ['AN', 'PY', 'BI']) {
      try {
        const m = await getInstitutionMapping(client, code);
        mapping.push(...m);
      } catch (err) { /* skip */ }
    }
  }

  const tasks = [];

  for (const row of mapping) {
    if (topicIdArg && row.topic_id !== topicIdArg) continue;

    // Find this topic's plan
    const topicPlan = plan.find(p => p.topic_id === row.topic_id);
    if (!topicPlan) continue;

    // Filter to Tier 1 types only
    const tier1Types = topicPlan.selected_types
      .filter(t => TIER1_TYPES.has(t.type))
      .map(t => t.type);

    if (tier1Types.length === 0) continue;

    // Check which types already exist
    const topicSlug = slugify(row.topic_name);
    const needed = tier1Types.filter(type => {
      const actSlug = `${topicSlug}-${TYPE_META[type].suffix}`;
      return !fs.existsSync(path.join(H5P_BASE, actSlug, 'content', 'content.json'));
    });

    if (needed.length === 0) continue;

    // Read manifest text
    const refRow = await readManifest(client, row.mgmcri_id);
    const sections = extractManifestText(refRow.manifest);
    const codeRange = refRow.manifest.an_code_range || refRow.manifest.code_range || '';

    tasks.push({
      topic_id: row.topic_id,
      topic_name: row.topic_name,
      topic_slug: topicSlug,
      code_range: codeRange,
      subject: topicPlan.subject,
      types: needed,
      mgmcri_id: row.mgmcri_id,
      sssmcri_id: row.sssmcri_id,
      santosh_id: row.santosh_id,
      content_text: sections.map(s => `### ${s.title}\n${s.text}`).join('\n\n').substring(0, 6000),
    });
  }

  await client.end();

  const outFile = path.join(EXTRACT_DIR, `${subjectCode || 'ALL'}-tier1-tasks.json`);
  fs.writeFileSync(outFile, JSON.stringify(tasks, null, 2));
  console.log(`Extracted ${tasks.length} topics with ${tasks.reduce((s, t) => s + t.types.length, 0)} total H5P types to generate`);
  console.log(`Written to ${outFile}`);
}

// ── Apply mode ──────────────────────────────────────────────────────

async function runApply() {
  const tasksFile = path.join(EXTRACT_DIR, `${subjectCode || 'ALL'}-tier1-tasks.json`);
  if (!fs.existsSync(tasksFile)) {
    console.error(`Tasks file not found: ${tasksFile}\nRun --extract first.`);
    process.exit(1);
  }

  const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
  const withResults = tasks.filter(t => t.results && Object.keys(t.results).length > 0);
  console.log(`Found ${withResults.length}/${tasks.length} topics with generated content\n`);

  let generated = 0, failed = 0;

  for (const task of withResults) {
    for (const [type, contentJson] of Object.entries(task.results)) {
      const meta = TYPE_META[type];
      if (!meta) continue;

      const actSlug = `${task.topic_slug}-${meta.suffix}`;
      const actDir = path.join(H5P_BASE, actSlug);

      if (fs.existsSync(path.join(actDir, 'content', 'content.json'))) {
        continue; // already exists
      }

      try {
        fs.mkdirSync(path.join(actDir, 'content'), { recursive: true });

        // Write content.json
        fs.writeFileSync(
          path.join(actDir, 'content', 'content.json'),
          JSON.stringify(contentJson, null, 2)
        );

        // Write h5p.json
        const title = `${task.code_range ? task.code_range + ' | ' : ''}${task.topic_name} — ${meta.machine.replace('H5P.', '')}`;
        fs.writeFileSync(
          path.join(actDir, 'h5p.json'),
          JSON.stringify({
            title,
            language: 'und',
            mainLibrary: meta.machine,
            embedTypes: ['iframe'],
            license: 'U',
            preloadedDependencies: [
              { machineName: meta.machine, majorVersion: meta.major, minorVersion: meta.minor },
              ...meta.deps,
            ],
          }, null, 2)
        );

        generated++;
        console.log(`  [ok] ${actSlug}`);
      } catch (err) {
        console.error(`  [error] ${actSlug}: ${err.message.substring(0, 80)}`);
        failed++;
      }
    }
  }

  // Update manifest external_links
  console.log(`\nUpdating manifest external_links...`);
  const client = createClient();
  await client.connect();
  let linked = 0;

  for (const task of withResults) {
    const manifestIds = [task.mgmcri_id, task.sssmcri_id, task.santosh_id];
    const typeKeys = Object.keys(task.results);

    for (const manifestId of manifestIds) {
      try {
        const mRow = await readManifest(client, manifestId);
        const m = mRow.manifest;
        if (!m.external_links) m.external_links = [];

        for (const type of typeKeys) {
          const meta = TYPE_META[type];
          if (!meta) continue;
          const slot = `h5p_${meta.suffix.replace(/-/g, '_')}`;
          const actSlug = `${task.topic_slug}-${meta.suffix}`;

          m.external_links = m.external_links.filter(l => l.slot !== slot);
          m.external_links.push({
            slot,
            title: `${task.code_range}${task.code_range ? ' | ' : ''}${task.topic_name} — ${meta.machine.replace('H5P.', '')}`,
            url: `${VIEWER_BASE}/${actSlug}/`,
            new_tab: true,
            indent: 1,
          });
        }

        await saveManifest(client, manifestId, m, mRow.status);
        linked++;
      } catch (err) {
        console.error(`  [error] Manifest ${manifestId}: ${err.message?.substring(0, 80)}`);
      }
    }
  }

  await client.end();
  console.log(`\nDONE: ${generated} activities, ${linked} manifests, ${failed} failed`);
}

// ── Main ────────────────────────────────────────────────────────────

if (!subjectCode && !hasFlag('help')) {
  console.log('Usage: node scripts/pipeline/h5p-generate-tier1.mjs --subject AN --extract|--apply');
  process.exit(0);
}

if (extractOnly) runExtract().catch(e => { console.error(e); process.exit(1); });
else if (applyOnly) runApply().catch(e => { console.error(e); process.exit(1); });
else { console.log('Specify --extract or --apply'); process.exit(1); }
