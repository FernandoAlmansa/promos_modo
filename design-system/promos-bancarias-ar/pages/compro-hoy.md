# Override — Vista "¿Compro hoy o espero?"

> Pisa a MASTER.md solo en esta vista.

## Estructura
1. El mismo `.amount` de arriba (si hay monto, todo se compara en plata) + búsqueda grande (`.search`, 48px) con foco automático solo si la vista se abrió por acción del usuario.
2. Resultado = lista de `.merchant`, cada uno con:
   - `.merchant__head`: comercio (18/600) + rubro (12, subtle)
   - `.matrix`: 7 `button.matrix__cell` → día · cifra · sub
   - `.verdict--buy` / `.verdict--wait` con ícono `i-check` / `i-hourglass`
   - tocar una celda abre el **panel de detalle** de la promo de ese día (el mismo de la vista Calendario).
3. Máximo 40 comercios, ordenados por su mejor beneficio de la semana. Esta vista mira siempre 7 días (no usa la ventana del Calendario).

## Reglas propias
- **Mejor día** sin monto = mayor %, después mayor tope (sin tope gana) y después más cuotas. **Con monto** = más plata que vuelve (las que no llegan al mínimo valen $0), después más cuotas. En los empates se marcan todos con `--best`.
- Celda sin monto: `30%` + tope abreviado (`$10k`, `s/tope`). Con monto: lo que te devuelven abreviado (`$7,5k`) + el % debajo; si no llega al mínimo, `$0` + "mín.".
- `--best` es la **única** superficie sólida verde de toda la app; no usar verde sólido en otro lado.
- Día sin promo: `--empty` (borde punteado, "—"), sin tap.
- Copy del veredicto, acción primero:
  - sin monto: "Comprá hoy: es el mejor día." / "Esperá al {día}: {mejor} vs {hoy} hoy." / "Esperá al {día}: {mejor}, hoy no hay."
  - con monto: "Comprá hoy: te devuelven $7.500, lo máximo de la semana." / "Esperá al miércoles: te devuelven $7.500 y hoy $3.000." / "…; hoy no hay promo."
- Estado inicial (menos de 2 caracteres): `.empty` con instrucción de una línea; no mostrar sugerencias genéricas.
