import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

function getMode() {
  return (process.env.PROMPTINEL_HTTP_MODE || 'live').toLowerCase();
}

function getFixturesDir() {
  return process.env.PROMPTINEL_FIXTURES_DIR || '.promptinel/fixtures';
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function sanitizeHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase();
    if (key === 'authorization' || key === 'x-api-key') continue;
    out[key] = String(v);
  }
  return out;
}

function fixtureKey({ provider, url, method, body }) {
  const base = stableStringify({
    provider,
    url,
    method: method.toUpperCase(),
    body: body ?? null
  });
  return crypto.createHash('sha256').update(base).digest('hex');
}

async function loadFixture(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function saveFixture(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

export async function replayableFetch({ provider, url, init }) {
  const mode = getMode();
  const fixturesDir = getFixturesDir();
  const method = (init?.method || 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : null;

  const key = fixtureKey({ provider, url, method, body });
  const fixturePath = path.join(fixturesDir, `${provider}_${key}.json`);

  if (mode === 'replay') {
    const fx = await loadFixture(fixturePath).catch(() => null);
    if (!fx) {
      throw new Error(
        `Offline replay fixture not found for ${provider} ${method} ${url}. ` +
        `Set PROMPTINEL_HTTP_MODE=record once to generate fixtures. Missing: ${fixturePath}`
      );
    }

    return {
      ok: fx.ok,
      status: fx.status,
      statusText: fx.statusText || '',
      json: async () => fx.json,
      text: async () => fx.text ?? JSON.stringify(fx.json ?? '')
    };
  }

  const res = await fetch(url, init);

  if (mode === 'record') {
    let json = null;
    let text = null;
    try {
      json = await res.clone().json();
    } catch {
      try {
        text = await res.clone().text();
      } catch {
      }
    }

    await saveFixture(fixturePath, {
      recordedAt: new Date().toISOString(),
      provider,
      request: {
        url,
        method,
        headers: sanitizeHeaders(init?.headers || {}),
        body
      },
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      json,
      text
    });
  }

  return res;
}
