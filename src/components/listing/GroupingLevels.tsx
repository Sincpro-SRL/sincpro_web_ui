"use client";

import type { GroupingControl } from "@sincpro/web-ui/components/listing/grouping";
import { grainName } from "@sincpro/web-ui/foundations/calendar";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import {
  GRAIN_ORDER,
  type GroupableField,
  type GroupGrain,
  levelKey,
} from "@sincpro/web-ui/foundations/grouping";
import { ChevronDown, ChevronRight, ChevronUp, X } from "lucide-react";
import { useState } from "react";

/**
 * «AGRUPAR POR», adentro del panel de recortes.
 *
 * Context: va en la MISMA columna donde están los filtros y los favoritos, y no
 * en un control aparte. Filtrar y agrupar son la misma pregunta —«qué parte de
 * esto estoy mirando»— y separarlos obliga a abrir dos cosas para armar un
 * recorte, sin poder ver los dos estados a la vez.
 *
 * ── Una fecha se DESPLIEGA, no se elige ─────────────────────────────
 *
 * Un campo común es una opción: se tilda y listo. Un campo de fecha no, porque
 * «agrupar por fecha» no quiere decir nada hasta decir con qué corte — y los
 * cortes no son excluyentes: «por mes y adentro por día» es una pregunta
 * legítima y frecuente. Así que una fecha se abre y ofrece sus granos como
 * CASILLAS, que se tildan de a varias.
 *
 * ── Y se ordenan solas ──────────────────────────────────────────────
 *
 * Tildar «día» y después «mes» da «mes › día», nunca al revés. No es una
 * preferencia: un día entero vive adentro de un solo mes, así que partir primero
 * por día deja un nivel de mes que no parte nada. La dirección la pone el
 * calendario y por eso la pone el sistema — ver `normalizeLevels`.
 */

export type GroupingLevelsProps = {
  /** Por qué campos se puede partir. Sin ninguno no se dibuja nada: una columna
   *  vacía en el panel es peor que una columna que no está. */
  fields: readonly GroupableField[];
  control: GroupingControl;
  /** Cómo se llama cada grano, cuando el producto lo dice con otras palabras.
   *  Sin esto, las de la copia en el idioma activo. */
  grainLabel?: (grain: GroupGrain) => string;
};

function fieldLabel(fields: readonly GroupableField[], field: string): string {
  return fields.find((one) => one.field === field)?.label ?? field;
}

export function GroupingLevels({ fields, control, grainLabel }: GroupingLevelsProps) {
  const copy = useUiCopy();
  /* Qué fechas están desplegadas. Arranca desplegada la que ya tenga algún grano
     puesto: si no, lo puesto queda escondido detrás de un chevron y hay que
     adivinar dónde. */
  const [opened, setOpened] = useState<readonly string[]>(() =>
    control.levels.filter((one) => one.grain !== undefined).map((one) => one.field),
  );

  if (fields.length === 0) return null;

  const placed = control.levels;
  const grain = (one: GroupGrain) => grainLabel?.(one) ?? grainName(one);
  const isOpen = (field: string) => opened.includes(field);
  const toggleOpen = (field: string) =>
    setOpened((current) =>
      current.includes(field) ? current.filter((one) => one !== field) : [...current, field],
    );

  return (
    <div className="flex flex-col gap-0.5">
      {/* LO PUESTO, arriba y como fichas numeradas. El número ES el nivel: sin
          él, tres fichas iguales no dicen cuál parte primero — y el orden es
          justamente lo que distingue «cliente › mes» de «mes ›
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

        /* Un campo común: una casilla y nada más. */
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

        /* Una FECHA: se despliega y ofrece sus cortes como casillas. */
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
              {/* Cuántos cortes tiene puestos, para no tener que abrirlo. */}
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

/** La marca de tildado. La columna existe SIEMPRE, tildada o no: sin ella,
 *  tildar corre el texto y la lista salta. Apagada se dibuja el aro, la misma
 *  marca que el panel de filtros, para que las dos columnas se lean como
 *  casillas y no como texto suelto con un hueco a la izquierda. */
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
