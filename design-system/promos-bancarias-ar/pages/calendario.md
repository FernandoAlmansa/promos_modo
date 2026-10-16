# Override — Vista "Calendario"

> Pisa a MASTER.md solo en esta vista. Lo que no figura acá sale de MASTER.
> Reemplaza a la vista "Semana" (7 columnas de tarjetas), que se sentía un lío de leer en el celu.

## Pregunta que responde
*¿Qué me conviene hoy (y en los próximos días que elijo mirar), y cuánto me devuelven?*

## Estructura (mobile)
1. App bar → tabs → `.amount` ("¿Cuánto vas a gastar?") → búsqueda + botón **Filtros (n)** → chips de filtros activos (`.chip--remove`) → `.summary[role=status]`.
2. `.daywin` sticky: un tab por día de la ventana (`Hoy`, `Mañana`, `dom`…), después `+ Agregar día` y `−` (quitar el último).
3. `.days` con **un día a la vez** en mobile, 2 desde 720px y **3 como máximo** desde 1100px. Nunca 7 columnas.
4. En cada `.day`:
   - `.day__head`: "Hoy · vie 16 oct · 75 promos" (el contador incluye lo que vale todos los días).
   - `.daybest` **"Lo mejor de hoy"**: 3 filas, borde verde.
   - `.rgroups` **"Solo este día, por rubro"**: un `details.rgroup` por rubro, cerrado, con contador y "hasta 30%" / "hasta $10.000".
5. `section.rgroup--all` **"Todos los días"** al final: lo que vale en todos los días de la ventana (solo si la ventana tiene 2+ días). Muestra siempre sus **3 mejores** y un `.btn--ghost` "Ver las N" (`aria-expanded`) para el resto: acá suele estar lo más amplio (rubros enteros todos los días), así que nunca queda escondido del todo.

## Reglas propias
- **Ventana:** por defecto Hoy + Mañana (2). Mínimo 1, máximo 7. Se guarda en `localStorage` (`promos-modo:days`). Al agregar un día se muestra el día nuevo.
- **Navegación:** tocar un tab, flechas ← → con foco en la tira, o swipe horizontal sobre el día (≥ 60px y más horizontal que vertical). El swipe es un atajo: los tabs siempre están (sin gestos ocultos).
- Los tabs visibles llevan `aria-current="true"` (relleno + borde inferior azul, no solo color).
- **Lo mejor del día:** las 3 mejores promos de **comercios puntuales** que valen ese día (las genéricas tipo "Comercios adheridos" no compiten acá). Con monto cargado, solo las que llegan al mínimo. Si una promo de "Todos los días" le gana a las del día, entra **una sola** marcada "todos los días": así "lo mejor de hoy" nunca esconde algo mejor y los días no repiten el mismo top.
- **Rubros:** ordenados por cantidad; "Otros" siempre al final. Dentro: las que llegan al mínimo primero; entre ellas, primero las que valen en **todo el rubro** ("Gastronomía", "Comercios adheridos", nota "todo el rubro") porque son las más amplias, después los comercios puntuales; cada grupo muestra 15 y un `.btn--ghost` "Ver N más". Abrir un rubro lo deja abierto en todos los días (se recuerda en la sesión).
- **Fusión:** mismo comercio + mismo beneficio (%, fijo, cuotas) que solo cambia de canal, tope o días = **una fila** ("2 opciones"); el detalle lista las variantes con su propio link. Publicaciones con condiciones idénticas (MODO repite la promo con otra vigencia) cuentan como una sola variante, la que dura más.
- **Gemelas:** si una promo del día tiene una gemela en "Todos los días" (mismo comercio y beneficio), la fila del rubro las junta y muestra **la mejor** (nota "todos los días"). Caso real: Gastronomía BBVA jue y vie con tope $20.000 escondía la de todos los días con tope $25.000.
- Las 3 de "Lo mejor" también figuran en su rubro (el rubro es el índice completo del día, y está cerrado). Fuera de eso, ninguna promo se repite: lo que vale toda la ventana no aparece en los rubros de cada día, salvo como variante de una gemela.
- Día sin nada propio: `.empty` "Nada que valga solo este día: el resto está en «Todos los días», más abajo."

## Con monto cargado
- La cifra de cada fila pasa a ser el **ahorro real**: `min(monto × %, tope por compra, tope del período)` → "$10.000 / te devuelven"; debajo "30% · tope $10.000/mes".
- Si no llega a la compra mínima: cifra en gris con "no llegás" (ámbar), alerta "Mín. $15.000, te faltan $5.000" y la fila baja al fondo de su rubro.
- Solo cuotas: "6" + "6 cuotas de $8.333 sin interés".
- El orden pasa de "% mayor" a "más plata que vuelve".
