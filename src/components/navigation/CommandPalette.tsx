"use client";

import {
  commandMatches,
  groupCommands,
  type PaletteCommand,
} from "@sincpro/web-ui/components/navigation/commands";
import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { tv } from "@sincpro/web-ui/foundations/variants";
import { Search, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Autocomplete,
  Button as AriaButton,
  Dialog,
  Header,
  Input,
  Keyboard,
  Menu,
  MenuItem,
  MenuSection,
  Modal,
  ModalOverlay,
  SearchField,
  useFilter,
} from "react-aria-components";

/* ==================================================================== *
 *  COMMAND PALETTE — ⌘K, type three letters, Enter.
 *
 *  An ERP has a hundred screens and twenty «new» buttons, and the people who
 *  use it all day stop wanting to look for any of them: they know the name of
 *  what they want. The palette is the shortest path from knowing the name to
 *  being there — one key to open, a few letters, Enter — without leaving the
 *  keyboard and without knowing in which menu of which module it lives.
 *
 *      ┌──────────────────────────────────────────────┐
 *      │ 🔍 fact                                    ✕ │
 *      ├──────────────────────────────────────────────┤
 *      │ IR A…                                        │
 *      │ ▌🧾 Facturas                                 │  ← Enter runs it
 *      │ CREAR…                                       │
 *      │   ＋ Nueva factura                       ⌘N  │
 *      └──────────────────────────────────────────────┘
 *
 *  React Aria's `Autocomplete` drives it: focus stays in the search box while
 *  the arrows walk the list (virtual focus), the first match is highlighted as
 *  you type so Enter always does something, and the modal traps focus, closes
 *  on Escape and on a click outside, and gives the focus back.
 *
 *  The match is the locale's (`useFilter` inside `AriaLocale`): «facturacion»
 *  finds «Facturación» because nobody types the accent when they are in a hurry.
 * ==================================================================== */

const overlay = tv({
  base: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-scrim/40 px-4 pt-24 transition-opacity duration-(--duration-quick) ease-(--ease-out)",
  variants: {
    isEntering: { true: "opacity-0" },
    isExiting: { true: "opacity-0" },
  },
});

const surface = tv({
  base: "w-full max-w-xl overflow-hidden rounded-panel border border-line-strong bg-surface text-ink shadow-window outline-0 transition-[opacity,translate] duration-(--duration-quick) ease-(--ease-out) forced-colors:bg-[Canvas]",
  variants: {
    isEntering: { true: "-translate-y-1 opacity-0" },
    isExiting: { true: "opacity-0" },
  },
});

const item = tv({
  base: "flex cursor-default items-center gap-2 rounded-control px-2 py-1.5 text-meta text-ink outline-0 select-none",
  variants: {
    isFocused: {
      true: "bg-primary/8 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isPressed: { true: "bg-primary/12" },
    isDisabled: { true: "text-muted forced-colors:text-[GrayText]" },
  },
});

/**
 * The search box and the list, without the modal around them.
 *
 * Context: split out so the filtering can be rendered on its own — in a test, with a query
 * already typed — since the modal is a portal that only exists in a browser.
 */
export function CommandSearch({
  commands,
  onRun,
  query,
  onQueryChange,
  placeholder,
}: {
  commands: readonly PaletteCommand[];
  onRun: (id: string) => void;
  query?: string;
  onQueryChange?: (next: string) => void;
  placeholder?: string;
}) {
  const copy = useUiCopy();
  const { contains } = useFilter({ sensitivity: "base" });
  const byId = useMemo(() => new Map(commands.map((c) => [c.id, c])), [commands]);
  const groups = useMemo(() => groupCommands(commands), [commands]);
  const hint = placeholder ?? copy.search.placeholder;

  return (
    <Autocomplete
      {...(query === undefined ? {} : { inputValue: query })}
      {...(onQueryChange === undefined ? {} : { onInputChange: onQueryChange })}
      filter={(_text, input, node) => {
        const command = byId.get(String(node.key));
        return command === undefined || commandMatches(command, input, contains);
      }}
    >
      <SearchField
        aria-label={hint}
        autoFocus
        className="group flex items-center gap-2 border-b border-line px-3"
      >
        <Search
          className="size-(--size-icon-md) shrink-0 text-muted"
          strokeWidth={2}
          aria-hidden
        />
        <Input
          placeholder={hint}
          className="h-(--size-control-lg) min-w-0 flex-1 bg-transparent text-body text-ink outline-0 placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        <AriaButton className="inline-flex shrink-0 items-center justify-center rounded-mark p-1 text-muted transition-colors duration-(--duration-instant) group-empty:invisible hover:bg-ink/6 hover:text-ink pressed:bg-ink/10">
          <X className="size-(--size-icon-md)" strokeWidth={2} aria-hidden />
        </AriaButton>
      </SearchField>
      <Menu
        aria-label={hint}
        onAction={(key) => onRun(String(key))}
        renderEmptyState={() => (
          <p className="px-3 py-6 text-center text-meta text-muted italic">
            {copy.menu.empty}
          </p>
        )}
        className="max-h-96 overflow-y-auto p-1 outline-0"
      >
        {groups.map((group) => (
          <MenuSection
            key={group.section ?? ""}
            id={group.section ?? "-"}
            className="not-first:mt-1"
          >
            {group.section === undefined ? null : (
              <Header className="px-2 pt-2 pb-1 text-micro font-medium text-muted">
                {group.section}
              </Header>
            )}
            {group.commands.map((command) => {
              const Icon = command.icon;
              return (
                <MenuItem
                  key={command.id}
                  id={command.id}
                  textValue={command.label}
                  className={item}
                >
                  {/* The icon column exists for every row, drawn or not, so labels start on
                      one vertical and the eye scans one column of words. */}
                  <span className="flex size-(--size-icon-md) shrink-0 items-center justify-center text-muted">
                    {Icon === undefined ? null : (
                      <Icon className="size-(--size-icon-md)" strokeWidth={2} aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  {command.shortcut === undefined ? null : (
                    <Keyboard className="shrink-0 rounded-mark border border-line px-1.5 font-sans text-micro text-muted tabular-nums">
                      {command.shortcut}
                    </Keyboard>
                  )}
                </MenuItem>
              );
            })}
          </MenuSection>
        ))}
      </Menu>
    </Autocomplete>
  );
}

/**
 * A modal search over everything the app can do — go to a screen, create a record — opened
 * with ⌘K (Ctrl+K) and run with Enter.
 *
 * Context: it is controlled (`open`, `onOpenChange`) and does not bind the shortcut itself,
 * because an app has ONE palette and many screens: the key is bound once, where the palette
 * lives, with `useCommandPaletteShortcut`. Running a command closes it — the palette is a
 * path, not a place to stay.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  onRun,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly PaletteCommand[];
  /** A command was chosen. The palette closes on its own. */
  onRun: (id: string) => void;
  /** The search box's prompt and its accessible name. By default, the copy table's. */
  placeholder?: string;
}) {
  const copy = useUiCopy();
  return (
    <AriaLocale>
      <ModalOverlay
        isOpen={open}
        onOpenChange={onOpenChange}
        isDismissable
        className={overlay}
      >
        <Modal className={surface}>
          <Dialog aria-label={placeholder ?? copy.search.placeholder} className="outline-0">
            <CommandSearch
              commands={commands}
              onRun={(id) => {
                onOpenChange(false);
                onRun(id);
              }}
              {...(placeholder === undefined ? {} : { placeholder })}
            />
          </Dialog>
        </Modal>
      </ModalOverlay>
    </AriaLocale>
  );
}

/**
 * Binds ⌘K (Ctrl+K on Windows and Linux) to open the palette, anywhere in the page.
 *
 * Context: both modifiers are accepted on every platform. Telling them apart by the user
 * agent guesses wrong on a Mac with a PC keyboard, and the cost of accepting both is that
 * Ctrl+K on a Mac — «delete to the end of the line» in a text box — opens the palette.
 */
export function useCommandPaletteShortcut(setOpen: (open: boolean) => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      e.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
