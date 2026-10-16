import { useCallback, useEffect, useMemo, useState } from 'react';
import WeekView from './components/WeekView.jsx';
import BuyOrWait from './components/BuyOrWait.jsx';
import Filters from './components/Filters.jsx';
import ProfileSheet from './components/ProfileSheet.jsx';
import { DEFAULT_FILTERS, DEFAULT_PROFILE, ISSUER_NAME, applies, nextDays, norm, passFilters, todayAR } from './lib/promos.js';
import { usePersisted } from './lib/storage.js';

const BASE = import.meta.env.BASE_URL;
const THEMES = { auto: '🌓', light: '☀️', dark: '🌙' };
const NEXT_THEME = { auto: 'light', light: 'dark', dark: 'auto' };

function useToday() {
  const [t, setT] = useState(todayAR);
  useEffect(() => {
    const upd = () => setT(todayAR());
    document.addEventListener('visibilitychange', upd);
    const id = setInterval(upd, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', upd);
      clearInterval(id);
    };
  }, []);
  return t;
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = usePersisted('profile', DEFAULT_PROFILE);
  const [filters, setFilters] = usePersisted('filters', DEFAULT_FILTERS);
  const [tab, setTab] = usePersisted('tab', 'week');
  const [theme, setTheme] = usePersisted('theme', 'auto');
  const [bowQuery, setBowQuery] = usePersisted('bowQuery', '');
  const [showProfile, setShowProfile] = useState(false);
  const today = useToday();
  const closeProfile = useCallback(() => setShowProfile(false), []);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/promos.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`promos ${r.status}`)))),
      fetch(`${BASE}data/bancos.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`bancos ${r.status}`)))),
    ])
      .then(([p, b]) => setData({ ...p, banks: b.banks }))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  const days = useMemo(() => nextDays(today, 7), [today]);
  const bankById = useMemo(() => Object.fromEntries((data?.banks || []).map((b) => [b.id, b])), [data]);
  const cats = data?.categories || {};
  const ctx = useMemo(() => ({ bankById, profile, cats }), [bankById, profile, cats]);

  const mine = useMemo(() => (data ? data.promos.filter((p) => p.ed >= today && applies(p, profile)) : []), [data, profile, today]);
  const fNorm = useMemo(() => ({ ...filters, q: tab === 'week' ? norm(filters.q) : '' }), [filters, tab]);
  const filtered = useMemo(() => mine.filter((p) => passFilters(p, fNorm, cats)), [mine, fNorm, cats]);

  const profileSummary = useMemo(() => {
    const names = profile.banks.map((id) => bankById[id]?.name).filter(Boolean);
    const bankTxt = names.length > 2 ? `${names.length} bancos` : names.join(', ') || 'Sin banco';
    const iss = [...new Set(profile.cards.map((c) => ISSUER_NAME[c.split(':')[1]]))].join('/');
    return `${bankTxt} · ${iss || 'sin tarjetas'}`;
  }, [profile, bankById]);

  const updated = data?.generated_at
    ? new Date(data.generated_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="app">
      <header className="top">
        <div className="top__brand">
          <h1>Promos MODO</h1>
          {updated && <span className="muted small">Actualizado {updated}</span>}
        </div>
        <div className="top__actions">
          <button className="btn btn--profile" onClick={() => setShowProfile(true)} title="Editar perfil">
            👤 <span>{profileSummary}</span>
          </button>
          <button className="btn btn--icon" onClick={() => setTheme(NEXT_THEME[theme])} title={`Tema: ${theme}`} aria-label={`Tema: ${theme}`}>
            {THEMES[theme]}
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'week'} className={tab === 'week' ? 'is-on' : ''} onClick={() => setTab('week')}>
          Semana
        </button>
        <button role="tab" aria-selected={tab === 'bow'} className={tab === 'bow' ? 'is-on' : ''} onClick={() => setTab('bow')}>
          ¿Compro hoy o espero?
        </button>
      </nav>

      <Filters f={filters} setF={setFilters} cats={cats} profile={profile} showSearch={tab === 'week'} />

      <main>
        {error && <p className="empty error">No pude cargar los datos ({error}).</p>}
        {!data && !error && <p className="empty">Cargando promos…</p>}
        {data && mine.length === 0 && <p className="empty">Tu perfil no matchea ninguna promo. Revisá bancos y tarjetas.</p>}
        {data && mine.length > 0 && (
          <>
            <p className="muted small summary">
              {filtered.length} de {mine.length} promos que te aplican ({data.count} vigentes en MODO)
            </p>
            {tab === 'week' ? (
              <WeekView promos={filtered} days={days} ctx={ctx} />
            ) : (
              <BuyOrWait promos={filtered} days={days} ctx={ctx} query={bowQuery} setQuery={setBowQuery} />
            )}
          </>
        )}
      </main>

      <footer className="foot muted small">
        Datos públicos de modo.com.ar, se actualizan una vez por día. Verificá condiciones en MODO antes de pagar.
      </footer>

      {showProfile && data && <ProfileSheet profile={profile} setProfile={setProfile} banks={data.banks} onClose={closeProfile} />}
    </div>
  );
}
