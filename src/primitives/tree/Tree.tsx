"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { cn, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  Button as AriaButton,
  Checkbox as AriaCheckbox,
  type Selection,
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent,
} from "react-aria-components";

/* ==================================================================== *
 *  TREE — a hierarchy of RECORDS, read and chosen from.
 *
 *      ┌──────────────────────────────────────────┐
 *      │ ▾ 1 Activo                  152.340,00   │   ← a group: it folds
 *      │   ▾ 1.1 Activo corriente     98.120,00   │
 *      │       1.1.01 Caja             4.500,00   │   ← a record
 *      │       1.1.02 Bancos          93.620,00 ✓ │   ← chosen
 *      │   ▸ 1.2 Activo no corriente  54.220,00   │   ← folded
 *      └──────────────────────────────────────────┘
 *
 *  The chart of accounts, product categories, warehouse locations: records
 *  whose PLACE is part of what they are. «Caja» means little until it reads
 *  under «Activo corriente». A flat list with the path written in every row
 *  says it forty times; a tree says it once, and lets the branch that does
 *  not matter now fold away.
 *
 *  ── Not the navigation tree ─────────────────────────────────────────
 *
 *  `NavigationTree` is a tree of LINKS — screens of the app, one of them the
 *  page you are on. This one is a tree of DATA: its rows are records, they
 *  can be chosen (one or many), opened, and they carry a figure. Both are
 *  React Aria trees with the same keys — arrows walk, ← and → fold and open,
 *  typing a name jumps to it — but a row here never says `aria-current`, and
 *  a row there is never «selected».
 *
 *  ── Choosing and opening are two gestures ───────────────────────────
 *
 *  With ONE to choose, a click chooses and a double click or Enter opens the
 *  record — the way a file manager works, and the only way a mouse can do both
 *  on the same row. With MANY, each row carries its check: the click on the
 *  row opens (or toggles, when there is nothing to open) and the check is what
 *  adds it to the set, so a click meant to open never edits the selection.
 *
 *  ── `disabled` means «cannot be chosen», not «gone» ─────────────────
 *
 *  In a chart of accounts the groups are VIEW accounts: they total the ones
 *  below and take no entries, so they must not be chosen as the account of a
 *  line. They still fold, still open, and still say their balance — disabling
 *  a branch must not lock away everything under it. React Aria's
 *  `disabledBehavior="selection"` is exactly that.
 * ==================================================================== */

/** One record of the hierarchy. With `children` it is a group that folds. */
export interface TreeItem {
  id: string;
  label: string;
  /** What reads beside the name, at the right, in tabular figures: a balance, a stock, a
   *  count. Already formatted — the tree does not know a currency from a unit. */
  meta?: string;
  icon?: LucideIcon;
  children?: readonly TreeItem[];
  /** It cannot be chosen — a view account that groups others and takes no entries. It still
   *  folds and opens. */
  disabled?: boolean;
}

/** One name or the other: a tree with no name is announced as a lone «tree». */
type TreeName =
  | {
      /** The accessible name: «Plan de cuentas». */
      label: string;
      labelledBy?: never;
    }
  | {
      /** The id of a visible heading that names the tree — the label of the `Field` it lives
       *  in. */
      labelledBy: string;
      label?: never;
    };

export type TreeProps = TreeName & {
  items: readonly TreeItem[];
  /** The groups open right now. Pass it with `onExpandedChange` to own the expansion. */
  expanded?: readonly string[];
  /** The groups that start open, when the tree owns its expansion. */
  defaultExpanded?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** `none` reads; `single` chooses one record (a category, a location); `multiple` a set. */
  selectionMode?: "none" | "single" | "multiple";
  /** The chosen ids — a list in both modes, like every other control, so a screen does not
   *  switch shapes when one becomes many. */
  selected?: readonly string[];
  defaultSelected?: readonly string[];
  onSelectedChange?: (ids: string[]) => void;
  /** Open the record: Enter, or a click (a double click when the tree chooses one). Without
   *  it, a click on a group folds or opens it. */
  onAction?: (id: string) => void;
  /** What an empty tree says. By default, the copy table's `tree.empty`. */
  empty?: string;
};

const row = tv({
  extend: focusRing,
  base: "group relative flex min-w-0 cursor-default items-center rounded-control text-meta text-ink -outline-offset-2 select-none forced-color-adjust-none",
  variants: {
    isSelected: {
      true: "bg-primary/10 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isHovered: { true: "" },
  },
  compoundVariants: [{ isSelected: false, isHovered: true, class: "bg-ink/4" }],
});

/* The chevron column is exactly one indent step wide, so a child's chevron lands under its
   parent's name and the levels read as columns, not as a ragged edge. */
const chevronButton = tv({
  extend: focusRing,
  base: "inline-flex size-(--spacing-indent) shrink-0 items-center justify-center rounded-mark text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink pressed:bg-ink/10",
});

/** Every id of the hierarchy that can be chosen — what «select all» means here. */
function choosable(items: readonly TreeItem[]): string[] {
  return items.flatMap((item) => [
    ...(item.disabled === true ? [] : [item.id]),
    ...choosable(item.children ?? []),
  ]);
}

/**
 * A hierarchy of records — the chart of accounts, product categories, warehouse locations —
 * with its groups that fold, a figure per row, and one or many rows to choose.
 *
 * Context: the keyboard is React Aria's `Tree`: arrows walk the visible rows, → opens a group
 * and ← folds it (or goes up to the parent), Home and End jump, and typing a name moves to it.
 * Escape does NOT clear the selection: the tree often lives in a dialog or a popover, and
 * Escape there means «close» — clearing the choice on the way out would lose it without a word.
 */
export function Tree({
  items,
  label,
  labelledBy,
  expanded,
  defaultExpanded,
  onExpandedChange,
  selectionMode = "none",
  selected,
  defaultSelected,
  onSelectedChange,
  onAction,
  empty,
}: TreeProps) {
  const copy = useUiCopy();
  const density = useDensity();
  const pad = byDensity(density, "py-1.5 pe-2", "py-0.5 pe-1.5");
  const many = selectionMode === "multiple";

  const onSelectionChange = (keys: Selection) =>
    onSelectedChange?.(keys === "all" ? choosable(items) : [...keys].map(String));

  const render = (node: TreeItem, level: number): ReactNode => {
    const children = node.children ?? [];
    const group = children.length > 0;
    const Icon = node.icon;
    /* Each level is one indent step; the first one keeps a sliver of the row's own padding so
       the chevron is not glued to the edge of its tint. */
    const indent: CSSProperties = {
      paddingInlineStart: `calc(var(--spacing) * 1 + var(--spacing-indent) * ${level - 1})`,
    };
    return (
      <AriaTreeItem
        key={node.id}
        id={node.id}
        textValue={node.label}
        isDisabled={node.disabled === true}
        className={({ isSelected, isHovered, isFocusVisible }) =>
          cn(row({ isSelected, isHovered, isFocusVisible }), pad)
        }
        style={indent}
      >
        <TreeItemContent>
          {({ isExpanded, isSelected }) => (
            <>
              {group ? (
                <AriaButton
                  slot="chevron"
                  className={({ isFocusVisible }) => chevronButton({ isFocusVisible })}
                >
                  <ChevronRight
                    className={`size-(--size-icon-sm) transition-transform duration-(--duration-quick) ease-(--ease-out) ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                </AriaButton>
              ) : (
                <span aria-hidden className="size-(--spacing-indent) shrink-0" />
              )}
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {many ? <SelectionCheck /> : null}
                {Icon === undefined ? null : (
                  <Icon
                    className="size-(--size-icon-md) shrink-0 text-muted"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
                {/* A group reads as the heading of what it holds; a record that cannot be
                    chosen is quieter, so the eye skips it while looking for one that can. */}
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    group ? "font-medium" : "",
                    isSelected ? "font-medium" : "",
                    node.disabled === true && selectionMode !== "none" ? "text-muted" : "",
                  )}
                >
                  {node.label}
                </span>
                {node.meta === undefined ? null : (
                  <span className="shrink-0 ps-3 text-right tabular-nums whitespace-nowrap text-muted">
                    {node.meta}
                  </span>
                )}
                {/* One to choose: the chosen row says so with a mark too, not with tint
                    alone — the same check the picker draws. */}
                {selectionMode === "single" && isSelected ? (
                  <Check
                    className="size-(--size-icon-sm) shrink-0 text-primary forced-colors:text-[HighlightText]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : null}
              </span>
            </>
          )}
        </TreeItemContent>
        {children.map((child) => render(child, level + 1))}
      </AriaTreeItem>
    );
  };

  return (
    <AriaLocale>
      <AriaTree
        {...(labelledBy === undefined
          ? { "aria-label": label }
          : { "aria-labelledby": labelledBy })}
        selectionMode={selectionMode}
        /* One to choose: a click chooses and a double click opens. Many: the click opens and
           the check chooses. See the header. */
        selectionBehavior={selectionMode === "single" ? "replace" : "toggle"}
        disabledBehavior="selection"
        escapeKeyBehavior="none"
        {...(selected === undefined ? {} : { selectedKeys: selected })}
        {...(defaultSelected === undefined ? {} : { defaultSelectedKeys: defaultSelected })}
        {...(expanded === undefined ? {} : { expandedKeys: expanded })}
        {...(defaultExpanded === undefined ? {} : { defaultExpandedKeys: defaultExpanded })}
        {...(onExpandedChange === undefined
          ? {}
          : { onExpandedChange: (keys) => onExpandedChange([...keys].map(String)) })}
        {...(onSelectedChange === undefined ? {} : { onSelectionChange })}
        {...(onAction === undefined ? {} : { onAction: (key) => onAction(String(key)) })}
        renderEmptyState={() => (
          <p className="px-2 py-3 text-meta text-muted">{empty ?? copy.tree.empty}</p>
        )}
        className="flex w-full min-w-0 flex-col gap-px outline-0"
      >
        {items.map((item) => render(item, 1))}
      </AriaTree>
    </AriaLocale>
  );
}

/* The check of a row when many can be chosen. It is React Aria's `selection` slot: it toggles
   the row and never opens it. Drawn like `Checkbox`'s box so a check reads as one thing. */
function SelectionCheck() {
  return (
    <AriaCheckbox slot="selection" className="group/check inline-flex shrink-0 outline-0">
      {({ isSelected, isFocusVisible }) => (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-4 items-center justify-center rounded-mark border transition-colors duration-(--duration-instant) forced-color-adjust-none",
            isSelected
              ? "border-primary bg-primary text-surface forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]"
              : "border-line-strong bg-surface text-transparent forced-colors:border-[ButtonBorder]",
            focusRing({ isFocusVisible }),
          )}
        >
          <Check className="size-3" strokeWidth={2.5} />
        </span>
      )}
    </AriaCheckbox>
  );
}
