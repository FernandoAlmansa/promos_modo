// Tests de la lógica pura (js/promos.js). Correr con: node --test tests/
// promos.js es un script clásico (para que la app ande desde file://), así que se carga en un
// contexto aislado igual que en el navegador y se toma window.Promos.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = {};
sandbox.self = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/promos.js'), 'utf8'), sandbox);
const P = sandbox.Promos;
// los objetos creados dentro del contexto tienen otro prototipo: se comparan como datos planos
const plain = (x) => JSON.parse(JSON.stringify(x));

// promo mínima válida; cada test pisa lo que necesita
const promo = (o = {}) => ({ id: 'x', pl: 'Comercio', n: 'Promo', bt: '', sl: 'x', sd: '2026-01-01', ed: '2026-12-31', d: [0, 1, 2, 3, 4, 5, 6], ch: ['p'], b: ['bank'], cat: ['1'], ...o });

test('reintegro %: monto × % cuando no toca ningún tope', () => {
  const s = P.savings(promo({ cb: 30, cap: 10000, capr: 'month' }), 20000);
  assert.equal(s.value, 6000);
  assert.equal(s.capBy, null);
  assert.equal(s.reaches, true);
});

test('tope del período: 30% de $50.000 serían $15.000, pero el tope es $10.000/mes', () => {
  const p = promo({ cb: 30, cap: 10000, capr: 'month' });
  const s = P.savings(p, 50000);
  assert.equal(s.value, 10000);
  assert.equal(s.raw, 15000);
  assert.equal(s.capBy, 'cap');
  assert.deepEqual(plain(P.figureOf(p, 50000)), { value: '$10.000', label: 'te devuelven', kind: 'save' });
  assert.equal(P.rowLine(p, 50000), '30% · tope $10.000/mes');
});

test('tope por compra: gana el menor entre tope por compra y tope del período', () => {
  const p = promo({ cb: 20, tx: 3000, cap: 10000, capr: 'week' });
  const s = P.savings(p, 50000);
  assert.equal(s.value, 3000);
  assert.equal(s.capBy, 'tx');
  assert.equal(P.rowLine(p, 50000), '20% · máx. $3.000 por compra');
  // si el tope del período es más chico que el de la compra, manda el del período
  assert.equal(P.savings(promo({ cb: 20, tx: 8000, cap: 5000 }), 50000).value, 5000);
});

test('mínimo no alcanzado: no devuelve nada, dice cuánto falta y va al fondo', () => {
  const p = promo({ pl: 'Con mínimo', cb: 25, min: 15000, cap: 20000 });
  const s = P.savings(p, 10000);
  assert.equal(s.reaches, false);
  assert.equal(s.value, 0);
  assert.equal(s.missing, 5000);
  assert.equal(s.potential, 2500);
  assert.equal(P.figureOf(p, 10000).label, 'no llegás');
  const alerts = P.alertsFor(p, '2026-10-16', '2026-10-16', 10000).map((a) => a.text);
  assert.ok(alerts.includes('Mín. $15.000, te faltan $5.000'), alerts.join(' | '));
  // con el monto justo ya llega
  assert.equal(P.savings(p, 15000).value, 3750);
  // orden: aunque tenga más %, la que no llega queda después
  const chica = promo({ pl: 'Sin mínimo', cb: 5 });
  const sorted = [p, chica].sort(P.compareFor(10000));
  assert.deepEqual(plain(sorted.map((x) => x.pl)), ['Sin mínimo', 'Con mínimo']);
});

test('monto fijo: devuelve el monto fijo (nunca más que la compra)', () => {
  const p = promo({ cb: 9593, cbf: 1 });
  assert.equal(P.savings(p, 50000).value, 9593);
  assert.equal(P.savings(p, 5000).value, 5000);
  assert.equal(P.benefitPhrase(p), '$9.593 de reintegro');
  assert.deepEqual(plain(P.figureOf(p, 0)), { value: '$9.593', label: 'reintegro', kind: 'save' });
});

test('solo cuotas: no hay plata que vuelva, se muestra el valor de cada cuota', () => {
  const p = promo({ q: 6 });
  const s = P.savings(p, 50000);
  assert.equal(s.kind, 'cuotas');
  assert.equal(s.value, 0);
  assert.equal(s.perCuota, 8333);
  assert.equal(P.benefitPhrase(p), '6 cuotas sin interés');
  assert.equal(P.rowLine(p, 50000), '6 cuotas de $8.333 sin interés');
  assert.deepEqual(plain(P.figureOf(p, 50000)), { value: '6', label: 'cuotas s/i', kind: 'cuotas' });
});

test('frases sin monto', () => {
  assert.equal(P.benefitPhrase(promo({ cb: 30, cap: 10000, capr: 'month' })), '30% de reintegro, hasta $10.000 por mes');
  assert.equal(P.benefitPhrase(promo({ cb: 25 })), '25% de reintegro, sin tope');
  assert.equal(P.benefitPhrase(promo({ cb: 30, q: 6, cap: 40000, capr: 'promo' })), '30% de reintegro y 6 cuotas s/i, hasta $40.000 en total');
});

test('con monto, el orden es por plata que vuelve (no por %)', () => {
  const alto = promo({ pl: '40% tope chico', cb: 40, cap: 2000 });
  const bajo = promo({ pl: '20% sin tope', cb: 20 });
  assert.deepEqual(plain([alto, bajo].sort(P.compare).map((x) => x.pl)), ['40% tope chico', '20% sin tope']);
  assert.deepEqual(plain([alto, bajo].sort(P.compareFor(50000)).map((x) => x.pl)), ['20% sin tope', '40% tope chico']);
});

test('fusiona mismo comercio + mismo beneficio que solo cambia de canal o tope', () => {
  const a = promo({ pl: 'Comercios de indumentaria adheridos', cb: 30, q: 6, cap: 50000, ch: ['p'] });
  const b = promo({ pl: 'Comercios de indumentaria adheridos', cb: 30, q: 6, ch: ['o'] });
  const c = promo({ pl: 'Otro', cb: 30, q: 6 });
  const rows = P.mergeRows([a, b, c]);
  assert.equal(rows.length, 2);
  const merged = rows.find((r) => r.variants.length === 2);
  assert.equal(merged.p, b); // sin tope gana
  assert.equal(P.isGeneric(a, {}), true);
  assert.equal(P.isGeneric(c, {}), false);
});

test('ventana: lo que vale todos los días va aparte (solo con 2+ días)', () => {
  const diaria = promo({ pl: 'Diaria', cb: 10 });
  const viernes = promo({ pl: 'Viernes', cb: 20, d: [4] });
  const ds = ['2026-10-16', '2026-10-17']; // viernes y sábado
  const w2 = P.splitWindow([diaria, viernes], ds);
  assert.deepEqual(plain(w2.common.map((p) => p.pl)), ['Diaria']);
  assert.deepEqual(plain(w2.perDay.map((l) => l.map((p) => p.pl))), [['Viernes'], []]);
  const w1 = P.splitWindow([diaria, viernes], ds.slice(0, 1));
  assert.equal(w1.common.length, 0);
  assert.deepEqual(plain(w1.perDay[0].map((p) => p.pl)), ['Diaria', 'Viernes']);
});

test('lo mejor del día: entra a lo sumo una de "todos los días", marcada', () => {
  const dia = [promo({ pl: 'A', cb: 20 }), promo({ pl: 'B', cb: 15 }), promo({ pl: 'C', cb: 10 })];
  const todos = [promo({ pl: 'Top', cb: 40 }), promo({ pl: 'Top2', cb: 35 })];
  const plan = P.planDay(dia, {}, P.compare, 0, todos);
  assert.deepEqual(plain(plan.best.map((r) => r.p.pl)), ['Top', 'A', 'B']);
  assert.equal(plan.best[0].everyday, true);
  // los rubros no repiten lo de todos los días
  assert.deepEqual(plain(plan.groups.flatMap((g) => g.rows.map((r) => r.p.pl))), ['A', 'B', 'C']);
});

test('ventana y monto: límites y formato', () => {
  assert.equal(P.clampWindow(0), 1);
  assert.equal(P.clampWindow(9), 7);
  assert.equal(P.clampWindow('x'), P.WINDOW_DEFAULT);
  assert.equal(P.parseAmount('$ 50.000'), 50000);
  assert.equal(P.formatAmount(50000), '50.000');
  assert.equal(P.moneyCompact(7500), '$7,5k');
  assert.equal(P.moneyCompact(12000), '$12k');
});

// Caso real (BBVA, oct 2026): "Gastronomía" 20% jue y vie tope $20.000 (may26) y la misma promo
// todos los días con tope $25.000 (jul26, repetida como ago26 y sep26). El rubro del viernes
// mostraba la peor y escondía la mejor en "Todos los días".
test('gemela en "todos los días": una sola fila con la mejor variante', () => {
  const juevesViernes = promo({ pl: 'Gastronomia', sl: 'may26', cb: 20, cap: 20000, capr: 'month', d: [3, 4], cat: ['2'] });
  const todos = ['jul26', 'ago26', 'sep26'].map((sl, i) => promo({ pl: i ? 'Gastronomía' : 'Gastronomia', sl, cb: 20, cap: 25000, capr: 'month', ed: `2027-0${i + 1}-28`, cat: ['2'] }));
  const cats = { 2: { t: 'Gastronomía' } };
  const plan = P.planDay([juevesViernes], cats, P.compare, 0, todos);
  const g = plan.groups.find((x) => x.title === 'Gastronomía');
  assert.equal(g.rows.length, 1);
  const r = g.rows[0];
  assert.equal(r.p.cap, 25000); // muestra la mejor
  assert.equal(r.everyday, true);
  // las tres publicaciones idénticas cuentan como una variante (la que dura más); más la de jue y vie
  assert.equal(r.variants.length, 2);
  assert.equal(r.p.sl, 'sep26');
  assert.equal(P.isGeneric(r.p, cats), true);
});

test('dentro del rubro, lo que vale en todo el rubro va primero', () => {
  const cats = { 2: { t: 'Gastronomía' } };
  const resto = promo({ pl: 'La Parrilla', cb: 25, cat: ['2'] });
  const rubro = promo({ pl: 'Comercios adheridos', cb: 20, cat: ['2'] });
  const plan = P.planDay([resto, rubro], cats);
  assert.deepEqual(plain(plan.groups[0].rows.map((x) => x.p.pl)), ['Comercios adheridos', 'La Parrilla']);
  // pero no compite en "lo mejor del día"
  assert.deepEqual(plain(plan.best.map((x) => x.p.pl)), ['La Parrilla']);
});
