import {
  type FieldDefinition,
  fieldLabel,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";

/* ==================================================================== *
 *  A FIELD PATH — a field reached through relations: «Líneas > Impuestos > Monto».
 *
 *  Context: a filter, a column or a grouping level is not always about a field
 *  of the record itself. «Facturas cuyo cliente es de Bolivia» asks about the
 *  country of the partner; «con algún impuesto mayor que 10» asks about the
 *  taxes of the lines. Odoo answers this with a popover that walks the
 *  relations one level at a time; `FieldPath` is that popover, and this file
 *  is its model: what a path is, how it is resolved, how it is named.
 *
 *  ── web-ui draws; it never fetches ──────────────────────────────────
 *
 *  The related models are not known in advance and web-ui does not know the
 *  transport. Whoever renders the picker passes `loadModel(path)`: given the
 *  path of relation fields from the root, it answers the model at its end. The
 *  framework decides whether that is a request, a cache or a constant.
 *
 *  ── A path is the field names, in order ─────────────────────────────
 *
 *      []                          nothing chosen yet
 *      ["state"]                   a field of the root
 *      ["partner_id", "country"]   a field of the partner's model
 *
 *  Every name but the last is a relation; the last one is whatever was chosen
 *  (a relation itself can be chosen: «Cliente = Acme»).
 * ==================================================================== */

export type FieldPathValue = readonly string[];

/** Answers the model at the end of a path of relation fields. The root is `[]`, and is
 *  never asked: the picker already has it. */
export type LoadModel = (path: FieldPathValue) => Promise<ModelDefinition>;

/** One step of a resolved path: the field, its definition and how it is called. */
export interface FieldPathStep {
  name: string;
  field: FieldDefinition;
  label: string;
}

/** Whether a field points to another model: the picker can walk into it. */
export function isRelation(field: FieldDefinition): boolean {
  return (
    field.kind === "relation" || (field.relation !== undefined && field.relation !== null)
  );
}

/** Whether a relation reaches MANY records. A filter through it has to say how many of them
 *  must match: some, none or all. */
export function isToMany(field: FieldDefinition): boolean {
  return isRelation(field) && field.many === true;
}

/** «Líneas > Impuestos > Monto»: how a path reads on a button or a chip. */
export function pathLabel(labels: readonly string[]): string {
  return labels.join(" > ");
}

/**
 * The models along paths, asked once each.
 *
 * Context: a filter with five rules over the same relation would ask the same model five
 * times, once per row, and the popover asks again each time it reopens. The cache keeps the
 * PROMISE, so two rows asking at the same moment share one request, and a failed request is
 * forgotten so the next attempt can succeed.
 */
export interface ModelCache {
  root: ModelDefinition;
  /** Whether relations can be followed at all: there is a `loadModel` behind it. */
  canLoad: boolean;
  /** The model at the end of a path of relations; `[]` is the root. */
  get: (path: FieldPathValue) => Promise<ModelDefinition>;
  /** The same, only if it already arrived — for code that cannot wait, like a label. */
  peek: (path: FieldPathValue) => ModelDefinition | undefined;
}

const key = (path: FieldPathValue) => path.join("\u0000");

export function createModelCache(root: ModelDefinition, loadModel?: LoadModel): ModelCache {
  const pending = new Map<string, Promise<ModelDefinition>>();
  const arrived = new Map<string, ModelDefinition>([[key([]), root]]);

  return {
    root,
    canLoad: loadModel !== undefined,
    peek: (path) => arrived.get(key(path)),
    get(path) {
      const at = key(path);
      const known = arrived.get(at);
      if (known !== undefined) return Promise.resolve(known);
      const asked = pending.get(at);
      if (asked !== undefined) return asked;
      if (loadModel === undefined) {
        return Promise.reject(new Error(`No loadModel to follow «${path.join(".")}»`));
      }
      const request = loadModel(path).then(
        (model) => {
          arrived.set(at, model);
          pending.delete(at);
          return model;
        },
        (error: unknown) => {
          pending.delete(at);
          throw error;
        },
      );
      pending.set(at, request);
      return request;
    },
  };
}

/**
 * A path resolved into its steps: each field with its definition and its label.
 *
 *      in   ["lines", "taxes", "amount"], the invoice model
 *      out  [Líneas (to-many), Impuestos (to-many), Monto (number)]
 *
 * A name the model does not have stops the walk: it answers `null`, because half a path is
 * a different question, not a shorter one.
 */
export async function resolvePath(
  models: ModelCache,
  path: FieldPathValue,
  locale: string,
): Promise<FieldPathStep[] | null> {
  const steps: FieldPathStep[] = [];
  for (let at = 0; at < path.length; at++) {
    const model = await models.get(path.slice(0, at));
    const name = path[at]!;
    const field = model.fields[name];
    if (field === undefined) return null;
    steps.push({ name, field, label: fieldLabel(model, name, locale) });
  }
  return steps;
}

/** The labels of a path with what has already arrived; a model still on its way leaves the
 *  raw name, which is what there is to say until it arrives. */
export function peekLabels(
  models: ModelCache,
  path: FieldPathValue,
  locale: string,
): string[] {
  return path.map((name, at) => {
    const model = models.peek(path.slice(0, at));
    return model === undefined ? name : fieldLabel(model, name, locale);
  });
}
