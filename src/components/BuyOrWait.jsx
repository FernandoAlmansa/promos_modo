import { useMemo, useState } from 'react';
import PromoCard from './PromoCard.jsx';
import { better, compare, dayLabel, headline, money, norm, placeKey, validOn, weekdayLong, weekdayShort } from '../lib/promos.js';

const MAX_GROUPS = 40;

function cellText(p) {
  if (!p) return '—';
  return headline(p);
}
function subText(p) {
  if (!p) return '';
  if (p.cb && p.cap) return p.cap >= 1000 ? `$${Math.round(p.cap / 1000)}k` : money(p.cap);
  if (p.cb) return 's/tope';
  return '';
}

function verdict(best, days) {
  const today = best[0];
  let top = null;
  best.forEach((p) => (top = p ? better(top, p) : top));
  if (!top) return null;
  if (today && compare(today, top) <= 0) return { kind: 'buy', text: 'Comprá hoy: hoy es el mejor día.' };
  const i = best.findIndex((p) => p && compare(p, top) === 0);
  return {
    kind: 'wait',
    text: `Conviene esperar al ${i === 1 ? 'mañana' : weekdayLong(days[i])} (${headline(top)}${today ? ` vs ${headline(today)} hoy` : ', hoy no hay'}).`,
  };
}

function Group({ g, days, ctx }) {
  const [sel, setSel] = useState(null);
  const top = g.best.reduce((acc, p) => (p ? better(acc, p) : acc), null);
  const v = verdict(g.best, days);
  const shown = sel != null ? g.best[sel] : null;
  return (
    <article className="bow">
      <header className="bow__head">
        <h3>{g.name}</h3>
        {g.cat && <span className="muted">{g.cat}</span>}
      </header>
      <div className="bow__row" role="list">
        {days.map((d, i) => {
          const p = g.best[i];
          const isTop = p && top && compare(p, top) === 0;
          return (
            <button
              key={d}
              role="listitem"
              className={`bow__cell ${isTop ? 'is-top' : ''} ${p ? '' : 'is-empty'} ${sel === i ? 'is-sel' : ''}`}
              onClick={() => p && setSel(sel === i ? null : i)}
              aria-label={`${weekdayLong(d)} ${dayLabel(d)}: ${p ? p.bt : 'sin promo'}`}
            >
              <span className="bow__wd">{i === 0 ? 'Hoy' : weekdayShort(d)}</span>
              <span className="bow__val">{cellText(p)}</span>
              <span className="bow__sub">{subText(p)}</span>
            </button>
          );
        })}
      </div>
      {v && <p className={`bow__verdict bow__verdict--${v.kind}`}>{v.text}</p>}
      {shown && <PromoCard p={shown} ctx={ctx} />}
    </article>
  );
}

export default function BuyOrWait({ promos, days, ctx, query, setQuery }) {
  const groups = useMemo(() => {
    const q = norm(query);
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    const map = new Map();
    for (const p of promos) {
      const hay = p._s || (p._s = norm(`${p.pl} ${p.n} ${p.bt} ${p.cat.map((c) => ctx.cats[c]?.t || '').join(' ')}`));
      if (!words.every((w) => hay.includes(w))) continue;
      const k = placeKey(p);
      let g = map.get(k);
      if (!g) map.set(k, (g = { key: k, name: p.pl || p.n, cat: ctx.cats[p.cat[0]]?.t, best: days.map(() => null) }));
      days.forEach((d, i) => {
        if (validOn(p, d)) g.best[i] = better(p, g.best[i]);
      });
    }
    const list = [...map.values()].filter((g) => g.best.some(Boolean));
    const topOf = (g) => g.best.reduce((a, p) => (p ? better(a, p) : a), null);
    list.sort((a, b) => compare(topOf(a), topOf(b)));
    return list;
  }, [promos, days, query, ctx.cats]);

  return (
    <div className="bowview">
      <label className="search search--big">
        <span aria-hidden>🔎</span>
        <input
          type="search"
          placeholder="Comercio o rubro: Carrefour, YPF, farmacia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </label>
      {norm(query).length < 2 ? (
        <p className="empty">Escribí un comercio o rubro y te muestro el mejor beneficio de cada uno de los próximos 7 días.</p>
      ) : groups.length === 0 ? (
        <p className="empty">No encontré promos para “{query}” con tu perfil y filtros.</p>
      ) : (
        <>
          <p className="muted small">
            {groups.length} comercio{groups.length > 1 ? 's' : ''}
            {groups.length > MAX_GROUPS ? ` (muestro los ${MAX_GROUPS} mejores)` : ''}. Tocá un día para ver el detalle.
          </p>
          {groups.slice(0, MAX_GROUPS).map((g) => (
            <Group key={g.key} g={g} days={days} ctx={ctx} />
          ))}
        </>
      )}
    </div>
  );
}
