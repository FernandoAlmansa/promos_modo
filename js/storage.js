// Preferencias en localStorage. Mismo prefijo y claves que la versión React,
// así quien ya la usaba conserva perfil, filtros y tema.
const PREFIX = 'promos-modo:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return structuredClone(fallback);
    const v = JSON.parse(raw);
    // merge superficial para tolerar campos nuevos
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) return { ...structuredClone(fallback), ...v };
    return v;
  } catch {
    return structuredClone(fallback);
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* modo privado o storage bloqueado: sigue funcionando en memoria */
  }
}
