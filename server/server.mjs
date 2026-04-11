/**
 * Academe H5P Server — Player-only H5P content server
 *
 * Uses @lumieducation/h5p-server for proper library resolution,
 * jQuery scoping, and xAPI support. Replaces h5p-standalone.
 *
 * Content: ../h5p/activities/{slug}/
 * Libraries: ../h5p/libs/
 * H5P Core: ./node_modules/h5p-php-library/
 *
 * Deploy on Railway: h5p.cbme.in
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as H5P from '@lumieducation/h5p-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3200;

// Paths
const LIBS_PATH = path.resolve(__dirname, '../libs');
const CONTENT_PATH = path.resolve(__dirname, '../activities');
const CORE_PATH = path.resolve(__dirname, 'h5p-core');
const EDITOR_PATH = path.resolve(__dirname, 'h5p-editor');

// Anonymous user for player-only mode
const ANON_USER = {
  id: 'anonymous',
  name: 'Student',
  type: 'local',
  canCreateRestricted: false,
  canInstallRecommended: false,
};

async function main() {
  // H5P Config
  const config = new H5P.H5PConfig(undefined, {
    baseUrl: '',
    contentFilesUrl: '/contentFiles',
    librariesUrl: '/libraries',
    coreUrl: '/core',
    playUrl: '/play',
    sendUsageStatistics: false,
    contentWhitelist: 'json png jpg jpeg gif bmp tif tiff svg eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf doc docx xls xlsx ppt pptx',
    fetchingDisabled: 1,
  });

  // Storage
  const libraryStorage = new H5P.fsImplementations.FileLibraryStorage(LIBS_PATH);
  const contentStorage = new H5P.fsImplementations.FileContentStorage(CONTENT_PATH);

  // URL Generator
  const urlGenerator = new H5P.UrlGenerator(config);

  // Player
  const player = new H5P.H5PPlayer(
    libraryStorage,
    contentStorage,
    config,
    undefined,
    urlGenerator,
  );

  // Express app
  const app = express();

  // CORS for iframe embedding
  app.use(cors({
    origin: [
      'https://sbvlms.cloudintegral.com',
      'https://academe-learn.pages.dev',
      /\.academe-learn\.pages\.dev$/,
      /\.cbme\.in$/,
      'http://localhost:3000',
    ],
    credentials: true,
  }));

  // Serve H5P core JS/CSS
  app.use('/core', express.static(CORE_PATH));

  // Serve library files (JS, CSS, fonts, images)
  app.get('/libraries/:uberName/:file(*)', async (req, res) => {
    try {
      const { uberName, file } = req.params;
      const stream = await libraryStorage.getFileStream(
        H5P.LibraryName.fromUberName(uberName),
        file
      );
      // Set content type based on extension
      const ext = path.extname(file).toLowerCase();
      const mimeTypes = {
        '.js': 'application/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml',
        '.woff': 'font/woff', '.woff2': 'font/woff2',
        '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      stream.pipe(res);
    } catch (err) {
      res.status(404).send('Library file not found');
    }
  });

  // Serve content files (images within content)
  app.get('/contentFiles/:contentId/:file(*)', async (req, res) => {
    try {
      const stream = await contentStorage.getFileStream(
        req.params.contentId,
        req.params.file,
        ANON_USER
      );
      res.setHeader('Cache-Control', 'public, max-age=86400');
      stream.pipe(res);
    } catch (err) {
      res.status(404).send('Content file not found');
    }
  });

  // Player page — H5P server renders complete HTML with proper dependency loading
  app.get('/play/:slug', async (req, res) => {
    try {
      const html = await player.render(req.params.slug, ANON_USER, 'en');
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      res.send(html);
    } catch (err) {
      console.error(`Player error [${req.params.slug}]:`, err.message);
      res.status(500).send(`<h1>Error loading activity</h1><p>${err.message}</p>`);
    }
  });

  // List all available activities
  app.get('/', async (req, res) => {
    try {
      const contentIds = await contentStorage.listContent(ANON_USER);
      const activities = [];
      for (const id of contentIds) {
        try {
          const metadata = await contentStorage.getMetadata(id, ANON_USER);
          activities.push({ id, title: metadata.title || id });
        } catch {
          activities.push({ id, title: id });
        }
      }
      activities.sort((a, b) => a.title.localeCompare(b.title));

      res.json({
        name: 'Academe H5P Server',
        version: '1.0.0',
        activities: activities.length,
        items: activities.map(a => ({
          id: a.id,
          title: a.title,
          playUrl: `/play/${a.id}`,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.listen(PORT, () => {
    console.log(`Academe H5P Server running on port ${PORT}`);
    console.log(`Libraries: ${LIBS_PATH}`);
    console.log(`Content: ${CONTENT_PATH}`);
    console.log(`Player: http://localhost:${PORT}/play/{slug}`);
  });
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
