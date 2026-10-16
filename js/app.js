// UI de Promos MODO — JS vanilla, sin dependencias.
// Render con template strings (todo dato externo pasa por esc()) y eventos delegados.
import * as P from './promos.js';
import { load, save } from './storage.js';

// ---------- utilidades ----------
const $ = (sel, el = document) => el.querySelector(sel);
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const icon = (id, cls = 'icon icon--sm') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? u : null);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const debounce = (fn, ms) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

const PAGE = 30;
const MAX_GROUPS = 40;
const DATA = 'data/';

// ---------- estado ----------
const state = {
  data: null,
  error: null,
  profile: load('profile', P.DEFAULT_PROFILE),
  filters: load('filters', P.DEFAULT_FILTERS),
  tab: load('tab', 'week'),
  theme: load('theme', 'auto'),
  bowQuery: load('bowQuery', ''),
  today: P.todayAR(),
  bandOpen: false,
  dayLimit: {}, // iso -> cantidad visible
  activeDay: 0,
  bowSel: {}, // comercio -> índice de día abierto
  bankQuery: '',
};
const persist = () => {
  save('profile', state.profile);
  save('filters', state.filters);
  save('tab', state.tab);
  save('theme', state.theme);
  save('bowQuery', state.bowQuery);
};

// datos derivados con memo simple
let memoMine = { key: null, list: [] };
function mine() {
  if (!state.data) return [];
  const key = JSON.stringify([state.profile, state.today]);
  if (memoMine.key !== key) {
    memoMine = { key, list: state.data.promos.filter((p) => p.ed >= state.today && P.applies(p, state.profile)) };
  }
  return memoMine.list;
}
function filtered() {
  const f = { ...state.filters, q: state.tab === 'week' ? state.filters.q : '' };
  const cats = state.data?.categories || {};
  return mine().filter((p) => P.passFilters(p, f, cats));
}
const days = () => P.nextDays(state.today, 7);
const cats = () => state.data?.categories || {};
const bankById = () => state.data?.bankById || {};

// ---------- componentes ----------
function bankText(p) {
  const byId = bankById();
  const my = state.profile.banks;
  const mineNames = p.b.filter((b) => my.includes(b)).map((b) => byId[b]?.name).filter(Boolean);
  if (p.b.length > 3) return `${mineNames.join(', ') || 'Bancos'} + ${p.b.length - mineNames.length} adheridos`;
  return p.b.map((b) => byId[b]?.name || 'Banco').join(', ');
}

function promoCard(p, { best = false } = {}) {
  const b = P.benefitOf(p);
  const cap = P.capText(p);
  const band = P.timeBand(p);
  const img = safeUrl(p.img);
  const meta = [];
  if (p.cb && p.q) meta.push(['cuotas', `${p.q} cuotas s/i`]);
  if (cap) meta.push([p.cap ? '' : 'save', cap]);
  if (p.tx) meta.push(['', `Máx ${P.money(p.tx)} por compra`]);
  if (p.min) meta.push(['', `Mín ${P.money(p.min)}`]);
  if (band) meta.push(['warn', `${icon('i-clock')}${band}`, true]);
  if (p.sd > state.today) meta.push(['', `Desde ${p.sd.slice(8)}/${p.sd.slice(5, 7)}`]);
  return `
  <article class="promo${best ? ' promo--best' : ''}">
    ${img
      ? `<img class="promo__thumb" src="${esc(img)}" alt="" width="44" height="44" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
      : `<div class="promo__thumb">${icon('i-tag', 'icon')}</div>`}
    <div class="promo__body">
      <h3 class="promo__place">${esc(p.pl || p.n)}</h3>
      <p class="promo__desc">${esc(p.bt)}</p>
    </div>
    <div class="benefit benefit--${b.kind}"><span class="benefit__value">${esc(b.value)}</span><span class="benefit__label">${b.label}</span></div>
    ${meta.length
      ? `<ul class="meta">${meta.map(([k, t, raw]) => `<li class="meta__item${k ? ` meta__item--${k}` : ''}">${raw ? t : esc(t)}</li>`).join('')}</ul>`
      : ''}
    <footer class="promo__foot">
      <span class="promo__channels">${p.ch
        .map((c) => `<span title="${P.CHANNEL[c].label}">${icon(P.CHANNEL[c].icon)}<span class="sr-only">${P.CHANNEL[c].label}</span></span>`)
        .join('')}</span>
      <span class="promo__bank">${esc(bankText(p))}</span>
      <a class="promo__link" href="${esc(P.promoUrl(p))}" target="_blank" rel="noopener noreferrer">Ver<span class="promo__link-long"> en MODO</span> ${icon('i-external')}<span class="sr-only"> (abre en otra pestaña)</span></a>
    </footer>
  </article>`;
}

const emptyState = (text, action = '') =>
  `<div class="empty">${icon('i-tag', 'icon')}<p>${text}</p>${action}</div>`;

// ---------- vista Semana ----------
function splitWeek(list, ds) {
  const band = [];
  const perDay = ds.map(() => []);
  for (const p of list) {
    const v = ds.map((d) => P.validOn(p, d));
    if (v.every(Boolean)) band.push(p);
    else v.forEach((ok, i) => ok && perDay[i].push(p));
  }
  band.sort(P.compare);
  perDay.forEach((l) => l.sort(P.compare));
  return { band, perDay };
}

function weekView(list) {
  const ds = days();
  const { band, perDay } = splitWeek(list, ds);
  const strip = ds
    .map(
      (d, i) => `<button type="button" class="daystrip__day" data-action="day" data-i="${i}"${i === state.activeDay ? ' aria-current="true"' : ''}
        aria-label="${i === 0 ? 'Hoy' : P.weekdayLong(d)} ${P.dayLabel(d)}: ${perDay[i].length} promos">${i === 0 ? 'hoy' : P.weekdayShort(d)}<span class="daystrip__count">${perDay[i].length}</span></button>`
    )
    .join('');
  const cols = ds
    .map((d, i) => {
      const l = perDay[i];
      const lim = state.dayLimit[d] || PAGE;
      return `<section class="day${i === 0 ? ' day--today' : ''}" aria-label="${i === 0 ? 'Hoy' : P.weekdayLong(d)} ${P.dayLabel(d)}">
        <header class="day__head"><h2 class="day__name">${i === 0 ? 'Hoy' : P.weekdayShort(d)}</h2><span class="day__date">${P.dayLabel(d)}</span><span class="day__count">${l.length} promos</span></header>
        ${l.length ? l.slice(0, lim).map((p) => promoCard(p)).join('') : `<p class="empty">Nada puntual este día.</p>`}
        ${l.length > lim ? `<button type="button" class="btn btn--block" data-action="more" data-day="${d}">Ver ${Math.min(PAGE, l.length - lim)} más (${l.length - lim} restantes)</button>` : ''}
      </section>`;
    })
    .join('');
  const shown = state.bandOpen ? band : band.slice(0, 6);
  return `
    <nav class="daystrip" aria-label="Días de la semana">${strip}</nav>
    <div class="days" id="days">${cols}</div>
    <section class="section" aria-labelledby="band-title">
      <header class="section__head">
        <h2 class="section__title" id="band-title">Válidas toda la semana <span class="count">${band.length}</span></h2>
        ${band.length > 6 ? `<button type="button" class="btn btn--ghost" data-action="band" aria-expanded="${state.bandOpen}">${state.bandOpen ? 'Mostrar menos' : `Ver las ${band.length}`}</button>` : ''}
      </header>
      ${band.length ? `<div class="grid-cards">${shown.map((p) => promoCard(p)).join('')}</div>` : emptyState('No hay promos que valgan los 7 días con estos filtros.')}
    </section>`;
}

// ---------- vista ¿Compro hoy o espero? ----------
function groupsFor(list, query) {
  const q = P.norm(query);
  if (q.length < 2) return null;
  const words = q.split(/\s+/);
  const ds = days();
  const map = new Map();
  for (const p of list) {
    if (!P.matchesQuery(p, words, cats())) continue;
    const k = P.placeKey(p);
    let g = map.get(k);
    if (!g) map.set(k, (g = { key: k, name: p.pl || p.n, cat: cats()[p.cat[0]]?.t, best: ds.map(() => null) }));
    ds.forEach((d, i) => {
      if (P.validOn(p, d)) g.best[i] = P.better(p, g.best[i]);
    });
  }
  const out = [...map.values()].filter((g) => g.best.some(Boolean));
  out.forEach((g) => (g.top = g.best.reduce((a, p) => P.better(a, p), null)));
  out.sort((a, b) => P.compare(a.top, b.top));
  return out;
}

const verdictValue = (p) => (p.cb ? (p.cbf ? P.money(p.cb) : `${p.cb}%`) : `${p.q} cuotas`);
function verdict(g, ds) {
  const today = g.best[0];
  if (today && P.sameRank(today, g.top)) return { kind: 'buy', icon: 'i-check', text: 'Comprá hoy: es el mejor día.' };
  const i = g.best.findIndex((p) => P.sameRank(p, g.top));
  const when = i === 1 ? 'Esperá a mañana' : `Esperá al ${P.weekdayLong(ds[i])}`;
  return {
    kind: 'wait',
    icon: 'i-hourglass',
    text: `${when}: ${verdictValue(g.top)}${today ? ` vs ${verdictValue(today)} hoy` : ', hoy no hay'}.`,
  };
}

function merchantCard(g) {
  const ds = days();
  const sel = state.bowSel[g.key];
  const cells = ds
    .map((d, i) => {
      const p = g.best[i];
      const wd = i === 0 ? 'hoy' : P.weekdayShort(d);
      if (!p) return `<div class="matrix__cell matrix__cell--empty" aria-label="${P.weekdayLong(d)}: sin promo"><span class="matrix__day">${wd}</span><span class="matrix__value">—</span><span class="matrix__sub">&nbsp;</span></div>`;
      const sub = p.cb ? (p.cap ? P.moneyShort(p.cap) : 's/tope') : '';
      return `<button type="button" class="matrix__cell${P.sameRank(p, g.top) ? ' matrix__cell--best' : ''}" data-action="cell" data-key="${esc(g.key)}" data-i="${i}" aria-pressed="${sel === i}"
        aria-label="${esc(`${P.weekdayLong(d)} ${P.dayLabel(d)}: ${p.bt}`)}"><span class="matrix__day">${wd}</span><span class="matrix__value">${esc(P.shortBenefit(p))}</span><span class="matrix__sub">${sub || '&nbsp;'}</span></button>`;
    })
    .join('');
  const v = verdict(g, ds);
  return `<article class="merchant">
    <header class="merchant__head"><h3 class="merchant__name">${esc(g.name)}</h3>${g.cat ? `<span class="merchant__cat">${esc(g.cat)}</span>` : ''}</header>
    <div class="matrix">${cells}</div>
    <p class="verdict verdict--${v.kind}">${icon(v.icon)}${esc(v.text)}</p>
    ${sel != null && g.best[sel] ? promoCard(g.best[sel], { best: P.sameRank(g.best[sel], g.top) }) : ''}
  </article>`;
}

function bowView(list) {
  const groups = groupsFor(list, state.bowQuery);
  if (!groups) return emptyState('Escribí un comercio o rubro y te muestro el mejor beneficio de cada uno de los próximos 7 días.');
  if (!groups.length) return emptyState(`No encontré promos para “${esc(state.bowQuery)}” con tu perfil y filtros.`, clearBtn());
  return `<div class="stack">
    <p class="summary">${groups.length} comercio${groups.length > 1 ? 's' : ''}${groups.length > MAX_GROUPS ? ` · muestro los ${MAX_GROUPS} mejores` : ''} · tocá un día para ver el detalle</p>
    ${groups.slice(0, MAX_GROUPS).map(merchantCard).join('')}
  </div>`;
}

// ---------- filtros ----------
const filtersDirty = () => {
  const f = state.filters;
  return f.tipo !== 'all' || f.cat || f.minPct || f.card || f.ch.join() !== P.DEFAULT_FILTERS.ch.join();
};
const clearBtn = () => (filtersDirty() ? `<button type="button" class="btn btn--ghost" data-action="clear">Limpiar filtros</button>` : '');

function renderFilters() {
  const f = state.filters;
  const c = cats();
  const seen = new Set();
  const catOpts = Object.entries(c)
    .filter(([, v]) => !seen.has(v.t) && seen.add(v.t))
    .sort((a, b) => a[1].t.localeCompare(b[1].t, 'es'));
  const myCards = [...state.profile.cards, ...(state.profile.pct ? ['t'] : [])];
  const PCTS = [0, 10, 15, 20, 25, 30, 40, 50];
  $('#filters').innerHTML = `
    ${P.CHANNELS.map(([k, label, ic]) => `<button type="button" class="chip" data-action="ch" data-v="${k}" aria-pressed="${f.ch.includes(k)}">${icon('i-check', 'icon icon--sm chip__check')}${icon(ic)}${label}</button>`).join('')}
    <div class="seg" role="group" aria-label="Tipo de beneficio">
      ${[['all', 'Todo'], ['cb', 'Reintegro'], ['q', 'Cuotas']].map(([k, l]) => `<button type="button" class="seg__btn" data-action="tipo" data-v="${k}" aria-pressed="${f.tipo === k}">${l}</button>`).join('')}
    </div>
    <select class="select${f.cat ? ' is-active' : ''}" data-filter="cat" aria-label="Rubro">
      <option value="">Todos los rubros</option>
      ${catOpts.map(([id, v]) => `<option value="${esc(id)}"${f.cat === id ? ' selected' : ''}>${esc(v.t)}</option>`).join('')}
    </select>
    <select class="select${f.minPct ? ' is-active' : ''}" data-filter="minPct" aria-label="Porcentaje mínimo">
      ${PCTS.map((n) => `<option value="${n}"${f.minPct === n ? ' selected' : ''}>${n ? `≥ ${n}%` : 'Cualquier %'}</option>`).join('')}
    </select>
    <select class="select${f.card ? ' is-active' : ''}" data-filter="card" aria-label="Tarjeta">
      <option value="">Todas mis tarjetas</option>
      ${myCards.map((k) => `<option value="${k}"${f.card === k ? ' selected' : ''}>${P.cardLabel(k)}</option>`).join('')}
    </select>
    ${clearBtn()}`;
}

// ---------- shell ----------
const THEME_NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
const THEME_LABEL = { auto: 'automático', light: 'claro', dark: 'oscuro' };
function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') root.removeAttribute('data-theme');
  else root.dataset.theme = state.theme;
  const b = $('#theme');
  b.setAttribute('aria-label', `Tema: ${THEME_LABEL[state.theme]}. Cambiar`);
  b.title = `Tema: ${THEME_LABEL[state.theme]}`;
  $('use', b).setAttribute('href', state.theme === 'dark' ? '#i-moon' : '#i-sun');
}

function renderShell() {
  document.querySelectorAll('[data-action="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === state.tab)));
  const input = $('#search');
  const want = state.tab === 'week' ? state.filters.q : state.bowQuery;
  if (input.value !== want) input.value = want;
  input.placeholder = state.tab === 'week' ? 'Buscar comercio o rubro' : 'Comercio o rubro: Carrefour, YPF, farmacia…';
  $('#search-label').textContent = state.tab === 'week' ? 'Buscar comercio o rubro' : '¿Dónde querés comprar?';

  const names = state.profile.banks.map((id) => bankById()[id]?.name).filter(Boolean);
  const bankTxt = names.length > 2 ? `${names.length} bancos` : names.join(', ') || 'Sin banco';
  const iss = [...new Set(state.profile.cards.map((c) => P.ISSUER_NAME[c.split(':')[1]]))].join('/');
  $('#profile-summary').textContent = `${bankTxt} · ${iss || 'sin tarjetas'}`;
  if (state.data?.generated_at) {
    const d = new Date(state.data.generated_at).toLocaleString('es-AR', { timeZone: P.TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    $('#updated').textContent = `Actualizado ${d}`;
  }
}

function renderMain() {
  const main = $('#main');
  if (state.error) {
    main.innerHTML = emptyState(`No pude cargar las promos (${esc(state.error)}). Probá recargar en un rato.`);
    $('#summary').textContent = '';
    return;
  }
  if (!state.data) {
    main.innerHTML = `<div class="stack" aria-hidden="true"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
    return;
  }
  const m = mine();
  if (!m.length) {
    $('#summary').textContent = '';
    main.innerHTML = emptyState('Tu perfil no coincide con ninguna promo. Revisá bancos y tarjetas.', `<button type="button" class="btn btn--primary" data-action="profile">Editar perfil</button>`);
    return;
  }
  const list = filtered();
  $('#summary').textContent = `${list.length} de ${m.length} promos que te aplican · ${state.data.count} vigentes en MODO`;
  if (state.tab === 'week') {
    const prev = $('#days')?.scrollLeft || 0;
    main.innerHTML = weekView(list);
    const el = $('#days');
    if (el) {
      el.scrollLeft = prev;
      el.addEventListener('scroll', onDaysScroll, { passive: true });
    }
  } else {
    main.innerHTML = bowView(list);
  }
}

function render() {
  renderShell();
  renderFilters();
  renderMain();
  persist();
}

// sincroniza la tira de días con el scroll horizontal de las columnas
const onDaysScroll = debounce(() => {
  const el = $('#days');
  const col = el?.firstElementChild;
  if (!col) return;
  const i = Math.max(0, Math.min(6, Math.round(el.scrollLeft / (col.offsetWidth + 12))));
  if (i === state.activeDay) return;
  state.activeDay = i;
  document.querySelectorAll('.daystrip__day').forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
}, 60);

// ---------- perfil (bottom sheet) ----------
let lastFocus = null;
function renderBankList() {
  const q = P.norm(state.bankQuery);
  const banks = state.data.banks;
  const sel = banks.filter((b) => state.profile.banks.includes(b.id));
  const rest = banks.filter((b) => !state.profile.banks.includes(b.id) && (!q || P.norm(b.name).includes(q)));
  $('#banklist').innerHTML = [...sel, ...rest]
    .map((b) => {
      const img = safeUrl(b.image);
      return `<li><label class="check"><input type="checkbox" data-bank="${esc(b.id)}"${state.profile.banks.includes(b.id) ? ' checked' : ''}>
        ${img ? `<img src="${esc(img)}" alt="" width="20" height="20" loading="lazy" referrerpolicy="no-referrer">` : `<span class="check__ph"></span>`}${esc(b.name)}</label></li>`;
    })
    .join('');
  $('#bank-count').textContent = state.profile.banks.length;
}
function renderSheet() {
  const has = (c) => state.profile.cards.includes(c);
  const chips = (prefix, list) =>
    list.map(([k, l]) => `<button type="button" class="chip" data-action="card" data-v="${prefix}:${k}" aria-pressed="${has(`${prefix}:${k}`)}">${icon('i-check', 'icon icon--sm chip__check')}${l}</button>`).join('');
  $('#sheet-cards').innerHTML = `
    <p class="sheet__label">Tarjetas de crédito</p><div class="cluster">${chips('c', P.CREDIT_ISSUERS)}</div>
    <p class="sheet__label" style="margin-top:var(--space-4)">Tarjetas de débito</p><div class="cluster">${chips('d', P.DEBIT_ISSUERS)}</div>
    <label class="check"><input type="checkbox" id="pct"${state.profile.pct ? ' checked' : ''}> Pago con transferencia desde MODO</label>`;
  renderBankList();
}
function openSheet() {
  if (!state.data) return;
  lastFocus = document.activeElement;
  state.bankQuery = '';
  $('#bank-q').value = '';
  renderSheet();
  const s = $('#sheet');
  s.hidden = false;
  document.body.style.overflow = 'hidden';
  $('.sheet__head button', s).focus();
}
function closeSheet() {
  $('#sheet').hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus?.();
  render();
}
function trapFocus(e) {
  const s = $('#sheet');
  if (s.hidden || e.key !== 'Tab') return;
  const f = [...s.querySelectorAll('button, input, select, a[href]')].filter((el) => !el.disabled && el.offsetParent);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) (last.focus(), e.preventDefault());
  else if (!e.shiftKey && document.activeElement === last) (first.focus(), e.preventDefault());
}

// ---------- eventos ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) {
    if (e.target.id === 'sheet') closeSheet(); // click en el fondo
    return;
  }
  const a = t.dataset.action;
  const f = state.filters;
  switch (a) {
    case 'tab':
      if (state.tab === t.dataset.tab) return;
      state.tab = t.dataset.tab;
      render();
      if (state.tab === 'bow') $('#search').focus();
      return;
    case 'theme':
      state.theme = THEME_NEXT[state.theme];
      applyTheme();
      persist();
      return;
    case 'profile':
      openSheet();
      return;
    case 'sheet-close':
      closeSheet();
      return;
    case 'sheet-reset':
      state.profile = structuredClone(P.DEFAULT_PROFILE);
      renderSheet();
      return;
    case 'card': {
      const v = t.dataset.v;
      const cards = state.profile.cards;
      state.profile.cards = cards.includes(v) ? cards.filter((x) => x !== v) : [...cards, v];
      t.setAttribute('aria-pressed', String(state.profile.cards.includes(v)));
      return;
    }
    case 'ch': {
      const v = t.dataset.v;
      const ch = f.ch.includes(v) ? f.ch.filter((x) => x !== v) : [...f.ch, v];
      if (ch.length) f.ch = ch; // nunca vacío
      break;
    }
    case 'tipo':
      f.tipo = t.dataset.v;
      break;
    case 'clear':
      state.filters = { ...structuredClone(P.DEFAULT_FILTERS), q: f.q };
      break;
    case 'day': {
      const i = +t.dataset.i;
      state.activeDay = i;
      document.querySelectorAll('.daystrip__day').forEach((b, j) => (j === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
      $('#days')?.children[i]?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
      return;
    }
    case 'more':
      state.dayLimit[t.dataset.day] = (state.dayLimit[t.dataset.day] || PAGE) + PAGE;
      renderMain();
      return;
    case 'band':
      state.bandOpen = !state.bandOpen;
      renderMain();
      if (!state.bandOpen) $('#band-title')?.scrollIntoView({ block: 'start' });
      return;
    case 'cell': {
      const k = t.dataset.key;
      const i = +t.dataset.i;
      state.bowSel[k] = state.bowSel[k] === i ? null : i;
      renderMain();
      document.querySelector(`[data-action="cell"][data-key="${CSS.escape(k)}"][data-i="${i}"]`)?.focus();
      return;
    }
    default:
      return;
  }
  render();
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.filter) {
    const k = t.dataset.filter;
    state.filters[k] = k === 'minPct' ? +t.value : t.value;
    render();
    $(`[data-filter="${k}"]`)?.focus();
  } else if (t.dataset.bank) {
    const id = t.dataset.bank;
    const b = state.profile.banks;
    state.profile.banks = t.checked ? [...b, id] : b.filter((x) => x !== id);
    $('#bank-count').textContent = state.profile.banks.length;
  } else if (t.id === 'pct') {
    state.profile.pct = t.checked;
  }
});

const onSearch = debounce((v) => {
  if (state.tab === 'week') state.filters.q = v;
  else {
    state.bowQuery = v;
    state.bowSel = {};
  }
  renderMain();
  persist();
}, 150);
$('#search').addEventListener('input', (e) => onSearch(e.target.value));
$('#bank-q').addEventListener('input', debounce((e) => {
  state.bankQuery = e.target.value;
  renderBankList();
}, 100));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
  trapFocus(e);
});

// cambio de día con la app abierta (o al volver a la pestaña)
const refreshToday = () => {
  const t = P.todayAR();
  if (t !== state.today) {
    state.today = t;
    state.dayLimit = {};
    render();
  }
};
document.addEventListener('visibilitychange', refreshToday);
setInterval(refreshToday, 60_000);

// ---------- arranque ----------
applyTheme();
render();
Promise.all(
  ['promos.json', 'bancos.json'].map((f) =>
    fetch(DATA + f).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${f}: HTTP ${r.status}`))))
  )
)
  .then(([p, b]) => {
    state.data = { ...p, banks: b.banks, bankById: Object.fromEntries(b.banks.map((x) => [x.id, x])) };
    render();
  })
  .catch((err) => {
    state.error = err.message;
    render();
  });
