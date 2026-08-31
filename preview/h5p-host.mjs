/**
 * preview/h5p-host.mjs
 *
 * Generates H5P host pages. The h5p-standalone runtime is SELF-HOSTED at
 * /h5p/standalone/ — deliberately not a CDN.
 *
 * It used to load from cdn.jsdelivr.net. That made every interactive in every
 * course depend on a third party at view time: if a student's network, ad
 * blocker or college firewall blocked jsdelivr, the page shell rendered and the
 * activity silently showed an EMPTY WHITE BOX with no error. Reported from a
 * live Santosh course on 31-08-2026 and reproduced exactly.
 *
 * Keep these paths local. build-preview.mjs copies preview/standalone/ to
 * <out>/h5p/standalone/ in both per-subject and monolith modes.
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
    'interactive-video': { badge: 'Interactive Lecture', color: '#db2777', hint: 'Watch the lecture — it will pause for quick checks along the way' },
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

/* Interactive Video caption (WebVTT ::cue) — bring default down ~20%
   from the browser's default so captions stop crowding the video area. */
video::cue{font-size:80%;background:rgba(0,0,0,.72);line-height:1.3}
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

<script src="/h5p/standalone/main.bundle.js"><\/script>
<script>
  new H5PStandalone.H5P(document.getElementById('h5p-container'), {
    h5pJsonPath:   '${esc(activityPath)}',
    librariesPath: '${esc(libsPath)}',
    frameJs:       '/h5p/standalone/frame.bundle.js',
    frameCss:      '/h5p/standalone/styles/h5p.css',
    fullScreen:    true,
    frame:         false,
  });
<\/script>

</body>
</html>`;
}

/**
 * Generate a minimal embed page — just the H5P player, no navigation header.
 * Served at /h5p/embed/<slug>/ for Canvas iframe embedding.
 *
 * --- HOST IFRAME SIZING CONTRACT ---
 * The H5P interactive video has an intrinsic height ≈ (iframe-width * 0.5625) +
 * ~35px (16:9 video + toolbar). Any host page that embeds this page in a
 * sub-iframe MUST size that sub-iframe to match this aspect, or the bottom
 * toolbar will be clipped on wide monitors.
 *
 * Recommended host wrapper (works inside Canvas's HTML sanitizer):
 *   <div style="position:relative;width:100%;padding-bottom:60%;max-height:1400px;">
 *     <iframe style="position:absolute;top:0;left:0;width:100%;height:100%;..."></iframe>
 *   </div>
 *
 * Do NOT use `aspect-ratio:`, `box-sizing:border-box`, or `height:80vh` in the
 * wrapper — the first two are stripped by Canvas's sanitizer, and the third
 * ties height to viewport instead of iframe width, causing clip on 16:9
 * monitors. Do NOT add `min-height:` either — it adds onto padding-bottom.
 * Reference: canvascbme docs/08-api-findings-and-solutions.md → "H5P iframe sizing".
 *
 * @param {object} opts
 * @param {string} opts.activityPath — e.g. "/h5p/activities/sdl-an-axilla-...-iv"
 * @param {string} opts.libsPath     — e.g. "/h5p/libs"
 * @returns {string} Full HTML
 */
export function h5pEmbedPage({ activityPath, libsPath }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:#fff}
#h5p-container{width:100%;height:100vh}
video::cue{font-size:80%;background:rgba(0,0,0,.72);line-height:1.3}
/* Ensure H5P fullscreen button works inside iframe */
.h5p-content{width:100%!important;height:100%!important}
</style>
</head>
<body>
<div id="h5p-container"></div>
<script src="/h5p/standalone/main.bundle.js"><\/script>
<script>
  new H5PStandalone.H5P(document.getElementById('h5p-container'), {
    h5pJsonPath:   '${esc(activityPath)}',
    librariesPath: '${esc(libsPath)}',
    frameJs:       '/h5p/standalone/frame.bundle.js',
    frameCss:      '/h5p/standalone/styles/h5p.css',
    fullScreen:    true,
    frame:         false,
  });
<\/script>
</body>
</html>`;
}
