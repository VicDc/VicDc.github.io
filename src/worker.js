import { validate } from './validate.js';

const MAX_BODY_BYTES = 16 * 1024;
// Change this when the privacy notice changes, together with /privacy/.
const PRIVACY_VERSION = '2026-11';

const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, error, fields) => reply(status, { ok: false, error, fields });

async function passesTurnstile(token, ip, secret) {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  if (!res.ok) throw new Error(`siteverify returned ${res.status}`);
  return (await res.json()).success === true;
}

async function notify(env, { nome, email, attivita, richiesta }) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_TO) {
    console.warn('Email not configured: request saved, no notification sent');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.NOTIFY_FROM,
      to: env.NOTIFY_TO,
      reply_to: email,
      subject: 'Nuova richiesta di bozza',
      text: `Nome: ${nome}\nEmail: ${email}\nAttività: ${attivita}\n\n${richiesta}`,
    }),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/richiesta') return fail(404, 'Indirizzo non trovato.');
    if (request.method !== 'POST') return fail(405, 'Metodo non consentito.');
    if (request.headers.get('Origin') !== url.origin) return fail(403, 'Invia la richiesta dal form del sito.');

    // A missing length means a chunked body of unknown size: refuse it before reading.
    const length = Number(request.headers.get('Content-Length'));
    if (!length || length > MAX_BODY_BYTES) return fail(413, 'Il testo inviato è troppo lungo.');

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.RATE_LIMITER.limit({ key: ip });
    if (!success) return fail(429, 'Hai inviato troppe richieste. Riprova tra un minuto.');

    let form;
    try {
      form = await request.formData();
    } catch {
      return fail(400, 'Non ho potuto leggere il form. Ricarica la pagina e riprova.');
    }

    // Validate first: a Turnstile token works once, so field errors must not spend it.
    const { values, errors } = validate(form);
    if (Object.keys(errors).length) return fail(422, 'Controlla i campi segnati.', errors);

    let human;
    try {
      human = await passesTurnstile(String(form.get('cf-turnstile-response') ?? ''), ip, env.TURNSTILE_SECRET_KEY);
    } catch (err) {
      console.error('Turnstile check failed:', err.message);
      return fail(503, 'Il controllo anti-spam non risponde. Riprova tra qualche minuto.');
    }
    if (!human) return fail(403, 'Il controllo anti-spam non è riuscito. Riprova.');

    try {
      await env.DB.prepare(
        'INSERT INTO richieste (created_at, nome, email, attivita, richiesta, consenso_versione) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(new Date().toISOString(), values.nome, values.email, values.attivita, values.richiesta, PRIVACY_VERSION).run();
    } catch (err) {
      console.error('D1 insert failed:', err.message);
      return fail(500, 'La richiesta non è stata salvata. Riprova tra qualche minuto.');
    }

    // The request is already saved, so a failed email must not fail the form.
    ctx.waitUntil(notify(env, values).catch((err) => console.error('Notification failed:', err.message)));
    return reply(201, { ok: true });
  },
};
