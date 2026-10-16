// UI de Promos MODO — JS vanilla, sin dependencias. Script clásico (anda también desde file://).
// Render con template strings (todo dato externo pasa por esc()) y eventos delegados.
(function () {
  'use strict';
  const P = window.Promos;
  const { load, save } = window.PromosStorage;

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

  const GROUP_PAGE = 15; // filas visibles por rubro antes de "Ver más"
  const ALL_PEEK = 3; // "Todos los días" cerrado: se ven igual las 3 mejores
  const ALL_PAGE = 12; // abierto: de a 12
  const MAX_GROUPS = 40; // comercios en "¿Compro hoy o espero?"
  const BOW_DAYS = 7;
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
    amount: P.parseAmount(load('amount', 0)),
    win: P.clampWindow(load('days', P.WINDOW_DEFAULT)), // días en la ventana
    today: P.todayAR(),
    activeDay: 0, // primer día visible de la ventana
    openCats: new Set(), // rubros abiertos (compartido entre días)
    catLimit: {},
    allOpen: false,
    allLimit: ALL_PAGE,
    bankQuery: '',
  };
  if (!Array.isArray(state.filters.ch) || !state.filters.ch.length) state.filters.ch = [...P.DEFAULT_FILTERS.ch];
  const persist = () => {
    save('profile', state.profile);
    save('filters', state.filters);
    save('tab', state.tab);
    save('theme', state.theme);
    save('bowQuery', state.bowQuery);
    save('amount', state.amount);
    save('days', state.win);
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
    return mine().filter((p) => P.passFilters(p, f, cats()));
  }
  const cats = () => (state.data && state.data.categories) || {};
  const bankById = () => (state.data && state.data.bankById) || {};
  const cmpNow = () => P.compareFor(state.amount);

  // columnas visibles según el ancho: 1 en mobile, 2 en tablet, 3 en desktop (nunca 7 apretadas)
  const mq2 = matchMedia('(min-width: 720px)');
  const mq3 = matchMedia('(min-width: 1100px)');
  const visCols = () => Math.min(state.win, mq3.matches ? 3 : mq2.matches ? 2 : 1);
  const clampActive = (i = state.activeDay) => Math.max(0, Math.min(i, state.win - visCols()));

  // filas renderizadas: el panel de detalle las busca por id
  let reg = new Map();
  const regRow = (row, iso) => {
    const id = 'r' + reg.size;
    reg.set(id, { row, iso });
    return id;
  };

  // ---------- componentes ----------
  function bankText(p) {
    const byId = bankById();
    const my = p.b.filter((b) => state.profile.banks.includes(b)).map((b) => byId[b] && byId[b].name).filter(Boolean);
    const others = p.b.length - my.length;
    if (!others) return my.join(', ');
    return `${my.join(', ')} y ${others} banco${others > 1 ? 's' : ''} más`;
  }
  function pmText(p) {
    if (!p.pm) return 'Cualquier medio de pago de MODO';
    const mineSet = new Set([...state.profile.cards, ...(state.profile.pct ? ['t'] : [])]);
    const yours = p.pm.filter((m) => mineSet.has(m)).map(P.cardLabel);
    const rest = p.pm.length - yours.length;
    return `${yours.join(', ')}${rest ? ` (y ${rest} medio${rest > 1 ? 's' : ''} más)` : ''}`;
  }
  const channelsHTML = (ch) =>
    `<span class="facts__channels">${ch.map((c) => `<span>${icon(P.CHANNEL[c].icon)}${P.CHANNEL[c].label}</span>`).join('')}</span>`;

  // una sola nota corta junto al nombre (si hay varias, la más útil)
  // "todo el rubro" solo si el nombre no lo dice ya ("…adheridos") y el rubro es uno de verdad (no "Otros")
  const wholeRubro = (r) => r.generic && !/adherid/i.test(r.p.pl) && P.catTitle(r.p, cats()) !== 'Otros';
  const note = (r) => {
    const t = r.everyday ? 'todos los días' : wholeRubro(r) ? 'todo el rubro' : r.variants.length > 1 ? `${r.variants.length} opciones` : '';
    return t ? `<span class="prow__note">${t}</span>` : '';
  };

  /** fila escaneable: cifra · comercio + condición · chevron */
  function rowHTML(r, iso) {
    const p = r.p;
    const amt = state.amount;
    const fig = P.figureOf(p, amt);
    const alerts = P.alertsFor(p, iso, state.today, amt);
    const n = r.variants.length;
    return `<li><button type="button" class="prow" data-action="detail" data-id="${regRow(r, iso)}" aria-haspopup="dialog">
      <span class="prow__fig prow__fig--${fig.kind}${fig.value.length > 5 ? ' prow__fig--long' : ''}"><span class="prow__value">${esc(fig.value)}</span><span class="prow__label">${fig.label}</span></span>
      <span class="prow__body">
        <span class="prow__top"><span class="prow__name">${esc(p.pl || p.n)}</span>${note(r)}</span>
        <span class="prow__line">${esc(P.rowLine(p, amt))}</span>
        ${alerts.length ? `<span class="prow__alert">${icon(alerts[0].icon)}${esc(alerts.map((a) => a.text).join(' · '))}</span>` : ''}
      </span>
      ${icon('i-chevron-right', 'icon prow__chev')}
    </button></li>`;
  }

  /** "hasta 30%" / "hasta $10.000" / "6 cuotas" para encabezados */
  function bestText(p) {
    if (!p) return '';
    if (state.amount > 0) {
      const s = P.savings(p, state.amount);
      if (s.kind === 'save' && s.reaches) return `hasta ${P.money(s.value)}`;
    }
    if (p.cb) return `hasta ${p.cbf ? P.money(p.cb) : p.cb + '%'}`;
    if (p.q) return `${p.q} cuotas`;
    return '';
  }

  const emptyState = (text, action = '') => `<div class="empty">${icon('i-tag', 'icon')}<p>${text}</p>${action}</div>`;

  // ---------- vista Calendario ----------
  const bestTitle = (iso) => {
    const r = P.relDay(iso, state.today);
    return r === 'Hoy' ? 'Lo mejor de hoy' : r === 'Mañana' ? 'Lo mejor de mañana' : `Lo mejor del ${P.weekdayLong(iso)}`;
  };

  function groupHTML(g, iso) {
    const open = state.openCats.has(g.title);
    const lim = state.catLimit[g.title] || GROUP_PAGE;
    const top = g.rows.reduce((a, r) => P.better(a, r.p, cmpNow()), null);
    return `<details class="rgroup" data-cat="${esc(g.title)}"${open ? ' open' : ''}>
      <summary class="rgroup__head">
        <span class="rgroup__title">${esc(g.title)}</span><span class="count">${g.rows.length}</span>
        <span class="rgroup__best">${esc(bestText(top))}</span>${icon('i-chevron-down', 'icon rgroup__chev')}
      </summary>
      <ul class="plist">${g.rows.slice(0, lim).map((r) => rowHTML(r, iso)).join('')}</ul>
      ${g.rows.length > lim ? `<button type="button" class="btn btn--ghost btn--block" data-action="more-cat" data-cat="${esc(g.title)}">Ver ${g.rows.length - lim} más</button>` : ''}
    </details>`;
  }

  function dayHTML(iso, list, common) {
    const plan = P.planDay(list, cats(), cmpNow(), state.amount, common);
    const total = list.length + common.length;
    const rel = P.relDay(iso, state.today);
    const isToday = iso === state.today;
    const best = plan.best.length
      ? `<section class="daybest" aria-label="${esc(bestTitle(iso))}">
          <h3 class="daybest__title">${icon('i-trend')}${esc(bestTitle(iso))}</h3>
          <ul class="plist">${plan.best.map((r) => rowHTML(r, iso)).join('')}</ul>
        </section>`
      : '';
    const groups = plan.groups.length
      ? `<div class="rgroups">
          <h3 class="rgroups__title">${common.length ? 'Solo este día, por rubro' : 'Por rubro'}</h3>
          ${plan.groups.map((g) => groupHTML(g, iso)).join('')}
        </div>`
      : `<p class="empty">${total ? 'Nada que valga solo este día: el resto está en «Todos los días», más abajo.' : 'No hay promos este día con tus filtros.'}</p>`;
    const body = best + groups;
    return `<section class="day${isToday ? ' day--today' : ''}" data-day="${iso}" data-total="${total}" aria-label="${esc(`${rel}, ${P.weekdayLong(iso)} ${P.dayLabel(iso)}`)}">
      <header class="day__head"><h2 class="day__name">${esc(rel)}</h2><span class="day__date">${esc(rel === P.cap1(P.weekdayLong(iso)) ? P.dayLabel(iso) : `${P.weekdayShort(iso)} ${P.dayLabel(iso)}`)}</span><span class="day__count">${total} promo${total === 1 ? '' : 's'}</span></header>
      ${body}
    </section>`;
  }

  function weekView(list) {
    const ds = P.nextDays(state.today, state.win);
    const { common, perDay } = P.splitWindow(list, ds);
    state.activeDay = clampActive();
    const V = visCols();
    const visible = (i) => i >= state.activeDay && i < state.activeDay + V;
    const tabs = ds
      .map((d, i) => {
        const rel = P.relDay(d, state.today);
        const short = rel === 'Hoy' || rel === 'Mañana' ? rel : P.weekdayShort(d);
        const n = perDay[i].length + common.length;
        return `<button type="button" class="daywin__day" data-action="day" data-i="${i}"${visible(i) ? ' aria-current="true"' : ''}
          aria-label="${esc(`${rel}, ${P.weekdayLong(d)} ${P.dayLabel(d)}: ${n} promos`)}"><span class="daywin__name">${esc(short)}</span><span class="daywin__date">${P.dayLabel(d)}</span></button>`;
      })
      .join('');
    const cols = [];
    for (let i = state.activeDay; i < state.activeDay + V; i++) cols.push(dayHTML(ds[i], perDay[i], common));

    let all = '';
    if (common.length) {
      // nunca cerrado del todo: las 3 mejores se ven siempre (acá suele estar lo más amplio)
      const rows = P.mergeRows(common, cmpNow());
      rows.forEach((r) => (r.generic = P.isGeneric(r.p, cats())));
      const sub = state.win === 2 ? 'Valen hoy y mañana' : `Valen los ${state.win} días que estás viendo`;
      const lim = state.allOpen ? state.allLimit : ALL_PEEK;
      const toggle = rows.length > ALL_PEEK
        ? `<button type="button" class="btn btn--ghost btn--block" data-action="all-toggle" aria-expanded="${state.allOpen}" aria-controls="alldays-list">${state.allOpen ? 'Mostrar menos' : `Ver las ${rows.length}`}</button>`
        : '';
      all = `<section class="rgroup rgroup--all" id="alldays" aria-labelledby="alldays-title">
        <header class="rgroup__head rgroup__head--static">
          <h2 class="rgroup__title" id="alldays-title">Todos los días <span class="rgroup__sub">${sub}</span></h2><span class="count">${rows.length}</span>
          <span class="rgroup__best">${esc(bestText(rows[0] && rows[0].p))}</span>
        </header>
        <ul class="plist plist--grid" id="alldays-list">${rows.slice(0, lim).map((r) => rowHTML(r, ds[0])).join('')}</ul>
        ${state.allOpen && rows.length > lim ? `<button type="button" class="btn btn--ghost btn--block" data-action="more-all">Ver ${rows.length - lim} más</button>` : ''}
        ${toggle}
      </section>`;
    }

    return `
      <nav class="daywin" aria-label="Días que estás viendo">
        <div class="daywin__scroll" id="daywin">
          ${tabs}
          <button type="button" class="daywin__add" data-action="day-add"${state.win >= P.WINDOW_MAX ? ' disabled' : ''}>${icon('i-plus')}Agregar día</button>
          <button type="button" class="btn btn--icon btn--ghost daywin__remove" data-action="day-remove" aria-label="Quitar el último día"${state.win <= P.WINDOW_MIN ? ' disabled' : ''}>${icon('i-minus', 'icon')}</button>
        </div>
      </nav>
      <div class="days" id="days" style="--cols:${V}">${cols.join('')}</div>
      ${all}`;
  }

  // ---------- vista ¿Compro hoy o espero? ----------
  function groupsFor(list, query) {
    const q = P.norm(query);
    if (q.length < 2) return null;
    const words = q.split(/\s+/);
    const ds = P.nextDays(state.today, BOW_DAYS);
    const cmp = cmpNow();
    const map = new Map();
    for (const p of list) {
      if (!P.matchesQuery(p, words, cats())) continue;
      const k = P.placeKey(p);
      let g = map.get(k);
      if (!g) map.set(k, (g = { key: k, name: p.pl || p.n, cat: P.catTitle(p, cats()), best: ds.map(() => null) }));
      ds.forEach((d, i) => {
        if (P.validOn(p, d)) g.best[i] = P.better(p, g.best[i], cmp);
      });
    }
    const out = [...map.values()].filter((g) => g.best.some(Boolean));
    out.forEach((g) => (g.top = g.best.reduce((a, p) => P.better(a, p, cmp), null)));
    out.sort((a, b) => cmp(a.top, b.top));
    return out;
  }

  /** "te devuelven $7.500" / "30%" / "6 cuotas" */
  function verdictValue(p) {
    if (!p) return '';
    if (state.amount > 0 && p.cb) {
      const s = P.savings(p, state.amount);
      return s.reaches ? P.money(s.value) : 'nada (no llegás al mínimo)';
    }
    return p.cb ? (p.cbf ? P.money(p.cb) : `${p.cb}%`) : `${p.q} cuotas`;
  }
  function verdict(g, ds) {
    const amt = state.amount;
    const today = g.best[0];
    const money = amt > 0 && g.top.cb;
    if (today && P.sameRank(today, g.top, amt)) {
      return { kind: 'buy', icon: 'i-check', text: money ? `Comprá hoy: te devuelven ${verdictValue(today)}, lo máximo de la semana.` : 'Comprá hoy: es el mejor día.' };
    }
    const i = g.best.findIndex((p) => P.sameRank(p, g.top, amt));
    const when = i === 1 ? 'Esperá a mañana' : `Esperá al ${P.weekdayLong(ds[i])}`;
    const best = verdictValue(g.top);
    if (money) {
      return { kind: 'wait', icon: 'i-hourglass', text: `${when}: te devuelven ${best}${today ? ` y hoy ${verdictValue(today)}` : '; hoy no hay promo'}.` };
    }
    return { kind: 'wait', icon: 'i-hourglass', text: `${when}: ${best}${today ? ` vs ${verdictValue(today)} hoy` : ', hoy no hay'}.` };
  }

  function cellValue(p) {
    const amt = state.amount;
    if (amt > 0 && p.cb) {
      const s = P.savings(p, amt);
      return { v: s.reaches ? P.moneyCompact(s.value) : '$0', sub: s.reaches ? (p.cbf ? 'fijo' : `${p.cb}%`) : 'mín.' };
    }
    return { v: p.cb ? (p.cbf ? P.moneyCompact(p.cb) : `${p.cb}%`) : `${p.q}c`, sub: p.cb ? (p.cap ? P.moneyCompact(p.cap) : 's/tope') : 's/int.' };
  }

  function merchantCard(g) {
    const ds = P.nextDays(state.today, BOW_DAYS);
    const cells = ds
      .map((d, i) => {
        const p = g.best[i];
        const wd = i === 0 ? 'hoy' : P.weekdayShort(d);
        if (!p) return `<div class="matrix__cell matrix__cell--empty" role="img" aria-label="${P.weekdayLong(d)}: sin promo"><span class="matrix__day">${wd}</span><span class="matrix__value">—</span><span class="matrix__sub">&nbsp;</span></div>`;
        const c = cellValue(p);
        const id = regRow({ p, variants: [p] }, d);
        return `<button type="button" class="matrix__cell${P.sameRank(p, g.top, state.amount) ? ' matrix__cell--best' : ''}" data-action="detail" data-id="${id}" aria-haspopup="dialog"
          aria-label="${esc(`${P.weekdayLong(d)} ${P.dayLabel(d)}: ${P.rowLine(p, state.amount)}`)}"><span class="matrix__day">${wd}</span><span class="matrix__value">${esc(c.v)}</span><span class="matrix__sub">${esc(c.sub)}</span></button>`;
      })
      .join('');
    const v = verdict(g, ds);
    return `<article class="merchant">
      <header class="merchant__head"><h3 class="merchant__name">${esc(g.name)}</h3>${g.cat ? `<span class="merchant__cat">${esc(g.cat)}</span>` : ''}</header>
      <div class="matrix">${cells}</div>
      <p class="verdict verdict--${v.kind}">${icon(v.icon)}${esc(v.text)}</p>
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
  const activeF = () => P.activeFilters(state.filters, cats());
  const clearBtn = () => (activeF().length ? `<button type="button" class="btn btn--ghost" data-action="clear">Limpiar filtros</button>` : '');

  function renderActiveFilters() {
    const list = activeF();
    const box = $('#active-filters');
    box.hidden = !list.length;
    box.innerHTML = list
      .map((f) => `<button type="button" class="chip chip--remove" data-action="unfilter" data-k="${f.key}">${esc(f.label)}${icon('i-x')}<span class="sr-only">: quitar filtro</span></button>`)
      .join('') + (list.length > 1 ? `<button type="button" class="btn btn--ghost btn--sm" data-action="clear">Limpiar todo</button>` : '');
    const n = list.length;
    $('#filters-btn').innerHTML = `${icon('i-filter', 'icon')}<span>Filtros</span>${n ? `<span class="count count--on">${n}</span>` : ''}`;
    $('#filters-btn').setAttribute('aria-label', n ? `Filtros, ${n} activo${n > 1 ? 's' : ''}` : 'Filtros');
  }

  function renderFilterSheet() {
    const f = state.filters;
    const c = cats();
    const seen = new Set();
    const catOpts = Object.entries(c)
      .filter(([, v]) => !seen.has(v.t) && seen.add(v.t))
      .sort((a, b) => a[1].t.localeCompare(b[1].t, 'es'));
    const myCards = [...state.profile.cards, ...(state.profile.pct ? ['t'] : [])];
    $('#fsheet-body').innerHTML = `
      <section><p class="sheet__label" id="fl-ch">Dónde pagás</p>
        <div class="cluster" role="group" aria-labelledby="fl-ch">${P.CHANNELS.map(([k, label, ic]) => `<button type="button" class="chip" data-action="ch" data-v="${k}" aria-pressed="${f.ch.includes(k)}">${icon('i-check', 'icon icon--sm chip__check')}${icon(ic)}${label}</button>`).join('')}</div>
        <p class="summary">El NFC de MODO funciona solo en Android.</p></section>
      <section><p class="sheet__label" id="fl-tipo">Tipo de beneficio</p>
        <div class="seg" role="group" aria-labelledby="fl-tipo">${[['all', 'Todo'], ['cb', 'Reintegro'], ['q', 'Cuotas']].map(([k, l]) => `<button type="button" class="seg__btn" data-action="tipo" data-v="${k}" aria-pressed="${f.tipo === k}">${l}</button>`).join('')}</div></section>
      <section><label class="sheet__label" for="f-cat">Rubro</label>
        <select class="select select--block${f.cat ? ' is-active' : ''}" id="f-cat" data-filter="cat">
          <option value="">Todos los rubros</option>
          ${catOpts.map(([id, v]) => `<option value="${esc(id)}"${f.cat === id ? ' selected' : ''}>${esc(v.t)}</option>`).join('')}
        </select></section>
      <section><label class="sheet__label" for="f-min">Reintegro mínimo</label>
        <select class="select select--block${f.minPct ? ' is-active' : ''}" id="f-min" data-filter="minPct">
          ${P.PCTS.map((n) => `<option value="${n}"${f.minPct === n ? ' selected' : ''}>${n ? `${n}% o más` : 'Cualquier %'}</option>`).join('')}
        </select></section>
      <section><label class="sheet__label" for="f-card">Tarjeta</label>
        <select class="select select--block${f.card ? ' is-active' : ''}" id="f-card" data-filter="card">
          <option value="">Todas mis tarjetas</option>
          ${myCards.map((k) => `<option value="${k}"${f.card === k ? ' selected' : ''}>${P.cardLabel(k)}</option>`).join('')}
        </select></section>`;
    const n = state.data ? filtered().length : 0;
    $('#fsheet-done').textContent = `Ver ${n} promo${n === 1 ? '' : 's'}`;
  }

  // ---------- panel de detalle ----------
  function heroHTML(p) {
    const amt = state.amount;
    if (amt > 0) {
      const s = P.savings(p, amt);
      if (!s.reaches) {
        const atMin = P.savings(p, p.min);
        return `<div class="hero hero--off"><p class="hero__value">No llegás al mínimo</p>
          <p class="hero__sub">La compra mínima es ${P.money(p.min)}: te faltan ${P.money(s.missing)}.${atMin.kind === 'save' ? ` Comprando ${P.money(p.min)} te devolverían ${P.money(atMin.value)}.` : ''}</p></div>`;
      }
      if (s.kind === 'save') {
        let why;
        if (p.cbf) why = 'Reintegro de monto fijo.';
        else if (s.capBy === 'cap') why = `${p.cb}% de ${P.money(amt)} serían ${P.money(s.raw)}, pero el tope es ${P.money(p.cap)}${P.capPeriod(p)}.`;
        else if (s.capBy === 'tx') why = `${p.cb}% de ${P.money(amt)} serían ${P.money(s.raw)}, pero el máximo por compra es ${P.money(p.tx)}.`;
        else why = `${p.cb}% de ${P.money(amt)}${p.cap ? `, con tope de ${P.money(p.cap)}${P.capPeriod(p)}` : ', sin tope'}.`;
        const period = p.cap && ['month', 'week', 'day'].includes(p.capr) ? ' Si ya usaste parte del tope en el período, te devuelven menos.' : '';
        const q = p.q ? ` Además: ${p.q} cuotas sin interés de ${P.money(s.perCuota)}.` : '';
        return `<div class="hero hero--save"><p class="hero__value">Te devuelven <span class="num">${P.money(s.value)}</span></p>
          <p class="hero__sub">${esc(why + q + period)}</p></div>`;
      }
      if (s.kind === 'cuotas') {
        return `<div class="hero hero--cuotas"><p class="hero__value"><span class="num">${p.q}</span> cuotas de <span class="num">${P.money(s.perCuota)}</span></p>
          <p class="hero__sub">Sin interés, sobre una compra de ${P.money(amt)}. No tiene reintegro.</p></div>`;
      }
    }
    // sin monto: la cifra arriba y abajo solo lo que la condiciona (sin repetir el %)
    const fig = P.figureOf(p, 0);
    const sub = [];
    if (p.cb && !p.cbf) sub.push(p.cap ? `Hasta ${P.money(p.cap)}${P.capPeriod(p)}.` : 'Sin tope.');
    if (p.tx && (!p.cap || p.tx < p.cap)) sub.push(`Máximo ${P.money(p.tx)} por compra.`);
    if (p.cb && p.q) sub.push(`Además, ${p.q} cuotas sin interés.`);
    if (p.cb) sub.push('Cargá cuánto vas a gastar y te digo cuánto te devuelven.');
    return `<div class="hero hero--${fig.kind}"><p class="hero__value"><span class="num">${esc(fig.value)}</span> ${esc(fig.label === 'cuotas s/i' ? 'cuotas sin interés' : fig.label === 'reintegro' ? 'de reintegro' : '')}</p>
      ${sub.length ? `<p class="hero__sub">${esc(sub.join(' '))}</p>` : ''}</div>`;
  }

  function detailBody(row, iso) {
    const p = row.p;
    const alerts = P.alertsFor(p, iso, state.today, state.amount);
    const facts = [
      p.cb && !p.cbf ? ['Tope', esc(p.cap ? `${P.money(p.cap)}${P.capPeriod(p)}` : 'Sin tope')] : null,
      p.cb && p.q ? ['Cuotas', esc(`${p.q} sin interés`)] : null,
      p.min ? ['Compra mínima', esc(P.money(p.min))] : null,
      p.tx ? ['Máximo por compra', esc(P.money(p.tx))] : null,
      ['Días', esc(P.daysText(p.d))],
      ['Horario', esc(P.timeBand(p) || 'Todo el día')],
      ['Vigencia', esc(P.vigenciaText(p, state.today))],
      P.isGeneric(p, cats()) ? ['Comercios', esc(P.catTitle(p, cats()) === 'Otros' ? 'Cualquier comercio adherido' : `Cualquier comercio adherido de ${P.catTitle(p, cats()).toLowerCase()}`)] : null,
      ['Dónde', channelsHTML(p.ch)],
      ['Medios de pago', esc(pmText(p))],
      ['Bancos', esc(bankText(p))],
    ].filter(Boolean);
    const variants = row.variants.length > 1
      ? `<section class="stack"><h3 class="sheet__label">${row.variants.length} variantes de esta promo</h3>
          <ul class="variants">${row.variants
            .map((v) => `<li class="variant"><span class="variant__text">${esc(v.ch.map((c) => P.CHANNEL[c].label).join(', '))} · ${esc(P.capText(v) || P.benefitPhrase(v))} · ${esc(P.daysText(v.d).toLowerCase())}</span>
              <a class="btn btn--ghost btn--sm" href="${esc(P.promoUrl(v))}" target="_blank" rel="noopener noreferrer">Ver ${icon('i-external')}<span class="sr-only"> en MODO (abre en otra pestaña)</span></a></li>`)
            .join('')}</ul></section>`
      : '';
    return `${heroHTML(p)}
      ${alerts.map((a) => `<p class="callout callout--warn">${icon(a.icon)}${esc(a.text)}</p>`).join('')}
      <dl class="facts">${facts.map(([k, v]) => `<div class="facts__row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${variants}
      <p class="summary">En MODO figura como “${esc(p.n || p.bt)}”. Revisá las bases antes de pagar.</p>`;
  }

  function openDetail(id) {
    const entry = reg.get(id);
    if (!entry) return;
    const { row, iso } = entry;
    const p = row.p;
    $('#detail-cat').textContent = `${P.catTitle(p, cats())} · ${P.relDay(iso, state.today)}`;
    $('#detail-title').textContent = p.pl || p.n;
    $('#detail-body').innerHTML = detailBody(row, iso);
    $('#detail-link').href = P.promoUrl(p);
    openDialog('detail');
  }

  // ---------- diálogos (detalle, filtros, perfil) ----------
  let openEl = null;
  let lastFocus = null;
  function openDialog(id) {
    if (openEl) closeDialog(true);
    lastFocus = document.activeElement;
    openEl = $('#' + id);
    openEl.hidden = false;
    $('.sheet__panel', openEl).scrollTop = 0;
    document.body.style.overflow = 'hidden';
    $('.sheet__head button', openEl).focus();
  }
  function closeDialog(silent) {
    if (!openEl) return;
    const id = openEl.id;
    openEl.hidden = true;
    openEl = null;
    document.body.style.overflow = '';
    if (silent) return;
    if (id === 'sheet') render(); // cambió el perfil
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function trapFocus(e) {
    if (!openEl || e.key !== 'Tab') return;
    const f = [...openEl.querySelectorAll('button, input, select, a[href], summary')].filter((el) => !el.disabled && el.offsetParent);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (!openEl.contains(document.activeElement)) (first.focus(), e.preventDefault());
    else if (e.shiftKey && document.activeElement === first) (last.focus(), e.preventDefault());
    else if (!e.shiftKey && document.activeElement === last) (first.focus(), e.preventDefault());
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
    input.placeholder = state.tab === 'week' ? 'Comercio o rubro' : '¿Dónde vas a comprar?';
    $('#search-label').textContent = state.tab === 'week' ? 'Buscar comercio o rubro' : '¿Dónde querés comprar?';
    const amt = $('#amount');
    if (document.activeElement !== amt) amt.value = P.formatAmount(state.amount);
    $('[data-action="amount-clear"]').hidden = !state.amount;

    const names = state.profile.banks.map((id) => bankById()[id] && bankById()[id].name).filter(Boolean);
    const bankTxt = names.length > 2 ? `${names.length} bancos` : names.join(', ') || 'Sin banco';
    const iss = [...new Set(state.profile.cards.map((c) => P.ISSUER_NAME[c.split(':')[1]]))].join('/');
    $('#profile-summary').textContent = `${bankTxt} · ${iss || 'sin tarjetas'}`;
    if (state.data && state.data.generated_at) {
      const d = new Date(state.data.generated_at).toLocaleString('es-AR', { timeZone: P.TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      $('#updated').textContent = `Actualizado ${d}`;
    }
    renderActiveFilters();
  }

  function renderMain() {
    const main = $('#main');
    reg = new Map();
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
    $('#summary').textContent = `${list.length} de ${m.length} promos te aplican${state.amount > 0 ? ` · calculado para una compra de ${P.money(state.amount)}` : ''}`;
    if (state.tab === 'week') {
      const prev = $('#daywin') ? $('#daywin').scrollLeft : 0;
      main.innerHTML = weekView(list);
      const strip = $('#daywin');
      strip.scrollLeft = prev;
      const cur = strip.querySelector('[aria-current="true"]');
      if (cur && (cur.offsetLeft < strip.scrollLeft || cur.offsetLeft + cur.offsetWidth > strip.scrollLeft + strip.clientWidth)) {
        strip.scrollLeft = cur.offsetLeft - 8;
      }
    } else {
      main.innerHTML = bowView(list);
    }
    if (openEl && openEl.id === 'fsheet') renderFilterSheet();
  }

  function render() {
    renderShell();
    renderMain();
    persist();
  }

  /** mueve la ventana visible (swipe, flechas) y vuelve al principio del día si estabas abajo */
  function showDay(i, focusTab) {
    const next = clampActive(i);
    if (next === state.activeDay && !focusTab) return;
    state.activeDay = next;
    renderMain();
    const days = $('#days');
    if (days && days.getBoundingClientRect().top < 0) days.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    if (focusTab != null) $(`.daywin__day[data-i="${focusTab}"]`)?.focus();
  }

  // ---------- perfil ----------
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

  // ---------- eventos ----------
  const refocus = (sel) => {
    const el = document.querySelector(sel);
    if (el) el.focus();
    return !!el;
  };

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) {
      if (e.target.classList && e.target.classList.contains('sheet')) closeDialog(); // click en el fondo
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
        if (!state.data) return;
        state.bankQuery = '';
        $('#bank-q').value = '';
        renderSheet();
        openDialog('sheet');
        return;
      case 'filters':
        if (!state.data) return;
        renderFilterSheet();
        openDialog('fsheet');
        return;
      case 'detail':
        openDetail(t.dataset.id);
        return;
      case 'sheet-close':
        closeDialog();
        return;
      case 'sheet-reset':
        state.profile = JSON.parse(JSON.stringify(P.DEFAULT_PROFILE));
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
        render();
        refocus(`#fsheet [data-action="ch"][data-v="${v}"]`);
        return;
      }
      case 'tipo':
        f.tipo = t.dataset.v;
        render();
        refocus(`#fsheet [data-action="tipo"][data-v="${t.dataset.v}"]`);
        return;
      case 'unfilter': {
        const k = t.dataset.k;
        f[k] = Array.isArray(P.DEFAULT_FILTERS[k]) ? [...P.DEFAULT_FILTERS[k]] : P.DEFAULT_FILTERS[k];
        render();
        if (!refocus('#active-filters .chip')) refocus('#filters-btn');
        return;
      }
      case 'clear':
        state.filters = { ...JSON.parse(JSON.stringify(P.DEFAULT_FILTERS)), q: f.q };
        render();
        if (!openEl && document.activeElement === document.body) $('#filters-btn').focus();
        return;
      case 'amount-clear':
        state.amount = 0;
        $('#amount').value = '';
        render();
        $('#amount').focus();
        return;
      case 'day':
        showDay(+t.dataset.i, +t.dataset.i);
        return;
      case 'day-add':
        if (state.win >= P.WINDOW_MAX) return;
        state.win += 1;
        state.activeDay = state.win - 1; // mostrar el día nuevo
        persist();
        renderMain();
        refocus(state.win >= P.WINDOW_MAX ? `.daywin__day[data-i="${state.win - 1}"]` : '[data-action="day-add"]');
        return;
      case 'day-remove':
        if (state.win <= P.WINDOW_MIN) return;
        state.win -= 1;
        persist();
        renderMain();
        refocus(state.win <= P.WINDOW_MIN ? '[data-action="day-add"]' : '[data-action="day-remove"]');
        return;
      case 'more-cat': {
        const c = t.dataset.cat;
        state.catLimit[c] = (state.catLimit[c] || GROUP_PAGE) + GROUP_PAGE;
        renderMain();
        return;
      }
      case 'all-toggle':
        state.allOpen = !state.allOpen;
        state.allLimit = ALL_PAGE;
        renderMain();
        refocus('[data-action="all-toggle"]');
        if (!state.allOpen) $('#alldays').scrollIntoView({ block: 'nearest' });
        return;
      case 'more-all':
        state.allLimit += ALL_PAGE * 2;
        renderMain();
        return;
      default:
    }
  });

  // abrir/cerrar rubros: se recuerda (y se aplica a todos los días)
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target;
      if (!(d instanceof HTMLDetailsElement)) return;
      if (d.dataset.cat) state.openCats[d.open ? 'add' : 'delete'](d.dataset.cat);
    },
    true
  );

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.filter) {
      const k = t.dataset.filter;
      state.filters[k] = k === 'minPct' ? +t.value : t.value;
      render();
      refocus(`#fsheet [data-filter="${k}"]`);
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
    else state.bowQuery = v;
    renderMain();
    persist();
  }, 150);
  $('#search').addEventListener('input', (e) => onSearch(e.target.value));

  // monto: solo dígitos, con punto de miles mientras escribís
  const onAmount = debounce(() => {
    renderMain();
    persist();
  }, 200);
  $('#amount').addEventListener('input', (e) => {
    const el = e.target;
    const digitsBefore = el.value.slice(0, el.selectionStart).replace(/\D/g, '').length;
    state.amount = P.parseAmount(el.value);
    el.value = P.formatAmount(state.amount);
    let pos = 0;
    for (let seen = 0; pos < el.value.length && seen < digitsBefore; pos++) if (/\d/.test(el.value[pos])) seen++;
    el.setSelectionRange(pos, pos);
    $('[data-action="amount-clear"]').hidden = !state.amount;
    onAmount();
  });

  $('#bank-q').addEventListener('input', debounce((e) => {
    state.bankQuery = e.target.value;
    renderBankList();
  }, 100));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openEl) {
      e.preventDefault();
      closeDialog();
      return;
    }
    trapFocus(e);
    // flechas en la tira de días
    const day = e.target.closest && e.target.closest('.daywin__day');
    if (day && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const i = Math.max(0, Math.min(state.win - 1, +day.dataset.i + (e.key === 'ArrowRight' ? 1 : -1)));
      e.preventDefault();
      showDay(i, i);
    }
  });

  // swipe horizontal sobre el día (complementa a la tira, no la reemplaza)
  let touch = null;
  const main = $('#main');
  main.addEventListener('touchstart', (e) => {
    touch = e.target.closest('#days') && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  main.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    showDay(state.activeDay + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // cambio de ancho: cambia cuántas columnas entran
  [mq2, mq3].forEach((m) => m.addEventListener('change', () => state.tab === 'week' && renderMain()));

  // cambio de día con la app abierta (o al volver a la pestaña)
  const refreshToday = () => {
    const t = P.todayAR();
    if (t !== state.today) {
      state.today = t;
      state.activeDay = 0;
      render();
    }
  };
  document.addEventListener('visibilitychange', refreshToday);
  setInterval(refreshToday, 60000);

  // ---------- datos ----------
  // Por http(s) se bajan los JSON. Abierto desde file:// (o si el fetch falla) se carga data/promos.js,
  // que la ingesta genera con los mismos datos en window.__PROMOS__ y window.__BANCOS__.
  function loadScriptData() {
    return new Promise((resolve, reject) => {
      const done = () => (window.__PROMOS__ && window.__BANCOS__ ? resolve([window.__PROMOS__, window.__BANCOS__]) : reject(new Error('data/promos.js sin datos')));
      if (window.__PROMOS__) return done();
      const s = document.createElement('script');
      s.src = DATA + 'promos.js';
      s.onload = done;
      s.onerror = () => reject(new Error('falta data/promos.js: corré scripts/ingest_modo.py'));
      document.head.appendChild(s);
    });
  }
  function loadData() {
    if (location.protocol === 'file:') return loadScriptData();
    return Promise.all(
      ['promos.json', 'bancos.json'].map((f) =>
        fetch(DATA + f).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${f}: HTTP ${r.status}`))))
      )
    ).catch((err) => loadScriptData().catch(() => Promise.reject(err)));
  }

  // ---------- arranque ----------
  applyTheme();
  render();
  loadData()
    .then(([p, b]) => {
      state.data = { ...p, banks: b.banks, bankById: Object.fromEntries(b.banks.map((x) => [x.id, x])) };
      render();
    })
    .catch((err) => {
      state.error = err.message;
      render();
    });
})();
