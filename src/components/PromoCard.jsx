import { memo } from 'react';
import { CHANNELS, capText, headline, money, promoUrl, timeBand } from '../lib/promos.js';

const CH_ICON = Object.fromEntries(CHANNELS.map(([k, label, icon]) => [k, { label, icon }]));

function bankText(p, bankById, myBanks) {
  const mine = p.b.filter((b) => myBanks.includes(b)).map((b) => bankById[b]?.name).filter(Boolean);
  if (p.b.length > 3) return `${mine.join(', ') || 'Bancos'} + ${p.b.length - mine.length} adheridos`;
  return p.b.map((b) => bankById[b]?.name || 'Banco').join(', ');
}

function PromoCard({ p, ctx, compact = false }) {
  const { bankById, profile, cats } = ctx;
  const cap = capText(p);
  const band = timeBand(p);
  const cat = cats[p.cat[0]];
  return (
    <article className={`promo ${compact ? 'promo--compact' : ''}`}>
      <div className="promo__top">
        {p.img ? (
          <img className="promo__img" src={p.img} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width="44" height="44" />
        ) : (
          <div className="promo__img promo__img--ph">{cat?.i || '🏷️'}</div>
        )}
        <div className="promo__main">
          <h3 className="promo__place" title={p.pl}>{p.pl || p.n}</h3>
          <p className="promo__desc">{p.bt}</p>
        </div>
        <div className={`promo__badge ${p.cb ? '' : 'promo__badge--q'}`}>{headline(p)}</div>
      </div>
      <ul className="promo__meta">
        {p.cb && p.q ? <li>{p.q} cuotas s/i</li> : null}
        {cap && <li className={p.cap ? '' : 'ok'}>{cap}</li>}
        {p.tx ? <li>Máx {money(p.tx)} x compra</li> : null}
        {p.min ? <li>Mín {money(p.min)}</li> : null}
        {band && <li className="warn">🕒 {band}</li>}
        {p.s === 'N' && <li className="info">Arranca {p.sd.slice(8)}/{p.sd.slice(5, 7)}</li>}
      </ul>
      <div className="promo__foot">
        <span className="promo__ch" aria-label={p.ch.map((c) => CH_ICON[c]?.label).join(', ')}>
          {p.ch.map((c) => (
            <span key={c} title={CH_ICON[c]?.label}>{CH_ICON[c]?.icon}</span>
          ))}
        </span>
        <span className="promo__bank">{bankText(p, bankById, profile.banks)}</span>
        <a className="promo__link" href={promoUrl(p)} target="_blank" rel="noopener noreferrer">
          Ver ↗
        </a>
      </div>
    </article>
  );
}

export default memo(PromoCard);
