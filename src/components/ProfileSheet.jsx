import { useEffect, useMemo, useState } from 'react';
import { CREDIT_ISSUERS, DEBIT_ISSUERS, DEFAULT_PROFILE, norm } from '../lib/promos.js';

export default function ProfileSheet({ profile, setProfile, banks, onClose }) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toggle = (key, v) =>
    setProfile((p) => {
      const arr = p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v];
      return { ...p, [key]: arr };
    });

  const list = useMemo(() => {
    const nq = norm(q);
    const sel = banks.filter((b) => profile.banks.includes(b.id));
    const rest = banks.filter((b) => !profile.banks.includes(b.id) && (!nq || norm(b.name).includes(nq)));
    return [...sel, ...rest];
  }, [banks, profile.banks, q]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Mi perfil" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>Mi perfil</h2>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <section>
          <h3>Tarjetas de crédito</h3>
          <div className="chips">
            {CREDIT_ISSUERS.map(([k, l]) => (
              <button key={k} className={`chip ${profile.cards.includes(`c:${k}`) ? 'is-on' : ''}`} onClick={() => toggle('cards', `c:${k}`)}>
                {l}
              </button>
            ))}
          </div>
          <h3>Tarjetas de débito</h3>
          <div className="chips">
            {DEBIT_ISSUERS.map(([k, l]) => (
              <button key={k} className={`chip ${profile.cards.includes(`d:${k}`) ? 'is-on' : ''}`} onClick={() => toggle('cards', `d:${k}`)}>
                {l}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={profile.pct} onChange={(e) => setProfile((p) => ({ ...p, pct: e.target.checked }))} />
            Pago con transferencia desde MODO (cuenta bancaria)
          </label>
        </section>

        <section>
          <h3>
            Bancos <span className="pill">{profile.banks.length}</span>
          </h3>
          <input className="input" type="search" placeholder="Buscar banco…" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="banklist">
            {list.map((b) => (
              <li key={b.id}>
                <label className="check">
                  <input type="checkbox" checked={profile.banks.includes(b.id)} onChange={() => toggle('banks', b.id)} />
                  {b.image ? <img src={b.image} alt="" width="20" height="20" loading="lazy" referrerPolicy="no-referrer" /> : <span className="check__ph" />}
                  {b.name}
                </label>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Mercado Pago no figura en el catálogo de bancos de MODO, así que no tiene promos acá. NFC de MODO funciona solo en Android.
          </p>
        </section>

        <footer className="sheet__foot">
          <button className="btn btn--ghost" onClick={() => setProfile({ ...DEFAULT_PROFILE })}>
            Restablecer
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}
