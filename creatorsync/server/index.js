import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { buildSB7Prompt } from './rewritePrompt.js';

const PORT = Number(process.env.PORT || 3001);
const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ENV_FILES = ['.env.local', '.env'];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const loadDotEnv = () => {
  for (const fileName of ENV_FILES) {
    const filePath = path.join(ROOT_DIR, fileName);
    if (!existsSync(filePath)) continue;

    const contents = readFileSync(filePath, 'utf8');
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;

      const equalsIndex = line.indexOf('=');
      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();

      if (!key || process.env[key]) continue;

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
};

const getOpenAIKey = () => process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const getContentType = (filePath) => MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

const readBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
};

const resolveStaticPath = (requestPath) => {
  const normalized = requestPath === '/' ? '/index.html' : requestPath;
  const safePath = path.normalize(normalized).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(DIST_DIR, safePath);

  if (path.relative(DIST_DIR, candidate).startsWith('..')) {
    return null;
  }

  return candidate;
};

const rewriteScript = async ({ title, content }) => {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY on the server.');
  }

  const prompt = buildSB7Prompt(title, content);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an elite YouTube scriptwriter. Rewrite rough ideas into strong SB7 storytelling scripts with clear structure, momentum, and creator-friendly language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Could not rewrite the script. OpenAI returned ${response.status}.`;
    throw new Error(message);
  }

  return data.choices?.[0]?.message?.content?.trim() || '';
};

const handleRewriteRequest = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { message: 'Method not allowed.' } });
    return;
  }

  try {
    const body = await readBody(req);
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();

    if (!content) {
      sendJson(res, 400, { error: { message: 'Content is required.' } });
      return;
    }

    const rewritten = await rewriteScript({ title, content });
    sendJson(res, 200, { content: rewritten });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Rewrite request failed.';
    sendJson(res, 500, { error: { message } });
  }
};

const serveStatic = async (req, res, pathname) => {
  if (!existsSync(DIST_DIR)) {
    sendJson(res, 503, { error: { message: 'Build output not found. Run npm run build first.' } });
    return;
  }

  let filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendJson(res, 400, { error: { message: 'Invalid path.' } });
    return;
  }

  try {
    const fileStats = existsSync(filePath) ? await stat(filePath) : null;

    if (fileStats?.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const file = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    if (req.method !== 'HEAD') {
      res.end(file);
    } else {
      res.end();
    }
  } catch {
    const indexPath = path.join(DIST_DIR, 'index.html');
    const file = await readFile(indexPath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (req.method !== 'HEAD') {
      res.end(file);
    } else {
      res.end();
    }
  }
};

loadDotEnv();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/rewrite') {
    await handleRewriteRequest(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: { message: 'Method not allowed.' } });
    return;
  }

  await serveStatic(req, res, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`CreatorSync server running on http://localhost:${PORT}`);
});
