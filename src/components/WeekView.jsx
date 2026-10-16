import { useMemo, useRef, useState } from 'react';
import PromoCard from './PromoCard.jsx';
import { compare, dayLabel, validOn, weekdayShort } from '../lib/promos.js';

const PAGE = 30;

function Column({ iso, isToday, list, ctx, innerRef }) {
  const [limit, setLimit] = useState(PAGE);
  return (
    <section className="day" ref={innerRef} aria-label={`${weekdayShort(iso)} ${dayLabel(iso)}`}>
      <header className={`day__head ${isToday ? 'is-today' : ''}`}>
        <span className="day__wd">{isToday ? 'Hoy' : weekdayShort(iso)}</span>
        <span className="day__date">{dayLabel(iso)}</span>
        <span className="day__count">{list.length}</span>
      </header>
      <div className="day__list">
        {list.length === 0 && <p className="empty">Nada puntual este día.</p>}
        {list.slice(0, limit).map((p) => (
          <PromoCard key={p.id} p={p} ctx={ctx} compact />
        ))}
        {list.length > limit && (
          <button className="btn btn--ghost btn--block" onClick={() => setLimit((l) => l + PAGE)}>
            Ver {Math.min(PAGE, list.length - limit)} más ({list.length - limit} restantes)
          </button>
        )}
      </div>
    </section>
  );
}

export default function WeekView({ promos, days, ctx }) {
  const [bandOpen, setBandOpen] = useState(false);
  const [active, setActive] = useState(0);
  const scroller = useRef(null);
  const cols = useRef([]);

  const { band, perDay } = useMemo(() => {
    const band = [];
    const perDay = days.map(() => []);
    for (const p of promos) {
      const v = days.map((d) => validOn(p, d));
      if (v.every(Boolean)) band.push(p);
      else v.forEach((ok, i) => ok && perDay[i].push(p));
    }
    band.sort(compare);
    perDay.forEach((l) => l.sort(compare));
    return { band, perDay };
  }, [promos, days]);

  const goTo = (i) => {
    setActive(i);
    cols.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const w = cols.current[0]?.offsetWidth || 1;
    const i = Math.round(el.scrollLeft / (w + 10));
    if (i !== active) setActive(Math.max(0, Math.min(days.length - 1, i)));
  };

  const shownBand = bandOpen ? band : band.slice(0, 6);

  return (
    <div className="week">
      <nav className="daychips" aria-label="Días">
        {days.map((d, i) => (
          <button key={d} className={`daychip ${active === i ? 'is-active' : ''}`} onClick={() => goTo(i)}>
            <span>{i === 0 ? 'Hoy' : weekdayShort(d)}</span>
            <b>{perDay[i].length}</b>
          </button>
        ))}
      </nav>

      <div className="days" ref={scroller} onScroll={onScroll}>
        {days.map((d, i) => (
          <Column key={d} iso={d} isToday={i === 0} list={perDay[i]} ctx={ctx} innerRef={(el) => (cols.current[i] = el)} />
        ))}
      </div>

      <section className="band">
        <header className="band__head">
          <h2>Válidas toda la semana <span className="pill">{band.length}</span></h2>
          {band.length > 6 && (
            <button className="btn btn--ghost" onClick={() => setBandOpen((o) => !o)}>
              {bandOpen ? 'Mostrar menos' : `Ver las ${band.length}`}
            </button>
          )}
        </header>
        {band.length === 0 ? (
          <p className="empty">No hay promos que valgan los 7 días con estos filtros.</p>
        ) : (
          <div className="band__grid">
            {shownBand.map((p) => (
              <PromoCard key={p.id} p={p} ctx={ctx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
