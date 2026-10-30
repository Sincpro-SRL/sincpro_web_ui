/* ==================================================================== *
 *  EL VOCABULARIO DEL MODELO — lo que el servidor publica sobre sus campos.
 *
 *  `model_meta_data` dice, por campo, de qué tipo es, qué comparaciones acepta,
 *  si es relacional y por qué columna se lo identifica, y qué valores puede
 *  tomar si es un enum. Todo lo que una pantalla ofrece sobre un modelo sale de
 *  acá: los filtros del constructor, los niveles del agrupado y las preguntas de
 *  la barra de búsqueda.
 *
 *  Vive aparte de quien lo dibuja porque lo hablan los tres. Mientras estuvo
 *  adentro de `FilterBuilder.tsx`, la barra tenía que importar del constructor
 *  de filtros para saber cómo se llama un campo — y el constructor, de la barra
 *  para saber cómo se llama un operador. Un vocabulario compartido no puede
 *  colgar de uno de los que lo hablan.
 * ==================================================================== */

/** Un campo, tal como lo describe el modelo. Espeja `FieldMeta` del servidor.
 *
 *  `ops` vacío es la señal de que este campo no se filtra, ordena ni agrupa directo: la
 *  publican tanto un valor-objeto (`embedded`) como cualquiera de los tres relacionales
 *  (`many2one`/`one2many`/`many2many`) — ninguno tiene una comparación propia. Un relacional
 *  se filtra por la columna que lo identifica (`identifiedBy`), que aparece como SU PROPIO
 *  campo escalar en el modelo. */
export interface FieldDefinition {
  type: string;
  nullable: boolean;
  sortable: boolean;
  ops: readonly string[];
  /** La respuesta gruesa a «qué es este nombre»: un valor en la fila, un valor-objeto adentro
   *  (JSON, sin identidad propia) u otro agregado que hay que traer. */
  kind?: "scalar" | "embedded" | "relation";
  /** Varios de ellos: un `one2many`, un `many2many`, o una lista de valores-objeto. */
  many?: boolean;
  /** Para un campo relacional, el agregado del otro lado, por nombre. */
  relation?: string | null;
  /** Para un campo relacional, la columna que lo identifica — nunca se ofrece el campo
   *  relacional en sí como blanco de un filtro, un orden o un nivel de agrupado. */
  identifiedBy?: string | null;
  /** Los valores que un campo de enum puede tomar — de ahí sale un `<select>`. */
  choices?: readonly unknown[];
}

/** Si este campo se puede usar en un `where`, un `order` o un `grouping.by` directamente.
 *  `ops.length === 0` alcanza como señal: la publican tanto `embedded` como los tres
 *  relacionales, así que no hace falta mirar `kind` aparte. */
export function isFilterable(field: FieldDefinition): boolean {
  return field.ops.length > 0;
}

/** La definición del modelo que manda el servidor bajo `model_meta_data`. */
/** Cada palabra que una pantalla necesita para el modelo o un campo suyo: siempre
 *  `{"default": …, …idiomas}`. Espeja `Translated` del servidor. */
export interface ModelTranslations {
  name: Record<string, string>;
  labels: Record<string, Record<string, string>>;
  help?: Record<string, Record<string, string>>;
}

export interface ModelDefinition {
  aggregate: string;
  identity: string;
  fields: Record<string, FieldDefinition>;
  /** Ausente en un modelo armado a mano —el `having` sintético de `CriteriaBuilder`, por
   *  ejemplo—; presente en cualquier `model_meta_data` real. */
  translations?: ModelTranslations;
}

/** El rótulo de un campo en el idioma pedido: el que el modelo publicó para ese idioma, o el
 *  que publicó como `default`, o el nombre del campo tal cual si el modelo no dijo nada —un
 *  modelo sintético, o uno que todavía no llegó. Nunca inventa una palabra: lo que no está en
 *  `translations` se ve tal cual sale de la tabla, y eso ya avisa que falta declararlo. */
export function fieldLabel(model: ModelDefinition, field: string, locale: string): string {
  const words = model.translations?.labels[field];
  return words?.[locale] ?? words?.default ?? field;
}

/** Los nombres del modelo que se pueden usar como blanco de un filtro, un orden o un nivel de
 *  agrupado — nunca un relacional ni un valor-objeto, filtrados por `isFilterable`. Ordenados,
 *  porque es la lista que arma cada `<select>` de este archivo. */
export function filterableNames(model: ModelDefinition): string[] {
  return Object.keys(model.fields)
    .filter((name) => isFilterable(model.fields[name]!))
    .sort();
}
