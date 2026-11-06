"use client";

import type { GroupingControl } from "@sincpro/web-ui/components/listing/grouping";
import { FieldPath, type PathPick } from "@sincpro/web-ui/components/search/FieldPath";
import { grainName } from "@sincpro/web-ui/foundations/calendar";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  GRAIN_ORDER,
  type GroupableField,
  type GroupGrain,
  levelKey,
} from "@sincpro/web-ui/foundations/grouping";
import { ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";
import { useState } from "react";

/**
 * «AGRUPAR POR», inside the cuts panel.
 *
 * Context: it goes in the SAME column where the filters and the favourites are, and not
 * in a separate control. Filtering and grouping are the same question —«which part of
 * this am I looking at»— and separating them forces you to open two things to build a
 * cut, without being able to see both states at once.
 *
 * ── A date UNFOLDS, it is not chosen ───────────────────────────────
 *
 * An ordinary field is an option: you tick it and that is it. A date field is not, because
 * «group by date» means nothing until you say with what cut — and the
 * cuts are not exclusive: «by month and inside it by day» is a
 * legitimate and frequent question. So a date opens and offers its grains as
 * CHECKBOXES, which are ticked several at a time.
 *
 * ── And they sort themselves ───────────────────────────────────────
 *
 * Ticking «día» and then «mes» gives «mes › día», never the other way round. It is not
 * a preference: a whole day lives inside a single month, so splitting first
 * by day leaves a month level that splits nothing. The direction is set by the
 * calendar and that is why the system sets it — see `normalizeLevels`.
 */

export type GroupingLevelsProps = {
  /** Which fields it can be split by. With none nothing is drawn: an empty
   *  column in the panel is worse than a column that is not there. */
  fields: readonly GroupableField[];
  control: GroupingControl;
  /** What each grain is called, when the product says it in other words.
   *  Without this, the copy's words in the active language. */
  grainLabel?: (grain: GroupGrain) => string;
  /** «Agrupar por otro campo»: a `FieldPath` that walks relations («Cliente > País»).
   *  It returns the path; which level is set with it is decided by whoever orchestrates the screen. */
  addPath?: PathPick;
};

function fieldLabel(fields: readonly GroupableField[], field: string): string {
  return fields.find((one) => one.field === field)?.label ?? field;
}

export function GroupingLevels({
  fields,
  control,
  grainLabel,
  addPath,
}: GroupingLevelsProps) {
  const copy = useUiCopy();
  /* Which dates are unfolded. The one that already has some grain
     set starts unfolded: otherwise what is set is hidden behind a chevron and you have to
     guess where. */
  const [opened, setOpened] = useState<readonly string[]>(() =>
    control.levels.filter((one) => one.grain !== undefined).map((one) => one.field),
  );

  if (fields.length === 0 && addPath === undefined) return null;

  const placed = control.levels;
  const grain = (one: GroupGrain) => grainLabel?.(one) ?? grainName(one);
  const isOpen = (field: string) => opened.includes(field);
  const toggleOpen = (field: string) =>
    setOpened((current) =>
      current.includes(field) ? current.filter((one) => one !== field) : [...current, field],
    );

  return (
    <div className="flex flex-col gap-0.5">
      {/* WHAT IS SET, on top and as numbered chips. The number IS the level: without
          it, three equal chips do not say which splits first — and the order is
          precisely what distinguishes «cliente › mes» from «mes ›
          cliente». */}
      {placed.length === 0 ? null : (
        <>
          <ol className="flex flex-wrap gap-1 px-1 pb-1.5">
            {placed.map((level, index) => (
              <li key={levelKey(level)}>
                <span className="inline-flex items-center gap-1 rounded-pill border border-accent/40 bg-accent/18 py-0.5 pr-0.5 pl-1.5 text-micro text-ink">
                  <span className="tabular-nums opacity-70">{index + 1}</span>
                  <span className="max-w-32 truncate">
                    {fieldLabel(fields, level.field)}
                    {level.grain === undefined ? "" : ` · ${grain(level.grain)}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => control.move(level.field, -1)}
                    disabled={index === 0}
                    aria-label={copy.grouping.up}
                    title={copy.grouping.up}
                    className="rounded-pill p-0.5 hover:bg-primary/15 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="size-3" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => control.move(level.field, 1)}
                    disabled={index === placed.length - 1}
                    aria-label={copy.grouping.down}
                    title={copy.grouping.down}
                    className="rounded-pill p-0.5 hover:bg-primary/15 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="size-3" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => control.remove(level.field, level.grain)}
                    aria-label={copy.grouping.remove}
                    title={copy.grouping.remove}
                    className="rounded-pill p-0.5 hover:bg-primary/15"
                  >
                    <X className="size-3" strokeWidth={2.5} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className="mb-1 h-px bg-line" role="separator" />
        </>
      )}

      {fields.map((one) => {
        const grains = one.grains;

        /* An ordinary field: a checkbox and nothing more. */
        if (grains === undefined || grains.length === 0) {
          const on = control.has(one.field);
          return (
            <button
              key={one.field}
              type="button"
              onClick={() => control.toggle(one.field)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-primary/8 ${
                on ? "bg-primary/6" : ""
              }`}
            >
              <Mark on={on} />
              <span
                className={`min-w-0 truncate text-meta ${on ? "font-medium text-ink" : "text-ink"}`}
              >
                {one.label}
              </span>
            </button>
          );
        }

        /* A DATE: it unfolds and offers its cuts as checkboxes. */
        const open = isOpen(one.field);
        const puestos = placed.filter((level) => level.field === one.field);
        return (
          <div key={one.field} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggleOpen(one.field)}
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-primary/8"
            >
              <ChevronRight
                className={`size-(--size-icon-sm) shrink-0 text-muted transition-transform duration-(--duration-instant) ${
                  open ? "rotate-90" : ""
                }`}
                strokeWidth={2}
                aria-hidden
              />
              <span
                className={`min-w-0 flex-1 truncate text-meta ${
                  puestos.length > 0 ? "font-medium text-ink" : "text-ink"
                }`}
              >
                {one.label}
              </span>
              {/* How many cuts it has set, so you do not have to open it. */}
              {puestos.length === 0 ? null : (
                <span className="inline-flex shrink-0 items-center rounded-pill border border-accent/40 bg-accent/18 px-2 py-0.5 text-micro tabular-nums text-ink">
                  {puestos.length}
                </span>
              )}
            </button>

            {!open ? null : (
              <div className="flex flex-col pl-(--spacing-indent)">
                {GRAIN_ORDER.filter((g) => grains.includes(g)).map((g) => {
                  const on = control.has(one.field, g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => control.toggle(one.field, g)}
                      aria-pressed={on}
                      className={`flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-primary/8 ${
                        on ? "bg-primary/6" : ""
                      }`}
                    >
                      <Mark on={on} />
                      <span
                        className={`min-w-0 truncate text-meta ${
                          on ? "font-medium text-ink" : "text-muted"
                        }`}
                      >
                        {grain(g)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {addPath === undefined ? null : (
        <div className="px-1 pt-1">
          <FieldPath
            look="button"
            icon={Plus}
            model={addPath.model}
            {...(addPath.loadModel === undefined ? {} : { loadModel: addPath.loadModel })}
            {...(addPath.filter === undefined ? {} : { filter: addPath.filter })}
            {...(addPath.followRelations === undefined
              ? {}
              : { followRelations: addPath.followRelations })}
            value={[]}
            label={copy.fieldPath.addLevel}
            placeholder={copy.fieldPath.addLevel}
            onChange={addPath.onPick}
          />
        </div>
      )}

      {placed.length === 0 ? null : (
        <>
          <div className="my-1 h-px bg-line" role="separator" />
          <button
            type="button"
            onClick={() => control.clear()}
            className="rounded-control px-2 py-1 text-left text-meta text-muted transition-colors duration-(--duration-instant) hover:bg-ink/4 hover:text-ink"
          >
            {copy.grouping.clear}
          </button>
        </>
      )}
    </div>
  );
}

/** The tick mark. The column ALWAYS exists, ticked or not: without it,
 *  ticking shifts the text and the list jumps. When off, the ring is drawn, the same
 *  mark as the filters panel, so that both columns read as
 *  checkboxes and not as loose text with a gap on the left. */
function Mark({ on }: { on: boolean }) {
  return (
    <span className="flex size-(--size-icon-sm) shrink-0 items-center justify-center">
      {on ? (
        <span className="size-1.5 rounded-pill bg-primary" />
      ) : (
        <span className="size-3 rounded-pill border border-line-strong" />
      )}
    </span>
  );
}
