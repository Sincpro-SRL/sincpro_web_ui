"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * UN VALOR QUE SE COPIA.
 *
 * Context: la mitad de los valores de este producto existen para pegarse en otro
 * lado —un NIT, un CUF de factura, una referencia bancaria, un código de
 * autorización de 26 caracteres—. Seleccionarlos a mano falla justo con los que
 * más importa no equivocar: son largos, van en monoespaciada y se cortan.
 *
 * ── Confirma, y por eso el estado vive acá ──────────────────────────
 *
 * Copiar no tiene efecto visible: el portapapeles está afuera de la pantalla. Un
 * botón que no contesta se aprieta tres veces «por las dudas». Por eso el ícono
 * pasa a un tilde por dos segundos — lo mínimo para creerle sin quedarse
 * mirando.
 *
 * ── Y puede fallar ──────────────────────────────────────────────────
 *
 * `navigator.clipboard` no existe fuera de un contexto seguro, y en algunos
 * navegadores exige un permiso que se puede negar. Se contempla: si falla, el
 * botón lo dice en vez de fingir que copió. Una confirmación falsa es peor que
 * ninguna, porque alguien pega lo que tenía antes y no se entera.
 */

export type CopyableProps = {
  /** Lo que se copia. Siempre texto: el portapapeles no tiene tipos. */
  value: string;
  /** Cómo se ve, si no es el valor tal cual. Un fingerprint se muestra cortado y
   *  se copia entero, que es justamente por qué las dos cosas son props
   *  distintas. */
  children?: ReactNode;
  /** El valor es de máquina: id, hash, clave. Sin esto, tipografía normal. */
  mono?: boolean;
  /** Sólo el botón, sin el valor al lado. Para una celda o un encabezado donde
   *  el valor ya está dibujado. */
  bare?: boolean;
};

/** Cuánto dura el tilde. Dos segundos: alcanza para verlo sin que el botón se
 *  quede en un estado que ya no es cierto. */
const CONFIRMED_FOR = 2000;

export function Copyable({ value, children, mono = false, bare = false }: CopyableProps) {
  const copy = useUiCopy();
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Se limpia al desmontar: sin esto, copiar y cerrar el panel antes de los dos
     segundos deja un `setState` apuntando a un componente que ya no existe. */
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function run() {
    if (timer.current !== null) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      /* Sin portapapeles —contexto no seguro, permiso negado— se DICE. Fingir
         que copió hace que alguien pegue lo que tenía antes sin enterarse. */
      setState("failed");
    }
    timer.current = setTimeout(() => setState("idle"), CONFIRMED_FOR);
  }

  const label =
    state === "done"
      ? copy.copyable.done
      : state === "failed"
        ? copy.copyable.failed
        : copy.copyable.label;

  const button = (
    <button
      type="button"
      onClick={run}
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-control p-0.5 transition-colors duration-(--duration-instant) ${
        state === "done"
          ? "text-good"
          : state === "failed"
            ? "text-bad"
            : "text-muted hover:bg-ink/6 hover:text-ink"
      }`}
    >
      {state === "done" ? (
        <Check className="size-(--size-icon-sm)" strokeWidth={2.5} />
      ) : (
        <Copy className="size-(--size-icon-sm)" strokeWidth={2} />
      )}
    </button>
  );

  if (bare) return button;

  return (
    /* El botón aparece con el puntero y ocupa lugar SIEMPRE: si apareciera de la
       nada, el valor se correría al pasar por encima, y un texto que se mueve
       cuando vas a seleccionarlo es peor que no tener botón. */
    <span className="group/copy inline-flex min-w-0 items-center gap-1">
      <span className={`min-w-0 truncate ${mono ? "font-mono" : ""}`}>
        {children ?? value}
      </span>
      <span className="opacity-0 transition-opacity duration-(--duration-instant) group-hover/copy:opacity-100 focus-within:opacity-100">
        {button}
      </span>
    </span>
  );
}
