import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/validate.js';

const form = (over = {}) => {
  const f = new FormData();
  const data = { nome: 'Anna', email: 'anna@esempio.it', attivita: 'Ferramenta', richiesta: 'Gestire ordini e clienti', consenso: 'on', ...over };
  for (const [k, v] of Object.entries(data)) if (v !== null) f.set(k, v);
  return f;
};

test('accepts a complete form and trims values', () => {
  const { values, errors } = validate(form({ nome: '  Anna  ' }));
  assert.deepEqual(errors, {});
  assert.equal(values.nome, 'Anna');
});

for (const [field, bad] of [['nome', ' a '], ['email', 'a@b'], ['email', 'a b@c.it'], ['attivita', ''], ['richiesta', 'corto'], ['richiesta', 'x'.repeat(2001)], ['consenso', null]]) {
  test(`rejects ${field}=${String(bad).slice(0, 12)}`, () => {
    assert.ok(validate(form({ [field]: bad })).errors[field]);
  });
}
