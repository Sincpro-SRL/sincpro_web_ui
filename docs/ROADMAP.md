# Lo que falta — inventario de @sincpro/web-ui

Medido contra lo que una pantalla de Odoo (y de un ERP moderno) necesita, agrupado por la
pregunta que contesta. Cada fila dice si ya existe, en qué pieza, y de quién es: **web-ui**
(cómo se ve), **composer** (dónde se abre y cómo se mueve), **web-framework** (de dónde salen
los datos). Lo marcado ✅ con fecha se hizo en la ronda del 2026-10-31.

## 1. Un registro

| Necesidad                                            | Estado   | Pieza / dueño                                      |
| ---------------------------------------------------- | -------- | -------------------------------------------------- |
| Identidad, riel, migas, paginador, acciones, etapas  | ✅       | `Record`, `Record.Rail`, `StatusBar`               |
| Barra y hoja en una sola columna; ancho completo     | ✅ 10-31 | `Record.Paper width`                               |
| Jerarquía: título › grupo › etiqueta › valor         | ✅ 10-31 | `SheetGroup` (título con regla), `HEADER_TEXT`     |
| Lo que el registro ES (pagada, archivada, cancelada) | ✅ 10-31 | `Record.Ribbon`                                    |
| Quién lo creó y quién lo tocó por última vez         | ✅ 10-31 | `Record.Audit`                                     |
| Avisos, notas de campo, actividad, historia          | ✅       | `Record.Notice`, `note`, `Record.Activity`         |
| Abrir un registro desde otro (sub-contexto)          | ✅       | composer (modal, vista previa, al costado, página) |
| Prioridad (estrellas)                                | ✅ 10-31 | `Priority`                                         |
| Estado kanban (semáforo) editable                    | ✅ 10-31 | `KanbanState`                                      |
| Próxima actividad en la tarjeta (reloj por urgencia) | ✅ 10-31 | `ActivityBadge`                                    |
| Campo de texto enriquecido (html)                    | ❌       | web-ui (necesita decidir editor: Tiptap/Lexical)   |
| Adjuntos del registro (lista, vista previa, bajar)   | 🟡       | `DropZone` sube; falta `Attachments` que liste     |
| Imagen / avatar editable                             | 🟡       | `Thumb`, `Avatar` muestran; falta subir y recortar |
| Firma                                                | ❌       | web-ui, baja prioridad                             |

## 2. Una colección de registros

| Necesidad                                                                | Estado   | Pieza / dueño                                         |
| ------------------------------------------------------------------------ | -------- | ----------------------------------------------------- |
| Filas, tabla, tablero, planilla, informe, pivote                         | ✅       | `List.*`                                              |
| Solo lectura vs. abrible; vista previa 👁 y abrir ↗                       | ✅ 10-31 | `List readOnly`, `onPeek`, `onOpen`                   |
| Encabezado de filas alineado al píxel                                    | ✅ 10-31 | `List.Rows header`                                    |
| Lista embebida con título cuando está suelta                             | ✅ 10-31 | `List.Identity` en `embedded`                         |
| Tablero POR ETAPAS con arrastrar entre columnas                          | ✅ 10-31 | `List.Board stages` (`BoardColumns`), Alt + ← / →     |
| Reordenar filas arrastrando (secuencia)                                  | ✅ 10-31 | `EditableTable` / `LineItems` `onReorder`             |
| Elegir «los 187 que coinciden», no solo la página                        | ✅ 10-31 | `selection.matching`                                  |
| Vista calendario de registros                                            | ✅ 10-31 | `List.Calendar` (`RecordCalendar`, FullCalendar v7)   |
| Gantt de proyecto (tareas, dependencias, avance)                         | ✅ 10-31 | `List.Gantt` (`RecordGantt`, SVAR)                    |
| Planificación agrupada (el «Gantt» de Odoo)                              | ✅ 10-31 | `List.Timeline` (`RecordTimeline`), `TimelineToolbar` |
| Kanban: crear rápido, total, barra de actividades, plegar, agregar etapa | ✅ 10-31 | `List.Board stages`                                   |
| Calendario por recurso, planificación automática, ruta crítica           | 💲       | licencia: FullCalendar scheduler / SVAR PRO           |
| Exportar lo que se ve (xlsx)                                             | ✅       | `foundations/xlsx`                                    |

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

| Necesidad                                                 | Estado   | Dueño                                                       |
| --------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| Lógica y HTML estático                                    | ✅ 10-31 | `tests/`, proyecto `model` de vitest                        |
| Interacción dentro de la historia (`play`), como composer | ✅ 10-31 | proyectos `storybook` y `storybook-dark`                    |
| Accesibilidad (axe) como error en cada historia           | 🟡       | hoy `todo`: corregir lo que axe encontró y volver a `error` |
