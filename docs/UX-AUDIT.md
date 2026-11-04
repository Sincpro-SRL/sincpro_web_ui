# Auditoría UX/UI — 2026-11-04

Revisión de la experiencia en Storybook (Playwright, escritorio 1360 px) contra
`PRINCIPLES.md`, más el inventario de lo que falta. Cada hallazgo lleva la evidencia
(captura o medición) y, cuando hay, el cambio aplicado.

## 1. Hallazgos y estado

| #   | Hallazgo                                                                                                                                                             | Evidencia                                                                      | Principio                    | Estado                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Un error no se puede copiar: `Failed` y `Missing` muestran el texto y nada más. El diálogo de error de campo tampoco.                                                | `stories/primitives/Notice.stories.tsx` («Fallo»), diálogo «Aplicar descuento» | 7 (tolerancia a errores)     | **Hecho** en `Failed`, `Missing`, `Callout` (tono `bad`), `Toast` (tono `bad`) y el error de `Field`: botón «Copiar el error» con el reporte (qué pasó, detalle técnico, fecha y página). |
| 2   | Padding delgado: el riel y la barra de la lista usaban 14 px de margen.                                                                                              | Medido en CRM › Actividades: `Pipeline` a 12–14 px del borde                   | 1 (jerarquía) y legibilidad  | **Hecho** en `ListingBar` (comfortable: `px-5 py-3`, 20 px). Falta revisar el gutter de `AppFrame` y del registro.                                                                        |
| 3   | El encabezado repite el nombre: una etiqueta chica «Pipeline» arriba a la izquierda y el título grande «Pipeline» debajo, separados por la barra de búsqueda.        | CRM › Actividades, captura de viewport                                         | 1 (jerarquía: dónde estoy)   | Pendiente. Propuesta: la etiqueta chica sale (es una miga redundante) o la barra de búsqueda se mueve bajo el título.                                                                     |
| 4   | Los eventos del calendario se cortan a 2–3 palabras («Llamar para confirm…») y los puntos de color (verde, rojo, gris) no tienen leyenda.                            | CRM › Actividades, mes de noviembre                                            | 3 (el color no va solo)      | Pendiente. Propuesta: leyenda con texto y, en la celda, ícono o palabra de estado además del punto.                                                                                       |
| 5   | Las historias con diálogo y estado de error tardan en pintar la primera captura (aparece el spinner de Storybook aunque el DOM ya tenga el contenido).               | Capturas repetidas de «Con error» y «Fallo»                                    | — (herramienta de auditoría) | Observado. Se resuelve leyendo el DOM antes de capturar; no es un defecto de la UI.                                                                                                       |
| 6   | No hay componentes de chat (solo el compositor y la línea de tiempo de `Activity`), ni de archivos, ni previsualización de imagen/PDF, ni de markdown, ni de canvas. | Inventario de `src/components`                                                 | Faltantes                    | Plan abajo.                                                                                                                                                                               |

Sin hallazgos en consola de la UI: el único error es el `favicon.ico` 404 de Storybook.

## 2. Qué falta y con qué (investigación)

Criterio: que sea **moderno y maduro**, que encaje con React 19 y Tailwind v4, y que el
diseño lo siga poniendo el sistema (tokens, React Aria, copia en la tabla). Las versiones y
fechas salen del registro de npm (`npm view`), no de páginas de proveedores.

| Necesidad                           | Candidato                                                  | Versión · última publicación                | Veredicto                                                                                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat (hilo, burbujas, compositor)   | **Propio** sobre React Aria y tokens                       | —                                           | Recomendado. Un kit con estilos impone su look y rompe la regla de tokens.                                                                                                      |
| Chat, alternativa headless para IA  | `@assistant-ui/react` (MIT)                                | 0.15.32 · 2026-10-28 · peer React ^18 ‖ ^19 | Solo si se agrega streaming de un modelo; sus primitivas son sin estilo.                                                                                                        |
| Chat, hosted                        | `stream-chat-react`                                        | 14.16.0 · 2026-11-04                        | Descartado: el backend es de un servicio propio y la licencia del servicio es propietaria.                                                                                      |
| Chat, kit con estilos               | `@chatscope/chat-ui-kit-react`                             | 2.1.1 · 2025-05-15                          | Descartado: sin publicación hace más de un año.                                                                                                                                 |
| Markdown (mensajes, previews)       | **`streamdown`**                                           | 2.7.1 · 2026-10-19 · peer React ^18 ‖ ^19   | Recomendado: API compatible con `react-markdown`, pensado para contenido que llega en streaming.                                                                                |
| Markdown, base estable              | `react-markdown`                                           | 10.1.0 · 2025-03-07                         | Válido como base; sin publicación desde hace más de un año.                                                                                                                     |
| Código resaltado                    | `shiki`                                                    | 4.6.0 · 2026-11-02                          | Recomendado para bloques de código.                                                                                                                                             |
| PDF                                 | **`react-pdf`** (wojtekmaj)                                | 11.0.0 · 2026-09-10 · peer React ^19        | Recomendado. Corre sobre pdf.js. Una búsqueda indica Node 22.13 o superior; verificar en su README.                                                                             |
| PDF, viewer con UI hecha            | `@react-pdf-viewer/core`                                   | 3.12.0 · 2023-03-21                         | Descartado: sin publicación desde 2023, y una fuente indica que el repo fue archivado en 2026.                                                                                  |
| Imagen con zoom y paneo             | Nativo + `react-zoom-pan-pinch`                            | sin verificar en esta sesión                | Por verificar en npm antes de adoptar.                                                                                                                                          |
| Archivos: lista, descarga, tipo     | Propio (`FileCard`, `FileList`) sobre `DropZone` existente | —                                           | Recomendado. Algunas librerías de «todo tipo de archivo» renderizan Office enviando el documento a un tercero (Microsoft Office Online); eso no sirve para documentos internos. |
| Canvas de nodos (diagramas, flujos) | **`@xyflow/react`** (React Flow)                           | 12.12.1 · 2026-11-04 · peer React >=17      | Recomendado para canvas de nodos y conexiones.                                                                                                                                  |
| Pizarra libre                       | `tldraw`                                                   | 5.6.0 · 2026-11-04                          | Válido para pizarra; **licencia por verificar** antes de usarlo en producción.                                                                                                  |
| Pizarra estilo a mano               | `@excalidraw/excalidraw`                                   | 0.18.1 · 2026-10-27 · peer React ^19        | Alternativa; **licencia por verificar**.                                                                                                                                        |

Fuentes de la búsqueda (las páginas de proveedores son orientativas; la madurez se midió en npm):

- [React PDF viewers 2026 (Syncfusion)](https://www.syncfusion.com/blogs/post/best-react-pdf-viewers.md)
- [react-pdf-viewer (phuocng)](https://github.com/react-pdf-dev/react-pdf-viewer)
- [Streamdown vs markstream-react](https://markstream-vue-docs.simonhe.me/compare/streamdown.html)
- [assistant-ui: alternativas 2026](https://designrevision.com/alternatives/assistant-ui)
- [Excalidraw vs tldraw vs Miro SDK 2026](https://www.pkgpulse.com/guides/excalidraw-vs-tldraw-vs-miro-sdk-collaborative-2026)
- [tldraw en GitHub](https://github.com/tldraw/tldraw)
- [file-preview (wh131462)](https://github.com/wh131462/file-preview)

## 3. Plan propuesto (en orden)

1. **Errores** (hecho): reporte copiable en `Callout` `bad`, en el `Toast` `bad` y en el error de `Field`.
2. **Padding y jerarquía del CRM**: quitar la etiqueta duplicada del encabezado; revisar el
   gutter de `AppFrame` y de `Record` con la misma medición (objetivo 20 px en comfortable).
3. **Calendario**: leyenda de estados con texto; eventos con ícono o palabra además del punto.
4. **Archivos**: `FileCard` (ícono por tipo, nombre, tamaño, descargar, eliminar), `FileList`,
   y `FilePreview` que despacha por tipo: imagen (nativo + zoom), PDF (`react-pdf`), texto y
   markdown (`streamdown`), y para el resto solo ícono + descarga.
5. **Chat**: `ChatThread` (burbujas, agrupado por día, cargar anteriores arriba, ir al final),
   `ChatComposer` (enviar con Enter, adjuntos), `ConversationList` (no leídos, buscar). Reusa
   el compositor de `Activity`, no lo duplica.
6. **Markdown** (`streamdown`) como primitiva de texto enriquecido de solo lectura, usada por
   el chat y las previews.
7. **Canvas**: `CanvasPanel` sobre `@xyflow/react` para diagramas y flujos; pizarra libre
   solo si se confirma la licencia de `tldraw`.

Cada pieza nueva sigue `AGENTS.md`: nivel y familia definidos, tokens solamente, textos en la
tabla de copia (inglés y español), historia en su carpeta y un test que falla sin el cambio.

## 4. Lo que queda por decidir

- **Dependencias nuevas**: `react-pdf`, `streamdown` y `@xyflow/react` agregan peso al paquete
  publicado. Se proponen sin instalar todavía; confirmar antes de agregarlas.
- **Licencias**: `tldraw` y `excalidraw` no se verificaron en esta sesión.
- **Verificación pendiente**: `make smoke` (todas las historias en Chrome, claro y oscuro)
  antes de entregar los cambios de errores y padding.

## 5. Barrido de layout — 332 historias, escritorio (1360 px) y teléfono (390 px)

Medido con Playwright sobre el DOM real: scroll horizontal de la página, texto cortado sin
elipsis, solapamientos entre textos y controles en el flujo normal, y la distancia real del
texto al borde de su caja (padding). Las demos de fundamentos (leyendas `figcaption` puestas
encima a propósito) y las librerías externas (FullCalendar, Gantt, React Flow) quedan fuera.

**Padding**: sano en escritorio después de llevar `ListingBar` a 20 px; lo que el barrido marca
(6 casos) son contenedores sin caja propia o la mención `@persona`, angosta a propósito.

**Corregido**

| Dónde                                | Qué pasaba                                                                                                 | Arreglo                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `SearchBar` (escritorio)             | En una fila `flex` sin ancho, la barra colapsaba y el input quedaba debajo del botón de filtros («bu⊞car») | La barra no baja de `min-w-48` y el input de `min-w-24`        |
| `TopBar` (teléfono)                  | Los menús se recortaban: «Cl» pegado a los íconos y el resto inalcanzable                                  | La franja de menús se desplaza (`scroll-quiet`)                |
| `SmartButtons` en el riel (teléfono) | Cada contador se salía de su celda, pisaba el siguiente y el último se recortaba                           | Las celdas no se achican y el grupo se desplaza                |
| `ChatComposer` (angosto)             | El cuadro colapsaba y «Enviar» se montaba encima                                                           | «Enviar» queda sólo ícono bajo 20 rem (consulta de contenedor) |
| Historia «Tablero»                   | El título largo de la tarjeta propia salía de su tarjeta                                                   | `min-w-0` + `max-w-full` en la historia                        |

**Pendiente (teléfono, 390 px)** — no se corrigió en esta vuelta:

- Formularios con controles anchos que desbordan la página: «Controles · Números» (61 px),
  «Mirar y editar» (107 px), «Unidad y redondeo» (147 px), «Elecciones · en un formulario»
  (26 px).
- `SearchBar` con muchas fichas («Probar», «Búsqueda literal») desborda ~110 px.
- Tabla editable en la lista («Facturas editables», 187 px): la tabla no está en un contenedor
  con scroll propio.
- Relacional en una tabla: el enlace y el NIT se pisan en celdas angostas.
- Barra de estados del registro: el botón de acción queda encima de las etapas.
- `SheetTable`: el encabezado «TRASPASO CTA PROPIA BNB» se corta 22 px sin elipsis.
- `Peek`: «Abrir como panel» se recorta 16 px contra el borde del cajón.
