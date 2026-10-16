// Lógica pura: fechas en hora argentina, aplicabilidad al perfil, filtros, orden, ahorro y textos.
// Sin DOM. Script clásico (anda abriendo index.html desde file://): en el navegador queda en
// window.Promos y en node se usa con require('./js/promos.js').
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Promos = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TZ = 'America/Argentina/Buenos_Aires';
  const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const fmtWd = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' });
  const fmtWdLong = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' });
  const fmtDay = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtDayLong = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtMoney = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  const fmtOne = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

  const todayAR = () => fmtISO.format(new Date());
  const asDate = (iso) => new Date(iso + 'T12:00:00Z');
  function addDays(iso, n) {
    const d = asDate(iso);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  /** 0 = lunes … 6 = domingo (mismo índice que genera la ingesta) */
  const weekdayIdx = (iso) => (asDate(iso).getUTCDay() + 6) % 7;
  const weekdayShort = (iso) => fmtWd.format(asDate(iso)).replace('.', '');
  const weekdayLong = (iso) => fmtWdLong.format(asDate(iso));
  const dayLabel = (iso) => fmtDay.format(asDate(iso)).replace('.', '');
  const dayLabelLong = (iso) => fmtDayLong.format(asDate(iso));
  const money = (n) => '$' + fmtMoney.format(Math.round(n));
  /** para celdas angostas: $950 · $7,5k · $12k */
  const moneyCompact = (n) => (n >= 10000 ? `$${fmtMoney.format(Math.round(n / 1000))}k` : n >= 1000 ? `$${fmtOne.format(Math.floor(n / 100) / 10)}k` : money(n));
  const moneyShort = moneyCompact;
  const nextDays = (start, n = 7) => Array.from({ length: n }, (_, i) => addDays(start, i));
  const validOn = (p, iso) => p.sd <= iso && iso <= p.ed && p.d.includes(weekdayIdx(iso));
  /** "Hoy", "Mañana", "Domingo" */
  const relDay = (iso, today) => (iso === today ? 'Hoy' : iso === addDays(today, 1) ? 'Mañana' : cap1(weekdayLong(iso)));
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- ventana de días ----------
  const WINDOW_MIN = 1;
  const WINDOW_MAX = 7;
  const WINDOW_DEFAULT = 2; // hoy + mañana
  const clampWindow = (n) => (Number.isFinite(+n) && n !== null && n !== '' ? Math.max(WINDOW_MIN, Math.min(WINDOW_MAX, Math.round(+n))) : WINDOW_DEFAULT);

  // ---------- perfil ----------
  const CREDIT_ISSUERS = [
    ['visa', 'Visa'], ['master', 'Mastercard'], ['american_express', 'Amex'], ['cabal', 'Cabal'],
    ['naranja', 'Naranja'], ['dinners_club', 'Diners'], ['confiable', 'Confiable'],
  ];
  const DEBIT_ISSUERS = [['visa', 'Visa'], ['master', 'Mastercard'], ['maestro', 'Maestro'], ['cabal', 'Cabal']];
  const ISSUER_NAME = Object.fromEntries([...CREDIT_ISSUERS, ...DEBIT_ISSUERS]);

  const BBVA_ID = '049ad22b-c0f0-4733-be35-e31256801ce8';
  const DEFAULT_PROFILE = {
    banks: [BBVA_ID],
    cards: ['c:visa', 'c:master', 'd:visa', 'd:master'],
    pct: true, // pago con transferencia desde MODO (cuenta BBVA)
  };

  function cardLabel(code) {
    if (code === 't') return 'Transferencia';
    const [t, iss] = code.split(':');
    return `${ISSUER_NAME[iss] || iss} ${t === 'c' ? 'crédito' : 'débito'}`;
  }

  function applies(p, profile) {
    if (!p.b.some((b) => profile.banks.includes(b))) return false;
    if (!p.pm) return true; // sin restricción de medio de pago
    return p.pm.some((m) => (m === 't' ? profile.pct : profile.cards.includes(m)));
  }

  // ---------- filtros ----------
  const CHANNELS = [
    ['p', 'Presencial', 'i-store'],
    ['o', 'Online', 'i-globe'],
    ['n', 'NFC', 'i-nfc'],
  ];
  const CHANNEL = Object.fromEntries(CHANNELS.map(([k, label, icon]) => [k, { label, icon }]));
  const DEFAULT_FILTERS = { ch: ['p', 'o'], tipo: 'all', cat: '', minPct: 0, card: '', q: '' };
  const PCTS = [0, 10, 15, 20, 25, 30, 40, 50];
  const TIPO_LABEL = { cb: 'Solo reintegro', q: 'Solo cuotas' };

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const haystack = (p, cats) =>
    p._s || (p._s = norm(`${p.pl} ${p.n} ${p.bt} ${p.cat.map((c) => (cats[c] && cats[c].t) || '').join(' ')}`));
  const matchesQuery = (p, words, cats) => words.every((w) => haystack(p, cats).includes(w));

  function passFilters(p, f, cats) {
    if (!p.ch.some((c) => f.ch.includes(c))) return false;
    if (f.tipo === 'cb' && !p.cb) return false;
    if (f.tipo === 'q' && !p.q) return false;
    if (f.cat && !p.cat.includes(f.cat)) return false;
    if (f.minPct > 0 && (p.cbf || (p.cb || 0) < f.minPct)) return false;
    if (f.card && p.pm && !p.pm.includes(f.card)) return false;
    const q = norm(f.q);
    if (q && !matchesQuery(p, q.split(/\s+/), cats)) return false;
    return true;
  }

  /** filtros distintos del default (sin la búsqueda), como chips removibles: [{key, label}] */
  function activeFilters(f, cats) {
    const out = [];
    if (f.ch.slice().sort().join() !== DEFAULT_FILTERS.ch.slice().sort().join()) {
      out.push({ key: 'ch', label: f.ch.map((c) => CHANNEL[c].label).join(' + ') });
    }
    if (f.tipo !== 'all') out.push({ key: 'tipo', label: TIPO_LABEL[f.tipo] });
    if (f.cat) out.push({ key: 'cat', label: (cats[f.cat] && cats[f.cat].t) || 'Rubro' });
    if (f.minPct) out.push({ key: 'minPct', label: `${f.minPct}% o más` });
    if (f.card) out.push({ key: 'card', label: cardLabel(f.card) });
    return out;
  }

  // ---------- ahorro ----------
  /**
   * Cuánto te devuelven de una compra de `amount`.
   * reintegro % → min(monto × %, tope por compra, tope del período); monto fijo → min(fijo, monto, topes).
   * Si no llega a la compra mínima, value = 0 y `missing` dice cuánto falta (potential guarda lo que daría).
   */
  function savings(p, amount) {
    amount = Math.max(0, +amount || 0);
    const reaches = !(p.min && amount < p.min);
    const missing = reaches ? 0 : p.min - amount;
    const perCuota = p.q ? Math.round(amount / p.q) : null;
    if (p.cb) {
      const raw = p.cbf ? Math.min(p.cb, amount) : (amount * p.cb) / 100;
      let v = raw;
      let capBy = null;
      if (p.tx && p.tx < v) (v = p.tx), (capBy = 'tx');
      if (p.cap && p.cap < v) (v = p.cap), (capBy = 'cap');
      v = Math.round(v);
      return { kind: 'save', value: reaches ? v : 0, potential: v, raw: Math.round(raw), capBy, reaches, missing, perCuota };
    }
    if (p.q) return { kind: 'cuotas', value: 0, potential: 0, raw: 0, capBy: null, reaches, missing, perCuota };
    return { kind: 'none', value: 0, potential: 0, raw: 0, capBy: null, reaches, missing, perCuota };
  }

  // ---------- orden ----------
  // sin monto: % desc, después tope desc (sin tope = mejor), después monto fijo y cuotas
  const pctOf = (p) => (p.cbf ? 0 : p.cb || 0);
  const capOf = (p) => (pctOf(p) > 0 ? p.cap || Infinity : 0);
  function compare(a, b) {
    return (
      pctOf(b) - pctOf(a) ||
      capOf(b) - capOf(a) ||
      (b.cbf ? b.cb : 0) - (a.cbf ? a.cb : 0) ||
      (b.q || 0) - (a.q || 0) ||
      a.pl.localeCompare(b.pl, 'es')
    );
  }
  /** con monto: las que no llegan al mínimo al fondo, después plata que vuelve desc, después cuotas */
  function compareFor(amount) {
    if (!(amount > 0)) return compare;
    return (a, b) => {
      const sa = savings(a, amount);
      const sb = savings(b, amount);
      return (sb.reaches - sa.reaches) || (sb.value - sa.value) || ((b.q || 0) - (a.q || 0)) || compare(a, b);
    };
  }
  const better = (a, b, cmp = compare) => (!a ? b : !b ? a : cmp(a, b) <= 0 ? a : b);
  /** lo que define "igual de bueno" (para marcar empates de mejor día) */
  function rankKey(p, amount) {
    if (amount > 0) {
      const s = savings(p, amount);
      return `${+s.reaches}|${s.value}|${p.q || 0}`;
    }
    return `${pctOf(p)}|${capOf(p)}|${p.cbf ? p.cb : 0}|${p.q || 0}`;
  }
  const sameRank = (a, b, amount = 0) => !!a && !!b && rankKey(a, amount) === rankKey(b, amount);

  // ---------- textos ----------
  const RESET = { month: 'por mes', week: 'por semana', day: 'por día', promo: 'en total' };
  const RESET_SHORT = { month: '/mes', week: '/semana', day: '/día', promo: ' total' };
  const RESET_CHIP = { month: 'por mes', week: 'por semana', day: 'por día', promo: 'total' };

  function capText(p) {
    if (!p.cb) return null;
    if (!p.cap) return 'Sin tope';
    const r = RESET_CHIP[p.capr] ? ` ${RESET_CHIP[p.capr]}` : '';
    return `Tope ${money(p.cap)}${r}`;
  }
  /** " por mes" / " por semana" / " en total" (o vacío) */
  const capPeriod = (p) => (RESET[p.capr] ? ' ' + RESET[p.capr] : '');
  const capShort = (p) => (p.cap ? `tope ${money(p.cap)}${RESET_SHORT[p.capr] || ''}` : 'sin tope');
  const cuotasText = (q) => `${q} cuotas sin interés`;

  /** frase completa sin monto: "30% de reintegro, hasta $10.000 por mes" */
  function benefitPhrase(p) {
    if (p.cb) {
      let s = p.cbf ? `${money(p.cb)} de reintegro` : `${p.cb}% de reintegro`;
      if (p.q) s += ` y ${p.q} cuotas s/i`; // combinada: abreviado para que entre en 2 líneas
      if (!p.cbf) s += p.cap ? `, hasta ${money(p.cap)}${capPeriod(p)}` : ', sin tope';
      if (p.tx && (!p.cap || p.tx < p.cap)) s += `, máx. ${money(p.tx)} por compra`;
      return s;
    }
    if (p.q) return cuotasText(p.q);
    return p.bt || p.n;
  }

  /** cifra grande de la fila: {value, label, kind: save|cuotas|off} */
  function figureOf(p, amount) {
    if (amount > 0) {
      const s = savings(p, amount);
      if (s.kind === 'save') {
        if (!s.reaches) return { value: p.cbf ? money(p.cb) : `${p.cb}%`, label: 'no llegás', kind: 'off' };
        return { value: money(s.value), label: 'te devuelven', kind: 'save' };
      }
    }
    if (p.cb) return { value: p.cbf ? money(p.cb) : `${p.cb}%`, label: 'reintegro', kind: 'save' };
    if (p.q) return { value: String(p.q), label: 'cuotas s/i', kind: 'cuotas' };
    return { value: '—', label: '', kind: 'cuotas' };
  }

  /** segunda línea de la fila */
  function rowLine(p, amount) {
    if (!(amount > 0)) return benefitPhrase(p);
    const s = savings(p, amount);
    if (s.kind === 'save') {
      const parts = [p.cbf ? 'monto fijo' : `${p.cb}%`];
      parts.push(s.capBy === 'tx' ? `máx. ${money(p.tx)} por compra` : p.cbf ? (p.cap ? capShort(p) : null) : capShort(p));
      if (p.q) parts.push(`${p.q} cuotas s/i`);
      return parts.filter(Boolean).join(' · ');
    }
    if (s.kind === 'cuotas') return `${p.q} cuotas de ${money(s.perCuota)} sin interés`;
    return benefitPhrase(p);
  }

  const HIGH_MIN = 30000;
  const hhmm = (t) => t.replace(/:00$/, '');
  /** alertas ámbar: lo que te puede dejar afuera ese día. [{icon, text}] */
  function alertsFor(p, iso, today, amount) {
    const out = [];
    if (p.h) out.push({ icon: 'i-clock', text: `Solo de ${hhmm(p.h[0])} a ${hhmm(p.h[1])} h` });
    if (p.ed === iso) out.push({ icon: 'i-hourglass', text: iso === today ? 'Termina hoy' : 'Último día' });
    if (p.min) {
      if (amount > 0 && amount < p.min) out.push({ icon: 'i-alert', text: `Mín. ${money(p.min)}, te faltan ${money(p.min - amount)}` });
      else if (!(amount > 0) && p.min >= HIGH_MIN) out.push({ icon: 'i-alert', text: `Compra mínima ${money(p.min)}` });
    }
    return out;
  }

  const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const listJoin = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`);
  function daysText(d) {
    const k = d.join();
    if (d.length === 7) return 'Todos los días';
    if (k === '0,1,2,3,4') return 'De lunes a viernes';
    if (k === '5,6') return 'Sábados y domingos';
    return cap1(listJoin(d.map((i) => DAY_NAMES[i])));
  }
  function vigenciaText(p, today) {
    if (p.sd > today) return `Del ${dayLabelLong(p.sd)} al ${dayLabelLong(p.ed)}`;
    if (p.ed === today) return 'Termina hoy';
    return `Hasta el ${dayLabelLong(p.ed)}`;
  }
  const timeBand = (p) => (p.h ? `De ${hhmm(p.h[0])} a ${hhmm(p.h[1])} h` : null);
  const promoUrl = (p) => `https://www.modo.com.ar/promos/${encodeURIComponent(p.sl)}`;
  const placeKey = (p) => norm(p.pl).replace(/\s+/g, ' ') || norm(p.n);

  // ---------- agrupación para la vista de días ----------
  const GENERIC = new Set(['shoppings', 'transporte', 'primera compra', 'supermercados', 'farmacias', 'gastronomia',
    'indumentaria', 'jugueterias', 'librerias', 'perfumerias', 'estaciones de servicio', 'combustible', 'delivery']);
  /** "Comercios de indumentaria adheridos", "Gastronomía": no es un comercio puntual */
  function isGeneric(p, cats) {
    const k = placeKey(p);
    if (!p.pl || /adherid|^comercios\b|^tiendas\b|^locales\b|^todos los\b/.test(k) || GENERIC.has(k)) return true;
    return Object.values(cats || {}).some((c) => norm(c.t) === k);
  }

  const benefitKey = (p) => `${p.cbf ? 'f' : ''}${p.cb || 0}|${p.q || 0}`;
  const rowKey = (p) => `${placeKey(p)}|${benefitKey(p)}`;
  // dos publicaciones con las mismas condiciones (MODO repite la promo con otra vigencia): una sola variante
  const conditionsKey = (p) => JSON.stringify([p.ch, p.cap || 0, p.capr || '', p.tx || 0, p.min || 0, p.d, p.h || '']);
  /** fusiona mismo comercio + mismo beneficio (cambia canal, tope o días): [{p: mejor variante, variants}] */
  function mergeRows(list, cmp = compare) {
    const map = new Map();
    for (const p of list) {
      const k = rowKey(p);
      const r = map.get(k);
      if (r) r.variants.push(p);
      else map.set(k, { key: k, p, variants: [p] });
    }
    const rows = [...map.values()];
    for (const r of rows) {
      // a igual beneficio, la que dura más (el nombre no desempata: es el mismo comercio)
      r.variants.sort((a, b) => cmp({ ...a, pl: '' }, { ...b, pl: '' }) || (b.ed > a.ed) - (b.ed < a.ed));
      const seen = new Set();
      r.variants = r.variants.filter((v) => !seen.has(conditionsKey(v)) && seen.add(conditionsKey(v)));
      r.p = r.variants[0];
    }
    return rows.sort((a, b) => cmp(a.p, b.p));
  }

  /** separa lo que vale todos los días de la ventana (solo si la ventana tiene 2+ días) */
  function splitWindow(list, ds) {
    const common = [];
    const perDay = ds.map(() => []);
    for (const p of list) {
      const v = ds.map((d) => validOn(p, d));
      if (ds.length > 1 && v.every(Boolean)) common.push(p);
      else v.forEach((ok, i) => ok && perDay[i].push(p));
    }
    return { common, perDay };
  }

  const catTitle = (p, cats) => (cats[p.cat[0]] && cats[p.cat[0]].t) || 'Otros';
  /**
   * Plan de un día: top N comercios puntuales ("Lo mejor de hoy") y el resto agrupado por rubro.
   * `list` = lo propio del día (va a los rubros). `alsoValid` = lo que vale toda la ventana: no se
   * repite en los rubros, pero su mejor promo entra al top si le gana a lo del día (marcada con
   * `everyday`), así "lo mejor de hoy" nunca esconde algo mejor y no se repiten 3 iguales por día.
   * Si una promo del día tiene una gemela en `alsoValid` (mismo comercio y beneficio), van en una
   * sola fila con la mejor variante: nunca se muestra la versión peor y se esconde la mejor.
   * Dentro del rubro van primero las que valen en todo el rubro ("Gastronomía", "Comercios
   * adheridos": las más amplias), después los comercios puntuales; "Otros" al final.
   */
  function planDay(list, cats, cmp = compare, amount = 0, alsoValid = [], topN = 3) {
    const dayKeys = new Set(list.map(rowKey));
    const twins = alsoValid.filter((p) => dayKeys.has(rowKey(p)));
    const rows = mergeRows(list.concat(twins), cmp);
    for (const r of rows) r.everyday = twins.includes(r.p);
    const common = alsoValid.length ? mergeRows(alsoValid, cmp) : [];
    for (const r of rows.concat(common)) r.generic = isGeneric(r.p, cats);
    const reach = (r) => !(amount > 0) || savings(r.p, amount).reaches;
    const featured = (r) => !r.generic && reach(r) && (r.p.cb || r.p.q);
    let best = rows.filter(featured).slice(0, topN);
    const c = common.find((r) => featured(r) && !dayKeys.has(r.key));
    if (c && (best.length < topN || cmp(c.p, best[best.length - 1].p) < 0)) {
      c.everyday = true;
      best = best.concat(c).sort((a, b) => cmp(a.p, b.p)).slice(0, topN);
    }
    if (!best.length) best = rows.concat(common).filter(reach).sort((a, b) => cmp(a.p, b.p)).slice(0, topN);
    const groups = new Map();
    for (const r of rows) {
      const t = catTitle(r.p, cats);
      if (!groups.has(t)) groups.set(t, { title: t, rows: [] });
      groups.get(t).rows.push(r);
    }
    const out = [...groups.values()];
    // las que no llegan al mínimo, al fondo; las de todo el rubro primero
    for (const g of out) g.rows.sort((a, b) => (reach(b) - reach(a)) || (b.generic - a.generic) || cmp(a.p, b.p));
    out.sort((a, b) => (a.title === 'Otros') - (b.title === 'Otros') || b.rows.length - a.rows.length || a.title.localeCompare(b.title, 'es'));
    return { rows, best, groups: out };
  }

  // ---------- monto ----------
  const parseAmount = (s) => Math.min(99999999, parseInt(String(s || '').replace(/\D/g, ''), 10) || 0);
  const formatAmount = (n) => (n > 0 ? fmtMoney.format(n) : '');

  return {
    TZ, todayAR, addDays, weekdayIdx, weekdayShort, weekdayLong, dayLabel, dayLabelLong, relDay, cap1,
    money, moneyCompact, moneyShort, nextDays, validOn,
    WINDOW_MIN, WINDOW_MAX, WINDOW_DEFAULT, clampWindow,
    CREDIT_ISSUERS, DEBIT_ISSUERS, ISSUER_NAME, BBVA_ID, DEFAULT_PROFILE, cardLabel, applies,
    CHANNELS, CHANNEL, DEFAULT_FILTERS, PCTS, norm, haystack, matchesQuery, passFilters, activeFilters,
    savings, pctOf, compare, compareFor, better, rankKey, sameRank,
    capText, capPeriod, capShort, benefitPhrase, figureOf, rowLine, alertsFor, HIGH_MIN, daysText, vigenciaText, timeBand,
    promoUrl, placeKey, isGeneric, mergeRows, splitWindow, planDay, catTitle, parseAmount, formatAmount,
  };
});
