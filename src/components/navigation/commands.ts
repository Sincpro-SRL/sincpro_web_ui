import type { LucideIcon } from "lucide-react";

/* ==================================================================== *
 *  THE COMMANDS OF A PALETTE — what can be run, and how a query finds it.
 *
 *  Pure on purpose: the grouping and the match are the palette's rules, and
 *  they are tested without opening a modal.
 * ==================================================================== */

/** Something the palette can run: go to a screen, create a record, open a report. */
export interface PaletteCommand {
  id: string;
  label: string;
  /** The heading it is listed under: «Ir a…», «Crear…». Commands without one go first,
   *  without a heading. */
  section?: string;
  icon?: LucideIcon;
  /** The key that runs it without the palette, as it should be read: «⌘N», «Alt+F». It is
   *  only drawn — the palette is where the shortcut gets learned, not where it is bound. */
  shortcut?: string;
  /** Other words that should find it: «factura» finds «Nueva venta» when the people who use
   *  it call it that. */
  keywords?: readonly string[];
}

/** The commands under each heading, headings in the order they first appear. */
export function groupCommands(
  commands: readonly PaletteCommand[],
): { section: string | undefined; commands: PaletteCommand[] }[] {
  const groups = new Map<string | undefined, PaletteCommand[]>();
  /* The commands with no heading are listed first, wherever they were written. */
  if (commands.some((c) => c.section === undefined)) groups.set(undefined, []);
  for (const command of commands) {
    const group = groups.get(command.section);
    if (group === undefined) groups.set(command.section, [command]);
    else group.push(command);
  }
  return [...groups].map(([section, list]) => ({ section, commands: list }));
}

/**
 * Whether a command answers a query. `contains` is the locale's comparison — React Aria's
 * `useFilter` in the palette — so «facturacion» finds «Facturación» and an uppercase query
 * finds a lowercase label.
 *
 * Every word of the query has to appear, in any order, in the label or the keywords:
 * «nueva fac» finds «Nueva factura», and so does «factura nueva».
 */
export function commandMatches(
  command: PaletteCommand,
  query: string,
  contains: (text: string, part: string) => boolean,
): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [command.label, ...(command.keywords ?? [])].join(" ");
  return words.every((word) => contains(haystack, word));
}
