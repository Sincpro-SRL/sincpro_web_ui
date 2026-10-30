"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";

/* ==================================================================== *
 *  LA FICHA, MIENTRAS LLEGA.
 *
 *  Factura y cliente contestaban la espera con `Empty`: «Cargando…» en el
 *  medio de la página. Eso es la frase de «no hay nada», y el registro sí
 *  está — todavía no llegó. La silueta es la de la ficha: el riel, el nombre,
 *  los cuatro hechos, las solapas y el cuerpo. Cuando el registro aparece,
 *  cae en el mismo lugar.
 *
 *  Sin brillo. Un pulso ya quiere decir «este estado está vivo».
 * ==================================================================== */

const HECHOS = ["w-16", "w-12", "w-20", "w-24"] as const;
const SOLAPAS = ["w-14", "w-16", "w-20"] as const;

export function RecordSkeleton({ label }: { label: string }) {
  const d = useDensity();
  const page = d === "comfortable";

  return (
    <article aria-busy="true" className="flex min-w-0 flex-col">
      <span className="sr-only">{label}</span>
      {page ? (
        <div aria-hidden className="flex items-center gap-3 bg-chrome px-3.5 py-2.5">
          <span className="h-3 w-24 rounded-control bg-chrome-ink/15" />
          <span className="h-3 w-40 rounded-control bg-chrome-ink/10" />
          <span className="ml-auto h-(--size-control-sm) w-28 rounded-control bg-chrome-ink/15" />
        </div>
      ) : null}
      <div aria-hidden className={page ? "border border-line bg-surface" : "bg-surface"}>
        <div
          className={`flex flex-col ${byDensity(d, "gap-3 px-4 pt-3.5 pb-4", "gap-2 py-2")}`}
        >
          <span className="h-5 w-72 max-w-full rounded-control bg-ink/8" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {HECHOS.map((width) => (
              <span key={width} className="flex flex-col gap-1">
                <span className="h-2.5 w-10 rounded-control bg-ink/5" />
                <span className={`h-3.5 rounded-control bg-ink/8 ${width}`} />
              </span>
            ))}
          </div>
          <div className="flex gap-4 border-b border-line pb-2">
            {SOLAPAS.map((width, i) => (
              <span
                key={width}
                className={`h-3 rounded-control ${i === 0 ? "bg-ink/10" : "bg-ink/5"} ${width}`}
              />
            ))}
          </div>
          <span className="h-24 rounded-box bg-ink/5" />
        </div>
      </div>
    </article>
  );
}
