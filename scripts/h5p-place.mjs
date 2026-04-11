#!/usr/bin/env node
/**
 * H5P Placement Orchestrator — reads H5P metadata from items.jsonl,
 * evaluates placement context, inserts embeds into manifest pages.
 *
 * Usage:
 *   node scripts/pipeline/h5p-place.mjs                    # process all ready items
 *   node scripts/pipeline/h5p-place.mjs --subject AN       # filter by subject
 *   node scripts/pipeline/h5p-place.mjs --dry-run          # preview without saving
 *   node scripts/pipeline/h5p-place.mjs --monitor          # poll for new items every 30s
 */
import fs from 'fs';
import path from 'path';
import {
  createClient, readManifest, saveManifest, getInstitutionMapping,
  getArg, hasFlag, findHeadingsWithoutImages, findSubSectionsWithoutImages,
  STATUS, env,
} from './lib.mjs';

const H5P_DIR = path.join(process.cwd(), 'output', 'h5p');
const ITEMS_FILE = path.join(H5P_DIR, 'items.jsonl');
const PLACED_FILE = path.join(H5P_DIR, 'placed.jsonl');
const BATCH_STATUS_FILE = path.join(H5P_DIR, 'batch-status.json');

const subjectFilter = getArg('subject');
const dryRun = hasFlag('dry-run');
const monitorMode = hasFlag('monitor');
const pollInterval = parseInt(getArg('interval') || '30', 10) * 1000;

// ── H5P embed HTML rendering ───────────────────────────────────────────────

function renderH5PEmbed(item) {
  // Use pre-built HTML if provided
  if (item.embedHtml) return item.embedHtml;

  const typeLabels = {
    'drag-and-drop': 'Drag & Drop',
    'fill-in-blanks': 'Fill in the Blanks',
    'image-hotspots': 'Image Hotspots',
    'accordion': 'Accordion',
    'flashcards': 'Flashcards',
    'mark-the-words': 'Mark the Words',
    'find-the-hotspot': 'Find the Hotspot',
    'dialog-cards': 'Dialog Cards',
    'interactive-video': 'Interactive Video',
    'course-presentation': 'Course Presentation',
    'quiz': 'Quiz',
  };

  const typeLabel = typeLabels[item.type] || item.type;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<div style="margin:20px 0;border:2px solid #6366f1;border-radius:8px;overflow:hidden;">
<div style="background:#eef2ff;padding:8px 16px;display:flex;align-items:center;gap:8px;">
  <span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75em;font-weight:600;">${esc(typeLabel)}</span>
  <span style="color:#1e293b;font-weight:600;font-size:0.95em;">${esc(item.title)}</span>
</div>
<iframe src="${esc(item.embedUrl)}" width="100%" height="400" frameborder="0" allowfullscreen="allowfullscreen" style="border:none;display:block;"></iframe>
</div>`;
}

function renderH5PLink(item) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<div style="margin:16px 0;padding:14px 20px;border:1px solid #6366f1;border-radius:8px;background:#eef2ff;">
<p style="margin:0 0 6px;color:#4338ca;font-weight:600;font-size:0.95em;">Interactive: ${esc(item.title)}</p>
<p style="margin:0;"><a href="${esc(item.embedUrl)}" target="_blank" style="color:#4f46e5;text-decoration:none;font-weight:500;">Open Interactive Activity &rarr;</a></p>
</div>`;
}

// ── Placement logic ────────────────────────────────────────────────────────

/**
 * Find the best insertion point for an H5P item in a page's HTML.
 * Returns { index, method } or null if no suitable position found.
 */
function findInsertionPoint(pageHtml, item) {
  const { placement } = item;
  if (!placement) return null;

  const strategy = placement.strategy || 'after_heading';
  const target = placement.targetHeading;

  if (strategy === 'end_of_page') {
    return { index: pageHtml.length, method: 'end_of_page' };
  }

  if (strategy === 'as_submodule') {
    return null; // handled separately — added as external URL module item
  }

  // Search headings first
  if (target) {
    const headings = findHeadingsWithoutImages(pageHtml);
    const allHeadings = [...headings];

    // Also search with sub-sections
    const subs = findSubSectionsWithoutImages(pageHtml);
    allHeadings.push(...subs);

    // Exact match
    let match = allHeadings.find(h => h.heading === target);

    // Fuzzy match — contains
    if (!match) {
      match = allHeadings.find(h =>
        h.heading.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(h.heading.toLowerCase())
      );
    }

    if (match) {
      return { index: match.insertAfterIndex, method: strategy };
    }
  }

  // Fallback: find any heading matching competencies
  if (item.competencies?.length) {
    const codePattern = item.competencies.map(c => c.replace('.', '\\.')).join('|');
    const re = new RegExp(`<h2[^>]*>[^<]*(${codePattern})[^<]*</h2>`, 'i');
    const match = re.exec(pageHtml);
    if (match) {
      // Find end of next block after this heading
      const headingEnd = match.index + match[0].length;
      const nextClose = pageHtml.substring(headingEnd).search(/<\/(p|div|ul|ol)>/);
      const insertAt = nextClose >= 0
        ? headingEnd + nextClose + pageHtml.substring(headingEnd + nextClose).match(/<\/(p|div|ul|ol)>/)[0].length
        : headingEnd;
      return { index: insertAt, method: 'competency_match' };
    }
  }

  // Last resort: end of page
  return { index: pageHtml.length, method: 'fallback_end' };
}

// ── Read items ─────────────────────────────────────────────────────────────

function readItems() {
  if (!fs.existsSync(ITEMS_FILE)) return [];
  const lines = fs.readFileSync(ITEMS_FILE, 'utf-8').split('\n').filter(l => l.trim());
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function readPlacedIds() {
  if (!fs.existsSync(PLACED_FILE)) return new Set();
  const lines = fs.readFileSync(PLACED_FILE, 'utf-8').split('\n').filter(l => l.trim());
  return new Set(lines.map(l => {
    try { return JSON.parse(l).id; } catch { return null; }
  }).filter(Boolean));
}

function markPlaced(item, result) {
  const entry = {
    id: item.id,
    topicId: item.topicId,
    title: item.title,
    placedAt: new Date().toISOString(),
    method: result.method,
    slot: result.slot,
    manifestIds: result.manifestIds,
  };
  fs.appendFileSync(PLACED_FILE, JSON.stringify(entry) + '\n');
}

function readBatchStatus() {
  if (!fs.existsSync(BATCH_STATUS_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BATCH_STATUS_FILE, 'utf-8')); } catch { return null; }
}

// ── Main placement pass ────────────────────────────────────────────────────

async function placementPass() {
  const items = readItems();
  const placedIds = readPlacedIds();
  const ready = items.filter(i =>
    i.status === 'ready' &&
    !placedIds.has(i.id) &&
    (!subjectFilter || i.subjectCode === subjectFilter)
  );

  if (!ready.length) {
    console.log('No new items to place.');
    return 0;
  }

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`H5P Placement — ${ready.length} items to place`);
  if (dryRun) console.log('Mode: DRY RUN');
  console.log(`${'═'.repeat(55)}\n`);

  const client = createClient();
  await client.connect();

  let placed = 0, skipped = 0;

  // Group by subject for institution mapping
  const bySubject = {};
  for (const item of ready) {
    if (!bySubject[item.subjectCode]) bySubject[item.subjectCode] = [];
    bySubject[item.subjectCode].push(item);
  }

  for (const [subjectCode, subjectItems] of Object.entries(bySubject)) {
    const mapping = await getInstitutionMapping(client, subjectCode);

    for (const item of subjectItems) {
      const topicRow = mapping.find(m => m.topic_id === item.topicId);
      if (!topicRow) {
        console.log(`  ! Topic ${item.topicId} not found in mapping, skipping`);
        skipped++;
        continue;
      }

      console.log(`[${item.topicName}] ${item.title} (${item.type})`);

      const targetSlot = item.placement?.targetSlot || null;
      const manifestIds = [topicRow.mgmcri_id, topicRow.sssmcri_id, topicRow.santosh_id];
      const placedManifestIds = [];

      // Render HTML based on tier
      const embedHtml = item.tier === 1 ? renderH5PEmbed(item) : renderH5PLink(item);

      for (const manifestId of manifestIds) {
        const instClient = createClient();
        await instClient.connect();

        try {
          const row = await readManifest(instClient, manifestId);
          const manifest = row.manifest;

          // Find the right page
          let targetPage = null;
          if (targetSlot) {
            targetPage = manifest.pages.find(p => p.slot === targetSlot);
          }

          // If no specific slot, search all content pages
          if (!targetPage) {
            for (const page of manifest.pages) {
              if (!page.slot?.startsWith('content')) continue;
              const point = findInsertionPoint(page.body_html, item);
              if (point && point.method !== 'fallback_end') {
                targetPage = page;
                break;
              }
            }
          }

          // Fallback to first content page
          if (!targetPage) {
            targetPage = manifest.pages.find(p => p.slot?.startsWith('content'));
          }

          if (!targetPage) {
            console.log(`    ! No suitable page found for manifest ${manifestId}`);
            continue;
          }

          const point = findInsertionPoint(targetPage.body_html, item);
          if (!point) {
            console.log(`    ! No insertion point found in ${targetPage.slot}`);
            continue;
          }

          if (dryRun) {
            console.log(`    [DRY RUN] Would insert in ${targetPage.slot} via ${point.method}`);
          } else {
            // Check for duplicates — don't insert if same H5P URL already present
            if (targetPage.body_html.includes(item.embedUrl)) {
              console.log(`    Already present in ${targetPage.slot}, skipping`);
              continue;
            }

            targetPage.body_html = targetPage.body_html.substring(0, point.index)
              + '\n' + embedHtml + '\n'
              + targetPage.body_html.substring(point.index);

            await saveManifest(instClient, manifestId, manifest, row.status);
            placedManifestIds.push(manifestId);
          }
        } catch (err) {
          console.log(`    ! Error on manifest ${manifestId}: ${err.message?.slice(0, 60)}`);
        } finally {
          try { await instClient.end(); } catch {}
        }
      }

      if (placedManifestIds.length > 0 || dryRun) {
        const instLabel = placedManifestIds.length === 3 ? 'all 3' : placedManifestIds.length;
        console.log(`  ✓ Placed in ${targetSlot || 'auto'} (${instLabel} institutions)`);
        if (!dryRun) {
          markPlaced(item, {
            method: 'embed',
            slot: targetSlot || 'auto',
            manifestIds: placedManifestIds,
          });
        }
        placed++;
      } else {
        skipped++;
      }
    }
  }

  await client.end();

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`DONE: ${placed} placed, ${skipped} skipped`);
  console.log(`${'═'.repeat(55)}`);

  return placed;
}

// ── Monitor mode ───────────────────────────────────────────────────────────

async function monitor() {
  console.log(`H5P Placement Monitor — polling every ${pollInterval / 1000}s`);
  console.log(`Watching: ${ITEMS_FILE}`);
  console.log(`Press Ctrl+C to stop\n`);

  let lastLineCount = 0;

  while (true) {
    // Check for new items
    const items = readItems();
    if (items.length > lastLineCount) {
      const newCount = items.length - lastLineCount;
      console.log(`\n[${new Date().toLocaleTimeString()}] ${newCount} new items detected`);
      lastLineCount = items.length;

      const placed = await placementPass();
      if (placed > 0) {
        console.log(`Placed ${placed} items. Rebuilding preview...`);
        // Could auto-rebuild preview here
      }
    }

    // Check batch status
    const batch = readBatchStatus();
    if (batch) {
      if (batch.status === 'batch_complete') {
        console.log(`\n[${new Date().toLocaleTimeString()}] Batch complete! Running final placement pass...`);
        await placementPass();
        console.log('Monitor done.');
        break;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (monitorMode) {
    await monitor();
  } else {
    await placementPass();
  }
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
