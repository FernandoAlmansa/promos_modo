# Promos Bancarias AR — Design System (MASTER)

> Fuente de verdad global. Si existe `pages/<vista>.md`, sus reglas pisan a este archivo para esa vista.
> Implementación: `/css/tokens.css` (variables) + `/css/components.css` (componentes) + `/assets/icons.svg` (sprite, pegado inline en `/index.html`). Specimen: `preview.html` (esta carpeta).

**Producto:** app web de promociones bancarias argentinas (MODO, reintegros y cuotas).
**Público:** general, desde el celular, muchas veces parado en la caja o en la góndola.
**Stack:** HTML + CSS + JS vanilla, GitHub Pages. Sin build, sin framework, sin Tailwind.
**Generado con:** ui-ux-pro-max (`--design-system`, dials variance 3 · motion 2 · density 7), ajustado a mano (ver "Decisiones").

---

## 1. Principios

1. **Primero la cifra.** En una lista de promos, la cifra (30%, 9 cuotas) es lo primero que se lee. Va arriba a la derecha, en Rubik bold, con el color de su tipo.
2. **El color significa algo.** La interfaz es neutra (grises fríos + blanco). Hay cuatro colores con significado y no se usan para decorar:
   - **Verde `--color-save`** → reintegro, plata que vuelve, "mejor día".
   - **Índigo `--color-cuotas`** → cuotas sin interés.
   - **Ámbar `--color-warn`** → condición que te puede dejar afuera: franja horaria, termina hoy, compra mínima alta.
   - **Azul `--color-primary`** → acción, link, selección, foco.
3. **Condiciones en chips, nunca en párrafos.** Tope, mínimo, franja: cada uno es un chip de 12px de hasta 3 palabras ("Tope $10.000 por mes").
4. **Una pantalla, una pregunta.** "Semana" responde *¿qué hay cada día?*; "¿Compro hoy o espero?" responde *¿cuándo me conviene ir a X?*.
5. **Rápido de verdad.** Sin animaciones decorativas, imágenes lazy con espacio reservado y un solo fetch de datos.

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
- Thumb de comercio: 44×44 con `width/height` declarados (CLS 0). En desktop dentro de columnas de día se oculta.

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
| **Tarjeta de promo** | `.promo` `__thumb` `__body` `__place` `__desc` `.benefit` `.meta` `__foot` `__channels` `__bank` `__link` `.promo--best` | grid 3 columnas: thumb · texto · cifra |
| Cifra | `.benefit--save` / `.benefit--cuotas` + `__value` `__label` | label corto: "reintegro", "cuotas s/i" |
| Metadato | `.meta__item` `--save` `--cuotas` `--warn` | máx. 3 palabras |
| Tira de días | `.daystrip` `__day[aria-current]` `__count` | sticky en mobile; oculta ≥ 1100px |
| Columnas de días | `.days` `.day` `.day--today` `__head` `__name` `__date` `__count` | scroll-snap en mobile, 2 columnas desde 720px y 7 desde 1100px |
| Sección / banda | `.section` `__head` `__title` `.count` `.grid-cards` | "Válidas toda la semana" |
| Matriz de 7 días | `.matrix` `__cell` `--best` `--empty` `[aria-pressed]` `__day` `__value` `__sub` | celdas `button` con `aria-label` completo |
| Veredicto | `.verdict--buy` / `.verdict--wait` | siempre con ícono + texto |
| Comercio | `.merchant` `__head` `__name` `__cat` | contenedor de la matriz |
| Bottom sheet | `.sheet[hidden]` `__panel` `__grab` `__head` `__title` `__label` `__foot` | `role="dialog" aria-modal="true"`, Escape cierra, foco atrapado |
| Checkbox | `.check` | 44px de alto y `accent-color` primario |
| Estados | `.empty` · `.skeleton` · `.summary[role=status]` | skeleton sin shimmer con reduced-motion |

### Anatomía de la tarjeta (orden de lectura)

```
┌────────────────────────────────────────────┐
│ [thumb]  Comercio (16/600, 2 líneas)   30% │  ← cifra 24/700 verde
│          Descripción (14, muted)  reintegro│
│ [6 cuotas s/i] [Tope $50.000 total] [18–22 h]│ ← chips 12/600
│ ─────────────────────────────────────────── │
│ [store][globe][nfc]  BBVA + 17 adh.  Ver ↗ │ ← íconos SVG + texto 12
└────────────────────────────────────────────┘
```

Los canales se muestran con ícono SVG y su nombre en `.sr-only`. El link "Ver en MODO" mide al menos 44px de alto.

## 8. Formatos de contenido

- Plata: `$40.000`, con punto de miles (`Intl.NumberFormat('es-AR')`) y sin decimales. En la matriz se abrevia: `$10k`.
- Topes: "Tope $10.000 por mes" / "por semana" / "por día" / "total". Si no hay tope y la promo tiene reintegro, se muestra "Sin tope" en chip verde.
- Días: "Hoy", "vie", "sáb" (es-AR, minúscula, capitalizado con CSS). Fecha corta: "15 oct".
- Franja horaria solo cuando no es todo el día: "18–22 h" en chip ámbar con ícono de reloj.
- Veredicto: "Comprá hoy: es el mejor día." / "Esperá al miércoles: 25% vs 10% hoy." (voseo rioplatense, acción primero).

## 9. Layout y breakpoints

Mobile-first. La base es 375px. Breakpoints: **720px** (2 columnas de días, grilla de 2) y **1100px** (7 columnas, grilla de 4, sheet centrado). Contenedor máx. 1440px. Nunca hay scroll horizontal de página: el scroll lateral vive solo en `.scroll-x` y `.days` (verificado en 375px). `viewport-fit=cover` y `env(safe-area-inset-*)` en app bar y sheet.

## 10. Accesibilidad (obligatorio)

- `:focus-visible` con anillo de 2px `--color-ring` en todo lo interactivo; nunca `outline: none` sin reemplazo.
- Usar elementos nativos: `button`, `a`, `input`, `select`. Nada de `div` clickeables.
- Estados expuestos: `aria-pressed` (chips, celdas), `aria-selected` (tabs), `aria-current` (día activo).
- Contadores que cambian con filtros: `.summary` con `role="status"`.
- Ícono junto a texto → `aria-hidden="true"`. Ícono solo → `aria-label` en el botón.
- Imágenes de comercio: `alt=""` (el nombre ya está en el texto), `loading="lazy"`, `decoding="async"` y `width/height` declarados.

## 11. Íconos

Hay dos formas de usar el sprite:
1. **Recomendada:** pegar el `<svg style="display:none">…</svg>` de `icons.svg` al inicio del `<body>` y referenciar con `<use href="#i-store"/>`. No hace requests extra y funciona también desde `file://`.
2. Externo: `<use href="icons.svg#i-store"/>`. Funciona en GitHub Pages (mismo origen), pero **no** abriendo el archivo local.

Íconos disponibles: `search store globe nfc calendar clock card user sun moon external filter check x tag trend hourglass`.

## 12. Anti-patrones (no hacer)

- Emojis como íconos (🏪 🌐 📲 🤔 📅). Hoy la app React los usa y hay que reemplazarlos.
- Paletas "fintech" oscuras con dorado/violeta o gradientes AI violeta-rosa. La herramienta las propuso primero y se descartaron.
- Colores semánticos para decorar (verde en un botón que no es "ahorro", ámbar de adorno).
- Texto < 12px; gris sobre gris; `--color-text-subtle` sobre `--color-surface-muted` en tamaños chicos.
- Scroll-reveal, carruseles automáticos o parallax.
- Párrafos de "bases y condiciones" en la tarjeta: eso va al link de MODO.
- Ocultar información solo detrás de hover (en el celu no hay hover).
- Placeholder como única etiqueta de un input.

## 13. Checklist previo a entregar

- [ ] Sin emojis como íconos; todos los íconos del sprite.
- [ ] Contraste ≥ 4.5:1 en claro **y** oscuro (los tokens actuales pasan, así que no hace falta inventar colores).
- [ ] Todo lo tocable ≥ 44px, con feedback de press (opacity/background).
- [ ] Foco visible al navegar con teclado; Escape cierra el sheet.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Probado en 375 · 768 · 1024 · 1440 sin scroll horizontal de página.
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
| Densidad 7 | ✅ | lista densa en mobile sin bajar de 44px táctiles |
