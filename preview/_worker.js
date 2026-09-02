/**
 * Cloudflare Pages — advanced-mode Worker.
 *
 * Intercepts requests before the static asset layer. Handles two things:
 *   1. /cc/<path>  →  proxy to assets.academe.org.in/<path>
 *      Reason: WebKit's <track> element enforces same-origin on top of CORS.
 *      Serving VTT captions from the Pages origin via this proxy lets the
 *      H5P iframe fetch them without Safari's "Unsafe attempt to load URL"
 *      block. See memory feedback_bunny_cdn_no_cors.md for context.
 *   2. All other requests → passthrough to the static asset binding.
 *
 * This file lives at the deploy root (alongside index.html and functions/)
 * because advanced-mode `_worker.js` takes precedence over the Functions
 * directory. One file, zero config.
 */

const R2_ORIGIN = 'https://assets.academe.org.in';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/cc/')) {
      const subPath = url.pathname.slice('/cc/'.length);
      if (!subPath) return new Response('not found', { status: 404 });

      const init = { method: request.method, headers: {} };
      const range = request.headers.get('range');
      if (range) init.headers.range = range;

      const upstream = await fetch(`${R2_ORIGIN}/${subPath}`, init);

      const headers = new Headers();
      for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
        const v = upstream.headers.get(h);
        if (v) headers.set(h, v);
      }
      // Captions are small but change when we re-translate/re-emit. ETag-based
      // revalidation on every request is the right balance — the browser asks
      // R2 "is this still current?" via If-None-Match, R2 returns 304 when
      // unchanged (no body re-download), 200 with new content when changed.
      headers.set('cache-control', 'public, max-age=0, must-revalidate');

      // CORS is REQUIRED, not optional. A <track> element is always fetched in
      // CORS mode, so a cross-origin caption file without this header is blocked
      // by the browser and the video simply shows no subtitles — with no visible
      // error on the page.
      //
      // It became cross-origin on 02-09-2026: Interactive Videos now play inside
      // the gated <slug>.cbme.in sites, while their caption tracks are absolute
      // URLs under academe-learn.pages.dev/cc/. Same-origin before, cross-origin
      // now. These are public caption files on an open host, so "*" is correct.
      headers.set('access-control-allow-origin', '*');
      headers.set('timing-allow-origin', '*');

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // Everything else: passthrough to the static asset binding.
    return env.ASSETS.fetch(request);
  },
};
