# Arquitectura — dónde va cada pieza de @sincpro/web-ui

`PRINCIPLES.md` dice cómo se tiene que ver y comportar una pantalla. Este documento dice
**dónde vive cada pieza y de qué puede depender**, para que quien agregue algo —una persona,
un agente, la aplicación que lo extiende— no tenga que adivinarlo. Como en `PRINCIPLES.md`,
cada regla dice qué la hace cumplir: una regla que nadie verifica es una sugerencia.

## 1. Cuatro niveles

| Nivel       | Qué es                                                              | Ejemplos                                        |
| ----------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| Foundations | Lo que TODAS las piezas hablan: decisiones, contratos y lógica pura | tokens, copia, densidad, modo de formulario     |
| Primitives  | Una pieza que no sabe en qué pantalla está                          | `Button`, `TextInput`, `Picker`, `DataTable`    |
| Components  | Primitivas compuestas para contestar UNA pregunta del producto      | `SearchBar`, `LineItems`, `Activity`, `Listing` |
| Views       | Los dos arquetipos: un registro (`Record`) o N registros (`List`)   | `Record`, `List`                                |

Un nivel importa sólo de los de abajo. **Se verifica**: `make doctor`.

## 2. Tres tiers dentro de las primitivas

«No sabe en qué pantalla está» junta un `Button` de 30 líneas con un `EditableTable` de 1.400.
Las dos cosas son primitivas, pero no se usan igual: para armar algo propio se empieza por los
ladrillos, y entre 90 archivos hay que poder encontrarlos. Por eso las familias de primitivas
se ordenan en tres tiers, y un tier importa sólo de los de abajo:

| Tier           | Qué contesta                          | Familias                                                                                                                |
| -------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **display**    | Mostrar: un dato, un estado, un aviso | `block` `button` `cell` `dialog` `disclosure` `hint` `menu` `notice` `overlay` `surface` `tabs` `tag` `toolbar` `value` |
| **input**      | Preguntar: un control de formulario   | `field` `choice` `date` `picker`                                                                                        |
| **collection** | Mostrar N cosas a la vez              | `table` `tree`                                                                                                          |

Un dato que se muestra no depende de un control (un `Tag` no sabe que existe un formulario); un
control no depende de una colección (un `Picker` no arrastra una tabla); una colección puede usar
los dos — una celda que se edita es un control dentro de una tabla. **Se verifica**:
`tests/architecture.test.ts`.

### El contrato de los controles vive en `foundations`

Lo que conecta un control con su formulario —los ids que le da `Field` (`useFieldIds`) y si se
mira o se escribe (`useFormMode`)— no es un control: es el contrato que todos los controles
hablan, como la densidad o la superficie. Vive en `foundations/form.tsx`. Así un dato que se
muestra distinto en lectura (`RelationValue`) lo lee sin depender de `Field`, y **un control
propio de la aplicación** se conecta igual que los del paquete:

```tsx
function Signature({ id, invalid }: { id?: string; invalid?: boolean }) {
  const ids = useFieldIds({ id, invalid });
  const read = useFormMode() === "read";
  …
}

<Field label="Firma del cliente"><Signature /></Field>
```

## 3. Sin ciclos

Ningún módulo de `src/` termina importándose a sí mismo por otro camino, ni siquiera por tipos:
un ciclo de tipos es la señal de que la dirección está al revés — el modelo (`criteria.ts`)
pidiéndole sus formas a la interfaz (`FilterBuilder`). Las formas son del modelo; la interfaz
las usa. **Se verifica**: `tests/architecture.test.ts`.

## 4. ¿Dónde va lo que voy a escribir?

1. ¿Sabe qué es una factura, un cliente, un dataset? → **No va en el paquete**: es de la aplicación.
2. ¿Es una decisión, un contrato que hablan varias piezas, o lógica sin dibujo? → **foundations**.
3. ¿Contesta una pregunta del producto componiendo primitivas (buscar, las líneas, la actividad)? → **components**.
4. ¿Es una de las dos maneras de mirar registros? → **views** — y no hay una tercera: buscá cuál es.
5. Si no, es una **primitiva**, y su tier lo dice lo que hace: muestra → display, pregunta → input, muestra N → collection.

Lo que dos vistas necesitan baja a `components/`; lo que dos tiers necesitan baja al de abajo o a
`foundations`.

## 5. Abierto para extender

La aplicación arma lo suyo con la API pública (`@sincpro/web-ui`), sin forks ni clases sueltas:

| Quiero…                                        | Con                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Un control propio dentro de un `Field`         | `useFieldIds`, `useFormMode` (`foundations/form`)                                            |
| Una celda con lo que sea adentro               | `DataColumn.cell`, `edit.render`, `rowActions`                                               |
| Otra manera de mirar una lista (mapa, galería) | `List.Present` → recibe el conjunto (`ListSet`)                                              |
| Una pieza compuesta escrita como árbol         | `slot()`, `pick`, `propsOf` (`foundations/slots`)                                            |
| Una operación sobre N registros (el «wizard»)  | `Record` en un modal + `api.pick` / `api.answer` (composer) — ver `5 · Plantillas/Operación` |
| Mis componentes con el mismo aspecto           | las clases de los tokens (`bg-surface text-ink …`)                                           |

Lo que está cerrado a propósito: el aspecto de un componente (no hay `className` ni `style`) y
el dominio. Lo abierto es la estructura.

## 6. Plan de refactor

Por fases, cada una del tamaño de un PR, sin romper a quien importa desde `@sincpro/web-ui`
(web-framework y composer importan sólo de ahí). Los caminos profundos (`…/primitives/field/mode`)
no son públicos: `package.json` exporta los niveles, no los archivos.

### Fase 1 — las capas, explícitas y verificadas ✅ 2026-11-03

- El contrato de los controles (`FieldIds`, `FormMode`) baja de `primitives/field` a
  `foundations/form.tsx`. Corta la dependencia de `value` sobre `field`.
- `TagsField` (el many2many) pasa de `tag` a `picker`, al lado del many2one: elegir registros —
  uno o varios— es una familia. `tag` queda en lo que muestra.
- Los dos ciclos: `GroupGrain` pasa a `calendar` (un grano es del calendario); `BuiltCondition` y
  `BuiltFilter` pasan a `criteria.ts` (son el modelo, la interfaz las dibuja).
- Nombres en inglés: `value/Fecha.tsx` → `value/DateValue.tsx`; `field/copy.tsx` →
  `field/clipboard.tsx` (era el botón de copiar, no la copia de textos).
- `tests/architecture.test.ts`: tiers y ciclos, para que no vuelvan.

### Fase 2 — la copia por familia

Hoy `foundations/copy.tsx` (1.400 líneas) enumera los textos de TODAS las piezas: la base
conoce a los de arriba, cada pieza nueva edita `foundations`, y una aplicación no puede sumar los
textos de sus propios componentes. El destino: `foundations` da el mecanismo
(`createCopy(english, { es })` → `Provider`, `useCopy`, `install`) y cada familia declara su
sección. La usan igual composer, web-framework y las aplicaciones, que hoy tienen tres tablas y
tres `install*Copy`. De paso: un `UiCopyProvider` deja de escribir la tabla global (hoy un sector
en otro idioma cambia el de toda la pantalla). Toca los tres repos: va después de un release.

### Fase 3 — «Extender», recetas que son pruebas

Una página `Extender.mdx` con una receta por fila de la tabla de §5. Cada receta es una historia
armada sólo con la API pública —como las plantillas—, así que si algo de lo que la receta usa se
vuelve interno, la historia deja de compilar. Es la garantía de que la librería sigue abierta.

### Fase 4 — pantallas de varias listas: la conciliación

La conciliación bancaria de Odoo: extractos, asientos y apuntes lado a lado, cada uno con su
búsqueda, que se cruzan. Una plantilla `Conciliación` dice qué falta. Lo que ya se sospecha: una
lista de página entera mueve su barra al encabezado de la pantalla (`useHeaderSlot`), y ahí hay
UN lugar — con tres listas, compiten.

### Lo que no se mueve, y por qué

- **Los niveles y sus nombres.** Están bien y `make doctor` los cuida; renombrarlos es churn.
- **`DataTable`, `EditableTable` y `Picker` siguen siendo primitivas.** No saben en qué pantalla
  están; el tier `collection`/`input` ya dice que no son ladrillos.
- **`Dialog` trae `Wizard`** para pasos en un diálogo suelto. Dentro del espacio de trabajo de
  composer, un modal es una vista de composer (`stories/Estilo.mdx`), y una operación de varios
  pasos se escribe ahí.
- **La lógica de `components/search` y `components/listing`** (`query.ts`, `pages.ts`, …) queda
  junto a su interfaz: la usa sólo su familia. Baja a `foundations` el día que la use otra.
