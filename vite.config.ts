import type { NextHandleFunction } from 'connect';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import type { AppData } from './types';
import { EMPTY_APP_DATA, normalizeAppData } from './shared/appDataDefaults';

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'appData.json');

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial = JSON.stringify(normalizeAppData(EMPTY_APP_DATA), null, 2);
    await fs.writeFile(DATA_FILE, initial, 'utf-8');
  }
};

const readAppData = async (): Promise<AppData> => {
  await ensureDataFile();
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return normalizeAppData(JSON.parse(content));
  } catch (error) {
    console.warn('Failed to read persisted data, resetting to defaults.', error);
    const fallback = normalizeAppData(EMPTY_APP_DATA);
    await fs.writeFile(DATA_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
};

const writeAppData = async (data: unknown) => {
  await ensureDataFile();
  const normalized = normalizeAppData(data);
  await fs.writeFile(DATA_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
};

const collectRequestBody = (req: Parameters<NextHandleFunction>[0]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    req.on('error', reject);
  });
};

const dataApiMiddleware: NextHandleFunction = async (req, res, next) => {
  if (!req.url || !req.url.startsWith('/api/data')) {
    return next();
  }

  try {
    if (req.method === 'GET') {
      const data = await readAppData();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return;
    }

    if (req.method === 'POST') {
      const body = await collectRequestBody(req);
      try {
        const parsed = body ? JSON.parse(body) : EMPTY_APP_DATA;
        await writeAppData(parsed);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok' }));
      } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Allow', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }

    res.statusCode = 405;
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    res.end();
  } catch (error) {
    console.error('Data API error', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: '資料存取時發生錯誤' }));
  }
};

const dataApiPlugin = () => ({
  name: 'assettracker-data-api',
  configureServer(server) {
    ensureDataFile().catch((error) => {
      console.error('Unable to initialise data directory.', error);
    });
    server.middlewares.use(dataApiMiddleware);
  },
  configurePreviewServer(server) {
    ensureDataFile().catch((error) => {
      console.error('Unable to initialise data directory.', error);
    });
    server.middlewares.use(dataApiMiddleware);
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    plugins: [react(), dataApiPlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
