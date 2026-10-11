import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes';
import { getDb } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPort = process.env.PORT;
const isSocket = Boolean(rawPort && isNaN(Number(rawPort)));
const PORT = isSocket ? rawPort : (Number(rawPort) || 3000);

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Health check routes for Cloud Run / hosting container probes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API endpoints
  app.use('/api', apiRouter);

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isBundledServer = __filename.endsWith('server.js');
  const isExplicitDev = !isBundledServer && (process.env.NODE_ENV === 'development' || Boolean(process.env.npm_lifecycle_event?.includes('dev')));
  const isProduction = isBundledServer || process.env.NODE_ENV === 'production' || (hasDist && !isExplicitDev);

  if (!isProduction) {
    try {
      // Dynamic import Vite so production runtime bundle never depends on Vite dev server
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in dev mode.');
    } catch (viteErr) {
      console.warn('Vite dev middleware could not be initialized, falling back to static build:', viteErr);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.resolve(distPath, 'index.html'));
        });
      }
    }
  } else {
    // Production static serving
    if (hasDist) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('Serving production static build from dist.');
    } else {
      console.warn('Warning: dist directory not found. Please run npm run build.');
    }
  }

  // Bind server listener immediately so health checks pass without delay
  if (isSocket) {
    app.listen(PORT, () => {
      console.log(`Vortex Full-Stack Server listening on socket: ${PORT}`);
    });
  } else {
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Vortex Full-Stack Server running on http://0.0.0.0:${PORT}`);
    });
  }

  // Initialize SQLite database asynchronously in parallel
  try {
    await getDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Non-fatal database initialization warning:', err);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
