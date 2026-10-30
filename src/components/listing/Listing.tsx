"use client";

import { useHeaderSlot } from "@sincpro/web-ui/components/shell/headerSlot";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/* ==================================================================== *
 *  LISTING — the shape of a screen of N records. A single one, for all of them.
 *
 *  The request was literal: «in every list window don't forget that it has
 *  [Search (Filters)] [List]». Up to here every view built that by hand —one
 *  put the totals on top, another the search box below the upload panel, another
 *  had no search box at all— and the result is that two lists of the same
 *  product get used differently.
 *
 *  Four bands, always in the same order:
 *
 *      bar       crumbs · search · pagination
 *                actions · title · columns · views
 *      body      the rows, in a card with a border
 *
 *  ── The list goes in a card and the background stays behind ─────────
 *
 *  It is what separates an application from a document. Without the card the
 *  rows float over nothing and the screen reads as running text; the card puts
 *  a boundary around the set, and that boundary is what makes it read as «one
 *  thing with elements inside».
 *
 *  ── Two densities, and both are needed ──────────────────────────────
 *
 *  `table`  aligned, sortable columns. It wins when there is width: the data
 *           gets compared across rows without reading, which is what a table
 *           exists for.
 *  `rows`   two lines per record, big name and metadata underneath. It wins
 *           when there is NO width —a narrow panel, the preview— because a
 *           six-column table in 380 px is not a table, it is an accordion.
 *
 *  It is not an aesthetic preference: it is the available width. That is why
 *  the consumer passes it and this piece does not choose it — only whoever
 *  composes knows which surface it is going to land on.
 *
 *  ── The row lays itself out; nobody tells it how ────────────────────
 *
 *  WHICH presentation is the consumer's call. How a row arranges itself inside
 *  the one that was chosen is nobody's: there is no width at which a row «turns
 *  narrow», and no breakpoint written anywhere. Every zone asks for what it
 *  needs —the name `--container-name`, the tags `--container-tags`, the
 *  metadata what it says— and the line does what a line does: what does not fit
 *  wraps, and the name keeps the first one.
 *
 *  **That is why it holds up with a checkbox, an icon, actions, no tags, or a
 *  metadata three times longer.** None of that is declared anywhere: they all
 *  take their width from the same line, so a list that selects wraps a little
 *  earlier than one that does not, on its own. Asking the density instead —a
 *  decision per SURFACE— got it wrong in the one place it mattered: a list in a
 *  480 px drawer is comfortable —it draws its title, its counters, its full
 *  padding— and narrow at the same time, and the name was left with whatever
 *  was over between a metadata that did not shrink and a tag column of 8 rem:
 *  about a dozen pixels, «ve…».
 * ==================================================================== */

export function Listing({
  bar,
  metrics,
  sticky = false,
  surface,
  children,
}: {
  /** The `ListingBar`: actions, title, search, pagination and views. */
  bar?: ReactNode;
  /**
   * La barra se queda arriba al scrollear, debajo de lo que ya esté pegado.
   *
   * Es opt-in y no el default porque el fondo tiene que ser el de lo que hay
   * DETRÁS, y eso depende de dónde esté puesta: el arquetipo de lista vive
   * sobre el piso de la página, pero un `FrameView` —«el vistazo» de un
   * registro— vive sobre el PAPEL blanco, y ahí la banda color piso se ve como
   * una mancha. Se descubrió comparando historias, no razonando.
   */
  sticky?: boolean;
  /** Sobre qué está puesta la lista. Sólo se usa para el fondo de la banda que
   *  se pega: `chrome` pinta el mismo azul que ya pinta la barra —o sea,
   *  invisible— y cualquier otra pinta el PISO, que es lo que hay detrás de una
   *  lista de página. Las que viven adentro de algo blanco —un cajón, una vista
   *  previa— son compactas, y en compacto la barra no se pega. */
  surface?: Surface;
  /** The metrics that also narrow down. They go BELOW the bar and above the
   *  rows: they belong to the set I am looking at, not to the frame that frames
   *  it — above the bar they read as part of the navigation. */
  metrics?: ReactNode;
  children: ReactNode;
}) {
  const d = useDensity();
  /* La barra se PEGA arriba y las filas se van debajo de ella.
     Context: con 187 filas, scrollear para ver la última dejaba sin buscador,
     sin paginador y sin el conmutador de presentación — o sea que recortar
     después de mirar obligaba a subir de nuevo. Se pega debajo de lo que ya
     esté pegado (la barra de la aplicación) y empuja la pila para el
     encabezado de la tabla, que se pega debajo de ella. Ver `system/sticky.tsx`. */
  const band = useStickyLayer<HTMLDivElement>();

  /* En compacto NO se pega, y no es por falta de espacio: compacto es un cajón
     o una vista previa, o sea una caja corta con su propia cabecera y su propio
     scroll. Una banda pegada ahí se pinta encima del papel blanco del cajón —se
     ve como una mancha— para resolver un scroll que en cinco filas no existe.
     Es la misma razón por la que `ListingBar` tampoco dibuja la identidad ahí. */
  const pegada = sticky && d === "comfortable";
  /* With a sidebar the bar is the screen's header: it goes in the frame's full-width slot,
     above the sidebar (see `shell/headerSlot.ts`), and the frame does the sticking. */
  const slot = useHeaderSlot();
  const inSlot = pegada && slot !== null;

  return (
    /* Context: the box of rows carries no border. What separates it from the
       background is its white and its radius; a frame around a list that is
       already inside a framed panel is a nested rectangle, and nested
       rectangles are what make a product read like a cloud console. */
    <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-2.5", "gap-2")}`}>
      {/* Se pega la BARRA, no las métricas. El fondo es obligatorio y no
          estético: sin él las filas se ven pasar por debajo del texto. Las
          métricas se quedan afuera porque son las únicas que en una lista sin
          cromo tendrían que pintar un fondo propio, y el color depende de sobre
          qué esté puesta la lista — el piso de la página o el papel blanco de
          un registro. Contestan «de qué está hecho esto», no «qué estoy
          mirando»: se pueden ir. */}
      {inSlot ? (
        createPortal(bar, slot)
      ) : (
        <div
          ref={band.ref}
          className={`min-w-0 ${
            pegada ? `sticky z-30 ${surface === "chrome" ? "bg-chrome" : "bg-ground"}` : ""
          }`}
          style={pegada ? band.self : undefined}
        >
          {bar}
        </div>
      )}
      {/* Out of the slot the bar is a sibling and the column gap separates it from the
          metrics; in the slot it is not, so the gap is put back. */}
      {inSlot && metrics !== undefined ? <div className="pt-2">{metrics}</div> : metrics}
      {/* `overflow-clip` y NO `overflow-hidden`: los dos recortan las esquinas
          redondeadas igual, pero `hidden` crea un contenedor de scroll, y
          entonces el `sticky` del encabezado de la tabla se pega al borde de
          ESTA caja —que no scrollea— en vez de al de la página. O sea que se
          iba con las filas. `clip` recorta sin ser un scroller. */}
      <div
        className="min-w-0 overflow-clip rounded-box bg-surface"
        style={pegada && !inSlot ? band.below : undefined}
      >
        {children}
      </div>
    </div>
  );
}
