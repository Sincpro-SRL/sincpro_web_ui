"use client";

import {
  at,
  type BuiltCondition,
  type BuiltFilter,
  criteriaId,
  type CriteriaJoin,
  type CriteriaPath,
  filterCriteria,
  removeAt,
  replaceAt,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { CriteriaChips } from "@sincpro/web-ui/components/search/CriteriaChips";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  describeCondition,
  opLabel,
  type QueryField,
  queryFields,
  type QuerySuggestion,
  readTyped,
  suggest,
  withoutValue,
} from "@sincpro/web-ui/components/search/query";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import type { MenuGroup, MenuOption } from "@sincpro/web-ui/primitives/menu/Menu";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import {
  ChevronRight,
  CornerDownRight,
  ListFilter,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useOverlay } from "react-aria";

/* ==================================================================== *
 *  THE BAR — searching is asking WHERE, not just what.
 *
 *  The product's diagnosis was literal: «we are currently putting everything
 *  in the menu as if they were filters». The side menu says WHICH OBJECTS there are;
 *  the bar says WHICH OF THEM I am looking at. They are two questions, and so they are
 *  two controls — putting the cuts in the menu forces you to navigate in order to filter.
 *
 *  ── The facet is the piece that cannot be skipped ──────────────────
 *
 *  A search field without facets searches where whoever programmed it decided.
 *  Typing «edad» can mean *«the file is called edad»* or *«it has a
 *  column edad»*, and those are two questions with two different answers. The solution
 *  is not to guess nor to search everywhere: it is to ASK. You type, the
 *  dropdown offers in which field to look for it, and what is chosen stays as a chip
 *  that is seen and removed.
 *
 *  With a MODEL the bar stops searching text and asks: from it come each field's type,
 *  its comparisons, its possible values and the column by which a
 *  relational is searched. Without a model, a facet is a text field and the
 *  bar keeps working — it is the same path, with less metadata.
 *
 *  ── The cuts live INSIDE the field ──────────────────────────────────
 *
 *  Filters, grouping and favourites are a single panel hanging from the right edge of
 *  the bar, and not three buttons side by side. They are the same question —*which part of
 *  this am I looking at?*— and apart they force you to open three dropdowns to
 *  build a cut, without being able to see the three states at once.
 *
 *  ── Everything set is an INSTANCE, and it is drawn ──────────────────
 *
 *  Ticking a filter, writing a question, opening a group with `#and` or adding
 *  a grouping level all leave the same thing: an instance in the list that
 *  the bar draws. The group ones go always on the left, chained; the
 *  filter ones on the right, with their nesting.
 *
 *  A counter on the funnel was not enough: you had to open the panel to know
 *  WHAT was set, and a list that looks unfiltered is how somebody ends up
 *  looking at a subset without knowing it. And how they are joined is not deduced: it is a
 *  word —«todas», «cualquiera», «ninguna»— that is read and touched right there.
 *
 *  Odoo hangs its panel from a chevron, and that is its flaw: a `▾` does not say what
 *  is on the other side, so you have to open it to find out. Here the trigger
 *  is a filter icon with its counter — you see that it filters, and how much.
 * ==================================================================== */

/** Where you can search. The domain declares it, not this piece. */
export interface SearchFacet {
  id: string;
  /** How it reads in the suggestion and on the chip: «nombre», «columnas». */
  label: string;
}

/** A column of the cuts panel. Either a list of options, or a piece that
 *  draws itself — grouping stopped being a list of checkboxes the day it
 *  became N ordered levels, but it is still the same question as the
 *  filters and that is why it stays in the same panel. */
interface Column {
  title: string;
  groups?: readonly MenuGroup[];
  content?: ReactNode;
  onSelect?: (id: string) => void;
}

function Option({ o, onSelect }: { o: MenuOption; onSelect?: (id: string) => void }) {
  const Icon = o.icon;
  return (
    <button
      type="button"
      disabled={o.disabled}
      onClick={() => onSelect?.(o.id)}
      className={`flex w-full items-start gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) disabled:pointer-events-none disabled:opacity-45 hover:bg-primary/8 ${
        o.checked === true ? "bg-primary/6" : ""
      }`}
    >
      {/* The mark column always exists, even if nothing is chosen: without
          it, ticking an option shifts all the text and the panel jumps.
          When off the ring is seen: a gap the size of the icon reads as
          padding nobody asked for. */}
      <span className="mt-0.5 flex size-(--size-icon-sm) shrink-0 items-center justify-center">
        {o.checked === true ? (
          <span className="size-1.5 rounded-pill bg-primary" />
        ) : Icon !== undefined ? (
          <Icon className="size-(--size-icon-sm) text-muted" strokeWidth={2} />
        ) : (
          <span className="size-3 rounded-pill border border-line-strong" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`truncate text-meta ${o.checked === true ? "font-medium text-ink" : "text-ink"}`}
          >
            {o.label}
          </span>
          {o.badge === undefined ? null : (
            <span className="inline-flex shrink-0 items-center rounded-pill border border-warn/30 bg-warn/10 px-2 py-0.5 text-micro text-warn">
              {o.badge}
            </span>
          )}
        </span>
        {o.hint === undefined ? null : (
          <span className="mt-0.5 block truncate text-micro text-muted">{o.hint}</span>
        )}
      </span>
    </button>
  );
}

/** A panel group. Collapsible when it asks —a date, which brings eleven
 *  options— and open from the start if it already has something ticked: otherwise what is set
 *  stays hidden behind a chevron and you have to guess where it is. */
function Group({
  group,
  first,
  onSelect,
}: {
  group: MenuGroup;
  first: boolean;
  onSelect?: (id: string) => void;
}) {
  const active = group.options.some((o) => o.checked === true);
  const [open, setOpen] = useState(active);

  const options = (
    <>
      {group.options.map((o) => (
        <Fragment key={o.id}>
          {o.divider === true ? <div className="my-1 h-px bg-line" role="separator" /> : null}
          <Option o={o} onSelect={onSelect} />
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {first ? null : <div className="my-1 h-px bg-line" role="separator" />}
      {group.label === undefined ? null : group.collapsible !== true ? (
        /* The group's label goes in the TEXT column, not the edge one.
           The column's band is already the title (medium, over the line). This
           one is a step down: normal weight, and the same gap as the mark
           so that «mostrar sólo» starts where «traídos» starts. */
        <div className="flex items-center gap-2 px-1.5 pt-1 pb-0.5 text-micro text-muted">
          <span className="size-(--size-icon-sm) shrink-0" aria-hidden />
          {group.label}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-control px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-primary/8"
        >
          <ChevronRight
            className={`size-(--size-icon-sm) shrink-0 text-muted transition-transform duration-(--duration-instant) ${
              open ? "rotate-90" : ""
            }`}
            strokeWidth={2}
            aria-hidden
          />
          <span
            className={`min-w-0 flex-1 truncate text-meta ${active ? "font-medium text-ink" : "text-ink"}`}
          >
            {group.label}
          </span>
          {/* How many cuts it has set, without opening it. */}
          {!active ? null : (
            <span className="inline-flex shrink-0 items-center rounded-pill border border-accent/40 bg-accent/18 px-2 py-0.5 text-micro tabular-nums text-ink">
              {group.options.filter((o) => o.checked === true).length}
            </span>
          )}
        </button>
      )}
      {group.collapsible === true && !open ? null : (
        <div
          className={
            group.collapsible === true
              ? "flex flex-col gap-0.5 pl-(--spacing-indent)"
              : "flex flex-col gap-0.5"
          }
        >
          {options}
        </div>
      )}
    </div>
  );
}

/**
 * The CONJUNCTION between two cuts: «y» or «o».
 *
 * With `onToggle` it can be touched, and that is no ornament: «vencidas Y de este
 * mes» and «vencidas O de este mes» are two completely different lists, and
 * until now which of the two it was was decided inside and could not be changed
 * without opening the builder. Without `onToggle` it is a word and nothing more — which is
 * right between two axes, where AND is not an option.
 */
/**
 * What the bar needs. It is apart from the function because it is the contract: what
 * a list has to give it for the bar to ask, and nothing more.
 */
export type SearchBarProps = {
  facets: readonly SearchFacet[];
  /**
   * The model, when the list has it.
   *
   * It is what turns the bar from «search a text in a field» into «ask a
   * question»: from here come each field's type —and with it what can be
   * written to it—, the operators it accepts, its possible values if it is an enum, and
   * by which column a relational is searched. Without this, `facets` keeps working
   * as always: each facet is a text field.
   */
  model?: ModelDefinition;
  /**
   * EVERYTHING the bar has set: the grouping levels and the filters, in
   * a single list of instances.
   *
   * A single one and not three because they are the same with different kinds —see
   * `criteria.ts`—: what enters through the hash sign, what is written by hand, what
   * a declared filter brings with a name and what comes out of the builder are
   * all instances, and that is why they are all read, touched and removed the same.
   */
  criteria: readonly SearchCriteria[];
  onCriteriaChange: (next: SearchCriteria[]) => void;
  placeholder?: string;
  /** What the panel OFFERS. What is set does not come from here: it comes from `criteria`. */
  filters?: readonly MenuGroup[];
  /**
   * The grouping levels editor: `<GroupingLevels …/>`.
   *
   * It goes in the SAME panel column where the filters are, because it is the same
   * question —«which part of this am I looking at»— and separating them forces opening two
   * things to build a cut without being able to see both states at once.
   */
  grouping?: ReactNode;
  /**
   * Somebody wrote `#and`, `#or` or `#not` and the bar opened a node: this says
   * which, in case whoever composes wants to do something more with it.
   */
  onOpenGroup?: (join: CriteriaJoin) => void;
  favorites?: readonly MenuGroup[];
  onFilterSelect?: (id: string) => void;
  onFavoriteSelect?: (id: string) => void;
  /**
   * Opens the builder. It receives the PATH of the instance that was touched, when one
   * was touched: the builder opens there, instead of opening on the first rule and
   * forcing you to search for the one you were looking at among twelve.
   */
  onOpenBuilder?: (path?: CriteriaPath) => void;
  /**
   * The set's own search — what a free text means when it is not a question about one field:
   * every field the set searches, at once (sincpro_framework's `LiteralSearch`, Odoo's «Search
   * for: …»). Given the typed text, it returns what the chip asks; `null` offers nothing.
   *
   * With it, «Buscar «Globex»» is offered for every text. It goes FIRST — the one Enter takes —
   * unless the model reads the text as a question of its own (an operator, a field's name, an
   * enum's value, a number a numeric field answers): then that goes first and this after it.
   */
  literal?: (text: string) => BuiltCondition | BuiltFilter | null;
  /** What goes stuck to the field, on its right. */
  trailing?: ReactNode;
  /** How many facets the bar shows before folding the rest into «+N»; the grouping chain
   *  counts as one. On a narrow bar only the first shows. `Infinity` never folds. */
  collapseAfter?: number;
  /** By default it inherits it from the surface that wraps it. */
  surface?: Surface;
};

export function SearchBar({
  facets,
  model,
  criteria,
  onCriteriaChange,
  placeholder,
  filters,
  grouping,
  onOpenGroup,
  favorites,
  onFilterSelect,
  onFavoriteSelect,
  onOpenBuilder,
  literal,
  trailing,
  collapseAfter,
  surface,
}: SearchBarProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(false);
  /** The step the question being written is at: no field, with a field, or
   *  with a field and operator. */
  const [step, setStep] = useState<{ field?: QueryField; op?: string }>({});
  /** Which of the offered is marked. It starts on the first, which is the one
   *  Enter takes without going down even once. */
  const [active, setActive] = useState(0);
  /**
   * The OPEN group: where the next thing written lands.
   *
   * `null` is «at the end of the list», which is the normal case. It is opened with `#and` and
   * closed with Escape or by choosing another — a group that cannot be closed is a
   * trap in which everything written afterwards ends up inside without anybody
   * having asked for it.
   */
  const [openGroup, setOpenGroup] = useState<CriteriaPath | null>(null);

  /* Which node is open is DERIVED from the path and the tree, and is not stored
     apart: stored, the day somebody changes its conjunction from the chip
     there are two truths about the same thing. */
  const openNode = openGroup === null ? undefined : at(criteria, openGroup);
  const openJoin = openNode?.kind === "join" ? openNode.join : undefined;

  /**
   * Close the open node: what follows lands outside again.
   *
   * If it was left EMPTY it is removed. Opening it and putting nothing leaves a bracket that does not
   * group anything, and somebody would have to discover that it is removed with the × of a
   * chip that says nothing inside.
   */
  function closeGroup() {
    if (openGroup !== null && openNode?.kind === "join" && openNode.of.length === 0) {
      onCriteriaChange(removeAt(criteria, openGroup));
    }
    setOpenGroup(null);
    input.current?.focus();
  }

  /* How many things are set, for the funnel's number. The ones on TOP are counted and not the leaves:
     «three» has to be what is seen in the bar, and what
     is seen is a group, not its two conditions. */
  const puestos = criteria.length;
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const toolsButton = useRef<HTMLButtonElement>(null);
  const panelBox = useRef<HTMLDivElement>(null);
  const id = useId();
  /* The suggestions are the input's popup (the ARIA combobox pattern): the input keeps the
     focus and says which list it controls and which option is the active one, so a screen
     reader announces «Nombre del cliente · contiene Globex» as the option it is. */
  const listId = useId();
  const optionId = (at: number) => `${listId}-${at}`;

  /**
   * The fields that can be asked about.
   *
   * With a model, they come from it with their type, their operators and their relations —and
   * then the bar knows that «total» accepts «menor que» and «estado» only
   * three values. Without a model, a facet is a text field and nothing more: it is
   * exactly what a list could declare until now, drawn through the
   * same path. Two paths would be two bars.
   */
  const fields: readonly QueryField[] =
    model === undefined
      ? facets.map((facet) => ({
          field: facet.id,
          label: facet.label,
          kind: "text" as const,
          /* The three that can be asked of a text without knowing anything more about
             it. With only one —«contiene»— the comparison step offered a
             button and nothing to choose, which is worse than not having the step. A model
             publishes its own and these are not used. */
          ops: ["like", "=", "!="],
        }))
      : queryFields(model, copy.locale);

  /* What is marked goes back to the first when what is offered changes: leaving the mark on the
     fourth row while you keep writing makes Enter take something that is no
     longer what the screen says. */
  const suggestions = suggest(
    {
      ...(step.field === undefined ? {} : { field: step.field }),
      ...(step.op === undefined ? {} : { op: step.op }),
      text,
    },
    fields,
    { literal: literal !== undefined },
  );

  /* What was typed, already read: needed here to know whether an
     ATTRIBUTE is being chosen —what starts with `#`— and to draw chips instead of rows. */
  const asked = readTyped(text);
  /* It opens when there is something to offer AND somebody has started: typing, or
     choosing a field, which is already having started. */
  const open = suggestions.length > 0 && (text.trim() !== "" || step.field !== undefined);

  /* CHIPS are chosen when what is chosen is an attribute or a comparison, and
     rows when what is chosen is a whole question. */
  const asTags =
    asked.attribute === true || (step.field !== undefined && step.op === undefined);

  const shown = suggestions.map((one) => one.id).join("\u0000");
  useEffect(() => {
    setActive(0);
  }, [shown]);

  /** A column with no options is not a column: the trigger would appear and the
   *  panel would open blank. Passing `[]` is what whoever has a list that
   *  declares no cut does, and it has to read the same as passing nothing. */
  const withOptions = (groups: readonly MenuGroup[]): boolean =>
    groups.some((group) => group.options.length > 0);

  const columns: Column[] = [
    ...(filters === undefined || !withOptions(filters)
      ? []
      : [{ title: copy.search.filters, groups: filters, onSelect: onFilterSelect }]),
    ...(grouping === undefined ? [] : [{ title: copy.search.groupBy, content: grouping }]),
    ...(favorites === undefined || !withOptions(favorites)
      ? []
      : [{ title: copy.search.favorites, groups: favorites, onSelect: onFavoriteSelect }]),
  ];

  /* THE PANEL IS A LAYER, and Escape closes the layer on top — only that one.

     It listened for Escape and for a click outside on `document`, without stopping either.
     Inside a dialog —the «Buscar más…» chooser, a composer modal— the dialog (React Aria's
     `ModalOverlay`, which answers inside the React tree) closed FIRST, then the panel: whoever
     pressed Escape to put the panel away lost the chooser. React Aria did not know the panel
     sat on top of the dialog. Now it does: `useOverlay` puts the panel on React Aria's stack
     of layers, the same one a `Select` or a `Picker` popover is on, so Escape and a press
     outside close the top layer and leave the dialog open. A press inside the bar is not
     «outside» (the button toggles, the input keeps typing). */
  const closePanel = () => {
    /* The focus goes back to the button that opened it — but only if it was inside the panel
       (Escape): a press elsewhere already put it where the person wanted. */
    const hadFocus = panelBox.current?.contains(document.activeElement) === true;
    setPanel(false);
    if (hadFocus) toolsButton.current?.focus();
  };
  const { overlayProps } = useOverlay(
    {
      isOpen: panel,
      onClose: closePanel,
      isDismissable: true,
      shouldCloseOnInteractOutside: (element) => box.current?.contains(element) !== true,
    },
    panelBox,
  );
  /* With the focus still in the bar (the input, the button) and the panel open, Escape is
     the panel's too — used up the same way, so it does not reach the dialog either. With the
     panel closed, Escape is not the bar's and goes on to whoever owns it. */
  const closePanelOnEscape = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || !panel || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    setPanel(false);
    toolsButton.current?.focus();
  };

  /**
   * A WHOLE QUESTION enters as an instance, and the bar goes back to the start.
   *
   * It lands inside the OPEN group if there is one —what `#and` does— and at the end of
   * the list if not. It is the only thing the bar decides about where things go:
   * the rest is decided by whoever has the list.
   */
  /** A finished instance, where the next one goes: the end, or the group left open. */
  function put(one: SearchCriteria) {
    onCriteriaChange(
      openGroup === null
        ? [...criteria, one]
        : replaceAt(criteria, openGroup, addTo(at(criteria, openGroup), one)),
    );
    setText("");
    setStep({});
    input.current?.focus();
  }

  function commit(field: QueryField, op: string, value: string) {
    const one = filterCriteria(
      /* The one that takes no value travels with `true`, which is what the engine expects of
         «está vacío»: sending it the empty string would be asking for the field that
         is "". */
      { field: field.field, operator: op, value: withoutValue(op) ? true : value },
      describeCondition(field, op, value),
    );
    put(one);
  }

  /** What was chosen in the dropdown, depending on what kind it is. */
  function pick(suggestion: QuerySuggestion) {
    if (suggestion.kind === "field") {
      setStep({ field: suggestion.field });
      setText("");
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "op") {
      setStep((current) => ({ ...current, op: suggestion.op }));
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "group") {
      /* Opening a group is putting an EMPTY node and remembering that what comes lands
         inside. Empty and not with the previous stuff forced in: whoever writes
         `#and` is saying «what follows goes together», not «group what I already
         put». */
      const node: SearchCriteria = {
        id: criteriaId("n"),
        kind: "join",
        join: suggestion.join,
        of: [],
      };
      onCriteriaChange([...criteria, node]);
      setOpenGroup([criteria.length]);
      onOpenGroup?.(suggestion.join);
      setText("");
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "literal") {
      const selection = literal?.(suggestion.text) ?? null;
      if (selection !== null)
        put(
          filterCriteria(
            selection,
            fillCopy(copy.search.literalChip, { text: suggestion.text }),
          ),
        );
      return;
    }
    commit(suggestion.field, suggestion.op, suggestion.value);
  }

  /** The node with one more instance inside. */
  function addTo(node: SearchCriteria | undefined, one: SearchCriteria): SearchCriteria {
    return node === undefined || node.kind !== "join"
      ? one
      : { ...node, of: [...node.of, one] };
  }

  return (
    <div
      ref={box}
      onKeyDown={closePanelOnEscape}
      /* `min-w-48`: placed in a flex row without a width, the bar used to collapse to its
         narrowest and the input slid UNDER the filters button («bu⊞car»). 12rem is the
         magnifier, a word of input and the buttons; a narrower container scrolls, it does
         not stack controls on top of each other. */
      className="relative flex min-w-48 items-center gap-2"
    >
      {/* Three columns: the magnifier, what is set plus the input (the only part that wraps),
          and the buttons. The two ends sit on the FIRST line: when the middle wraps they
          stay where the eye starts reading, instead of floating to its middle. */}
      <div
        className={`@container/bar flex min-h-(--size-control-md) w-full min-w-0 items-start rounded-box border transition-colors duration-(--duration-instant) ${bySurface(
          sup,
          "border-line-strong bg-surface focus-within:border-primary/60",
          /* On the chrome what defines the field is the BORDER, not the fill. The
             blue is already almost black, so sinking it gives no contrast (1.05:1) and
             raising it gives 1.21:1 — in both cases the field does not read as a
             field, which was «it does not draw attention». Ink at 45 % is the first
             border that passes 3:1 against the fill AND against the chrome, which is what
             1.4.11 asks of a control. */
          "border-chrome-ink/45 bg-chrome-ink/8 focus-within:border-chrome-link",
        )}`}
      >
        <span className="mt-0.75 flex h-7 shrink-0 items-center pr-1.5 pl-2.5">
          <Search
            className="size-(--size-icon-md) shrink-0 text-muted"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        {/* `min-w-24`: the input's own minimum. Below it the input overflowed this column
            and was drawn under the buttons of the next one. */}
        <div className="flex min-w-24 flex-1 flex-wrap items-center gap-1 py-0.75">
          {/* WHAT IS SET. A single piece for both kinds: the group ones on the
              left, chained; the filter ones after, with their nesting and their
              touchable conjunction. Everything opens the builder standing on what was
              touched — see `CriteriaChips`. */}
          <CriteriaChips
            criteria={criteria}
            surface={sup}
            {...(openGroup === null ? {} : { open: openGroup })}
            {...(onOpenBuilder === undefined ? {} : { onOpen: onOpenBuilder })}
            {...(collapseAfter === undefined ? {} : { collapseAfter })}
            onRemoveMany={(paths) => {
              /* From the deepest index up, so each removal leaves the next path valid. */
              const sorted = [...paths].sort((a, b) => (b[0] ?? 0) - (a[0] ?? 0));
              onCriteriaChange(
                sorted.reduce<SearchCriteria[]>(
                  (left, path) => removeAt(left, path),
                  [...criteria],
                ),
              );
            }}
            onJoin={(path, join) => {
              const node = at(criteria, path);
              if (node?.kind !== "join") return;
              onCriteriaChange(replaceAt(criteria, path, { ...node, join }));
            }}
            onRemove={(path) => {
              onCriteriaChange(removeAt(criteria, path));
              /* If what was removed was the open group, it stops being so: writing
                 inside something that no longer exists is writing into the air. */
              if (openGroup !== null && path.join(".") === openGroup.join(".")) {
                setOpenGroup(null);
              }
            }}
          />

          {/* THE DRAFT, in the bar and not in the dropdown.
              
              While it is being built, the question is seen where it will end up: the chosen field
              and the chosen comparison are chips in here, in front of
              what is being written. The dropdown only OFFERS — if it also
              said which step you are on, the state would live in two places and the
              one that disappears on clicking outside would take half with it.

              Each chip of the draft is removed and chosen again: the field's
              × returns to step 1, the comparison's to step 2. */}
          <Tags
            surface={sup}
            items={[
              /* INSIDE WHAT is being written, first: it is what wraps
                 the rest of the draft, and it is the only chip that is removed to
                 CLOSE rather than to undo a step. Without it, `#and` opened
                 a group and the only thing that said so was that the next question
                 appeared in a place nobody chose by looking. */
              ...(openJoin === undefined
                ? []
                : [
                    {
                      id: "draft-group",
                      label: copy.search.joins[openJoin === "not" ? "none" : openJoin],
                      icon: CornerDownRight,
                      selected: true,
                      onRemove: closeGroup,
                      removeLabel: copy.search.closeGroup,
                    },
                  ]),
              ...(step.field === undefined
                ? []
                : [
                    {
                      id: "draft-field",
                      label: step.field.label,
                      ...(step.field.through === undefined
                        ? {}
                        : { note: step.field.through }),
                      selected: true,
                      onRemove: () => {
                        setStep({});
                        input.current?.focus();
                      },
                      removeLabel: copy.search.dropField,
                    },
                  ]),
              ...(step.field === undefined || step.op === undefined
                ? []
                : [
                    {
                      id: "draft-op",
                      label: opLabel(step.op),
                      note: step.op,
                      selected: true,
                      onRemove: () => {
                        setStep({ field: step.field });
                        input.current?.focus();
                      },
                      removeLabel: copy.search.dropOp,
                    },
                  ]),
            ]}
          />

          <input
            ref={input}
            /* Named even when a placeholder shows: a placeholder is not a label, and once
               chips are set there is none at all. */
            aria-label={copy.choice.search}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            {...(open ? { "aria-controls": listId } : {})}
            {...(open && !asTags && suggestions[active] !== undefined
              ? { "aria-activedescendant": optionId(active) }
              : {})}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              /* Backspace with the field empty removes the LAST instance: the gesture
                 that already exists in any chip field and the only one that is
                 discovered without anybody explaining it. The last and not the last of
                 its kind — now they are a single list, so there is no order of
                 preference to remember. */
              if (e.key === "Backspace" && text === "") {
                if (criteria.length > 0) {
                  onCriteriaChange(removeAt(criteria, [criteria.length - 1]));
                }
                return;
              }
              /* The arrows TRAVERSE what is offered and Enter takes what is
                 marked. Without this, typing «#nom» and going down did nothing: the
                 list was seen and could not be touched without the mouse, which is
                 precisely what a search bar cannot ask for. */
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                if (suggestions.length === 0) return;
                e.preventDefault();
                setActive((current) => {
                  const next = e.key === "ArrowDown" ? current + 1 : current - 1;
                  /* It wraps around: with five fields, going down six times returns to the
                     first instead of getting stuck on the last. */
                  return (next + suggestions.length) % suggestions.length;
                });
                return;
              }
              /* Enter takes what is MARKED, which starts out being the first — and the
                 first is the most likely: with «test» the first text field,
                 with «<= 100» the only one that can answer it. */
              if (e.key === "Enter") {
                e.preventDefault();
                const chosen = suggestions[active] ?? suggestions[0];
                if (chosen !== undefined) pick(chosen);
              }
              /* Escape UNDOES, one step at a time and always the last: first what is
                 written, then the comparison, then the field. Whoever
                 got the field wrong wants to change it, not start over — and
                 whoever is not building anything does not expect anything to happen.

                 Before, it only dismantled the step when a field had already been chosen,
                 so with «vent» half-written it did nothing: the key that
                 everybody presses to undo did not undo. */
              if (e.key === "Escape") {
                if (text !== "") {
                  e.preventDefault();
                  e.stopPropagation();
                  setText("");
                  return;
                }
                if (step.op !== undefined) {
                  e.preventDefault();
                  e.stopPropagation();
                  setStep({ field: step.field });
                  return;
                }
                if (step.field !== undefined) {
                  e.preventDefault();
                  e.stopPropagation();
                  setStep({});
                  return;
                }
                /* And at the end, the group: the last thing opened is the last thing
                   undone. */
                if (openGroup !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  closeGroup();
                }
                return;
              }
            }}
            placeholder={
              step.field !== undefined
                ? copy.search.typeValue
                : criteria.length === 0
                  ? (placeholder ?? copy.search.placeholder)
                  : ""
            }
            /* WITH A FIELD CHOSEN, what is written is the VALUE — and it is drawn
               as the chip it will become, behind the other two. It is not an
               ornament: the draft is read whole —«nombre · contiene · vent▌»—
               before existing as a cut, so you see what it will end up as
               before it ends up. And it is still the input: nothing is duplicated, and
               nothing becomes a filter until somebody presses Enter or
               chooses from the list.

               The width is asked for by the CONTENT —`field-sizing`— so the chip
               grows with what is written instead of reserving an empty band. Where it
               is not available, the input stretches as always. */
            style={step.field === undefined ? undefined : { fieldSizing: "content" }}
            className={
              step.field === undefined
                ? `h-7 ${criteria.length === 0 ? "min-w-24" : "min-w-16"} flex-1 bg-transparent text-meta outline-none ${bySurface(sup, "text-ink placeholder:text-muted", "text-chrome-ink placeholder:text-chrome-muted")}`
                : `min-w-16 rounded-pill px-2 py-0.5 text-micro outline-none ${bySurface(
                    sup,
                    "bg-accent/18 text-ink placeholder:text-muted",
                    "bg-chrome-link/20 text-chrome-ink placeholder:text-chrome-muted",
                  )}`
            }
          />
        </div>

        {puestos === 0 ? null : (
          <button
            type="button"
            onClick={() => {
              onCriteriaChange([]);
              setOpenGroup(null);
              input.current?.focus();
            }}
            aria-label={copy.search.clearAll}
            title={copy.search.clearAll}
            className={`my-0.5 inline-flex h-(--size-control-sm) shrink-0 items-center rounded-control px-1.5 transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              sup,
              "text-muted hover:bg-ink/5 hover:text-ink",
              "text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
            )}`}
          >
            <X className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
          </button>
        )}

        {columns.length === 0 && onOpenBuilder === undefined ? null : (
          <button
            ref={toolsButton}
            type="button"
            onClick={() => setPanel((v) => !v)}
            aria-expanded={panel}
            aria-controls={panel ? id : undefined}
            /* Named on purpose, not by its content: once something is set the count is
               the only text inside, and it became the whole name — «1» instead of what
               the button opens. The count stays IN the name because it is what shows. */
            aria-label={
              puestos === 0
                ? copy.search.tools
                : fillCopy(
                    puestos === 1 ? copy.search.toolsSetOne : copy.search.toolsSetMany,
                    {
                      label: copy.search.tools,
                      count: puestos.toLocaleString(copy.locale),
                    },
                  )
            }
            title={copy.search.tools}
            className={`my-0.5 mr-0.5 inline-flex h-(--size-control-sm) shrink-0 items-center gap-1 rounded-control border px-2 text-micro transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              puestos > 0 || panel
                ? bySurface(
                    sup,
                    "border-accent/40 bg-accent/18 text-ink",
                    "border-chrome-link/35 bg-chrome-link/15 text-chrome-link",
                  )
                : bySurface(
                    sup,
                    "border-transparent text-muted hover:bg-ink/5 hover:text-ink",
                    "border-transparent text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
                  )
            }`}
          >
            <ListFilter className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
            {puestos > 0 ? <span className="text-micro tabular-nums">{puestos}</span> : null}
          </button>
        )}
      </div>

      {trailing}

      {/* WHAT IS OFFERED, and nothing more.
          
          The dropdown does not say which step you are on: that is already seen in the bar,
          in chips, where it will end up. Here there are only the options — and the shape
          is decided by what is being chosen, because choosing between chips and choosing
          between rows are not the same gesture.

              atributos       chips, because it is what will end up set
              comparaciones   chips in a small box: they are three symbols
              preguntas       «campo: valor» rows, as they will end up */}
      {open ? (
        <div
          className={`absolute top-full z-30 mt-1 overflow-hidden rounded-panel border border-line-strong bg-surface shadow-float ${
            asTags ? "left-0 w-max max-w-full" : "right-0 left-0"
          }`}
        >
          {/* WHERE WHAT IS CHOSEN WILL LAND. It goes above what is offered because it is
              the condition for everything below: the same question chosen lands in
              a different place depending on whether there is an open node or not. */}
          {openJoin === undefined ? null : (
            <div className="flex items-center gap-1.5 border-line border-b px-3 py-1.5 text-micro text-muted">
              <CornerDownRight className="size-3 shrink-0" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate">{copy.search.landsHere}</span>
              <span className="shrink-0 rounded-pill border border-accent/40 bg-accent/18 px-1.5 text-ink">
                {copy.search.joins[openJoin === "not" ? "none" : openJoin]}
              </span>
            </div>
          )}
          {asTags ? (
            /* A LIST, not a strip. You are CHOOSING: the eye goes down a
               column and so does the keyboard. Twelve attributes folded into three
               rows are twelve things to sweep in zigzag to find one. */
            <div id={listId} className="max-h-72 overflow-y-auto p-1">
              <Tags
                stack
                surface="canvas"
                label={
                  step.field !== undefined ? copy.search.askOp : copy.search.askAttribute
                }
                items={suggestions.map((one, at) => ({
                  id: one.id,
                  label: one.label,
                  ...(one.kind === "op"
                    ? { note: one.op }
                    : one.kind === "field" && one.hint !== undefined
                      ? { note: one.hint }
                      : {}),
                  active: at === active,
                  onSelect: () => pick(one),
                }))}
              />
            </div>
          ) : (
            <div
              id={listId}
              role="listbox"
              aria-label={copy.search.suggestions}
              className="p-1"
            >
              {suggestions.map((one, at) => (
                <div
                  key={one.id}
                  id={optionId(at)}
                  role="option"
                  aria-selected={at === active}
                  /* The input keeps the focus: pressing an option must not take it. */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(one)}
                  onMouseEnter={() => setActive(at)}
                  className={`flex w-full cursor-pointer items-baseline gap-1.5 rounded-control px-2 py-1.5 text-left text-meta transition-colors duration-(--duration-instant) ${
                    at === active ? "bg-primary/8" : "hover:bg-ink/4"
                  }`}
                >
                  <span className="shrink-0 font-medium text-ink">{one.label}</span>
                  {one.kind === "condition" || one.kind === "literal" ? (
                    <>
                      <span className="shrink-0 text-muted">:</span>
                      <span className="min-w-0 truncate font-mono text-micro text-ink">
                        {one.hint}
                      </span>
                    </>
                  ) : one.kind === "field" && one.hint !== undefined ? (
                    <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro text-muted">
                      {one.hint}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* The cuts panel. On a wide screen the three columns are seen at
          once —which is exactly the point: building a cut without opening three things—;
          on a narrow one they stack by themselves and it ends up looking like a popover,
          which is exactly what is needed on a phone. */}
      {panel && (columns.length > 0 || onOpenBuilder !== undefined) ? (
        <div
          {...overlayProps}
          ref={panelBox}
          id={id}
          className="absolute top-full right-0 z-30 mt-1 flex w-max max-w-full flex-wrap overflow-hidden rounded-panel border border-line-strong bg-surface shadow-float"
        >
          {columns.map((c, i) => (
            <div
              key={c.title}
              className={`flex min-w-48 flex-1 flex-col ${
                i === 0 ? "" : "border-t border-line sm:border-t-0 sm:border-l"
              }`}
            >
              {/* The title is a band of the column, not a label with its own
                  padding inside another padding. Both columns start the
                  content at the same height. */}
              <div className="border-b border-line px-2.5 py-1.5 text-micro font-medium text-muted">
                {c.title}
              </div>
              <div className="flex flex-col gap-0.5 p-1">
                {c.content ??
                  c.groups?.map((g, gi) => (
                    <Group
                      key={g.label ?? gi}
                      group={g}
                      first={gi === 0}
                      onSelect={c.onSelect}
                    />
                  ))}
              </div>
            </div>
          ))}

          {/* THE DOOR TO THE BUILDER, below and across the width of the three columns.
              
              The columns above are the questions somebody ALREADY THOUGHT OF —the named
              filters, a date's cuts, the favourites— and this one
              is the door to the ones nobody thought of. It goes outside them because it
              is not a cut that gets ticked: it is another screen.

              It was hidden as one more option inside the filters
              column, or simply was not there, and so the builder that
              exists could not be opened from the only place where somebody
              looked for it. */}
          {onOpenBuilder === undefined ? null : (
            <div className="w-full border-t border-line p-1">
              <button
                type="button"
                onClick={() => {
                  onOpenBuilder();
                  setPanel(false);
                }}
                className="flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left text-meta text-ink transition-colors duration-(--duration-instant) hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                <SlidersHorizontal className="size-(--size-icon-sm)" strokeWidth={2} />
                {copy.search.openBuilder}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
