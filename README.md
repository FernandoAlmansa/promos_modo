# Promos MODO

App web estática (React + Vite) con las promociones de MODO que te aplican según tu banco y tarjetas, día por día. Sin backend: un GitHub Action baja los datos todos los días y deploya a GitHub Pages.

## Cómo funciona

1. `.github/workflows/deploy.yml` corre a las 09:00 UTC (06:00 AR), en cada push a `main` y a mano (*Run workflow*).
2. `scripts/ingest_modo.py` (solo stdlib) baja el catálogo v1 de bancos, los rubros y las ~28 páginas de promos, deduplica por `benefit.id`, descarta `FINISHED_FOR_PRODUCT` y escribe `public/data/promos.json` y `public/data/bancos.json`.
3. Si vienen menos de 1000 promos o falla el parseo, el script sale con error → no hay build ni deploy → Pages sigue sirviendo el último JSON bueno.
4. El frontend hace un fetch de cada JSON y filtra en memoria. Perfil, filtros y tema quedan en `localStorage`.

## Setup en GitHub

1. Crear el repo y subir esta carpeta (`git init && git add . && git commit -m "init" && git push`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → Actualizar promos y deploy → Run workflow** para el primer deploy.

> GitHub desactiva los `schedule` después de 60 días sin actividad en el repo; si pasa, se reactiva desde la pestaña Actions.

## Desarrollo local

```bash
npm install
npm run ingest      # baja datos a public/data/
npm run dev
```

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
| `pm` | medios: `c:visa`, `d:master`… y `t` = transferencia (PCT). Ausente = sin restricción |
| `cb`, `cbf` | cashback (`cbf` = monto fijo en vez de %) |
| `q` | máximo de cuotas sin interés |
| `cap`, `capr`, `capa` | period_cap: monto, reset_by, aggregate_by |
| `tx`, `min` | tope por transacción, compra mínima |
| `b`, `cat` | UUIDs de bancos, rubros |

Una promo te aplica si algún banco de `b` está en tu perfil **y** (no tiene `pm` o alguno coincide con tus tarjetas).
