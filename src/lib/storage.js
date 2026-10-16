import { useEffect, useState } from 'react';

const PREFIX = 'promos-modo:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    // merge superficial para tolerar campos nuevos
    return fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...v } : v;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* modo privado / storage bloqueado: seguimos en memoria */
  }
}

export function usePersisted(key, fallback) {
  const [v, setV] = useState(() => load(key, fallback));
  useEffect(() => save(key, v), [key, v]);
  return [v, setV];
}
