# vicdc site

One Cloudflare Worker serves everything:

- `/`: business page in Italian
- `/portfolio/`: portfolio in English, with the case studies at `/malaria/`, `/lisai/`, `/business-plan/`, `/watershed/`, `/roots/`
- `POST /api/richiesta`: the request form endpoint

`public/` holds everything that gets published. `src/` holds the Worker.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev                 # http://127.0.0.1:8787
```

Locally the form uses the Cloudflare Turnstile test keys. Without `RESEND_API_KEY` the request is saved and no email is sent.

## Checks

```sh
npm test
npm run check-links
```

## First setup on Cloudflare

```sh
npx wrangler login
npx wrangler d1 create vicdc-richieste    # copy database_id into wrangler.toml
npm run db:migrate
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put NOTIFY_TO         # the address that receives notifications
```

Put the public Turnstile site key in `TURNSTILE_SITEKEY`, at the top of `public/assets/js/aziende.js`.

## Deploy

```sh
npm run deploy
```

The repository is also connected to the Worker in Cloudflare, so a push to the production branch can deploy too. Database migrations do not run on deploy: run `npm run db:migrate` after adding one.

## Things you may want to change

| What | Where |
|---|---|
| Time to deliver the draft | `TEMPO_BOZZA` in `public/assets/js/aziende.js` |
| Rate limit | `[[ratelimits]]` in `wrangler.toml` (period can only be 10 or 60 seconds) |
| Sender address | `NOTIFY_FROM` in `wrangler.toml` |
| Privacy notice version | `PRIVACY_VERSION` in `src/worker.js`, together with `public/privacy/` |
| Redirects | `public/_redirects` |
| Security headers | `public/_headers` |

## Requests saved in D1

```sh
npx wrangler d1 execute vicdc-richieste --remote --command "SELECT * FROM richieste ORDER BY id DESC LIMIT 20"
npx wrangler d1 execute vicdc-richieste --remote --command "DELETE FROM richieste WHERE id = 1"
npx wrangler d1 execute vicdc-richieste --remote --command "DELETE FROM richieste WHERE created_at < datetime('now', '-12 months')"
```

Deleting old requests is manual. Keep the period in line with the privacy notice.

## Connecting a domain later

1. Add the custom domain to the Worker in the Cloudflare dashboard.
2. Add the hostname to the Turnstile widget.
3. Replace `https://vicdc.vicio-dicara.workers.dev` in the canonical and Open Graph tags of `public/`.
4. Verify the domain for email and update `NOTIFY_FROM`, or move to the Cloudflare `send_email` binding.
5. Set `workers_dev = false` in `wrangler.toml`.
