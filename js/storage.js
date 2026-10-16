// Preferencias en localStorage. Mismo prefijo y claves que las versiones anteriores,
// así quien ya la usaba conserva perfil, filtros y tema. Script clásico: queda en window.PromosStorage.
(function (root) {
  'use strict';
  const PREFIX = 'promos-modo:';
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return clone(fallback);
      const v = JSON.parse(raw);
      // merge superficial para tolerar campos nuevos
      if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) return { ...clone(fallback), ...v };
      return v;
    } catch {
      return clone(fallback);
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* modo privado o storage bloqueado: sigue funcionando en memoria */
    }
  }

  root.PromosStorage = { load, save };
})(typeof self !== 'undefined' ? self : this);
