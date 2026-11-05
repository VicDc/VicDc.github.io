const LIMITS = {
  nome: [2, 100, 'Scrivi il tuo nome.'],
  attivita: [2, 100, 'Scrivi il tipo di attività, per esempio "ferramenta" o "studio dentistico".'],
  richiesta: [10, 2000, 'Racconta in almeno 10 caratteri cosa vorresti gestire.'],
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { values, errors }. errors is empty when every field is valid.
export function validate(form) {
  const text = (name) => String(form.get(name) ?? '').trim();
  const values = { nome: text('nome'), email: text('email'), attivita: text('attivita'), richiesta: text('richiesta') };
  const errors = {};

  for (const [name, [min, max, message]] of Object.entries(LIMITS)) {
    const { length } = values[name];
    if (length < min) errors[name] = message;
    else if (length > max) errors[name] = `Questo campo accetta al massimo ${max} caratteri.`;
  }
  if (values.email.length > 254 || !EMAIL.test(values.email)) errors.email = 'Scrivi un indirizzo email valido, per esempio nome@esempio.it.';
  if (form.get('consenso') !== 'on') errors.consenso = "Per inviare la richiesta devi accettare l'informativa privacy.";

  return { values, errors };
}
