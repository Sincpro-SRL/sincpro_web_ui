"use client";

import type { CriteriaJoin } from "@sincpro/web-ui/components/search/criteria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import { useState } from "react";

/* ==================================================================== *
 *  CÓMO SE JUNTA UN NODO, en una palabra que se toca.
 *
 *  Todas, cualquiera, ninguna. Son las tres y no dos: sin «ninguna», negar algo
 *  sólo se podía escribir en el JSON, y una pregunta que el editor no sabe
 *  construir es una pregunta que la mayoría no va a hacer.
 *
 *  ── Una palabra, no un símbolo ──────────────────────────────────────
 *
 *  «Y» y «O» son de quien escribe consultas; «todas» y «cualquiera» son de quien
 *  busca. Y son las de la copia, así que cambiarlas las cambia en los dos lados
 *  a la vez.
 *
 *  ── Se abre en sus opciones, no rota ────────────────────────────────
 *
 *  Con tres, un botón que alterna no dice cuáles hay ni cuál está puesta: hay
 *  que apretarlo para averiguarlo, y averiguarlo cambia lo que filtra.
 *
 *  Vive acá y no adentro de la barra porque el constructor pregunta lo mismo. Un
 *  `<select>` allá y una lista acá son dos controles para una decisión, y el que
 *  aprendió uno no reconoce el otro.
 * ==================================================================== */

const OPTIONS: readonly CriteriaJoin[] = ["all", "any", "not"];

export function JoinWord({
  join,
  onChange,
  surface,
}: {
  join: CriteriaJoin;
  /** Sin esto la palabra es un valor: dice cómo junta, y no se toca. */
  onChange?: (next: CriteriaJoin) => void;
  surface?: Surface;
}) {
  const sup = useSurface(surface);
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const word = copy.search.joins[join === "not" ? "none" : join];

  if (onChange === undefined) {
    return <span className="shrink-0 text-micro text-muted">{word}</span>;
  }

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title={copy.search.switchJoin}
        className={`shrink-0 rounded-control px-1 text-micro font-medium underline decoration-dotted underline-offset-4 decoration-current/40 transition-colors hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
          sup,
          "text-muted hover:text-ink",
          "text-chrome-muted hover:text-chrome-ink",
        )}`}
      >
        {word}
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-40 mt-1 rounded-panel border border-line-strong bg-surface p-1.5 shadow-float">
          <Tags
            stack
            surface="canvas"
            label={copy.search.switchJoin}
            items={OPTIONS.map((one) => ({
              id: one,
              label: copy.search.joins[one === "not" ? "none" : one],
              selected: one === join,
              onSelect: () => {
                onChange(one);
                setOpen(false);
              },
            }))}
          />
        </span>
      ) : null}
    </span>
  );
}
