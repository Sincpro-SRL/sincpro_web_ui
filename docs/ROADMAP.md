# Lo que falta — inventario de @sincpro/web-ui

Medido contra lo que una pantalla de Odoo (y de un ERP moderno) necesita, agrupado por la
pregunta que contesta. Cada fila dice si ya existe, en qué pieza, y de quién es: **web-ui**
(cómo se ve), **composer** (dónde se abre y cómo se mueve), **web-framework** (de dónde salen
los datos). Lo marcado ✅ con fecha se hizo en la ronda del 2026-10-31.

## 1. Un registro

| Necesidad                                            | Estado   | Pieza / dueño                                           |
| ---------------------------------------------------- | -------- | ------------------------------------------------------- |
| Identidad, riel, migas, paginador, acciones, etapas  | ✅       | `Record`, `Record.Rail`, `StatusBar`                    |
| Barra y hoja en una sola columna; ancho completo     | ✅ 10-31 | `Record.Paper width`                                    |
| Jerarquía: título › grupo › etiqueta › valor         | ✅ 10-31 | `SheetGroup` (título con regla), `HEADER_TEXT`          |
| Lo que el registro ES (pagada, archivada, cancelada) | ✅ 10-31 | `Record.Ribbon`                                         |
| Quién lo creó y quién lo tocó por última vez         | ✅ 10-31 | `Record.Audit`                                          |
| Avisos, notas de campo, actividad, historia          | ✅       | `Record.Notice`, `note`, `Record.Activity`              |
| Abrir un registro desde otro (sub-contexto)          | ✅       | `Drill` (web-ui) — y en el espacio de trabajo, composer |
| Prioridad (estrellas)                                | ✅ 10-31 | `Priority`                                              |
| Estado kanban (semáforo) editable                    | ❌       | web-ui: `StatusDot` que se elige                        |
| Campo de texto enriquecido (html)                    | ❌       | web-ui (necesita decidir editor: Tiptap/Lexical)        |
| Adjuntos del registro (lista, vista previa, bajar)   | 🟡       | `DropZone` sube; falta `Attachments` que liste          |
| Imagen / avatar editable                             | 🟡       | `Thumb`, `Avatar` muestran; falta subir y recortar      |
| Firma                                                | ❌       | web-ui, baja prioridad                                  |

## 2. Una colección de registros

| Necesidad                                         | Estado   | Pieza / dueño                                     |
| ------------------------------------------------- | -------- | ------------------------------------------------- |
| Filas, tabla, tablero, planilla, informe, pivote  | ✅       | `List.*`                                          |
| Solo lectura vs. abrible; vistazo 👁 y abrir ↗     | ✅ 10-31 | `List readOnly`, `onPeek`, `onOpen`               |
| Encabezado de filas alineado al píxel             | ✅ 10-31 | `List.Rows header`                                |
| Lista embebida con título cuando está suelta      | ✅ 10-31 | `List.Identity` en `embedded`                     |
| Tablero POR ETAPAS con arrastrar entre columnas   | ✅ 10-31 | `List.Board stages` (`BoardColumns`), Alt + ← / → |
| Reordenar filas arrastrando (secuencia)           | ✅ 10-31 | `EditableTable` / `LineItems` `onReorder`         |
| Elegir «los 187 que coinciden», no solo la página | ✅ 10-31 | `selection.matching`                              |
| Vista calendario de registros                     | ❌       | web-ui: `List.Calendar` (presentación, no vista)  |
| Gantt / línea de tiempo de registros              | ❌       | web-ui, baja prioridad                            |
| Exportar lo que se ve (xlsx)                      | ✅       | `foundations/xlsx`                                |

## 3. Elegir y buscar

| Necesidad                                          | Estado   | Pieza / dueño                                       |
| -------------------------------------------------- | -------- | --------------------------------------------------- |
| Barra con facetas, filtros, agrupado, favoritos    | ✅       | `SearchBar`                                         |
| Muchos recortes sin romper la barra                | ✅ 10-31 | cadena de agrupado, «+N», tope por ficha            |
| Constructor de criterios con JSON                  | ✅       | `CriteriaBuilder`                                   |
| many2one con columnas para distinguir              | ✅       | `Picker`                                            |
| «Buscar más…» (one y many), arrastrable            | ✅ 10-31 | `Lookup`, `LookupDialog`, `Dialog movable`          |
| many2many como fichas, con «Buscar más…»           | ✅ 10-31 | `TagsField onBrowseAll`                             |
| Paleta de comandos                                 | ✅       | `CommandPalette`                                    |
| Búsqueda contra el servidor con facetas del modelo | 🟡       | web-ui da la barra; el modelo lo trae web-framework |

## 4. Dónde se abre (espacio de trabajo)

| Necesidad                                                  | Estado   | Dueño                                        |
| ---------------------------------------------------------- | -------- | -------------------------------------------- |
| Vistazo, panel, ventana, página con migas, ⌘K              | ✅       | composer                                     |
| Las superficies que composer viste (Peek, Dialog, Missing) | ✅       | web-ui (`Peek onPromote`, `Dialog onExpand`) |
| Modales DENTRO de los paneles                              | 🟡       | composer — en refactor (2026-10-31)          |
| Teléfono: todo es página, vistazo como hoja inferior       | ❌       | composer                                     |
| Plantillas que muestran web-ui + composer juntos           | ✅ 10-31 | `5 · Plantillas/Espacio de trabajo`          |
| La ventana de `api.pick` con un tamaño pedido              | ❌       | composer (hoy abre 480×360)                  |

## 5. Pruebas

| Necesidad                                                 | Estado | Dueño                                      |
| --------------------------------------------------------- | ------ | ------------------------------------------ |
| Lógica y HTML estático                                    | ✅     | `tests/` (node:test)                       |
| Interacción dentro de la historia (`play`), como composer | ❌     | web-ui: vitest + `@storybook/addon-vitest` |
