# Override — Vista "¿Compro hoy o espero?"

> Pisa a MASTER.md solo en esta vista.

## Estructura
1. Búsqueda grande (`.search`, 48px) con foco automático solo si la vista se abrió por acción del usuario.
2. Resultado = lista de `.merchant`, cada uno con:
   - `.merchant__head`: comercio (18/600) + rubro (12, subtle)
   - `.matrix`: 7 `button.matrix__cell` → día · cifra · sub (tope abreviado `$10k` o `s/tope`)
   - `.verdict--buy` / `.verdict--wait` con ícono `i-check` / `i-hourglass`
   - al tocar una celda se abre debajo la `.promo` completa de ese día (`aria-pressed` en la celda)
3. Máximo 40 comercios, ordenados por su mejor beneficio de la semana.

## Reglas propias
- **Mejor día** = mayor %, después mayor tope (sin tope gana) y después más cuotas. En los empates se marcan todos con `--best`.
- `--best` es la **única** superficie sólida verde de toda la app; no usar verde sólido en otro lado.
- Día sin promo: `--empty` (borde punteado, "—"), sin tap.
- Copy del veredicto, acción primero: "Comprá hoy: es el mejor día." / "Esperá al {día}: {mejor} vs {hoy} hoy." / "Esperá al {día}: {mejor}, hoy no hay."
- Estado inicial (menos de 2 caracteres): `.empty` con instrucción de una línea; no mostrar sugerencias genéricas.
