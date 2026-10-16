// Lógica pura: fechas en hora argentina, aplicabilidad al perfil, filtros, orden y textos.
// Sin DOM: se puede testear con node.

export const TZ = 'America/Argentina/Buenos_Aires';
const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtWd = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' });
const fmtWdLong = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone: 'UTC' });
const fmtDay = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtMoney = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const todayAR = () => fmtISO.format(new Date());
const asDate = (iso) => new Date(iso + 'T12:00:00Z');
export function addDays(iso, n) {
  const d = asDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 0 = lunes … 6 = domingo (mismo índice que genera la ingesta) */
export const weekdayIdx = (iso) => (asDate(iso).getUTCDay() + 6) % 7;
export const weekdayShort = (iso) => fmtWd.format(asDate(iso)).replace('.', '');
export const weekdayLong = (iso) => fmtWdLong.format(asDate(iso));
export const dayLabel = (iso) => fmtDay.format(asDate(iso)).replace('.', '');
export const money = (n) => '$' + fmtMoney.format(n);
export const moneyShort = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : money(n));
export const nextDays = (start, n = 7) => Array.from({ length: n }, (_, i) => addDays(start, i));
export const validOn = (p, iso) => p.sd <= iso && iso <= p.ed && p.d.includes(weekdayIdx(iso));

// ---------- perfil ----------
export const CREDIT_ISSUERS = [
  ['visa', 'Visa'], ['master', 'Mastercard'], ['american_express', 'Amex'], ['cabal', 'Cabal'],
  ['naranja', 'Naranja'], ['dinners_club', 'Diners'], ['confiable', 'Confiable'],
];
export const DEBIT_ISSUERS = [['visa', 'Visa'], ['master', 'Mastercard'], ['maestro', 'Maestro'], ['cabal', 'Cabal']];
export const ISSUER_NAME = Object.fromEntries([...CREDIT_ISSUERS, ...DEBIT_ISSUERS]);

export const BBVA_ID = '049ad22b-c0f0-4733-be35-e31256801ce8';
export const DEFAULT_PROFILE = {
  banks: [BBVA_ID],
  cards: ['c:visa', 'c:master', 'd:visa', 'd:master'],
  pct: true, // pago con transferencia desde MODO (cuenta BBVA)
};

export function cardLabel(code) {
  if (code === 't') return 'Transferencia';
  const [t, iss] = code.split(':');
  return `${ISSUER_NAME[iss] || iss} ${t === 'c' ? 'crédito' : 'débito'}`;
}

export function applies(p, profile) {
  if (!p.b.some((b) => profile.banks.includes(b))) return false;
  if (!p.pm) return true; // sin restricción de medio de pago
  return p.pm.some((m) => (m === 't' ? profile.pct : profile.cards.includes(m)));
}

// ---------- filtros ----------
export const CHANNELS = [
  ['p', 'Presencial', 'i-store'],
  ['o', 'Online', 'i-globe'],
  ['n', 'NFC', 'i-nfc'],
];
export const CHANNEL = Object.fromEntries(CHANNELS.map(([k, label, icon]) => [k, { label, icon }]));
export const DEFAULT_FILTERS = { ch: ['p', 'o'], tipo: 'all', cat: '', minPct: 0, card: '', q: '' };

export const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const haystack = (p, cats) =>
  p._s || (p._s = norm(`${p.pl} ${p.n} ${p.bt} ${p.cat.map((c) => cats[c]?.t || '').join(' ')}`));
export const matchesQuery = (p, words, cats) => words.every((w) => haystack(p, cats).includes(w));

export function passFilters(p, f, cats) {
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

// ---------- orden: % desc, después tope desc (sin tope = mejor), después cuotas ----------
export const pctOf = (p) => (p.cbf ? 0 : p.cb || 0);
const capOf = (p) => (pctOf(p) > 0 ? p.cap || Infinity : 0);
export function compare(a, b) {
  return (
    pctOf(b) - pctOf(a) ||
    capOf(b) - capOf(a) ||
    (b.cbf ? b.cb : 0) - (a.cbf ? a.cb : 0) ||
    (b.q || 0) - (a.q || 0) ||
    a.pl.localeCompare(b.pl, 'es')
  );
}
export const better = (a, b) => (!a ? b : !b ? a : compare(a, b) <= 0 ? a : b);
export const sameRank = (a, b) => !!a && !!b && compare(a, b) === 0;

// ---------- textos ----------
const RESET = { month: 'por mes', week: 'por semana', day: 'por día', promo: 'total' };
export function capText(p) {
  if (!p.cb) return null;
  if (!p.cap) return 'Sin tope';
  const r = RESET[p.capr] ? ` ${RESET[p.capr]}` : '';
  return `Tope ${money(p.cap)}${r}`;
}
/** cifra principal + etiqueta + tipo semántico */
export function benefitOf(p) {
  if (p.cb) return { value: p.cbf ? money(p.cb) : `${p.cb}%`, label: 'reintegro', kind: 'save' };
  if (p.q) return { value: String(p.q), label: 'cuotas s/i', kind: 'cuotas' };
  return { value: '—', label: '', kind: 'cuotas' };
}
export const shortBenefit = (p) => (p.cb ? (p.cbf ? moneyShort(p.cb) : `${p.cb}%`) : p.q ? `${p.q}c` : '—');
export const promoUrl = (p) => `https://www.modo.com.ar/promos/${encodeURIComponent(p.sl)}`;
export const timeBand = (p) => (p.h ? `${p.h[0]}–${p.h[1]} h` : null);
export const placeKey = (p) => norm(p.pl).replace(/\s+/g, ' ') || norm(p.n);
