import { CHANNELS, DEFAULT_FILTERS, cardLabel } from '../lib/promos.js';

const PCTS = [0, 10, 15, 20, 25, 30, 40, 50];

export default function Filters({ f, setF, cats, profile, showSearch }) {
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const toggleCh = (c) =>
    setF((o) => {
      const ch = o.ch.includes(c) ? o.ch.filter((x) => x !== c) : [...o.ch, c];
      return { ...o, ch: ch.length ? ch : o.ch }; // nunca vacío
    });
  const catOpts = Object.entries(cats)
    .filter(([id], i, arr) => arr.findIndex(([, c]) => c.t === cats[id].t) === i)
    .sort((a, b) => a[1].t.localeCompare(b[1].t, 'es'));
  const myCards = [...profile.cards, ...(profile.pct ? ['t'] : [])];
  const dirty =
    f.tipo !== 'all' || f.cat || f.minPct || f.card || f.q || f.ch.join() !== DEFAULT_FILTERS.ch.join();

  return (
    <div className="filters">
      {showSearch && (
        <label className="search">
          <span aria-hidden>🔎</span>
          <input type="search" placeholder="Buscar comercio o rubro" value={f.q} onChange={(e) => set('q', e.target.value)} />
        </label>
      )}
      <div className="filters__row">
        <div className="seg" role="group" aria-label="Canal">
          {CHANNELS.map(([k, label, icon]) => (
            <button key={k} className={f.ch.includes(k) ? 'is-on' : ''} aria-pressed={f.ch.includes(k)} onClick={() => toggleCh(k)}>
              {icon} {label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Tipo">
          {[
            ['all', 'Todo'],
            ['cb', 'Reintegro'],
            ['q', 'Cuotas'],
          ].map(([k, l]) => (
            <button key={k} className={f.tipo === k ? 'is-on' : ''} aria-pressed={f.tipo === k} onClick={() => set('tipo', k)}>
              {l}
            </button>
          ))}
        </div>
        <select aria-label="Rubro" value={f.cat} onChange={(e) => set('cat', e.target.value)} className={f.cat ? 'is-on' : ''}>
          <option value="">Todos los rubros</option>
          {catOpts.map(([id, c]) => (
            <option key={id} value={id}>
              {c.i} {c.t}
            </option>
          ))}
        </select>
        <select aria-label="Porcentaje mínimo" value={f.minPct} onChange={(e) => set('minPct', +e.target.value)} className={f.minPct ? 'is-on' : ''}>
          {PCTS.map((n) => (
            <option key={n} value={n}>
              {n ? `≥ ${n}%` : 'Cualquier %'}
            </option>
          ))}
        </select>
        <select aria-label="Tarjeta" value={f.card} onChange={(e) => set('card', e.target.value)} className={f.card ? 'is-on' : ''}>
          <option value="">Todas mis tarjetas</option>
          {myCards.map((c) => (
            <option key={c} value={c}>
              {cardLabel(c)}
            </option>
          ))}
        </select>
        {dirty && (
          <button className="btn btn--ghost" onClick={() => setF({ ...DEFAULT_FILTERS })}>
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
