# Promos MODO

App web estática con las promociones de MODO que te aplican según tu banco y tus tarjetas, día por día. Es **HTML + CSS + JS vanilla**, sin build ni dependencias. Un GitHub Action baja los datos todos los días y publica en GitHub Pages.

## Estructura

```
index.html                 página (incluye el sprite de íconos inline)
css/tokens.css             design tokens (colores, tipografía, espacios), claro y oscuro
css/components.css         componentes del design system
css/app.css                layout propio de la app
js/promos.js               lógica pura: fechas AR, aplicabilidad, filtros, orden, textos
js/storage.js              preferencias en localStorage
js/app.js                  render y eventos
assets/icons.svg           fuente del sprite de íconos
data/                      promos.json y bancos.json (los genera la ingesta; no se versionan)
scripts/ingest_modo.py     ingesta (solo stdlib)
design-system/promos-bancarias-ar/
  MASTER.md                reglas del design system (fuente de verdad)
  pages/*.md               reglas específicas de cada vista
  preview.html             specimen visual de todos los componentes
.github/workflows/deploy.yml
```

## Cómo funciona

1. El workflow corre a las 09:00 UTC (06:00 AR), en cada push a `main` y a mano (*Run workflow*).
2. `scripts/ingest_modo.py` baja el catálogo v1 de bancos, los rubros y las ~28 páginas de promos. Deduplica por `benefit.id`, descarta las `FINISHED_FOR_PRODUCT` y escribe `data/promos.json` y `data/bancos.json`.
3. Si vienen menos de 1000 promos o falla el parseo, el script sale con error y no hay deploy, así que Pages sigue sirviendo el último JSON bueno.
4. El workflow copia `index.html css js assets data design-system` a `_site/` y lo publica.
5. El navegador hace un fetch de cada JSON y filtra en memoria. El perfil, los filtros y el tema quedan en `localStorage`.

## Setup en GitHub (una vez)

1. Subí el repo (`git add -A && git commit -m "..." && git push`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → Actualizar promos y deploy → Run workflow.**

> GitHub pausa los `schedule` después de 60 días sin actividad en el repo. Se reactivan desde la pestaña Actions.

## Probar en tu compu

Los módulos JS no cargan abriendo el archivo con doble clic; hace falta un servidor local:

```bash
python3 scripts/ingest_modo.py      # baja datos a data/
python3 -m http.server 8000         # y abrí http://localhost:8000
```

El specimen del design system queda en `http://localhost:8000/design-system/promos-bancarias-ar/preview.html`.

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

Una promo te aplica si algún banco de `b` está en tu perfil **y** (no tiene `pm` o alguno coincide con tus tarjetas).
