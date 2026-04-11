#!/usr/bin/env node
/**
 * Tier 2 Batch Generator — lists topics that need DragText, Summary, MarkTheWords
 * and their source content (from existing Blanks activities).
 *
 * Outputs a JSON file that subagents consume to generate content.json files.
 *
 * Usage:
 *   node scripts/gen-tier2-batch.mjs --list          # output task list
 *   node scripts/gen-tier2-batch.mjs --list --offset 0 --limit 15
 */
import fs from 'fs';
import path from 'path';

const ACTIVITIES = path.resolve('activities');
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };

const offset = parseInt(getArg('offset') || '0', 10);
const limit = parseInt(getArg('limit') || '999', 10);

const TYPE_META = {
  DragText: {
    suffix: 'drag-text',
    machine: 'H5P.DragText',
    major: 1, minor: 10,
    deps: [
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 },
      { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 },
      { machineName: 'jQuery.ui', majorVersion: 1, minorVersion: 10 },
    ],
  },
  Summary: {
    suffix: 'summary',
    machine: 'H5P.Summary',
    major: 1, minor: 10,
    deps: [
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 },
      { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 },
    ],
  },
  MarkTheWords: {
    suffix: 'mark-words',
    machine: 'H5P.MarkTheWords',
    major: 1, minor: 11,
    deps: [
      { machineName: 'H5P.Question', majorVersion: 1, minorVersion: 5 },
      { machineName: 'H5P.JoubelUI', majorVersion: 1, minorVersion: 3 },
      { machineName: 'FontAwesome', majorVersion: 4, minorVersion: 5 },
    ],
  },
};

// Scan activities directory
const allDirs = fs.readdirSync(ACTIVITIES).filter(d =>
  fs.statSync(path.join(ACTIVITIES, d)).isDirectory()
);

// Find topics that have blanks (as source material indicator)
const blanksSlugs = allDirs
  .filter(d => d.endsWith('-blanks'))
  .map(d => d.replace(/-blanks$/, ''));

const tasks = [];

for (const slug of blanksSlugs) {
  const needed = [];
  for (const [type, meta] of Object.entries(TYPE_META)) {
    const actDir = path.join(ACTIVITIES, `${slug}-${meta.suffix}`);
    if (!fs.existsSync(actDir)) {
      needed.push(type);
    }
  }
  if (needed.length === 0) continue;

  // Read blanks content as source reference
  const blanksPath = path.join(ACTIVITIES, `${slug}-blanks`, 'content', 'content.json');
  let blanksContent = {};
  try { blanksContent = JSON.parse(fs.readFileSync(blanksPath, 'utf-8')); } catch {}

  // Read h5p.json for title/code
  const h5pPath = path.join(ACTIVITIES, `${slug}-blanks`, 'h5p.json');
  let h5pMeta = {};
  try { h5pMeta = JSON.parse(fs.readFileSync(h5pPath, 'utf-8')); } catch {}

  const title = h5pMeta.title || slug;
  const codeRange = title.split('|')[0]?.trim() || '';
  const topicName = (title.split('|')[1] || title).split('—')[0]?.trim() || slug;

  tasks.push({
    slug,
    topicName,
    codeRange,
    needed,
    // Extract question text from blanks as source content
    sourceText: (blanksContent.questions || [])
      .map(q => q.replace(/<[^>]+>/g, '').replace(/\*[^*]+\*/g, '___'))
      .join('\n'),
  });
}

const batch = tasks.slice(offset, offset + limit);
console.log(JSON.stringify(batch, null, 2));
console.error(`Total: ${tasks.length} topics, showing ${offset}-${offset + batch.length}`);
