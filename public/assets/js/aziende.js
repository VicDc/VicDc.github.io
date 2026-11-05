/* Change these two values when needed. */
const TEMPO_BOZZA = 'entro 5 giorni lavorativi';
const TURNSTILE_SITEKEY = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? '1x00000000000000000000AA' // Cloudflare's public test key
  : 'DA_IMPOSTARE'; // public site key from the Turnstile dashboard
const EMAIL_CONTATTO = 'vicio.dicara@gmail.com';

document.querySelectorAll('[data-tempo-bozza]').forEach((el) => { el.textContent = TEMPO_BOZZA; });

/* ---------- hero demo: plays once, the HTML already holds the final state ---------- */
(function () {
  const demo = document.getElementById('demo');
  const text = document.getElementById('demo-text');
  if (!demo || !text || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const full = text.textContent;
  let i = 0;
  demo.classList.add('is-before', 'is-typing');
  text.textContent = '';
  function type() {
    text.textContent = full.slice(0, ++i);
    if (i < full.length) { setTimeout(type, 38); return; }
    setTimeout(() => demo.classList.remove('is-before', 'is-typing'), 350);
  }
  // Start only when the table is on screen, otherwise nobody sees the change.
  new IntersectionObserver((entries, observer) => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    setTimeout(type, 400);
  }, { threshold: 0.35 }).observe(demo);
})();

/* ---------- request form ---------- */
(function () {
  const form = document.getElementById('form-richiesta');
  if (!form) return;
  const status = document.getElementById('form-status');
  const button = form.querySelector('button[type="submit"]');
  let widget = null;
  let requested = false;

  const CHECK_FAILED = `Il controllo anti-spam non si è caricato. Ricarica la pagina oppure scrivimi a ${EMAIL_CONTATTO}.`;

  // The check loads only near the form, so the top of the page stays light.
  function loadTurnstile() {
    if (requested) return;
    requested = true;
    window.onTurnstileLoad = () => {
      widget = window.turnstile.render('#turnstile', {
        sitekey: TURNSTILE_SITEKEY,
        language: 'it',
        theme: 'dark',
        'error-callback': () => { status.textContent = CHECK_FAILED; return true; },
      });
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    script.async = true;
    script.onerror = () => { status.textContent = CHECK_FAILED; };
    document.head.append(script);
  }
  new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) { loadTurnstile(); observer.disconnect(); }
  }, { rootMargin: '600px' }).observe(form);
  form.addEventListener('focusin', loadTurnstile);

  function showFieldErrors(fields = {}) {
    let first = null;
    form.querySelectorAll('.err').forEach((el) => {
      const name = el.id.replace('err-', '');
      const input = form.elements[name];
      el.textContent = fields[name] || '';
      if (fields[name]) { input.setAttribute('aria-invalid', 'true'); first = first || input; }
      else input.removeAttribute('aria-invalid');
    });
    if (first) first.focus();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    button.disabled = true;
    button.textContent = 'Invio in corso…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      const data = await res.json();
      if (data.ok) {
        document.getElementById('ok-email').textContent = form.elements.email.value.trim();
        form.hidden = true;
        const sent = document.getElementById('form-ok');
        sent.hidden = false;
        sent.querySelector('h3').focus();
        return;
      }
      showFieldErrors(data.fields);
      status.textContent = data.error;
      if (!data.fields && widget !== null) window.turnstile.reset(widget);
    } catch {
      status.textContent = `La richiesta non è partita. Controlla la connessione e riprova, oppure scrivimi a ${EMAIL_CONTATTO}.`;
      if (widget !== null) window.turnstile.reset(widget);
    } finally {
      button.disabled = false;
      button.textContent = 'Invia la richiesta';
    }
  });
})();
