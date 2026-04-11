#!/usr/bin/env node
/**
 * Phase 2e: Generate H5P Interactive Precis activities from manifest content.
 *
 * Supports two H5P content types:
 *   - hotspots: Image Hotspots (exploratory, tap to learn)
 *   - drag:     Drag Question (graded, drag labels to correct positions)
 *
 * For each topic:
 *   1. Read manifest to get images and headings
 *   2. For each image, use Sonnet vision to identify structures + positions
 *   3. Generate content.json for the chosen H5P type(s)
 *   4. Write h5p.json + content/content.json to h5p/activities/
 *   5. Update manifest external_links with viewer URL
 *
 * Usage:
 *   node scripts/pipeline/h5p-precis.mjs --subject AN --topic-id 1
 *   node scripts/pipeline/h5p-precis.mjs --subject AN --type both
 *   node scripts/pipeline/h5p-precis.mjs --subject AN --type drag
 *   node scripts/pipeline/h5p-precis.mjs --subject AN --dry-run
 */
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import {
  createClient, readManifest, saveManifest, getInstitutionMapping,
  getArg, hasFlag, STATUS, env,
} from './lib.mjs';

const subjectCode = getArg('subject');
const topicIdArg = getArg('topic-id') ? parseInt(getArg('topic-id'), 10) : null;
const dryRun = hasFlag('dry-run');
const maxImages = parseInt(getArg('max-images') || '3', 10);
const extractOnly = hasFlag('extract');
const applyOnly = hasFlag('apply');
const activityType = getArg('type') || 'hotspots'; // hotspots | drag | both
const genHotspots = activityType === 'hotspots' || activityType === 'both';
const genDrag = activityType === 'drag' || activityType === 'both';

const H5P_BASE = path.resolve('h5p/activities');
const EXTRACT_DIR = path.resolve('output/h5p-extract');
const VIEWER_BASE = 'https://academe-learn.pages.dev/h5p/viewer';

if (!subjectCode || hasFlag('help')) {
  console.log(`
Phase 2e: Generate H5P Interactive Precis from manifests.

Usage:
  node scripts/pipeline/h5p-precis.mjs --subject AN --topic-id 1
  node scripts/pipeline/h5p-precis.mjs --subject AN --type both
  node scripts/pipeline/h5p-precis.mjs --subject AN --type drag
  node scripts/pipeline/h5p-precis.mjs --subject AN --dry-run

Options:
  --subject <code>    Subject code (required)
  --topic-id <id>     Single topic by Neon topic ID
  --type <type>       Activity type: hotspots, drag, or both (default: hotspots)
  --max-images <n>    Max images to process per topic (default: 3)
  --dry-run           Preview without writing files
`);
  process.exit(0);
}

// ── Anthropic client ────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/**
 * Use Sonnet vision to analyze an image and generate hotspot data.
 * Returns array of hotspots with x/y percentages and popup content.
 */
async function analyzeImageForHotspots(imageUrl, heading, topicName) {
  const prompt = `You are analyzing a medical education image for an interactive learning tool (H5P Image Hotspots). The image is from the topic "${topicName}" and accompanies the heading "${heading}".

STEP 1: First, describe what you see in the image. Note the layout — is it a single diagram, split into panels, landscape or portrait? Identify the major visual regions and where specific structures are drawn.

STEP 2: Based on your description, identify 4-5 key anatomical structures or concepts VISIBLE in this image. For each:

1. Place the hotspot at the VISUAL CENTER of where that structure is drawn in the image
2. Write a short header (structure name, 2-5 words)
3. Write educational popup HTML (2-4 sentences) with bold key terms, one clinical pearl, and one memory aid

POSITIONING (critical — be precise):
- x=0 is LEFT edge, x=100 is RIGHT edge
- y=0 is TOP edge, y=100 is BOTTOM edge
- Coordinates are PERCENTAGES of image dimensions
- If a structure is in the left third of the image, x should be 10-33
- If a structure is in the center, x should be 33-66
- If a structure is at the top quarter, y should be 0-25
- AVOID placing hotspots at the very edges (keep x and y between 5 and 95)
- AVOID clustering — spread hotspots across different regions of the image

Respond with your image description first (2-3 lines), then the JSON array:
[
  {
    "x": 25.5,
    "y": 30.0,
    "header": "Structure Name",
    "text": "<p>Educational explanation with <strong>bold key terms</strong>. <em>Clinical pearl:</em> relevant clinical fact. <em>Memory aid:</em> mnemonic or analogy.</p>"
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = response.content[0].text.trim();
    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`    [warn] No JSON array found in Sonnet response`);
      return [];
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`    [error] Sonnet vision failed: ${err.message?.substring(0, 100)}`);
    return [];
  }
}

/**
 * Use Sonnet vision to analyze an image and generate drag-and-drop label data.
 * Returns array of structures with name, x/y position for drop zones, and a tip.
 */
async function analyzeImageForDragLabels(imageUrl, heading, topicName) {
  const prompt = `You are analyzing a medical education image for a drag-and-drop labeling activity (H5P Drag Question). The image is from the topic "${topicName}" and accompanies the heading "${heading}".

STEP 1: Describe the image layout — orientation, panels, key visual regions.

STEP 2: Identify 5-7 key anatomical structures or concepts CLEARLY VISIBLE in this image that a student should be able to label. For each structure:

1. Provide the structure name (short, 2-4 words)
2. Provide the x,y position (as percentages) where the DROP ZONE should be placed — this should be directly on/adjacent to the structure in the image
3. Provide a brief hint (1 sentence) for students who are stuck
4. Provide brief feedback text for correct placement (1 sentence, clinical relevance)

POSITIONING (critical — be precise):
- x=0 is LEFT edge, x=100 is RIGHT edge
- y=0 is TOP edge, y=100 is BOTTOM edge
- Coordinates are PERCENTAGES of image dimensions
- Place drop zones DIRECTLY on the structure they represent
- AVOID edges (keep x and y between 8 and 92)
- SPREAD zones across the image — don't cluster them

Respond with your image description first (2-3 lines), then the JSON array:
[
  {
    "label": "Structure Name",
    "x": 45.0,
    "y": 30.0,
    "tip": "This structure runs along the lateral border.",
    "feedback": "Correct! This is clinically important because..."
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`    [warn] No JSON array found in Sonnet response for drag labels`);
      return [];
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error(`    [error] Sonnet vision (drag) failed: ${err.message?.substring(0, 100)}`);
    return [];
  }
}

/** Build content.json for DragQuestion from analyzed label data. */
function buildDragContentJson(imageUrl, labels, taskTitle) {
  // Place draggable labels in a column on the left, evenly spaced
  const elements = labels.map((l, i) => ({
    type: {
      library: 'H5P.AdvancedText 1.1',
      params: { text: `<p>${l.label}</p>` },
      subContentId: uuid(),
    },
    x: 2,
    y: 5 + i * (85 / Math.max(labels.length - 1, 1)),
    width: 8.5,
    height: 1.6,
    dropZones: labels.map((_, j) => String(j)),  // can be dropped on any zone
    backgroundOpacity: 100,
    multiple: false,
  }));

  const dropZones = labels.map((l, i) => ({
    label: '',
    showLabel: false,
    x: l.x,
    y: l.y,
    width: 6,
    height: 2.5,
    correctElements: [i],
    backgroundOpacity: 50,
    single: true,
    autoAlign: true,
    tipsAndFeedback: {
      tip: l.tip || '',
      feedbackOnCorrect: l.feedback || 'Correct!',
      feedbackOnIncorrect: 'Not quite. Try another position.',
    },
  }));

  return {
    scoreShow: 'Check',
    submit: 'Submit',
    tryAgain: 'Retry',
    question: {
      settings: {
        background: {
          path: imageUrl,
          mime: imageUrl.endsWith('.png') ? 'image/png' : 'image/jpeg',
        },
        questionTitle: taskTitle,
        size: { width: 620, height: 460 },
      },
      task: { elements, dropZones },
    },
    overallFeedback: [
      { from: 0, to: 40, feedback: 'Review this diagram and try again.' },
      { from: 41, to: 70, feedback: 'Good effort — keep practising!' },
      { from: 71, to: 100, feedback: 'Excellent labeling!' },
    ],
    behaviour: {
      enableRetry: true,
      enableCheckButton: true,
      singlePoint: false,
      applyPenalties: false,
      enableScoreExplanation: true,
      dropZoneHighlighting: 'dragging',
      autoAlignSpacing: 2,
      enableFullScreen: false,
      showScorePoints: true,
      showTitle: true,
    },
    grabbablePrefix: 'Grabbable {num} of {total}.',
    grabbableSuffix: 'Placed in dropzone {num}.',
    dropzonePrefix: 'Dropzone {num} of {total}.',
    a11yCheck: 'Check the answers.',
    a11yRetry: 'Retry the task.',
  };
}

/** Build h5p.json for DragQuestion. */
function buildDragH5pJson(title) {
  return {
    title,
    language: 'und',
    mainLibrary: 'H5P.DragQuestion',
    embedTypes: ['iframe'],
    license: 'U',
    preloadedDependencies: [
      { machineName: 'H5P.DragQuestion', majorVersion: 1, minorVersion: 15 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 },
      { machineName: 'jQuery.ui', majorVersion: 1, minorVersion: 10 },
      { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 },
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 },
      { machineName: 'H5P.Components', majorVersion: 1, minorVersion: 0 },
      { machineName: 'H5P.AdvancedText', majorVersion: 1, minorVersion: 1 },
    ],
  };
}

/**
 * Extract images and their associated headings from manifest pages.
 */
function extractImagesWithContext(manifest) {
  const images = [];
  for (const page of (manifest.pages || [])) {
    if (['glossary', 'classroom', 'summary'].includes(page.slot)) continue;
    const html = page.body_html || '';

    // Find each h2 heading and the first image after it
    const headingRe = /<h2[^>]*>(.*?)<\/h2>/gi;
    let headingMatch;
    while ((headingMatch = headingRe.exec(html)) !== null) {
      const headingText = headingMatch[1].replace(/<[^>]+>/g, '').trim();
      if (!headingText || headingText === 'References' || headingText === 'Glossary' || headingText === 'Learning Objectives') continue;

      // Find next image after this heading
      const afterHeading = html.substring(headingMatch.index);
      const imgMatch = afterHeading.match(/src=["'](https?:\/\/[^"']+\.(png|jpg|jpeg|webp))["']/i);
      if (imgMatch) {
        images.push({
          heading: headingText,
          imageUrl: imgMatch[1],
        });
      }
    }
  }
  return images;
}

/** Generate a UUID-like string for H5P subContentId. */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Build content.json for Image Hotspots from analyzed data. */
function buildContentJson(imageUrl, hotspots) {
  return {
    image: {
      path: imageUrl,
      width: 1024,
      height: 1024,
      alt: 'Interactive anatomy diagram',
    },
    backgroundImageAltText: 'Medical education diagram with interactive hotspots',
    iconType: 'icon',
    icon: 'plus',
    color: '#7c3aed',
    hotspots: hotspots.map(h => ({
      position: {
        x: h.x,
        y: h.y,
        legacyPositioning: false,
      },
      header: h.header,
      alwaysFullscreen: false,
      content: [{
        library: 'H5P.Text 1.1',
        params: { text: h.text },
        subContentId: uuid(),
      }],
    })),
  };
}

/** Build h5p.json metadata. */
function buildH5pJson(title) {
  return {
    title,
    language: 'und',
    mainLibrary: 'H5P.ImageHotspots',
    embedTypes: ['iframe'],
    license: 'U',
    preloadedDependencies: [
      { machineName: 'H5P.ImageHotspots', majorVersion: 1, minorVersion: 10 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 },
      { machineName: 'H5P.Transition', majorVersion: 1, minorVersion: 0 },
      { machineName: 'H5P.Text', majorVersion: 1, minorVersion: 1 },
    ],
  };
}

/** Slugify a topic name for directory naming. */
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// ── Extract mode — dump image list for agent-driven analysis ────────

async function runExtract() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Phase 2e EXTRACT: Dumping images for agent analysis — ${subjectCode} [${activityType}]`);
  console.log(`${'═'.repeat(55)}\n`);

  const client = createClient();
  await client.connect();
  const mapping = await getInstitutionMapping(client, subjectCode);

  const tasks = [];

  for (const row of mapping) {
    if (topicIdArg && row.topic_id !== topicIdArg) continue;

    const refRow = await readManifest(client, row.mgmcri_id);
    const manifest = refRow.manifest;
    const images = extractImagesWithContext(manifest);
    if (images.length === 0) continue;

    const selected = images.slice(0, maxImages);
    const codeRange = manifest.an_code_range || manifest.code_range || '';

    for (const img of selected) {
      const baseSlug = `${slugify(row.topic_name)}-${slugify(img.heading)}`;

      if (genHotspots) {
        const actSlug = baseSlug;
        if (!fs.existsSync(path.join(H5P_BASE, actSlug, 'content', 'content.json'))) {
          tasks.push({
            type: 'hotspots', actSlug, topicId: row.topic_id,
            topicName: row.topic_name, heading: img.heading,
            imageUrl: img.imageUrl, codeRange,
          });
        }
      }

      if (genDrag) {
        const actSlug = `${baseSlug}-drag`;
        if (!fs.existsSync(path.join(H5P_BASE, actSlug, 'content', 'content.json'))) {
          tasks.push({
            type: 'drag', actSlug, topicId: row.topic_id,
            topicName: row.topic_name, heading: img.heading,
            imageUrl: img.imageUrl, codeRange,
          });
        }
      }
    }
  }

  await client.end();

  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  const outFile = path.join(EXTRACT_DIR, `${subjectCode}-${activityType}-tasks.json`);
  fs.writeFileSync(outFile, JSON.stringify(tasks, null, 2));
  console.log(`Wrote ${tasks.length} tasks to ${outFile}`);
  console.log(`\nNext: analyze images with agents, then run --apply`);
}

// ── Apply mode — read analyzed data and generate H5P activities ─────

async function runApply() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Phase 2e APPLY: Generating H5P from analyzed data — ${subjectCode} [${activityType}]`);
  console.log(`${'═'.repeat(55)}\n`);

  const tasksFile = path.join(EXTRACT_DIR, `${subjectCode}-${activityType}-tasks.json`);
  if (!fs.existsSync(tasksFile)) {
    console.error(`Tasks file not found: ${tasksFile}\nRun --extract first.`);
    process.exit(1);
  }

  const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
  const analyzed = tasks.filter(t => t.result && t.result.length > 0);
  console.log(`Found ${analyzed.length}/${tasks.length} analyzed tasks\n`);

  let generated = 0, failed = 0;

  for (const task of analyzed) {
    const actDir = path.join(H5P_BASE, task.actSlug);
    if (fs.existsSync(path.join(actDir, 'content', 'content.json'))) {
      console.log(`  [skip] ${task.actSlug} already exists`);
      continue;
    }

    fs.mkdirSync(path.join(actDir, 'content'), { recursive: true });
    const titleBase = `${task.codeRange ? task.codeRange + ' | ' : ''}${task.heading}`;

    if (task.type === 'hotspots') {
      fs.writeFileSync(
        path.join(actDir, 'content', 'content.json'),
        JSON.stringify(buildContentJson(task.imageUrl, task.result), null, 2)
      );
      fs.writeFileSync(
        path.join(actDir, 'h5p.json'),
        JSON.stringify(buildH5pJson(titleBase), null, 2)
      );
    } else {
      const title = `${titleBase} — Label`;
      fs.writeFileSync(
        path.join(actDir, 'content', 'content.json'),
        JSON.stringify(buildDragContentJson(task.imageUrl, task.result, title), null, 2)
      );
      fs.writeFileSync(
        path.join(actDir, 'h5p.json'),
        JSON.stringify(buildDragH5pJson(title), null, 2)
      );
    }

    generated++;
    console.log(`  [ok] ${task.type}: ${task.actSlug}`);
  }

  // Now update manifest external_links
  console.log(`\nUpdating manifest external_links...`);
  const client = createClient();
  await client.connect();
  const mapping = await getInstitutionMapping(client, subjectCode);

  let linked = 0;
  // Group tasks by topic_id to find first slugs
  const byTopic = {};
  for (const t of analyzed) {
    if (!byTopic[t.topicId]) byTopic[t.topicId] = {};
    if (t.type === 'hotspots' && !byTopic[t.topicId].hotspots) byTopic[t.topicId].hotspots = t;
    if (t.type === 'drag' && !byTopic[t.topicId].drag) byTopic[t.topicId].drag = t;
  }

  for (const row of mapping) {
    const topicTasks = byTopic[row.topic_id];
    if (!topicTasks) continue;

    const manifestIds = [row.mgmcri_id, row.sssmcri_id, row.santosh_id];
    const codeRange = topicTasks.hotspots?.codeRange || topicTasks.drag?.codeRange || '';

    for (const manifestId of manifestIds) {
      try {
        const mRow = await readManifest(client, manifestId);
        const m = mRow.manifest;
        if (!m.external_links) m.external_links = [];

        if (topicTasks.hotspots) {
          m.external_links = m.external_links.filter(l => l.slot !== 'h5p_precis');
          m.external_links.push({
            slot: 'h5p_precis',
            title: `${codeRange}${codeRange ? ' | ' : ''}${row.topic_name} — Interactive Precis`,
            url: `${VIEWER_BASE}/${topicTasks.hotspots.actSlug}/`,
            new_tab: true, indent: 1,
          });
        }

        if (topicTasks.drag) {
          m.external_links = m.external_links.filter(l => l.slot !== 'h5p_drag');
          m.external_links.push({
            slot: 'h5p_drag',
            title: `${codeRange}${codeRange ? ' | ' : ''}${row.topic_name} — Label the Diagram`,
            url: `${VIEWER_BASE}/${topicTasks.drag.actSlug}/`,
            new_tab: true, indent: 1,
          });
        }

        await saveManifest(client, manifestId, m, mRow.status);
        linked++;
      } catch (err) {
        console.error(`  [error] Manifest ${manifestId}: ${err.message?.substring(0, 80)}`);
        failed++;
      }
    }
  }

  await client.end();

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`DONE: ${generated} activities generated, ${linked} manifests linked, ${failed} failed`);
  console.log(`${'═'.repeat(55)}`);
}

// ── Direct mode (API-based, original flow) ──────────────────────────

async function runDirect() {
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`Phase 2e: H5P Interactive Precis — ${subjectCode} [${activityType}]`);
  if (dryRun) console.log('Mode: DRY RUN');
  console.log(`${'═'.repeat(55)}\n`);

  const client = createClient();
  await client.connect();

  let mapping;
  try {
    mapping = await getInstitutionMapping(client, subjectCode);
  } catch (err) {
    console.error('Failed to load institution mapping:', err.message);
    await client.end();
    process.exit(1);
  }

  let generated = 0, linked = 0, skipped = 0, failed = 0;

  for (let i = 0; i < mapping.length; i++) {
    const row = mapping[i];
    if (topicIdArg && row.topic_id !== topicIdArg) continue;

    console.log(`\n[${i + 1}/${mapping.length}] ${row.topic_name} (topic_id=${row.topic_id})`);

    const refRow = await readManifest(client, row.mgmcri_id);
    const manifest = refRow.manifest;
    const images = extractImagesWithContext(manifest);
    if (images.length === 0) { console.log('  No images found, skipping'); skipped++; continue; }

    console.log(`  Found ${images.length} images with headings`);
    const selected = images.slice(0, maxImages);
    const codeRange = manifest.an_code_range || manifest.code_range || '';
    let firstHotspotsSlug = null, firstDragSlug = null;

    for (const img of selected) {
      const baseSlug = `${slugify(row.topic_name)}-${slugify(img.heading)}`;

      if (genHotspots) {
        const actSlug = baseSlug;
        const actDir = path.join(H5P_BASE, actSlug);
        if (fs.existsSync(path.join(actDir, 'content', 'content.json'))) {
          if (!firstHotspotsSlug) firstHotspotsSlug = actSlug;
          skipped++;
        } else if (!dryRun) {
          const hotspots = await analyzeImageForHotspots(img.imageUrl, img.heading, row.topic_name);
          if (hotspots.length > 0) {
            fs.mkdirSync(path.join(actDir, 'content'), { recursive: true });
            fs.writeFileSync(path.join(actDir, 'content', 'content.json'), JSON.stringify(buildContentJson(img.imageUrl, hotspots), null, 2));
            fs.writeFileSync(path.join(actDir, 'h5p.json'), JSON.stringify(buildH5pJson(`${codeRange ? codeRange + ' | ' : ''}${img.heading}`), null, 2));
            if (!firstHotspotsSlug) firstHotspotsSlug = actSlug;
            generated++;
            console.log(`    [ok] Hotspots: ${actSlug}`);
          } else { failed++; }
        }
      }

      if (genDrag) {
        const actSlug = `${baseSlug}-drag`;
        const actDir = path.join(H5P_BASE, actSlug);
        if (fs.existsSync(path.join(actDir, 'content', 'content.json'))) {
          if (!firstDragSlug) firstDragSlug = actSlug;
          skipped++;
        } else if (!dryRun) {
          const labels = await analyzeImageForDragLabels(img.imageUrl, img.heading, row.topic_name);
          if (labels.length > 0) {
            fs.mkdirSync(path.join(actDir, 'content'), { recursive: true });
            const title = `${codeRange ? codeRange + ' | ' : ''}${img.heading} — Label`;
            fs.writeFileSync(path.join(actDir, 'content', 'content.json'), JSON.stringify(buildDragContentJson(img.imageUrl, labels, title), null, 2));
            fs.writeFileSync(path.join(actDir, 'h5p.json'), JSON.stringify(buildDragH5pJson(title), null, 2));
            if (!firstDragSlug) firstDragSlug = actSlug;
            generated++;
            console.log(`    [ok] Drag: ${actSlug}`);
          } else { failed++; }
        }
      }
    }

    if (dryRun) continue;

    const manifestIds = [row.mgmcri_id, row.sssmcri_id, row.santosh_id];
    for (const manifestId of manifestIds) {
      try {
        const mRow = await readManifest(client, manifestId);
        const m = mRow.manifest;
        if (!m.external_links) m.external_links = [];

        if (genHotspots && firstHotspotsSlug) {
          m.external_links = m.external_links.filter(l => l.slot !== 'h5p_precis');
          m.external_links.push({ slot: 'h5p_precis', title: `${codeRange}${codeRange ? ' | ' : ''}${row.topic_name} — Interactive Precis`, url: `${VIEWER_BASE}/${firstHotspotsSlug}/`, new_tab: true, indent: 1 });
        }
        if (genDrag && firstDragSlug) {
          m.external_links = m.external_links.filter(l => l.slot !== 'h5p_drag');
          m.external_links.push({ slot: 'h5p_drag', title: `${codeRange}${codeRange ? ' | ' : ''}${row.topic_name} — Label the Diagram`, url: `${VIEWER_BASE}/${firstDragSlug}/`, new_tab: true, indent: 1 });
        }

        await saveManifest(client, manifestId, m, mRow.status);
        linked++;
      } catch (err) {
        console.error(`  [error] Manifest ${manifestId}: ${err.message?.substring(0, 80)}`);
        failed++;
      }
    }
  }

  await client.end();
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`DONE: ${generated} activities generated, ${linked} manifests linked`);
  console.log(`      ${skipped} skipped, ${failed} failed`);
  console.log(`${'═'.repeat(55)}`);
}

// ── Main dispatch ───────────────────────────────────────────────────

async function main() {
  if (extractOnly) return runExtract();
  if (applyOnly) return runApply();
  return runDirect();
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
