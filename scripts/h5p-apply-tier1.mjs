#!/usr/bin/env node
/**
 * Apply Tier 1 H5P results — reads batch files, writes H5P activities.
 * Run after agents have populated the `results` key in batch files.
 *
 * Usage: node scripts/pipeline/h5p-apply-tier1.mjs
 */
import fs from 'fs';
import path from 'path';

const H5P_BASE = path.resolve('h5p/activities');
const EXTRACT_DIR = path.resolve('output/h5p-extract');

const TYPE_META = {
  Blanks:         { suffix: 'blanks', machine: 'H5P.Blanks', major: 1, minor: 14, deps: [{machineName:'H5P.Question',majorVersion:1,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'FontAwesome',majorVersion:4,minorVersion:5},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
  Crossword:      { suffix: 'crossword', machine: 'H5P.Crossword', major: 0, minor: 5, deps: [{machineName:'H5P.Question',majorVersion:1,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'H5P.Image',majorVersion:1,minorVersion:1},{machineName:'H5P.MaterialDesignIcons',majorVersion:1,minorVersion:0},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
  Flashcards:     { suffix: 'flashcards', machine: 'H5P.Flashcards', major: 1, minor: 7, deps: [{machineName:'FontAwesome',majorVersion:4,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'H5P.FontIcons',majorVersion:1,minorVersion:0},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
  SortParagraphs: { suffix: 'sort-paragraphs', machine: 'H5P.SortParagraphs', major: 0, minor: 11, deps: [{machineName:'H5P.Question',majorVersion:1,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'FontAwesome',majorVersion:4,minorVersion:5},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
  MarkTheWords:   { suffix: 'mark-words', machine: 'H5P.MarkTheWords', major: 1, minor: 11, deps: [{machineName:'H5P.Question',majorVersion:1,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'FontAwesome',majorVersion:4,minorVersion:5},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
  Summary:        { suffix: 'summary', machine: 'H5P.Summary', major: 1, minor: 10, deps: [{machineName:'H5P.Question',majorVersion:1,minorVersion:5},{machineName:'H5P.JoubelUI',majorVersion:1,minorVersion:3},{machineName:'FontAwesome',majorVersion:4,minorVersion:5},{machineName:'H5P.Components',majorVersion:1,minorVersion:0}] },
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
}

// Collect all batch files
const batchFiles = fs.readdirSync(EXTRACT_DIR)
  .filter(f => f.startsWith('tier1-batch-') && f.endsWith('.json'))
  .sort();

let generated = 0, skipped = 0, failed = 0, noResults = 0;

for (const batchFile of batchFiles) {
  const tasks = JSON.parse(fs.readFileSync(path.join(EXTRACT_DIR, batchFile), 'utf-8'));

  for (const task of tasks) {
    if (!task.results || Object.keys(task.results).length === 0) {
      noResults++;
      continue;
    }

    for (const [type, contentJson] of Object.entries(task.results)) {
      const meta = TYPE_META[type];
      if (!meta) { console.log(`  [skip] Unknown type: ${type}`); continue; }

      const actSlug = `${task.topic_slug}-${meta.suffix}`;
      const actDir = path.join(H5P_BASE, actSlug);

      if (fs.existsSync(path.join(actDir, 'content', 'content.json'))) {
        skipped++;
        continue;
      }

      try {
        fs.mkdirSync(path.join(actDir, 'content'), { recursive: true });
        fs.writeFileSync(
          path.join(actDir, 'content', 'content.json'),
          JSON.stringify(contentJson, null, 2)
        );

        const title = `${task.code_range ? task.code_range + ' | ' : ''}${task.topic_name} — ${meta.machine.replace('H5P.', '')}`;
        fs.writeFileSync(
          path.join(actDir, 'h5p.json'),
          JSON.stringify({
            title, language: 'und', mainLibrary: meta.machine,
            embedTypes: ['iframe'], license: 'U',
            preloadedDependencies: [
              { machineName: meta.machine, majorVersion: meta.major, minorVersion: meta.minor },
              ...meta.deps,
            ],
          }, null, 2)
        );

        generated++;
      } catch (err) {
        console.error(`  [error] ${actSlug}: ${err.message.substring(0, 80)}`);
        failed++;
      }
    }
  }
}

console.log(`\nApply complete:`);
console.log(`  Generated: ${generated}`);
console.log(`  Skipped (exists): ${skipped}`);
console.log(`  No results: ${noResults}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total activities in h5p/activities/: ${fs.readdirSync(H5P_BASE).filter(d => !d.startsWith('.')).length}`);
