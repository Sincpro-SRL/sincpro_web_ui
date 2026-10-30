import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import type { ReactNode } from "react";

/**
 * Context: the diagnosis was not a lack of ornaments, it was that a view was a
 * pile of `<div className="flex flex-col gap-3">` with no hierarchy — the lines,
 * the taxes and the payments floated at the same height and nothing said where one
 * ends and the other begins. In a 1.200 px panel that reads as a loose sheet.
 *
 * The block has an edge (a hair of border and the radius of the scale, not a
 * shadow: over the canvas a shadow alone looks blurry) and its title lives ON the
 * border, not floating above it.
 */

/**
 * What state whatever this section asks for or shows is in.
 *
 * Context: it is the only thing worth copying from the old console — each section
 * said «Required» or «(Incomplete)» in its header, so you could see what is
 * missing WITHOUT opening any of them. The system doesn't know what «incomplete»
 * means for an invoice, so the word is put there by whoever composes.
 */
export type BlockStatus = {
  label: string;
  tone?: Tone;
};

export type BlockProps = {
  /** Without a title the block is only the box: it serves to group without
   *  naming. */
  title?: string;
  count?: number;
  aside?: ReactNode;
  /** What can be done with THIS block, to the right of its title. */
  actions?: ReactNode;
  status?: BlockStatus;
  /** Without padding, for whatever already brings its own frame: a table inside a
   *  box with borders is two frames arguing. */
  flush?: boolean;
  children: ReactNode;
};

export function Block({
  title,
  count,
  aside,
  actions,
  status,
  flush = false,
  children,
}: BlockProps) {
  const withHeader = title !== undefined || actions !== undefined || status !== undefined;

  return (
    <section className="min-w-0 rounded-box border border-line bg-surface">
      {!withHeader ? null : (
        <header className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-3 py-2">
          {title === undefined ? null : (
            <SectionHeader title={title} count={count} aside={aside} />
          )}
          {status === undefined ? null : (
            <Tag tone={status.tone ?? "neutral"}>{status.label}</Tag>
          )}
          {actions === undefined ? null : (
            <div className="ml-auto flex flex-wrap items-center gap-1">{actions}</div>
          )}
        </header>
      )}
      <div className={flush ? "" : "px-3 py-2.5"}>{children}</div>
    </section>
  );
}

/**
 * A cut in the page: between two groups of fields, or between a sheet of
 * facts and the table that hangs off them.
 *
 * Without a label it is a hairline. With one it is Odoo's separator — the
 * word names what starts, the line says the previous group ended. `FormSection`
 * is a GROUP of fields; this is what goes BETWEEN groups. A block with a
 * border is a third thing: a region, not a cut.
 */
export function Rule({ label }: { label?: string }) {
  if (label === undefined) {
    return <hr className="border-0 border-t border-line" />;
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="shrink-0 text-micro font-medium text-muted">{label}</span>
      <span className="h-px min-w-0 flex-1 bg-line" aria-hidden />
    </div>
  );
}

/**
 * `DATOS ── 3`. The title of a section and nothing else.
 *
 * Context: proportional and not monospaced — it is a written title, at the
 * body size, in medium ink. The count is tabular, because it is a figure.
 *
 * The `aside` goes next to the title and not pushed to the opposite edge: with
 * `justify-between`, «El vistazo» and «20 de 1.000 filas» ended up half a screen
 * apart and the phrase read as split in two.
 */
export function SectionHeader({
  title,
  count,
  aside,
}: {
  title: string;
  count?: number;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-meta font-medium text-ink">
        {title}
        {count === undefined ? null : (
          <>
            <span className="mx-1.5 text-line-strong">──</span>
            <span className="tabular-nums">{count}</span>
          </>
        )}
      </h2>
      {aside === undefined ? null : (
        <>
          <span aria-hidden className="text-meta text-line-strong">
            ·
          </span>
          {aside}
        </>
      )}
    </div>
  );
}
