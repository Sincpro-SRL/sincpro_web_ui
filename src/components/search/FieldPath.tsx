"use client";

import {
  type FieldDefinition,
  fieldLabel,
  type ModelDefinition,
} from "@sincpro/web-ui/components/search/model";
import {
  createModelCache,
  type FieldPathStep,
  type FieldPathValue,
  isRelation,
  type LoadModel,
  type ModelCache,
  pathLabel,
  peekLabels,
  resolvePath,
} from "@sincpro/web-ui/components/search/paths";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useSurface } from "@sincpro/web-ui/foundations/surface";
import { Button, IconButton } from "@sincpro/web-ui/primitives/button/Button";
import { SearchField } from "@sincpro/web-ui/primitives/choice/SearchField";
import { listOptionStyles } from "@sincpro/web-ui/primitives/field/aria";
import { Failed, Skeleton } from "@sincpro/web-ui/primitives/notice/Notice";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { ChevronDown, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Pressable,
} from "react-aria-components";

/* ==================================================================== *
 *  FIELD PATH — choose a field, walking into relations when it lives in another model.
 *
 *  Context: Odoo's field popover. A stack of levels: the root's fields first;
 *  a relation shows a chevron and pressing it opens ITS fields, with «Volver»
 *  (or Backspace in an empty search) one level up. A search filters the level
 *  on screen. What is chosen reads «Líneas > Impuestos > Monto» on the trigger.
 *
 *  ── One action per row ──────────────────────────────────────────────
 *
 *  A relation that can be followed OPENS when pressed; choosing the relation
 *  itself («Cliente = Acme») is the first row inside it, «Cliente (el
 *  registro)». Two buttons in one row — «elegir» and «entrar» — are two tab
 *  stops per field and a guess about which half was pressed.
 *
 *  ── The caller decides what can be chosen and what can be walked ────
 *
 *      filter            which fields can be chosen here: a filter wants the
 *                        filterable ones, a grouping the ones that can split
 *      followRelations   which relations open: none, all, or a rule — a
 *                        column picker may refuse to-many relations
 *
 *  It never fetches: the models along the way come from `loadModel(path)`,
 *  through a cache the caller can share (`models`) so five rows of a filter
 *  ask each model once.
 * ==================================================================== */

/** A rule about a field met while walking: its definition, its name, and the path of
 *  relations that leads to its model (`[]` at the root). */
export type FieldPathRule = (
  field: FieldDefinition,
  name: string,
  at: FieldPathValue,
) => boolean;

export type FieldPathProps = {
  /** The root model: the record the path starts from. */
  model: ModelDefinition;
  /** The model at the end of a path of relations. Absent = relations are not walked. */
  loadModel?: LoadModel;
  /** A cache shared with other pickers over the same root. Absent = one of its own. */
  models?: ModelCache;
  /** The chosen path; `[]` is nothing chosen. */
  value: FieldPathValue;
  /** The new path, with each step's definition and label already resolved. */
  onChange: (path: string[], steps: FieldPathStep[]) => void;
  /** Which fields can be chosen. Absent = all of them. */
  filter?: FieldPathRule;
  /** Which relations open. Default: all, when `loadModel` is there. */
  followRelations?: boolean | FieldPathRule;
  /** The accessible name of the trigger and of the popover: «Campo», «Columna». */
  label: string;
  /** What the trigger says with nothing chosen. Default: «Elegir un campo». */
  placeholder?: string;
  /** `select` reads like the other controls of a row; `button` is a toolbar action
   *  («Agregar columna») that always shows its placeholder. */
  look?: "select" | "button";
  /** The icon of the `button` look. */
  icon?: LucideIcon;
};

/**
 * A `FieldPath` offered as an ACTION of another piece: «Agregar columna» in the columns menu,
 * «Agrupar por otro campo» in the grouping panel. The piece draws the button; what the chosen
 * path becomes — a column, a level — is decided by whoever orchestrates the screen.
 */
export type PathPick = {
  model: ModelDefinition;
  loadModel?: LoadModel;
  filter?: FieldPathRule;
  followRelations?: FieldPathProps["followRelations"];
  onPick: (path: string[], steps: FieldPathStep[]) => void;
};

/** The cache a picker uses: the one it was given, or its own over its root. */
export function useModelCache(
  model: ModelDefinition,
  loadModel?: LoadModel,
  models?: ModelCache,
): ModelCache {
  return useMemo(
    () => models ?? createModelCache(model, loadModel),
    [models, model, loadModel],
  );
}

/**
 * The steps of a path, once its models arrived: `undefined` while they come, `null` when the
 * path does not exist in the model (or a model could not be loaded).
 *
 * The rows of a filter use it to learn the LAST field's operators and type: «Monto» reached
 * through two relations compares like a number, not like the relation it came through.
 */
export function useFieldPathSteps(
  models: ModelCache,
  path: FieldPathValue,
): FieldPathStep[] | null | undefined {
  const copy = useUiCopy();
  const at = path.join("\u0000");
  const [steps, setSteps] = useState<
    { at: string; steps: FieldPathStep[] | null } | undefined
  >();

  useEffect(() => {
    let alive = true;
    const asked = at === "" ? [] : at.split("\u0000");
    resolvePath(models, asked, copy.locale).then(
      (found) => {
        if (alive) setSteps({ at, steps: found });
      },
      () => {
        if (alive) setSteps({ at, steps: null });
      },
    );
    return () => {
      alive = false;
    };
  }, [models, at, copy.locale]);

  return steps === undefined || steps.at !== at ? undefined : steps.steps;
}

function follows(rule: FieldPathProps["followRelations"], canLoad: boolean): FieldPathRule {
  if (!canLoad || rule === false) return () => false;
  if (rule === undefined || rule === true) return (field) => isRelation(field);
  return (field, name, at) => isRelation(field) && rule(field, name, at);
}

export function FieldPath({
  model,
  loadModel,
  models: shared,
  value,
  onChange,
  filter,
  followRelations,
  label,
  placeholder,
  look = "select",
  icon,
}: FieldPathProps) {
  const copy = useUiCopy();
  const surface = useSurface();
  const models = useModelCache(model, loadModel, shared);
  const [open, setOpen] = useState(false);
  const steps = useFieldPathSteps(models, value);
  const canFollow = follows(followRelations, models.canLoad);
  const canChoose: FieldPathRule = filter ?? (() => true);

  const shown =
    value.length === 0
      ? (placeholder ?? copy.fieldPath.choose)
      : pathLabel(steps?.map((step) => step.label) ?? peekLabels(models, value, copy.locale));

  const frame =
    surface === "chrome"
      ? "border-chrome-ink/20 bg-chrome text-chrome-ink"
      : "border-ink/15 bg-surface text-ink";

  return (
    <DialogTrigger isOpen={open} onOpenChange={setOpen}>
      {look === "button" ? (
        <Pressable>
          <Button
            role="secondary"
            size="sm"
            expanded={open}
            haspopup="dialog"
            {...(icon === undefined ? {} : { icon })}
          >
            {placeholder ?? copy.fieldPath.choose}
          </Button>
        </Pressable>
      ) : (
        <AriaButton
          aria-label={value.length === 0 ? label : `${label}: ${shown}`}
          className={`flex min-w-0 flex-1 basis-40 items-center gap-2 rounded-control border px-2 py-1 text-left text-meta outline-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${frame}`}
        >
          <span
            className={`min-w-0 flex-1 truncate ${value.length === 0 ? "text-muted" : ""}`}
          >
            {shown}
          </span>
          <ChevronDown className="size-(--size-icon-sm) shrink-0 text-muted" aria-hidden />
        </AriaButton>
      )}
      <Popover placement="bottom start">
        <Dialog
          aria-label={label}
          className="flex w-72 max-w-full flex-col gap-2 p-2 outline-0"
        >
          {({ close }) => (
            <Levels
              models={models}
              start={value.slice(0, -1)}
              canChoose={canChoose}
              canFollow={canFollow}
              onChoose={(path) => {
                void resolvePath(models, path, copy.locale).then((found) => {
                  if (found !== null) onChange(path, found);
                });
                close();
              }}
            />
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

const SELF = "\u0000self";

type Level =
  | { status: "loading" }
  | { status: "ready"; model: ModelDefinition }
  | { status: "failed"; error: string };

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase();
}

function Levels({
  models,
  start,
  canChoose,
  canFollow,
  onChoose,
}: {
  models: ModelCache;
  start: FieldPathValue;
  canChoose: FieldPathRule;
  canFollow: FieldPathRule;
  onChoose: (path: string[]) => void;
}) {
  const copy = useUiCopy();
  const [at, setAt] = useState<FieldPathValue>(start);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLevel({ status: "loading" });
    models.get(at).then(
      (model) => {
        if (alive) setLevel({ status: "ready", model });
      },
      (error: unknown) => {
        if (alive)
          setLevel({
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
      },
    );
    return () => {
      alive = false;
    };
  }, [models, at, attempt]);

  function enter(name: string) {
    setAt([...at, name]);
    setQuery("");
  }

  function back() {
    setAt(at.slice(0, -1));
    setQuery("");
  }

  /* Backspace in an empty search goes up a level, the way it does in Odoo: the hand that
     typed the search is already on the key. */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Backspace" && query === "" && at.length > 0) {
      event.preventDefault();
      back();
    }
  }

  const here = pathLabel(peekLabels(models, at, copy.locale));
  /* The relation this level is inside, to offer choosing it as a whole. */
  const parent = at.length === 0 ? undefined : models.peek(at.slice(0, -1));
  const relationName = at[at.length - 1];
  const relationField = relationName === undefined ? undefined : parent?.fields[relationName];
  const offerSelf =
    relationField !== undefined &&
    relationName !== undefined &&
    canChoose(relationField, relationName, at.slice(0, -1));

  const rows =
    level.status !== "ready"
      ? []
      : Object.entries(level.model.fields)
          .map(([name, field]) => ({
            name,
            field,
            label: fieldLabel(level.model, name, copy.locale),
            choose: canChoose(field, name, at),
            follow: canFollow(field, name, at),
          }))
          .filter((row) => row.choose || row.follow)
          .filter((row) => {
            const q = fold(query.trim());
            return q === "" || fold(row.label).includes(q) || fold(row.name).includes(q);
          })
          .sort((a, b) => a.label.localeCompare(b.label, copy.locale));

  return (
    <div onKeyDown={onKeyDown} className="flex min-w-0 flex-col gap-2">
      {at.length === 0 ? null : (
        <div className="flex min-w-0 items-center gap-1">
          <IconButton icon={ChevronLeft} label={copy.fieldPath.back} onClick={back} />
          <p className="min-w-0 flex-1 truncate text-meta font-medium text-ink">{here}</p>
        </div>
      )}
      <SearchField
        value={query}
        onChange={setQuery}
        aria-label={copy.fieldPath.search}
        placeholder={copy.fieldPath.search}
      />

      {level.status === "loading" ? (
        <Skeleton rows={4} label={copy.fieldPath.loading} />
      ) : level.status === "failed" ? (
        <Failed
          heading={copy.fieldPath.failed}
          sentence={copy.fieldPath.failedHint}
          detail={`${at.join(".") || "/"} — ${level.error}`}
          action={
            <Button role="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              {copy.attachments.retry}
            </Button>
          }
        />
      ) : rows.length === 0 && !offerSelf ? (
        <p className="px-2 py-3 text-meta text-muted">{copy.fieldPath.empty}</p>
      ) : (
        <ListBox
          aria-label={at.length === 0 ? copy.fieldPath.search : here}
          className="max-h-72 min-w-0 overflow-auto outline-0"
          onAction={(key) => {
            const name = String(key);
            if (name === SELF) return onChoose([...at]);
            const row = rows.find((one) => one.name === name);
            if (row === undefined) return;
            if (row.follow) enter(name);
            else if (row.choose) onChoose([...at, name]);
          }}
        >
          {offerSelf && relationField !== undefined ? (
            <ListBoxItem
              id={SELF}
              textValue={fillCopy(copy.fieldPath.self, { label: here })}
              className={(state) =>
                `${listOptionStyles(state)} border-b border-line font-medium`
              }
            >
              {fillCopy(copy.fieldPath.self, {
                label: peekLabels(models, at, copy.locale).at(-1) ?? "",
              })}
            </ListBoxItem>
          ) : null}
          {rows.map((row) => (
            <ListBoxItem
              key={row.name}
              id={row.name}
              textValue={row.label}
              className={(state) => listOptionStyles(state)}
            >
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {row.follow ? (
                <>
                  <span className="sr-only">{copy.fieldPath.opens}</span>
                  <ChevronRight
                    className="size-(--size-icon-sm) shrink-0 text-muted"
                    aria-hidden
                  />
                </>
              ) : null}
            </ListBoxItem>
          ))}
        </ListBox>
      )}
    </div>
  );
}
