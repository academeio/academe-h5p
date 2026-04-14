/**
 * preview/h5p-host.mjs
 *
 * Generates H5P host pages that load h5p-standalone from CDN
 * and point to the shared libs + per-activity content folders.
 */

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Generate an H5P host page.
 *
 * @param {object} opts
 * @param {string} opts.title        — page title
 * @param {string} opts.topicName    — display name
 * @param {string} opts.codeRange    — competency codes (e.g. "AN10.1-13")
 * @param {string} opts.activityPath — relative path to activity folder from site root (e.g. "/h5p/activities/axilla-hotspots")
 * @param {string} opts.libsPath     — relative path to shared libs (e.g. "/h5p/libs")
 * @param {string} [opts.backUrl]    — link back
 * @param {string} [opts.h5pType]    — 'hotspots' or 'drag' (auto-detected from h5p.json)
 * @returns {string} Full HTML
 */
export function h5pHostPage({ title, topicName, codeRange, activityPath, libsPath, backUrl, h5pType }) {
  const TYPE_CONFIG = {
    hotspots:       { badge: 'Interactive Precis',    color: '#7c3aed', hint: 'Tap the hotspots to explore each structure' },
    drag:           { badge: 'Label the Diagram',     color: '#0891b2', hint: 'Drag the labels onto the correct positions in the diagram' },
    'drag-text':    { badge: 'Drag the Words',        color: '#0d9488', hint: 'Drag the correct words into the blanks' },
    blanks:         { badge: 'Fill in the Blanks',    color: '#0d9488', hint: 'Type the missing words into the blanks' },
    'mark-words':   { badge: 'Mark the Words',        color: '#0d9488', hint: 'Click on the correct words in the text' },
    crossword:      { badge: 'Crossword',             color: '#d97706', hint: 'Complete the crossword puzzle' },
    flashcards:     { badge: 'Flashcards',            color: '#7c3aed', hint: 'Type your answer, then check' },
    'dialog-cards': { badge: 'Dialog Cards',          color: '#7c3aed', hint: 'Flip each card to check your answer' },
    'sort-paragraphs': { badge: 'Sort the Steps',     color: '#0d9488', hint: 'Drag the paragraphs into the correct order' },
    'true-false':   { badge: 'True or False',         color: '#dc2626', hint: 'Decide if the statement is true or false' },
    summary:        { badge: 'Summary',               color: '#2563eb', hint: 'Select the correct statement from each set' },
    multichoice:    { badge: 'Multiple Choice',       color: '#2563eb', hint: 'Select the correct answer(s)' },
    'memory-game':  { badge: 'Memory Game',           color: '#d97706', hint: 'Find all matching pairs' },
    'image-sequencing': { badge: 'Image Sequencing',  color: '#d97706', hint: 'Arrange the images in the correct order' },
    timeline:       { badge: 'Timeline',              color: '#6d28d9', hint: 'Explore the events on the timeline' },
    'interactive-video': { badge: 'Interactive Video', color: '#db2777', hint: 'Watch the video — it will pause for quick checks along the way' },
  };
  const cfg = TYPE_CONFIG[h5pType] || TYPE_CONFIG.hotspots;
  const badgeLabel = cfg.badge;
  const badgeColor = cfg.color;
  const hintText = cfg.hint;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Academe H5P</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#f8fafc;min-height:100vh}
.header{padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;display:flex;align-items:center;gap:12px}
.header .back{color:#94a3b8;text-decoration:none;font-size:1.3em;padding:4px 8px;border-radius:6px;transition:background .2s}
.header .back:hover{background:rgba(148,163,184,.15)}
.header .info{flex:1;min-width:0}
.header h1{font-size:.95em;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header .code{font-size:.75em;color:#94a3b8;margin-top:2px}
.header .brand{display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.header .brand-name{color:#94a3b8;font-size:.6em;font-weight:400;letter-spacing:.05em;text-transform:uppercase}
.header .badge{background:${badgeColor};color:#fff;font-size:.65em;padding:3px 10px;border-radius:12px;font-weight:500;white-space:nowrap}
.wrap{max-width:960px;margin:0 auto;padding:16px}
.h5p-box{background:#fff;border-radius:8px;overflow:hidden;min-height:300px}
.hint{padding:12px 16px;color:#64748b;font-size:.8em;text-align:center}

/* Responsive H5P hotspot icons */
.h5p-image-hotspots{font-size:clamp(10px,2.2vw,22px)!important}
.h5p-image-hotspot{font-size:clamp(10px,2.5vw,24px)!important}
</style>
</head>
<body>

<header class="header">
  ${backUrl ? `<a class="back" href="${esc(backUrl)}" title="Back">&#8592;</a>` : ''}
  <div class="info">
    <h1>${esc(topicName)}</h1>
    ${codeRange ? `<div class="code">${esc(codeRange)}</div>` : ''}
  </div>
  <div class="brand">
    <span class="brand-name">Academe H5P</span>
    <span class="badge">${esc(badgeLabel)}</span>
  </div>
</header>

<div class="wrap">
  <p class="hint">${esc(hintText)}</p>
  <div id="h5p-container" class="h5p-box"></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/h5p-standalone@3.8.2/dist/main.bundle.js"><\/script>
<script>
  new H5PStandalone.H5P(document.getElementById('h5p-container'), {
    h5pJsonPath:   '${esc(activityPath)}',
    librariesPath: '${esc(libsPath)}',
    frameJs:       'https://cdn.jsdelivr.net/npm/h5p-standalone@3.8.2/dist/frame.bundle.js',
    frameCss:      'https://cdn.jsdelivr.net/npm/h5p-standalone@3.8.2/dist/styles/h5p.css',
    fullScreen:    true,
    frame:         false,
  });
<\/script>

</body>
</html>`;
}
