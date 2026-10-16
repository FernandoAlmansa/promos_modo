# Override — Vista "Semana"

> Pisa a MASTER.md solo en esta vista. Lo que no figura acá sale de MASTER.

## Estructura (mobile)
1. App bar → tabs → búsqueda → fila de filtros (`.scroll-x`) → `.summary[role=status]`
2. `.daystrip` sticky: 7 días con el contador de cada uno. El día visible lleva `aria-current="true"` y sincroniza con el scroll de `.days`.
3. `.days`: una columna por día con scroll-snap; se ve el borde de la siguiente (`calc(100% - 32px)`) como pista de que hay más.
4. Banda **"Válidas toda la semana"** (`.section` + `.grid-cards`) **debajo** de los días, colapsada a 6 con un `.btn--ghost` "Ver las N".

## Reglas propias
- Una promo que vale los 7 días visibles va solo en la banda, nunca repetida en las columnas.
- Cada columna muestra 30 tarjetas y luego un `.btn--block` "Ver 30 más (N restantes)". No usar scroll infinito.
- Columna de hoy: `.day--today` (nombre "Hoy" en azul y borde inferior azul).
- Columna vacía: `.empty` con el texto "Nada puntual este día.", sin ilustración.
- ≥ 1100px: la tira de días se oculta, se ven las 7 columnas a la vez, las tarjetas pierden el thumb y la cifra baja a 20px.
