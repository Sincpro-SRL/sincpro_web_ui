import type { ReactNode } from "react";

/* ==================================================================== *
 *  LA LÍNEA DE TRES ZONAS — y por qué el centro se centra contra la LÍNEA.
 *
 *  Es la forma de las dos bandas del producto: la del registro —de dónde
 *  vengo · lo que cuelga de esto · cuál de ochenta soy— y la de la lista —de
 *  dónde vengo · qué estoy buscando · qué página—. Las dos tienen el mismo
 *  problema y por eso tienen una sola solución.
 *
 *  ── El problema: el centro no estaba en el centro ───────────────────
 *
 *  Con `mx-auto`, o con una grilla `auto 1fr max-content`, el centro queda
 *  donde SOBRA lugar. Y entonces un nombre de cincuenta caracteres a la
 *  izquierda —que en este producto es lo normal— empuja los botones contra el
 *  borde derecho, y la misma pantalla con un nombre corto los dibuja en otro
 *  lado. Dos registros seguidos ponen sus controles en dos lugares distintos:
 *  eso no es un centro, es un resto.
 *
 *  ── La regla: los dos lados PIDEN lo mismo ──────────────────────────
 *
 *  Los lados piden el mismo ancho y crecen parejo, así que lo que sobra se
 *  reparte en dos mitades iguales y el centro cae en el medio de la línea, con
 *  o sin migas, con o sin paginador. Lo que no entra en una mitad se recorta
 *  adentro de su mitad —para eso `min-w-0`— en vez de empujar al vecino.
 *
 *  ── Y se parte sola ─────────────────────────────────────────────────
 *
 *  No hay ningún umbral acá: ni consulta de medios, ni de contenedor, ni una
 *  rama por densidad. Cada zona declara lo que PIDE y `flex-wrap` decide: en
 *  una banda angosta el centro ya no entra al lado de las migas y baja entero
 *  al renglón siguiente, con el paginador atrás. Es lo mismo que hace una fila
 *  de lista, y por la misma razón: un umbral no sabe si la línea trae tres
 *  contadores o nueve.
 * ==================================================================== */

export function Line({
  start,
  center,
  end,
  /**
   * Lo que PIDE cada lado antes de que la línea se parta. Los dos piden lo
   * mismo —es lo que centra el centro— así que es un solo valor y no dos.
   */
  asks = "var(--container-trail)",
  /** Lo que pide el centro. `auto` es «lo que mida»; un campo de búsqueda pide
   *  su ancho tope, que es lo que hace que no se estire a 700 px. */
  centerAsks = "auto",
  gap = "gap-x-4 gap-y-2",
  align = "items-center",
}: {
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  asks?: string;
  centerAsks?: string;
  gap?: string;
  align?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap ${align} ${gap}`}>
      {/* Las tres zonas se dibujan SIEMPRE, incluso vacías. Una mitad que
          desaparece cuando no hay paginador mueve el centro, y entonces el
          centro vuelve a depender de lo que haya al lado — que es el problema
          que esto resuelve. */}
      <div className="flex min-w-0 flex-1 items-center" style={{ flexBasis: asks }}>
        {start}
      </div>
      {/* El centro NO crece. Si creciera, lo que sobra se repartiría en tres y
          el centro volvería a moverse con lo que tenga al lado — un campo de
          búsqueda pide su ancho tope y los dos lados se quedan con el resto, en
          mitades iguales. Encoger sí: en una línea angosta el campo se achica
          antes que desbordar. */}
      <div
        className="flex min-w-0 shrink items-center justify-center"
        style={{ flexBasis: centerAsks, flexGrow: 0 }}
      >
        {center}
      </div>
      <div
        className="flex min-w-0 flex-1 items-center justify-end"
        style={{ flexBasis: asks }}
      >
        {end}
      </div>
    </div>
  );
}
