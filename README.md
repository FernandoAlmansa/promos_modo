# Promos MODO

App web estática con las promociones de MODO que te aplican según tu banco y tus tarjetas, día por día, y **cuánto te devuelven** de lo que vas a gastar. Es **HTML + CSS + JS vanilla**, sin build ni dependencias. Un GitHub Action baja los datos todos los días y publica en GitHub Pages.

## Cómo se usa

- **Calendario:** por defecto ves **Hoy y Mañana**. Con "+ Agregar día" sumás días (hasta 7) y con "−" los sacás; la cantidad queda guardada. En el celu ves un día por vez (tocá el día arriba o deslizá); en la compu, hasta 3 columnas.
- Cada día empieza con **"Lo mejor de hoy"** (3 promos) y sigue con el resto **agrupado por rubro**, cerrado. Lo que vale en todos los días que estás mirando va aparte, al final, en **"Todos los días"**.
- **¿Cuánto vas a gastar?** Si cargás un monto, cada promo muestra lo que te devuelven de verdad: `min(monto × %, tope por compra, tope del período)`. Si no llegás a la compra mínima te dice cuánto te falta y la manda al fondo.
- Tocá una promo para ver el **detalle**: condiciones, días, horario, vigencia, dónde pagar, medios de pago, bancos y el link a MODO.
- **Filtros** (canal, tipo, rubro, % mínimo, tarjeta) en un panel aparte; los activos quedan como chips que se sacan con un toque.
- **¿Compro hoy o espero?:** buscá un comercio y compará los próximos 7 días; con monto cargado compara en plata ("Esperá al miércoles: te devuelven $7.500 y hoy $3.000").

## Estructura

```
index.html                 página (incluye el sprite de íconos inline)
css/tokens.css             design tokens (colores, tipografía, espacios), claro y oscuro
css/components.css         componentes del design system
css/app.css                layout propio de la app
js/promos.js               lógica pura: fechas AR, aplicabilidad, filtros, orden, ahorro, agrupación, textos
js/storage.js              preferencias en localStorage
js/app.js                  render y eventos
tests/promos.test.cjs      tests de js/promos.js (node --test, sin dependencias)
assets/icons.svg           fuente del sprite de íconos
data/                      promos.json, bancos.json y promos.js (los genera la ingesta; no se versionan)
scripts/ingest_modo.py     ingesta (solo stdlib)
design-system/promos-bancarias-ar/
  MASTER.md                reglas del design system (fuente de verdad)
  pages/*.md               reglas específicas de cada vista (calendario, compro-hoy)
  preview.html             specimen visual de todos los componentes
.github/workflows/deploy.yml
```

Los tres JS son **scripts clásicos** (no módulos ES): `promos.js` queda en `window.Promos`, `storage.js` en `window.PromosStorage` y `app.js` los usa. Así la app anda también abriendo `index.html` con doble clic.

## Cómo funciona

1. El workflow corre a las 09:00 UTC (06:00 AR), en cada push a `main` y a mano (*Run workflow*).
2. Corre los tests de `js/promos.js` (`node --test`).
3. `scripts/ingest_modo.py` baja el catálogo v1 de bancos, los rubros y las ~28 páginas de promos. Deduplica por `benefit.id`, descarta las `FINISHED_FOR_PRODUCT` y escribe `data/promos.json`, `data/bancos.json` y `data/promos.js` (los mismos datos como script: `window.__PROMOS__` y `window.__BANCOS__`).
4. Si vienen menos de 1000 promos o falla el parseo, el script sale con error y no hay deploy, así que Pages sigue sirviendo el último JSON bueno.
5. El workflow copia `index.html css js assets data design-system` a `_site/` y lo publica.
6. Por http(s) el navegador hace un fetch de cada JSON y filtra en memoria. Abierto desde `file://` (o si el fetch falla) carga `data/promos.js`. El perfil, los filtros, el tema, el monto y la cantidad de días quedan en `localStorage` (prefijo `promos-modo:`; claves `profile`, `filters`, `theme`, `tab`, `bowQuery`, `amount`, `days`).

## Setup en GitHub (una vez)

1. Subí el repo (`git add -A && git commit -m "..." && git push`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → Actualizar promos y deploy → Run workflow.**

> GitHub pausa los `schedule` después de 60 días sin actividad en el repo. Se reactivan desde la pestaña Actions.

## Probar en tu compu

```bash
python3 scripts/ingest_modo.py      # baja datos a data/
```

Después, cualquiera de las dos:

- **Doble clic en `index.html`.** Usa `data/promos.js`, así que no hace falta servidor.
- O con servidor local (igual que en Pages): `python3 -m http.server 8000` y abrí http://localhost:8000

Tests de la lógica (cálculo de ahorro, ventana de días, fusión de duplicados):

```bash
node --test tests/promos.test.cjs
```

El specimen del design system queda en `design-system/promos-bancarias-ar/preview.html`.

> `package.json`, `vite.config.js` y `src/` son de la versión anterior en React y la app vanilla no los usa.

## Formato de `promos.json`

`{generated_at, source_total, raw, count, categories: {id: {t, i}}, promos: [...]}`. Cada promo:

| campo | origen |
|---|---|
| `id` | benefit.id |
| `n`, `t`, `sc` | benefit.name / type / scope |
| `pl`, `bt`, `img` | card.validity_place / benefit / image |
| `sl` | benefit.publication.slug → `https://www.modo.com.ar/promos/{sl}` |
| `s` | `R` = RUNNING, `N` = NEXT_FOR_PRODUCT |
| `sd`, `ed`, `d` | start/stop_date, days_of_week (0 = lunes) |
| `h` | franja horaria, solo si no es todo el día |
| `ch` | canales: `p` presencial (instore, physical-card), `o` online, `n` NFC |
| `pm` | medios: `c:visa`, `d:master`… y `t` = transferencia (PCT). Si no está, no hay restricción |
| `cb`, `cbf` | cashback (`cbf` = monto fijo en vez de %) |
| `q` | máximo de cuotas sin interés |
| `cap`, `capr`, `capa` | period_cap: monto, reset_by, aggregate_by |
| `tx`, `min` | tope por transacción, compra mínima |
| `b`, `cat` | UUIDs de bancos, rubros |

`data/promos.js` no agrega campos: es `window.__PROMOS__ = <promos.json>; window.__BANCOS__ = <bancos.json>;`.

Una promo te aplica si algún banco de `b` está en tu perfil **y** (no tiene `pm` o alguno coincide con tus tarjetas).

**Lo que te devuelven** (con monto `M`): reintegro % → `min(M × cb / 100, tx, cap)`; monto fijo → `min(cb, M, tx, cap)`; si `min` y `M < min` → 0 (y "te faltan `min − M`"). Es una estimación: no sabe cuánto del tope del período ya usaste.
