import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const URL_API = 'https://sito.test/api/richiesta';
const realFetch = globalThis.fetch;
let calls, inserts, turnstile, resendOk, dbFails, limited, pending;

const env = () => ({
  TURNSTILE_SECRET_KEY: 's', RESEND_API_KEY: 'k', NOTIFY_TO: 'a@b.it', NOTIFY_FROM: 'c@d.it',
  RATE_LIMITER: { limit: async () => ({ success: !limited }) },
  DB: { prepare: () => ({ bind: (...args) => ({ run: async () => { if (dbFails) throw new Error('down'); inserts.push(args); } }) }) },
});
const ctx = () => ({ waitUntil: (p) => pending.push(p) });

async function post(over = {}, headers = {}) {
  const f = new FormData();
  const data = { nome: 'Anna', email: 'anna@esempio.it', attivita: 'Ferramenta', richiesta: 'Gestire ordini e clienti', consenso: 'on', 'cf-turnstile-response': 't', ...over };
  for (const [k, v] of Object.entries(data)) f.set(k, v);
  const probe = new Request(URL_API, { method: 'POST', body: f });
  const type = probe.headers.get('Content-Type');
  const buf = await probe.arrayBuffer();
  return new Request(URL_API, {
    method: 'POST',
    body: buf,
    headers: { 'Content-Type': type, 'Content-Length': String(buf.byteLength), Origin: 'https://sito.test', ...headers },
  });
}

beforeEach(() => {
  calls = []; inserts = []; pending = []; turnstile = true; resendOk = true; dbFails = false; limited = false;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('turnstile')) return Response.json({ success: turnstile });
    return new Response('{}', { status: resendOk ? 200 : 500 });
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const run = async (req) => {
  const res = await worker.fetch(req, env(), ctx());
  await Promise.all(pending);
  return res;
};

test('saves the request and sends the notification', async () => {
  const res = await run(await post());
  assert.equal(res.status, 201);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0][5], '2026-11');
  assert.ok(calls.some((u) => u.includes('resend')));
});

test('refuses GET, other origins and missing length', async () => {
  assert.equal((await run(new Request(URL_API))).status, 405);
  assert.equal((await run(await post({}, { Origin: 'https://altro.test' }))).status, 403);
  assert.equal((await run(await post({}, { 'Content-Length': '' }))).status, 413);
  assert.equal(inserts.length, 0);
});

test('rate limit stops the request', async () => {
  limited = true;
  assert.equal((await run(await post())).status, 429);
  assert.equal(calls.length, 0);
});

test('field errors do not spend the Turnstile token', async () => {
  const res = await run(await post({ email: 'no' }));
  assert.equal(res.status, 422);
  assert.ok((await res.json()).fields.email);
  assert.equal(calls.length, 0);
});

test('failed Turnstile stores nothing', async () => {
  turnstile = false;
  assert.equal((await run(await post())).status, 403);
  assert.equal(inserts.length, 0);
});

test('database failure returns an error and sends no email', async () => {
  dbFails = true;
  assert.equal((await run(await post())).status, 500);
  assert.ok(!calls.some((u) => u.includes('resend')));
});

test('email failure keeps the request and still succeeds', async (t) => {
  t.mock.method(console, 'error', () => {});
  resendOk = false;
  assert.equal((await run(await post())).status, 201);
  assert.equal(inserts.length, 1);
});
