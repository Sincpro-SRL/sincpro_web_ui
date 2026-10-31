# Principios de diseño — @sincpro/web-ui

Un sistema de diseño para software de gestión: el usuario es experto, repetitivo, y mide su día
en tareas terminadas. Velocidad, previsibilidad y teclado valen más que animación o vidrio.
Cada principio de abajo dice **qué pieza del sistema lo aplica** y **qué lo verifica**, porque
una regla que nadie hace cumplir es una sugerencia.

## 1. Jerarquía visual

Cada pantalla responde en dos segundos: dónde estoy, qué es lo más importante, qué hago ahora.
Se construye con tamaño, peso, color, contraste, espacio y posición — en ese orden de fuerza.

| Cómo lo aplica el sistema                                                                                                                                                     | Dónde                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| El nombre del registro es el punto de entrada: `text-display` (28 px) sobre un cuerpo de 13 px — relación 2,15.                                                               | `Record` (`identity.title`)                       |
| El dato por el que se abre el registro va grande, a la derecha.                                                                                                               | `Record` (`identity.figure`)                      |
| Quién es el registro, segundo: `subtitle` en `text-lead`. Los hechos, terceros, en el tamaño callado.                                                                         | `Record` (`identity.subtitle`, `Record.Facts`)    |
| El resumen de montos aparte, a la derecha, el total último y más grande.                                                                                                      | `Totals`                                          |
| El título de una lista es lo más grande de su barra.                                                                                                                          | `ListingBar`                                      |
| UNA banda oscura por pantalla: la barra de la app. El riel del registro y la barra de la lista son claros POR DEFECTO (`canvas`); `surface="chrome"` es una opción explícita. | `AppFrame`, `Record.Rail surface`, `List surface` |

**Se verifica**: la auditoría UX (`ux-ui-audit`) mide la relación título/cuerpo (mínimo ~1,5); `tests/mobile.test.tsx` fija que el riel por defecto no lleva `bg-chrome` y que sus botones toman la superficie del contexto.

## 2. Una acción principal por contexto

La primaria (dorada) aparece una sola vez por vista. Las secundarias con contorno, las
terciarias en `ghost` o en un menú `⋯`, las destructivas en `danger`, separadas y con deshacer.

| Cómo lo aplica el sistema                                         | Dónde            |
| ----------------------------------------------------------------- | ---------------- |
| Cuatro roles de botón: `primary`, `secondary`, `ghost`, `danger`. | `Button`         |
| Las acciones del riel: a lo sumo tres visibles + menú `⋯`.        | `Record.Actions` |

**Se verifica**: `make smoke` falla si una vista o plantilla muestra más de un botón primario.

## 3. El color comunica, no decora

El color significa estado (pagado, vencido, borrador), alerta o la acción principal. Nunca solo
color: siempre con texto o ícono.

| Cómo lo aplica el sistema                                                                  | Dónde                        |
| ------------------------------------------------------------------------------------------ | ---------------------------- |
| Cinco tonos semánticos — neutral, info, good, warn, bad — y el acento solo para la acción. | `Tag`, `StatusDot`, `Metric` |
| Cada color lleva su contraste WCAG anotado y medido.                                       | `tokens.css`                 |
| Un estado fallido lleva ícono además del rojo.                                             | `StatusBar`                  |

**Se verifica**: `tests/tokens.test.ts` recalcula cada contraste; `tests/tokenLint.test.ts`
prohíbe colores fuera de los tokens.

El tema oscuro cumple lo mismo: los cinco tonos conservan su significado, el dorado sigue siendo
la acción principal (con `on-accent` encima) y cada contraste se mide contra el lienzo, la
superficie y el cromo **del oscuro**. Cómo funciona: README, «Theming».

## 4. Proximidad y agrupación

Lo que está cerca se percibe relacionado: el espacio entre grupos es mayor que dentro de un
grupo. Ordena más que poner bordes.

| Cómo lo aplica el sistema                                 | Dónde                       |
| --------------------------------------------------------- | --------------------------- |
| Grupos de campos en dos columnas, cada uno con su título. | `SheetGroups`, `SheetGroup` |
| Secciones que se contestan juntas.                        | `FormSection`               |

## 5. Divulgación progresiva

Primero lo que el 80 % necesita; el resto en pestañas, secciones plegables o "ver más".

| Cómo lo aplica el sistema                                                                                                                                                                                                                                                                                                        | Dónde                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Pestañas del registro.                                                                                                                                                                                                                                                                                                           | `Record.Pages`                                  |
| Opciones avanzadas plegadas.                                                                                                                                                                                                                                                                                                     | `Disclosure`, `Accordion`                       |
| Ayuda bajo demanda, no un párrafo en cada campo.                                                                                                                                                                                                                                                                                 | `Hint` (el `?` del rótulo)                      |
| Avisos del registro: lo que está mal, siempre a la vista y fuera de la hoja; el resto, en la sección «Avisos» de la Actividad, y el indicador del riel lleva a ellos.                                                                                                                                                            | `Record.Notice`                                 |
| Lo que rodea al registro en UNA columna, «Actividad», unida a la hoja por la derecha si hay ancho y debajo si no, abierta por defecto: arriba, compactos, los avisos (lo que está mal AHORA); debajo, siempre a la vista, la línea de tiempo (lo que PASÓ): mensajes, notas y eventos por fecha, separados por día, con filtros. | `Record.Activity`, `Activity`                   |
| Lo que es de UN campo va con su campo: una marca al lado del rótulo dice DÓNDE y abre la frase; la Actividad la lista con los avisos y lleva de vuelta al campo.                                                                                                                                                                 | `note` de `Field`, `DataField` y `Record.Facts` |
| Un registro abierto desde otro: un modal del espacio de trabajo, nunca uno sobre otro.                                                                                                                                                                                                                                           | composer: modal, vista previa, al costado       |

## 6. Consistencia y convenciones

Si "Confirmar" está arriba a la izquierda en Ventas, está en el mismo lugar en Compras. Las dos
vistas —un registro, N registros— son las mismas en todo el producto.

| Cómo lo aplica el sistema                              | Dónde                |
| ------------------------------------------------------ | -------------------- |
| Dos vistas y nada más, escritas como árbol (compound). | `Record.*`, `List.*` |
| Las plantillas solo componen la API pública.           | `stories/templates/` |

**Se verifica**: `tests/templates.test.ts` falla si una plantilla necesita estilos propios
(es un componente que falta); `tests/storyCoverage.test.ts` exige historia para todo lo público.

## 7. Retroalimentación y tolerancia a errores

Cada acción tiene respuesta visible. Los errores dicen qué hacer, en lenguaje humano.
Deshacer es mejor que "¿estás seguro?".

| Cómo lo aplica el sistema                                                                    | Dónde                         |
| -------------------------------------------------------------------------------------------- | ----------------------------- |
| Aviso con acción ("Deshacer").                                                               | `Toast` (`action`)            |
| Cambios sin guardar en el riel, con Guardar y Descartar.                                     | `Record` (`dirty`)            |
| El error va debajo del campo, con ícono, y dice qué poner. Se muestra al intentar, no antes. | `Field` (`error`)             |
| Estados vacío, cargando y falló, cada uno con su frase y su salida.                          | `Empty`, `Skeleton`, `Failed` |

## 8. Accesibilidad como base

Teclado completo, foco visible, nombres accesibles, contraste AA como mínimo.

| Cómo lo aplica el sistema                                                                 | Dónde                   |
| ----------------------------------------------------------------------------------------- | ----------------------- |
| Comportamiento de teclado, foco y ARIA de React Aria.                                     | primitivas interactivas |
| Cada control dentro de `Field` queda nombrado por su rótulo y descrito por ayuda y error. | `useFieldIds`           |

**Se verifica**: Storybook corre a11y como error; `make smoke` abre cada historia en Chrome.

## 9. Leyes útiles

- **Fitts**: la acción principal grande y cerca de donde se mira.
- **Hick**: menos opciones, decisión más rápida — una sola navegación por pantalla (si hay
  barra lateral, la barra de arriba no repite sus menús).
- **Jakob**: la gente espera que funcione como lo que ya conoce (Odoo, SAP Fiori) — por eso el
  resumen de totales a la derecha y la barra de etapas de un documento.
- **Miller**: no obligar a recordar entre pantallas — el paginador del registro y las migas.

## 10. La IA propone, la persona decide

Un asistente que actúa dentro de una pantalla de negocio se confía si siempre se puede contestar
tres cosas: de dónde sacó eso, qué cambia exactamente y cómo se deshace. Nunca se identifica solo
por color: ícono y palabra. Y nunca pide «¿estás seguro?»: aplica y ofrece deshacer.

| Cómo lo aplica el sistema                                                                              | Dónde                                        |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| La sugerencia va debajo del campo, en borde punteado (propuesta, no valor), con su fuente como enlace. | `AssistSuggestion`, `AssistSourceLink`       |
| Varios cambios se ven como antes → después, con el tipo escrito, y se elige cuáles aplicar.            | `ChangeReview`, `ChangeReviewDialog`         |
| Aplicar devuelve su deshacer y el aviso lo ofrece; no hay diálogo de confirmación.                     | `applyWithUndo` + `Toast`                    |
| Lo que el asistente completó queda marcado: quién, cuándo y de qué fuente; y en el historial.          | `AssistMark`, `AssistedValue`, `assistEvent` |
| El asistente trabajando no bloquea: es una línea cancelable donde va a aparecer la propuesta.          | `AssistPending`                              |
| El acento dorado sigue siendo la única acción principal: el asistente usa el tono `info`.              | `ChangeReview` (`emphasis`)                  |

**Se verifica**: `tests/assist.test.tsx` (marca con texto, grupo nombrado, tipo de cambio escrito,
«Aplicar» cuenta y se apaga en cero, el deshacer restaura); `make smoke` (una sola primaria por
plantilla); `tests/templates.test.ts` (la plantilla compone sin estilos propios).

## Checklist antes de entregar una pantalla

- [ ] ¿Se entiende en dos segundos dónde estoy y qué es lo importante? (entrecerrá los ojos)
- [ ] ¿Hay una sola acción primaria?
- [ ] ¿El color significa algo, y nunca va solo? ¿Se ve bien también en oscuro (`globals=theme:dark`)?
- [ ] ¿Los estados vacío, cargando y error están cubiertos, cada uno con su salida?
- [ ] ¿Se usa entera con teclado?
- [ ] ¿Funciona con datos extremos: nombres larguísimos, montos de diez dígitos, cero registros?
- [ ] Si actúa un asistente: ¿tiene fuente, vista previa de lo que cambia y deshacer?
- [ ] ¿La pantalla se armó solo con componentes del sistema (sin estilos propios)?
