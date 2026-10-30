"use client";

import { cn, focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { ChevronRight } from "lucide-react";
import { type ReactNode, useContext } from "react";
import {
  Button as AriaButton,
  Disclosure as AriaDisclosure,
  DisclosureGroup as AriaDisclosureGroup,
  DisclosureGroupStateContext,
  DisclosurePanel,
  DisclosureStateContext,
  Heading,
} from "react-aria-components";

/**
 * A section that folds: the advanced options of a form, a question of a FAQ, the lines of a
 * group.
 *
 * Context: it is a HEADING ROW, not a card. What folds is part of the page it is on — the
 * rest of the form, the rest of the list — so it is separated by hairlines and not boxed:
 * a box would say «this is another thing», and the advanced options of an invoice are still
 * the invoice. The title is set like a field label (`text-meta`, medium) because that is
 * what it is: the name of what is underneath.
 *
 * The chevron points right when closed and turns down when open — the one mark everybody
 * already reads as «there is more here». React Aria owns the rest: the row is a real button
 * with `aria-expanded`, the panel is `hidden="until-found"` when closed (the browser's
 * find-in-page still opens it), and the height animates from the measure it publishes.
 */
const row = tv({
  extend: focusRing,
  base: "flex w-full items-center gap-2 rounded-control px-2 py-2 text-left text-meta font-medium text-ink transition-colors duration-(--duration-instant) hover:bg-ink/6 pressed:bg-ink/10",
  variants: {
    isDisabled: {
      true: "cursor-not-allowed text-muted hover:bg-transparent forced-colors:text-[GrayText]",
    },
  },
});

export type DisclosureProps = {
  /** The name of what folds. */
  title: ReactNode;
  children: ReactNode;
  /** Its key inside an `Accordion`. Needed only when the accordion is controlled or has a
   *  `defaultExpanded`. */
  id?: string;
  /** Something about the content, at the right of the row: «3 líneas», «Bs 1.240,00». It is
   *  what lets a closed section be read without opening it. */
  detail?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  disabled?: boolean;
  /** The heading level of the title, so the outline of the page stays true. */
  level?: 2 | 3 | 4 | 5 | 6;
};

function Header({
  title,
  detail,
  level,
}: Pick<DisclosureProps, "title" | "detail" | "level">) {
  const isExpanded = useContext(DisclosureStateContext)?.isExpanded ?? false;
  return (
    <Heading level={level} className="m-0">
      <AriaButton slot="trigger" className={(state) => row(state)}>
        <ChevronRight
          aria-hidden
          strokeWidth={2}
          className={cn(
            "size-(--size-icon-md) shrink-0 text-muted transition-transform duration-(--duration-quick) ease-(--ease-out)",
            isExpanded && "rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {detail === undefined ? null : (
          <span className="shrink-0 text-micro font-normal text-muted tabular-nums">
            {detail}
          </span>
        )}
      </AriaButton>
    </Heading>
  );
}

export function Disclosure({
  title,
  children,
  id,
  detail,
  defaultExpanded,
  expanded,
  onExpandedChange,
  disabled,
  level = 3,
}: DisclosureProps) {
  // Inside an accordion the group draws the line above; alone, it closes itself on both sides.
  const inGroup = useContext(DisclosureGroupStateContext) !== null;
  return (
    <AriaDisclosure
      id={id}
      defaultExpanded={defaultExpanded}
      isExpanded={expanded}
      onExpandedChange={onExpandedChange}
      isDisabled={disabled}
      className={cn("border-line py-1", inGroup ? "border-b" : "border-y")}
    >
      <Header title={title} detail={detail} level={level} />
      <DisclosurePanel className="h-(--disclosure-panel-height) overflow-clip motion-safe:transition-[height] motion-safe:duration-(--duration-panel) motion-safe:ease-(--ease-out)">
        <div className="px-2 pt-1 pb-3 text-meta text-ink">{children}</div>
      </DisclosurePanel>
    </AriaDisclosure>
  );
}

/**
 * Several `Disclosure`s that work as one: by default opening one closes the other.
 *
 * Context: a FAQ or the groups of a long form read better one at a time — the open section
 * is the one being read and the rest stay as an index. `allowsMultipleExpanded` is for when
 * the sections are compared, not read (the lines of two groups side by side). The value is
 * a list of the sections' `id`s, not React Aria's `Set<Key>`, like every other control.
 */
export function Accordion({
  children,
  allowsMultipleExpanded = false,
  defaultExpanded,
  expanded,
  onExpandedChange,
  disabled,
}: {
  /** `Disclosure`s, each with its `id`. */
  children: ReactNode;
  allowsMultipleExpanded?: boolean;
  defaultExpanded?: string[];
  expanded?: string[];
  onExpandedChange?: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <AriaDisclosureGroup
      allowsMultipleExpanded={allowsMultipleExpanded}
      defaultExpandedKeys={defaultExpanded}
      expandedKeys={expanded}
      onExpandedChange={
        onExpandedChange === undefined
          ? undefined
          : (keys) => onExpandedChange([...keys].map(String))
      }
      isDisabled={disabled}
      className="border-t border-line"
    >
      {children}
    </AriaDisclosureGroup>
  );
}
