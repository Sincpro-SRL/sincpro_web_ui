# Lo que falta — inventario de @sincpro/web-ui

Medido contra lo que una pantalla de Odoo (y de un ERP moderno) necesita, agrupado por la
pregunta que contesta. Cada fila dice si ya existe, en qué pieza, y de quién es: **web-ui**
(cómo se ve), **composer** (dónde se abre y cómo se mueve), **web-framework** (de dónde salen
los datos). Lo marcado ✅ con fecha se hizo en la ronda del 2026-10-31.

## 1. Un registro

| Necesidad                                                                | Estado   | Pieza / dueño                                                                 |
| ------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------- |
| Identidad, riel, migas, paginador, acciones, etapas                      | ✅       | `Record`, `Record.Rail`, `StatusBar`                                          |
| Barra y hoja en una sola columna; ancho completo                         | ✅ 10-31 | `Record.Paper width`                                                          |
| Jerarquía: título › grupo › etiqueta › valor                             | ✅ 10-31 | `SheetGroup` (título con regla), `HEADER_TEXT`                                |
| Lo que el registro ES (pagada, archivada, cancelada)                     | ✅ 10-31 | `Record.Ribbon`                                                               |
| Editar sin `Record.Actions` no pierde el foco                            | ✅ 11-03 | `RecordHeader`: `dirty` ya no decide el papel                                 |
| Qué cambió, mientras se edita: marca por campo y «2 cambios sin guardar» | ✅ 11-03 | `Field changed`, `DirtyState.changes`                                         |
| Guardar sin perder el foco ni guardar dos veces                          | ✅ 11-03 | `Button busy` (en `DirtyActions`); al terminar, el foco vuelve al nombre      |
| Saber que se guardó, sin que la app lo escriba                           | ✅ 11-03 | «✓ Guardado» en el riel (`useJustSaved`, región `status`)                     |
| Por qué no se puede guardar, a la vista y no en un `title`               | ✅ 11-03 | `DirtyState.blocked` en lugar de «sin guardar», y describe el botón           |
| El foco se ve llegar y la etiqueta lo acompaña                           | ✅ 11-03 | `focus-in` (sólo con movimiento permitido), `Field` con `focus-within`        |
| Una carga rápida no destella un esqueleto                                | ✅ 11-03 | `animate-reveal-late` (aparece a los 200 ms) en `Skeleton` y `RecordSkeleton` |
| Un hecho largo (un email) no pisa al de al lado                          | ✅ 11-03 | `Sheet` (`wrap-anywhere`); la densidad la da `DensityProvider`                |
| Quién lo creó y quién lo tocó por última vez                             | ✅ 10-31 | `Record.Audit`                                                                |
| Avisos, notas de campo, actividad, historia                              | ✅       | `Record.Notice`, `note`, `Record.Activity`                                    |
| Abrir un registro desde otro (sub-contexto)                              | ✅       | composer (modal, vista previa, al costado, página)                            |
| Prioridad (estrellas)                                                    | ✅ 10-31 | `Priority`                                                                    |
| Estado kanban (semáforo) editable                                        | ✅ 10-31 | `KanbanState`                                                                 |
| Próxima actividad en la tarjeta (reloj por urgencia)                     | ✅ 10-31 | `ActivityBadge`                                                               |
| Campo de texto enriquecido (html)                                        | ❌       | web-ui (necesita decidir editor: Tiptap/Lexical)                              |
| Adjuntos del registro (lista, vista previa, bajar)                       | 🟡       | `DropZone` sube; falta `Attachments` que liste                                |
| Imagen / avatar editable                                                 | 🟡       | `Thumb`, `Avatar` muestran; falta subir y recortar                            |
| Firma                                                                    | ❌       | web-ui, baja prioridad                                                        |

## 2. Una colección de registros

| Necesidad                                                                         | Estado   | Pieza / dueño                                                                |
| --------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| Filas, tabla, tablero, planilla, informe, pivote                                  | ✅       | `List.*`                                                                     |
| Solo lectura vs. abrible; vista previa 👁 y abrir ↗                                | ✅ 10-31 | `List readOnly`, `onPeek`, `onOpen`                                          |
| Encabezado de filas alineado al píxel                                             | ✅ 10-31 | `List.Rows header`                                                           |
| Lista embebida con título cuando está suelta                                      | ✅ 10-31 | `List.Identity` en `embedded`                                                |
| Tablero POR ETAPAS con arrastrar entre columnas                                   | ✅ 10-31 | `List.Board stages` (`BoardColumns`), Alt + ← / →                            |
| Reordenar filas arrastrando (secuencia)                                           | ✅ 10-31 | `EditableTable` / `LineItems` `onReorder`                                    |
| Elegir «los 187 que coinciden», no solo la página                                 | ✅ 10-31 | `selection.matching`                                                         |
| Vista calendario de registros                                                     | ✅ 10-31 | `List.Calendar` (`RecordCalendar`, FullCalendar v7)                          |
| Gantt de proyecto (tareas, dependencias, avance)                                  | ✅ 10-31 | `List.Gantt` (`RecordGantt`, SVAR)                                           |
| Planificación agrupada (el «Gantt» de Odoo)                                       | ✅ 10-31 | `List.Timeline` (`RecordTimeline`), `TimelineToolbar`                        |
| Kanban: crear rápido, total, barra de actividades, plegar, agregar etapa          | ✅ 10-31 | `List.Board stages`                                                          |
| Calendario por recurso, planificación automática, ruta crítica                    | 💲       | licencia: FullCalendar scheduler / SVAR PRO                                  |
| Exportar lo que se ve (xlsx)                                                      | ✅       | `foundations/xlsx`                                                           |
| Una presentación propia (mapa, galería, plano) con el mismo conjunto              | ✅ 11-03 | `List.Present` (`ListSet`: orden, montones, selección)                       |
| Una operación sobre N registros elegidos (el «wizard» de Odoo)                    | ✅ 11-03 | `5 · Plantillas/Operación`: `Record` en modal + `api.pick`                   |
| Una operación en VARIOS pasos de una sentada (importar: subir › mapear › revisar) | ❌       | web-ui: falta la pieza; `Steps` es para trabajo de días                      |
| Miles de filas en la tabla: dibuja sólo las que se ven (desde 200)                | ✅ 11-03 | `DataTable` (`primitives/table/rowWindow`)                                   |
| La tabla dibuja los montones que contó el servidor, con «Ver N más»               | ✅ 11-03 | `DataTable piles`, `Grouping.onMore` (filas, tablero, tabla, `ListSet.more`) |
| Volver a preguntar sin que las filas desaparezcan                                 | ✅ 11-03 | `List state.refreshing`: las filas quedan, una barra discreta y `aria-busy`  |
| La tarjeta de una persona dibuja su cara                                          | ✅ 11-03 | `RecordCard media.person`, como `RelationCard`                               |
| Varios conjuntos a la vez (la conciliación), cada uno con su búsqueda             | ✅ 11-03 | `Panes` / `Pane`; `5 · Plantillas/Conciliación`                              |

## 3. Elegir y buscar

| Necesidad                                                                         | Estado   | Pieza / dueño                                                                   |
| --------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| Barra con facetas, filtros, agrupado, favoritos                                   | ✅       | `SearchBar`                                                                     |
| Muchos recortes sin romper la barra                                               | ✅ 10-31 | cadena de agrupado, «+N», tope por ficha                                        |
| Constructor de criterios con JSON                                                 | ✅       | `CriteriaBuilder`                                                               |
| many2one con columnas para distinguir                                             | ✅       | `Picker`                                                                        |
| «Buscar más…» (one y many/agregar), con el buscador, orden y páginas de la lista  | ✅ 10-31 | `api.pick` + `List onChoose` (many: `selection.actions`)                        |
| many2many como fichas, con «Buscar más…»                                          | ✅ 10-31 | `TagsField onBrowseAll`                                                         |
| Paleta de comandos                                                                | ✅       | composer (⌘K)                                                                   |
| Búsqueda literal marcada (sin tildes), y «coincide NIT…» cuando matchea lo oculto | ✅ 10-31 | `Picker`, `TagsField` (`foundations/match`)                                     |
| Crear desde el campo: «Crear «…»» y «Crear y editar…»                             | ✅ 10-31 | `Picker onCreate`, `onCreateAndEdit`                                            |
| Filas del elegidor con widgets (cara, estado, saldo a la derecha)                 | ✅ 10-31 | `PickerItem.avatar`, `tags`, `aside`                                            |
| «Buscar más…» con varias presentaciones (tabla, filas, planilla, calendario)      | 🟡       | el elegidor es una `List`: tabla y filas ✅; planilla y calendario, por mostrar |
| Búsqueda contra el servidor con facetas del modelo                                | 🟡       | web-ui da la barra; el modelo lo trae web-framework                             |
| Un selector que busca en el SERVIDOR: no filtra ni corta lo que le dan            | ✅ 10-31 | `Picker onSearch`; el nombre del elegido fuera de la página, `valueLabel`       |
| Un many2many que busca en el SERVIDOR (fichas sobre miles)                        | ✅ 10-31 | `TagsField onSearch`: no filtra lo que le dan; los elegidos no vuelven          |
| Un grupo dice cuánto suma, no sólo cuántos hay                                    | ✅ 10-31 | `Pile.detail` → `GroupHeader detail` (lo suma quien guarda los datos)           |
| Búsqueda literal en la barra («Buscar «X»» sobre todo el conjunto, con Enter)     | ✅ 10-31 | `SearchBar literal`: primero, salvo que el modelo lea lo escrito como pregunta  |
| Un monto (`decimal`, `monetary`) se pregunta como número                          | ✅ 10-31 | `kindOf` lo leía como texto: «total <= 1000» no se podía pedir                  |
| La barra con fichas puestas: el campo y el botón del panel conservan su nombre    | ✅ 11-03 | `SearchBar`: «Buscar» y «Filtrar, agrupar y favoritos, N puestos»               |
| Las sugerencias de la barra son opciones (combobox de ARIA)                       | ✅ 11-03 | `SearchBar`: `listbox` / `option`, `aria-activedescendant`                      |
| Las palabras de la aplicación con el mismo mecanismo que las del paquete          | ✅ 11-03 | `createCopy`; un `Provider` cambia su rama y nunca la copia instalada           |

## 4. Dónde se abre (espacio de trabajo)

| Necesidad                                                       | Estado   | Dueño                                                           |
| --------------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| Vista previa, panel, ventana, página con migas, ⌘K              | ✅       | composer                                                        |
| Las superficies que composer viste (Peek, Dialog, Missing)      | ✅       | web-ui (`Peek onPromote`, `Dialog onExpand`)                    |
| Modales DENTRO de los paneles                                   | 🟡       | composer — en refactor (2026-10-31)                             |
| Teléfono: todo es página, vista previa como hoja inferior       | ❌       | composer                                                        |
| Plantillas que muestran web-ui + composer juntos                | ✅ 10-31 | `5 · Plantillas/Espacio de trabajo`                             |
| La ventana de `api.pick` con un tamaño pedido                   | ❌       | composer (hoy abre 480×360)                                     |
| Abrir un relacional: modal por defecto + «Abrir en…»            | ✅ 10-31 | `RelationValue onOpenIn`, `Picker onOpen(id, to)`, `OpenTarget` |
| Una etiqueta (many2many) abre su registro en vista previa       | ✅ 10-31 | `TagsField onOpen`, `openTarget`                                |
| Todas las plantillas sobre composer (modales, vista previa, ⌘K) | ✅ 10-31 | `5 · Plantillas/*`                                              |
| Guía «Nuestro estilo · cómo abrimos las cosas»                  | ✅ 10-31 | `stories/Estilo.mdx`                                            |
| Un «abridor» único que web-framework conecta una vez            | ❓       | por decidir: web-ui (contexto) o web-framework                  |

## 5. Pruebas

| Necesidad                                                 | Estado   | Dueño                                                    |
| --------------------------------------------------------- | -------- | -------------------------------------------------------- |
| Lógica y HTML estático                                    | ✅ 10-31 | `tests/`, proyecto `model` de vitest                     |
| Interacción dentro de la historia (`play`), como composer | ✅ 10-31 | proyectos `storybook` y `storybook-dark`                 |
| Accesibilidad (axe) como error en cada historia           | ✅ 11-03 | `a11y: "error"`; lo que se excluye dice por qué, al lado |
