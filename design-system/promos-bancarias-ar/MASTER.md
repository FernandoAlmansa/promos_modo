# Promos Bancarias AR — Design System (MASTER)

> Fuente de verdad global. Si existe `pages/<vista>.md`, sus reglas pisan a este archivo para esa vista.
> Implementación: `/css/tokens.css` (variables) + `/css/components.css` (componentes) + `/assets/icons.svg` (sprite, pegado inline en `/index.html`). Specimen: `preview.html` (esta carpeta).

**Producto:** app web de promociones bancarias argentinas (MODO, reintegros y cuotas).
**Público:** general, desde el celular, muchas veces parado en la caja o en la góndola.
**Stack:** HTML + CSS + JS vanilla, GitHub Pages. Sin build, sin framework, sin Tailwind.
**Generado con:** ui-ux-pro-max (`--design-system`, dials variance 3 · motion 2 · density 7), ajustado a mano (ver "Decisiones").

---

## 1. Principios

1. **Primero la cifra, y en plata si se puede.** En una lista de promos, la cifra es lo primero que se lee: va a la izquierda de la fila, en Rubik bold, con el color de su tipo. Si el usuario cargó cuánto va a gastar, la cifra es **lo que le devuelven** (`$10.000`), no el porcentaje.
2. **El color significa algo.** La interfaz es neutra (grises fríos + blanco). Hay cuatro colores con significado y no se usan para decorar:
   - **Verde `--color-save`** → reintegro, plata que vuelve, "mejor día".
   - **Índigo `--color-cuotas`** → cuotas sin interés.
   - **Ámbar `--color-warn`** → condición que te puede dejar afuera: franja horaria, termina hoy, compra mínima alta.
   - **Azul `--color-primary`** → acción, link, selección, foco.
3. **Una frase, no chips sueltos.** El beneficio se dice como se diría en voz alta: "30% de reintegro, hasta $10.000 por mes" / "6 cuotas sin interés" / "$9.593 de reintegro". En la fila solo aparece una alerta ámbar si algo te puede dejar afuera (franja horaria, termina hoy, mínimo alto o no alcanzado); el resto de las condiciones van al panel de detalle.
4. **Una pantalla, una pregunta.** "Calendario" responde *¿qué me conviene hoy y en los días que miro?*; "¿Compro hoy o espero?" responde *¿cuándo me conviene ir a X?*.
5. **Poco por vez.** Pocos días (hoy + mañana, ampliable), lo mejor arriba y el resto agrupado y cerrado. Nunca 7 columnas apretadas.
6. **Rápido de verdad.** Sin animaciones decorativas, imágenes lazy con espacio reservado y un solo fetch de datos.

## 2. Estilo

**Minimalismo / Swiss Style**: grilla, mucho blanco, contraste alto, sans-serif geométrica, jerarquía por tamaño y peso (no por cajas y sombras). Sombra solo `--shadow-card` (casi imperceptible) en claro y ninguna en oscuro.

**Modo:** claro por defecto, oscuro automático según el sistema (`prefers-color-scheme`) o forzado con `<html data-theme="dark|light">`. El oscuro tiene tokens propios; no es una inversión del claro.

## 3. Color

| Rol | Token | Claro | Oscuro | Uso |
|---|---|---|---|---|
| Fondo | `--color-bg` | `#F8FAFC` | `#0B1220` | página |
| Superficie | `--color-surface` | `#FFFFFF` | `#111A2E` | tarjetas, inputs, sheet |
| Superficie tenue | `--color-surface-muted` | `#EEF2F6` | `#1A2540` | chips de metadato, tabs |
| Borde | `--color-border` | `#E2E8F0` | `#22304D` | separar tarjetas (decorativo) |
| Borde de control | `--color-border-control` | `#7C8AA0` | `#6B7A90` | inputs, chips, botones (≥ 3:1) |
| Texto | `--color-text` | `#0F172A` | `#E2E8F0` | títulos, cuerpo |
| Texto secundario | `--color-text-muted` | `#475569` | `#94A3B8` | descripciones |
| Metadato | `--color-text-subtle` | `#64748B` | `#8492A6` | solo ≥ 12px |
| Acción | `--color-primary` / `--color-on-primary` | `#1D4ED8` / `#FFF` | `#60A5FA` / `#0B1220` | botón primario, links, foco |
| Seleccionado | `--color-primary-soft` / `--color-on-primary-soft` | `#DBEAFE` / `#1E40AF` | `#172554` / `#BFDBFE` | chip activo, día activo |
| Reintegro | `--color-save` / `--color-on-save` | `#047857` / `#FFF` | `#34D399` / `#04241A` | cifra %, mejor día |
| Reintegro tenue | `--color-save-soft` / `--color-on-save-soft` | `#D1FAE5` / `#047857` | `#063B2C` / `#34D399` | "Sin tope", veredicto "comprá hoy" |
| Cuotas | `--color-cuotas` sobre `--color-cuotas-soft` | `#4338CA` / `#E0E7FF` | `#A5B4FC` / `#1E1B4B` | cifra de cuotas, chip de cuotas |
| Condición | `--color-warn` sobre `--color-warn-soft` | `#92400E` / `#FEF3C7` | `#FCD34D` / `#3B2A06` | franja horaria, termina hoy, "esperá" |
| Error | `--color-danger` sobre `--color-danger-soft` | `#B91C1C` / `#FEE2E2` | `#FCA5A5` / `#3F1010` | error de carga |

Todos los pares texto/fondo verificados: mínimo **4.55:1** en claro y **5.49:1** en oscuro. Bordes de control y anillo de foco ≥ 3:1. El color nunca va solo: el "mejor día" además tiene fondo sólido, y la franja horaria lleva un ícono de reloj y texto.

## 4. Tipografía

- **Display / cifras:** Rubik 500–700 (`--font-display`). Siempre con `font-variant-numeric: tabular-nums` en cifras (clase `.num`), así 10% y 30% alinean.
- **Cuerpo:** Nunito Sans 400/600/700 (`--font-body`).
- Carga: `https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&family=Rubik:wght@500;600;700&display=swap` con `preconnect`. Fallback `system-ui`: si la fuente no carga, la app se ve bien igual.

| Token | px | Uso |
|---|---|---|
| `--text-xs` | 12 | metadatos, chips, contadores (piso absoluto) |
| `--text-sm` | 14 | descripción de la promo, botones, tabs |
| `--text-md` | 16 | cuerpo, **inputs** (evita el zoom de iOS), nombre de comercio en tarjeta |
| `--text-lg` | 18 | nombre del día, comercio en "¿Compro hoy?", títulos de sección |
| `--text-xl` | 20 | título de app/sheet, cifra de cuotas |
| `--text-2xl` | 24 | cifra del beneficio en tarjeta |
| `--text-3xl` | 32 | cifra destacada (hero de un comercio) |

Interlineado: 1.5 para cuerpo y 1.2 para títulos y cifras. El nombre del comercio corta a 2 líneas con ellipsis.

## 5. Espaciado, forma y tamaños

- Escala base 4px: `--space-1…12` = 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48. **Gutter mobile 16px** (`--space-4`).
- Dentro de una tarjeta se usa 8/12; entre tarjetas 8 (lista densa) o 12; entre secciones 24–48.
- Radios: 6 (chip de metadato) · 10 (botón, input, badge) · 14 (tarjeta) · 20 (sheet) · pill (chips de filtro).
- **Objetivo táctil ≥ 44px** (`--tap-min`). Los chips de filtro miden 36px visibles y extienden el área tocable con `::after`.
- Íconos: 16 / 20 / 24, trazo 2, sin relleno, una sola familia (trazos estilo Lucide en `icons.svg`). **Prohibidos los emojis como íconos.**
- Filas de promo de 64px o más; encabezado de rubro 52px; tabs de día 52px. La lista ya no muestra thumbs de comercio.

## 6. Movimiento

Sutil y funcional. Tokens: `--dur-press` 100ms, `--dur-fast` 150ms (hover, toggle), `--dur-base` 220ms, `--dur-sheet` 280ms de entrada. Easing `--ease-out` al entrar y `--ease-in` al salir (la salida dura menos que la entrada). Solo se animan `opacity`, `transform`, `background-color` y `border-color`, nunca width/height. Con `prefers-reduced-motion` todas las duraciones pasan a 0. **No usar GSAP ni scroll-reveal:** la sugerencia de la herramienta se descartó porque una lista de promos tiene que estar visible al toque.

## 7. Componentes (`components.css`)

| Componente | Clases | Notas |
|---|---|---|
| App bar | `.appbar` `__title` `__meta` `__actions` | respeta `safe-area-inset-top` |
| Tabs de vista | `.tabs` `.tabs__tab[aria-selected]` | 2 vistas, `role="tablist"` |
| Búsqueda | `.search` + `input type=search` | label `.sr-only` + ícono decorativo `aria-hidden` |
| Select | `.select` `.is-active` | flecha SVG inline, sin librerías |
| Chip de filtro | `.chip[aria-pressed]` `.chip__check` | el check aparece al activar (el estado no depende solo del color) |
| Segmentado | `.seg` `.seg__btn[aria-pressed]` | tipo: Todo / Reintegro / Cuotas |
| Botón | `.btn` `--primary` `--ghost` `--icon` `--block` | `disabled` real; los botones de solo ícono llevan `aria-label` |
| Fila de filtros | `.scroll-x` | scroll horizontal *dentro* del componente, nunca de la página |
| Chip removible | `.chip.chip--remove` | filtro activo arriba de la lista; tocarlo lo quita (texto + ícono x + `.sr-only` "quitar filtro") |
| **Monto a gastar** | `.amount` `__icon` `__label` `__prefix` `__input` `__clear` | label visible arriba, `inputmode="numeric"`, punto de miles mientras escribís; persistente |
| **Ventana de días** | `.daywin` `__scroll` `__day[aria-current]` `__name` `__date` `__add` `__remove` | sticky; tabs + "Agregar día" (borde punteado) + quitar; 1 a 7 días |
| Días | `.days[style=--cols:N]` `.day` `.day--today` `__head` `__name` `__date` `__count` | 1 columna en mobile, 2 desde 720px, 3 como máximo desde 1100px |
| Lo mejor del día | `.daybest` `__title` + `.plist` | 3 filas, borde `--color-save` |
| **Lista de filas** | `.plist` (`--grid` en "Todos los días") | superficie única con separadores de 1px; en `--grid`, 2 o 3 columnas |
| **Fila de promo** | `.prow` `__fig(--save/--cuotas/--off/--long)` `__value` `__label` `__body` `__top` `__name` `__note` `__line` `__alert` `__chev` | `button` de ≥ 64px que abre el detalle; ver anatomía |
| **Grupo por rubro** | `details.rgroup` `__head` (summary) `__title` `__sub` `.count` `__best` `__chev` · `section.rgroup--all` + `__head--static` | nativo (`details/summary`), cerrado por defecto, 52px de alto; "Todos los días" muestra siempre su top 3 |
| **Panel de detalle** | `.sheet.sheet--side` + `.hero(--save/--cuotas/--off)` `.callout--warn` `.facts` `__row` `__channels` `.variants` `.variant` | bottom sheet en mobile, panel lateral derecho desde 1100px |
| Contador | `.count` / `.count--on` | `--on` = filtros activos en el botón "Filtros" |
| Matriz de 7 días | `.matrix` `__cell` `--best` `--empty` `[aria-pressed]` `__day` `__value` `__sub` | celdas `button` con `aria-label` completo |
| Veredicto | `.verdict--buy` / `.verdict--wait` | siempre con ícono + texto |
| Comercio | `.merchant` `__head` `__name` `__cat` | contenedor de la matriz |
| Bottom sheet | `.sheet[hidden]` `__panel` `__grab` `__head` `__heading` `__eyebrow` `__title` `__label` `__foot` | `role="dialog" aria-modal="true"`, Escape cierra, foco atrapado y devuelto al que lo abrió. Perfil, filtros y detalle |
| Checkbox | `.check` | 44px de alto y `accent-color` primario |
| Estados | `.empty` · `.skeleton` · `.summary[role=status]` | skeleton sin shimmer con reduced-motion |

### Anatomía de la fila (orden de lectura)

```
┌──────────────────────────────────────────────────┐
│  30%       Carrefour (16/600, 1 línea)  2 opc. › │  ← cifra 24/700 verde · nombre · chevron
│  reintegro 30% de reintegro, hasta $10.000       │  ← frase 14 muted, máx. 2 líneas
│            por mes                               │
│            [reloj Solo de 18 a 22 h]             │  ← alerta ámbar, solo si hace falta
└──────────────────────────────────────────────────┘
con monto:  $10.000 / te devuelven · "30% · tope $10.000/mes"
sin llegar: 30% gris / no llegás (ámbar) · alerta "Mín. $15.000, te faltan $5.000"
```

Fuera de la fila (van al panel de detalle): imagen, íconos de canal, bancos, medios de pago, días válidos, vigencia, franja y "Ver en MODO".

### Anatomía del panel de detalle

`eyebrow` (rubro · día) → título (comercio) → `.hero` ("Te devuelven $10.000" + por qué: "30% de $50.000 serían $15.000, pero el tope es $10.000 por mes") → alertas `.callout--warn` → `.facts` (tope, cuotas, mínimo, máximo por compra, días, horario, vigencia, dónde, medios de pago, bancos) → variantes fusionadas → botón primario "Ver en MODO".

## 8. Formatos de contenido

- Plata: `$40.000`, con punto de miles (`Intl.NumberFormat('es-AR')`) y sin decimales. En la matriz se abrevia: `$10k`.
- Beneficio sin monto: "30% de reintegro, hasta $10.000 por mes" · "25% de reintegro, sin tope" · "30% de reintegro y 6 cuotas s/i, hasta $40.000 en total" · "6 cuotas sin interés" · "$9.593 de reintegro".
- Beneficio con monto: cifra "$10.000" + "te devuelven"; debajo "30% · tope $10.000/mes" o "20% · máx. $3.000 por compra"; cuotas: "6 cuotas de $8.333 sin interés".
- Ahorro = `min(monto × %, tope por compra, tope del período)`; monto fijo = `min(fijo, monto)`; si no llega a la compra mínima, $0 y "te faltan $X". Es una estimación: el tope del período puede estar usado en parte (el detalle lo aclara).
- Días: "Hoy", "Mañana", "dom" (es-AR, minúscula, capitalizado con CSS). Fecha corta: "15 oct". Días válidos: "Todos los días", "De lunes a viernes", "Jueves, viernes y sábado".
- Alertas (ámbar, con ícono): "Solo de 18 a 22 h", "Termina hoy" / "Último día", "Compra mínima $100.000" (mínimo de $30.000 o más, sin monto cargado), "Mín. $15.000, te faltan $5.000".
- Veredicto: "Comprá hoy: es el mejor día." / "Esperá al miércoles: 25% vs 10% hoy." (voseo rioplatense, acción primero).

## 9. Layout y breakpoints

Mobile-first. La base es 375px. Breakpoints: **720px** (2 días visibles, monto y búsqueda en una fila, "Todos los días" en 2 columnas) y **1100px** (3 días visibles como máximo, "Todos los días" en 3 columnas, sheets centrados y detalle como panel lateral). Contenedor máx. 1440px. Nunca hay scroll horizontal de página: el scroll lateral vive solo en `.scroll-x` y `.daywin__scroll` (verificado en 375 y 1440). `viewport-fit=cover` y `env(safe-area-inset-*)` en app bar y sheet.

## 10. Accesibilidad (obligatorio)

- `:focus-visible` con anillo de 2px `--color-ring` en todo lo interactivo; nunca `outline: none` sin reemplazo.
- Usar elementos nativos: `button`, `a`, `input`, `select`. Nada de `div` clickeables.
- Estados expuestos: `aria-pressed` (chips de filtro), `aria-selected` (tabs), `aria-current` (días visibles), `aria-haspopup="dialog"` (filas y celdas que abren el detalle), `details[open]` (rubros).
- Diálogos: foco al botón cerrar al abrir, Tab/Shift+Tab atrapados adentro, Escape y click en el fondo cierran, el foco vuelve al elemento que lo abrió.
- El swipe entre días es un atajo: siempre hay tabs (y flechas izquierda/derecha con foco en la tira).
- Contadores que cambian con filtros: `.summary` con `role="status"`.
- Ícono junto a texto → `aria-hidden="true"`. Ícono solo → `aria-label` en el botón.
- Imágenes de comercio: `alt=""` (el nombre ya está en el texto), `loading="lazy"`, `decoding="async"` y `width/height` declarados.

## 11. Íconos

Hay dos formas de usar el sprite:
1. **Recomendada:** pegar el `<svg style="display:none">…</svg>` de `icons.svg` al inicio del `<body>` y referenciar con `<use href="#i-store"/>`. No hace requests extra y funciona también desde `file://`.
2. Externo: `<use href="icons.svg#i-store"/>`. Funciona en GitHub Pages (mismo origen), pero **no** abriendo el archivo local.

Íconos disponibles: `search store globe nfc calendar clock card user sun moon external filter check x tag trend hourglass plus minus chevron-right chevron-down alert cash`.

## 12. Anti-patrones (no hacer)

- Emojis como íconos (🏪 🌐 📲 🤔 📅). Hoy la app React los usa y hay que reemplazarlos.
- Paletas "fintech" oscuras con dorado/violeta o gradientes AI violeta-rosa. La herramienta las propuso primero y se descartaron.
- Colores semánticos para decorar (verde en un botón que no es "ahorro", ámbar de adorno).
- Texto < 12px; gris sobre gris; `--color-text-subtle` sobre `--color-surface-muted` en tamaños chicos.
- Scroll-reveal, carruseles automáticos o parallax.
- Párrafos de "bases y condiciones" en la fila: el detalle va al panel y las bases al link de MODO.
- Imagen, íconos de canal, lista de bancos o links dentro de la fila: es ruido, va al panel de detalle.
- Mostrar 7 días a la vez, o la misma promo repetida en cada día.
- Ocultar información solo detrás de hover (en el celu no hay hover).
- Placeholder como única etiqueta de un input.

## 13. Checklist previo a entregar

- [ ] Sin emojis como íconos; todos los íconos del sprite.
- [ ] Contraste ≥ 4.5:1 en claro **y** oscuro (los tokens actuales pasan, así que no hace falta inventar colores).
- [ ] Todo lo tocable ≥ 44px, con feedback de press (opacity/background).
- [ ] Foco visible al navegar con teclado; Escape cierra el sheet.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Probado en 375 · 768 · 1024 · 1440 sin scroll horizontal de página.
- [ ] Cálculo de ahorro cubierto por `tests/promos.test.cjs` (topes, mínimo, monto fijo, cuotas).
- [ ] Imágenes con tamaño reservado (CLS ≈ 0).
- [ ] Ningún color crudo en componentes: solo `var(--…)`.

## Decisiones (qué propuso la herramienta y qué quedó)

| Propuesta ui-ux-pro-max | Decisión | Motivo |
|---|---|---|
| Patrón "Trust & Authority" + paleta Fintech oscura dorado/violeta | ❌ | Se pidió estilo claro; esa misma paleta cae en el anti-patrón "AI purple" de la herramienta |
| Estilo **Minimalism & Swiss** | ✅ | Coincidió en las dos corridas; ideal para escanear |
| Paleta Banking (navy + neutros claros) | ✅ base neutra | da confianza y es sobria |
| Paleta E-commerce "success green + urgency orange" | ✅ adaptada | verde = ahorro y ámbar = condición; el naranja se oscureció a `#92400E` para pasar 4.5:1 |
| Tipografía **Rubik + Nunito Sans** (e-commerce) | ✅ | Rubik da cifras grandes y legibles; IBM Plex (banking) quedaba demasiado corporativa |
| GSAP scroll reveal | ❌ | Agrega peso y demora el contenido; queda solo CSS |
| Evitar swipe horizontal en contenido principal (ux "Gesture Conflicts") | ✅ adaptada | el swipe entre días existe pero es un atajo: los tabs siempre están y alcanzan solos |
| Label visible siempre, `inputmode` numérico (ux "Input Labels", "Mobile Keyboards") | ✅ | `.amount` con label arriba del valor, no placeholder como etiqueta |
| Foco visible y no tapado en modales (ux "Focus States", "Focus Not Obscured") | ✅ | anillo de 2px; el pie sticky del sheet va al final del flujo |
| Densidad 7 | ✅ | lista densa en mobile sin bajar de 44px táctiles |
