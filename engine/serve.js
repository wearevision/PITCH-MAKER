#!/usr/bin/env node
// serve.js — servidor estático mínimo para previsualizar propuestas generadas.
// Uso: node engine/serve.js [dir] [port]
//   node engine/serve.js proposals/nua-aniversario-25/dist 5173
// Sin dependencias.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = process.argv[2] || 'proposals/nua-aniversario-25/dist';
const port = Number(process.argv[3] || process.env.PORT || 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    // evita path traversal
    const rel = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(root, rel);
    let s;
    try {
      s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
      /* se maneja abajo */
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 — no encontrado');
  }
});

server.listen(port, () => {
  console.log(`▶ PITCH-MAKER preview  http://localhost:${port}/  (root: ${root})`);
});
