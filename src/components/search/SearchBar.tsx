"use client";

import { useSearchSettings } from "@sincpro/web-ui/components/search/context";
import {
  at,
  type BuiltCondition,
  type BuiltFilter,
  criteriaId,
  type CriteriaJoin,
  type CriteriaPath,
  facetPaths,
  filterCriteria,
  type RecordOption,
  type Removal,
  removeAt,
  replaceAt,
  restoreRemoval,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { CriteriaChips } from "@sincpro/web-ui/components/search/CriteriaChips";
import type { ModelDefinition } from "@sincpro/web-ui/components/search/model";
import {
  chipParts,
  choiceValues,
  conditionCriteria,
  fieldKey,
  opLabel,
  type QueryField,
  queryFields,
  type QueryKind,
  type QuerySuggestion,
  readTyped,
  suggest,
  valuesCriteria,
  withoutValue,
  withValue,
} from "@sincpro/web-ui/components/search/query";
import type { BrowseRecords, SearchRecords } from "@sincpro/web-ui/components/search/records";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { keysLabel } from "@sincpro/web-ui/foundations/keys";
import { useKeyboardPlatform } from "@sincpro/web-ui/foundations/shortcut";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { CheckMark } from "@sincpro/web-ui/primitives/field/Checks";
import type { MenuGroup, MenuOption } from "@sincpro/web-ui/primitives/menu/Menu";
import { useToastIfAny } from "@sincpro/web-ui/primitives/notice/Toast";
import { MatchedText } from "@sincpro/web-ui/primitives/picker/MatchedText";
import { Count } from "@sincpro/web-ui/primitives/tag/Count";
import { chosenTone } from "@sincpro/web-ui/primitives/tag/Tag";
import { Tags } from "@sincpro/web-ui/primitives/tag/Tags";
import {
  CalendarDays,
  ChevronRight,
  CornerDownRight,
  Hash,
  History,
  Layers,
  Link2,
  List,
  ListFilter,
  type LucideIcon,
  Search,
  SlidersHorizontal,
  Star,
  ToggleLeft,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { mergeProps, Overlay, useOverlay, useOverlayPosition } from "react-aria";

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
 *
 *  ── A relation is asked by its RECORDS ──────────────────────────────
 *
 *  What Odoo does right: «andres» offers «Search Contact for: andres ▸», and the ▸ unfolds
 *  the contacts that match. A many2one compared through its foreign key cannot answer a
 *  text, and «contiene andres» would also take the second Andrés: choosing ONE filters by
 *  that record. With `searchRecords` (the application's, see `records.ts`) a relation's row
 *  unfolds —▸ or →— into its records, an enum's into its words, and values of the same field
 *  land in one chip. Under everything offered, «Búsqueda avanzada…»: whoever typed what the
 *  bar cannot write is looking at this list when they find out.
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
  /** Said once beside the title, so the three columns are told apart before they are read. */
  icon: LucideIcon;
  groups?: readonly MenuGroup[];
  /** Its options are cuts, on or off — the filters. Otherwise they are actions (a favourite
   *  is applied, not ticked) and carry their own icon. */
  checks?: boolean;
  content?: ReactNode;
  onSelect?: (id: string) => void;
}

/** What kind of field a row asks about, at a glance: its icon. */
const KIND_ICON: Record<QueryKind, LucideIcon> = {
  text: Type,
  number: Hash,
  date: CalendarDays,
  boolean: ToggleLeft,
  choice: List,
  relation: Link2,
};

/** How long the bar waits for the typing to stop before searching records: every key would
 *  be a request, and the answer to «a», «an», «and» is thrown away anyway. */
const RECORDS_DELAY = 200;

/**
 * A row of the dropdown: what `suggest` offers, the values a row unfolded into, and the rows
 * that are not a question — a status while records are searched, «Buscar más…», the way into
 * the builder.
 */
type Item =
  | {
      kind: "suggestion";
      id: string;
      suggestion: QuerySuggestion;
      child?: true;
      query?: string;
    }
  | { kind: "status"; id: string; text: string; child?: true }
  | { kind: "more"; id: string; field: QueryField; text: string; child?: true }
  | { kind: "advanced"; id: string }
  /* What the empty bar offers: a title over a block, and a search done lately. */
  | { kind: "heading"; id: string; text: string }
  | { kind: "recent"; id: string; criteria: Extract<SearchCriteria, { kind: "filter" }> };

/** How many searches the bar remembers. Five is what fits above the fields without pushing them
 *  out of sight, and past five a «recent» is a history nobody reads. */
const RECENT_MAX = 5;

/** A column of the panel longer than this gets a box to narrow it — and the keyboard a letter. */
const FIND_AFTER = 8;

/** Two words are the same for the eye whatever their case and accents: «Fecha» is «fecha». */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** A search remembered in the browser, read back only if it still has the shape of one. */
function recentFromStorage(
  raw: string | null,
): Extract<SearchCriteria, { kind: "filter" }>[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (one): one is Extract<SearchCriteria, { kind: "filter" }> =>
        typeof one === "object" &&
        one !== null &&
        (one as { kind?: unknown }).kind === "filter" &&
        typeof (one as { id?: unknown }).id === "string" &&
        typeof (one as { label?: unknown }).label === "string",
    )
    .slice(0, RECENT_MAX);
}

/* «/» goes to the search — GitHub's key, Gmail's, Linear's. With several bars on screen (a
   reconciliation's panes, a chooser over a list) the last mounted that is SEEN answers, the
   way shortcuts stack. Its own listener and not `useShortcuts`: on a Spanish keyboard «/» is
   Shift+7, and a combination there matches its modifiers exactly. */
const slashBars: { current: HTMLInputElement | null }[] = [];

function typingIn(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

function onSlash(event: KeyboardEvent) {
  if (
    event.key !== "/" ||
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    typingIn(event.target)
  )
    return;
  for (let at = slashBars.length - 1; at >= 0; at--) {
    const field = slashBars[at]!.current;
    /* Seen and not behind a modal: a bar under an open dialog is not where «/» should land. */
    if (
      field !== null &&
      field.getClientRects().length > 0 &&
      field.closest("[aria-hidden='true'], [inert]") === null
    ) {
      event.preventDefault();
      field.focus();
      return;
    }
  }
}

/** The records found for a relation: for which search (`key`) and of which field. */
type Found = {
  key: string;
  field: string;
  status: "loading" | "ready" | "failed";
  options: readonly RecordOption[];
};

/** A row the keyboard and the pointer stop on — every one but a status. */
function selectable(item: Item): boolean {
  return item.kind !== "status" && item.kind !== "heading";
}

/** A row that opens what is under it with → (or its ▸). */
function unfoldable(item: Item | undefined): boolean {
  if (item?.kind !== "suggestion" || item.child === true) return false;
  const one = item.suggestion;
  return one.kind === "unfold" || (one.kind === "condition" && one.unfolds === true);
}

/** The keys of the dropdown, each drawn as a key beside its word. */
function KeysHint({ keys }: { keys: readonly (readonly [readonly string[], string])[] }) {
  return (
    <p
      data-ui="search.keys"
      className="hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-1.5 text-micro text-muted sm:flex"
    >
      {keys.map(([caps, word]) => (
        <span key={word} className="inline-flex items-center gap-1">
          {caps.map((cap) => (
            <kbd
              key={cap}
              className="inline-flex min-w-5 items-center justify-center rounded-control border border-line bg-surface px-1 font-mono text-micro leading-tight text-ink"
            >
              {cap}
            </kbd>
          ))}
          <span>{word}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * What one row of the dropdown says. The row around it —its role, its mark, what pressing it
 * does— is the bar's; this is only its content, so every kind reads the same way:
 *
 *     ▢ Cliente : contiene andres           ▸     a question; ▸ opens its records
 *     ▢ Etiquetas  con «urg»                ▸     a field asked only by its values
 *         Andrés Pérez               1028457      a value under its row
 *         Buscar más…
 *     ⚙ Búsqueda avanzada…
 */
function SuggestionRow({
  item,
  open,
  onToggle,
  renderRecord,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
  renderRecord?: SearchBarProps["renderRecord"];
}) {
  const copy = useUiCopy();
  const indent = "ml-6 border-l border-line pl-2.5";

  if (item.kind === "status") {
    return (
      <span
        className={`min-w-0 truncate text-micro text-muted ${item.child === true ? indent : ""}`}
      >
        {item.text}
      </span>
    );
  }
  if (item.kind === "more") {
    return (
      <span
        className={`flex min-w-0 items-center gap-1.5 font-medium text-primary ${item.child === true ? indent : ""}`}
      >
        <Search className="size-(--size-icon-sm) shrink-0" strokeWidth={2} aria-hidden />
        {copy.search.moreRecords}
      </span>
    );
  }
  if (item.kind === "advanced") {
    return (
      <span className="-mx-2 -my-1.5 flex w-full min-w-0 items-center gap-2 border-t border-line px-2 pt-2 pb-1.5 font-medium text-primary">
        <SlidersHorizontal
          className="size-(--size-icon-sm) shrink-0"
          strokeWidth={2}
          aria-hidden
        />
        {copy.search.advanced}
      </span>
    );
  }

  if (item.kind === "heading") {
    return (
      <span className="min-w-0 truncate text-micro font-medium text-muted">{item.text}</span>
    );
  }
  if (item.kind === "recent") {
    return (
      <>
        <History
          className="size-(--size-icon-sm) shrink-0 text-muted"
          strokeWidth={2}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-ink">{item.criteria.label}</span>
      </>
    );
  }

  const one = item.suggestion;
  /* A VALUE under its row: the record's name with what was typed marked —it says why it is
     listed—, and what tells two of the same name apart on the right. */
  if (one.kind === "value" && item.child === true) {
    const query = item.query ?? "";
    return (
      <span className={`flex min-w-0 flex-1 items-baseline gap-2 ${indent}`}>
        {renderRecord !== undefined ? (
          renderRecord(one.option, { field: one.field, query })
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-ink">
              <MatchedText text={one.option.name} query={query} />
            </span>
            {one.option.meta === undefined ? null : (
              <span className="shrink-0 text-micro text-muted tabular-nums">
                {one.option.meta}
              </span>
            )}
          </>
        )}
      </span>
    );
  }

  const Icon =
    one.kind === "literal"
      ? Search
      : one.kind === "condition" ||
          one.kind === "unfold" ||
          one.kind === "value" ||
          one.kind === "field"
        ? KIND_ICON[one.field.kind]
        : undefined;
  const opens = one.kind === "unfold" || (one.kind === "condition" && one.unfolds === true);

  return (
    <>
      {Icon === undefined ? null : (
        <Icon
          className="size-(--size-icon-sm) shrink-0 text-muted"
          strokeWidth={2}
          aria-hidden
        />
      )}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="shrink-0 font-medium text-ink">{one.label}</span>
        {one.kind === "condition" || one.kind === "literal" || one.kind === "value" ? (
          one.hint === "" ? null : (
            <>
              <span className="shrink-0 text-muted">:</span>
              <span className="min-w-0 truncate font-mono text-micro text-ink">
                {one.hint}
              </span>
            </>
          )
        ) : one.kind === "unfold" ? (
          <span className="min-w-0 truncate text-micro text-muted">
            {fillCopy(copy.search.unfoldHint, { text: one.hint })}
          </span>
        ) : one.kind === "field" && one.hint !== undefined ? (
          <span className="inline-flex shrink-0 items-center rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro text-muted">
            {one.hint}
          </span>
        ) : null}
      </span>
      {/* ▸ opens what is under the row, without choosing it. Not a button of its own: an
          option holds no control, and the keyboard has → for it. */}
      {!opens ? null : (
        <span
          aria-hidden
          title={open ? copy.search.fold : copy.search.unfold}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className="-my-1 -mr-1 inline-flex shrink-0 items-center rounded-control p-1 text-muted hover:bg-ink/6 hover:text-ink"
        >
          <ChevronRight
            className={`size-(--size-icon-sm) transition-transform duration-(--duration-instant) ${
              open ? "rotate-90" : ""
            }`}
            strokeWidth={2}
          />
        </span>
      )}
      {!opens ? null : (
        <span className="sr-only">{open ? copy.search.fold : copy.search.unfold}</span>
      )}
    </>
  );
}

function Option({
  o,
  checks,
  onSelect,
}: {
  o: MenuOption;
  checks: boolean;
  onSelect?: (id: string) => void;
}) {
  const Icon = o.icon;
  const toggles = checks || o.checked !== undefined;
  return (
    <button
      type="button"
      disabled={o.disabled}
      onClick={() => onSelect?.(o.id)}
      {...(toggles ? { "aria-pressed": o.checked === true } : {})}
      className="flex w-full items-start gap-2 rounded-ui-option px-1.5 py-1 text-left transition-colors duration-(--duration-instant) disabled:pointer-events-none disabled:opacity-45 hover:bg-ui-option-active"
    >
      {/* The mark column always exists: without it, ticking an option shifts all the text
          and the panel jumps, and an action's label starts under its column's title text.
          A cut is a MULTIPLE choice, so its mark is `Checkbox`'s box — a ring that turned
          into a dot read as a radio, one of many, the opposite of what the column does. */}
      <span className="mt-0.5 flex size-(--size-icon-sm) shrink-0 items-center justify-center">
        {toggles ? (
          <CheckMark on={o.checked === true} />
        ) : Icon === undefined ? null : (
          <Icon className="size-(--size-icon-sm) text-muted" strokeWidth={2} aria-hidden />
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
        {/* Two lines and not one: cut at one, «todavía no se enviaron al S…» hid the very
            word that said what the filter does. */}
        {o.hint === undefined ? null : (
          <span className="mt-0.5 line-clamp-2 text-micro text-muted" title={o.hint}>
            {o.hint}
          </span>
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
  checks,
  onSelect,
  forceOpen = false,
}: {
  group: MenuGroup;
  first: boolean;
  checks: boolean;
  onSelect?: (id: string) => void;
  /** The column is being searched: what matches is shown, folded or not. */
  forceOpen?: boolean;
}) {
  const active = group.options.some((o) => o.checked === true);
  const [unfolded, setOpen] = useState(active);
  const open = unfolded || forceOpen;

  const options = (
    <>
      {group.options.map((o) => (
        <Fragment key={o.id}>
          {o.divider === true ? <div className="my-1 h-px bg-line" role="separator" /> : null}
          <Option o={o} checks={checks} onSelect={onSelect} />
        </Fragment>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {first ? null : <div className="my-1 h-px bg-line" role="separator" />}
      {group.label === undefined ? null : group.collapsible !== true ? (
        /* The group's label goes in the TEXT column, not the edge one. The column's title
           is the step above (the section, with its icon); this one is a step down: the
           quiet size, and the same gap as the mark so that «mostrar sólo» starts where
           «traídos» starts. */
        <div className="flex items-center gap-2 px-1.5 pt-1 pb-0.5 text-micro text-muted">
          <span className="size-(--size-icon-sm) shrink-0" aria-hidden />
          {group.label}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-ui-option px-1.5 py-1 text-left transition-colors duration-(--duration-instant) hover:bg-ui-option-active"
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
            <Count value={group.options.filter((o) => o.checked === true).length} />
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
  /**
   * Searches the records of a relation — the application's, the SAME function the builder
   * takes (see `records.ts`). With it a relation's row unfolds (▸, or →) into the records that
   * match what was typed, and choosing one filters by THAT record, sent by its key and read by
   * its name: «Cliente: Andrés Pérez». A second one of the same relation lands in the same chip
   * — «… o Andrés Gutiérrez». A relation that cannot compare a text (its foreign key, a
   * many2many) is offered only this way; `#cliente` goes straight to its records.
   *
   * Absent, the one of the nearest `SearchProvider`.
   */
  searchRecords?: SearchRecords;
  /** «Buscar más…» under a relation's records: the application's chooser with the whole list
   *  —`List onChoose` with its own search bar—, on what was typed. What it answers lands in the
   *  relation's chip. Absent, the one of the nearest `SearchProvider`. */
  browseRecords?: BrowseRecords;
  /** How a record found reads in the dropdown — a face, a NIT, a balance —, for one that does
   *  not fit «name + meta». The row around it stays the bar's: keys, focus, choosing. */
  renderRecord?: (
    record: RecordOption,
    state: { field: QueryField; query: string },
  ) => ReactNode;
  /** What goes stuck to the field, on its right. */
  trailing?: ReactNode;
  /** How many facets the bar shows before folding the rest into «+N»; the grouping chain
   *  counts as one. On a narrow bar only the first shows. `Infinity` never folds. */
  collapseAfter?: number;
  /**
   * Under which name this bar remembers what was searched with it, in this browser: the last
   * five questions put, offered when the empty bar takes the focus («Recientes»). Give each
   * list its own — «facturas», «contactos». Without it, nothing is remembered.
   */
  recentKey?: string;
  /** «/» focuses the bar from anywhere on the page that is not a field (on by default). With
   *  several bars on screen the last one mounted answers. `false` leaves «/» to the page. */
  focusOnSlash?: boolean;
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
  searchRecords: ownSearchRecords,
  browseRecords: ownBrowseRecords,
  renderRecord,
  trailing,
  collapseAfter,
  recentKey,
  focusOnSlash = true,
  surface,
}: SearchBarProps) {
  const copy = useUiCopy();
  const sup = useSurface(surface);
  const platform = useKeyboardPlatform();
  const toasts = useToastIfAny();
  /* Its own, or the application's (`SearchProvider`): wired once for every bar. */
  const { searchRecords, browseRecords } = useSearchSettings({
    ...(ownSearchRecords === undefined ? {} : { searchRecords: ownSearchRecords }),
    ...(ownBrowseRecords === undefined ? {} : { browseRecords: ownBrowseRecords }),
  });
  const [text, setText] = useState("");
  const [panel, setPanel] = useState(false);
  /** The panel was opened from the keyboard (Alt+↓, or Enter on the funnel): its first option
   *  takes the focus, or the keys that opened it would have nothing to move through. */
  const panelFromKeys = useRef(false);
  /** What a long column of the panel is narrowed to, by the column's title. */
  const [find, setFind] = useState<Record<string, string>>({});
  /** The focus is somewhere in the bar. What is offered closes when it leaves: a dropdown that
   *  stays open over the list after a click elsewhere covers what the person went to look at. */
  const [focused, setFocused] = useState(false);
  /** The empty bar offers — recent searches, the fields — once it takes the focus, and stops
   *  after something is set or Escape, until the next time it is entered or ↓ asks again. */
  const [starter, setStarter] = useState(false);
  /** The piece marked from the keyboard, by its place in `facetPaths`. */
  const [marked, setMarked] = useState<number | null>(null);
  /** The piece whose value is being edited in place. */
  const [editing, setEditing] = useState<number | null>(null);
  /** The last removal, offered back in the bar when there is no notice stack to offer it. */
  const [undo, setUndo] = useState<Removal | null>(null);
  const lastRemoval = useRef<Removal | null>(null);
  const [recent, setRecent] = useState<
    readonly Extract<SearchCriteria, { kind: "filter" }>[]
  >([]);
  /** The step the question being written is at: no field, with a field, or
   *  with a field and operator. */
  const [step, setStep] = useState<{ field?: QueryField; op?: string }>({});
  /** Which of the offered is marked, by its id: `null` is the first, which is the one Enter
   *  takes without going down even once. By id and not by place, because records arriving
   *  under an unfolded row push the rows below them down. */
  const [activeId, setActiveId] = useState<string | null>(null);
  /** The row unfolded into its values — a relation's records, an enum's values. One at a time:
   *  two lists open are two places to look for the same thing. */
  const [unfolded, setUnfolded] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
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
  const pieces = facetPaths(criteria);
  /* The list as it is NOW, for an «undo» pressed in a notice long after it was offered: the
     notice keeps the closure of the moment it was shown. */
  const criteriaNow = useRef(criteria);
  useEffect(() => {
    criteriaNow.current = criteria;
  });
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

  const records = searchRecords !== undefined;
  const suggestions = suggest(
    {
      ...(step.field === undefined ? {} : { field: step.field }),
      ...(step.op === undefined ? {} : { op: step.op }),
      text,
    },
    fields,
    { literal: literal !== undefined, records },
  );

  /* What was typed, already read: needed here to know whether an
     ATTRIBUTE is being chosen —what starts with `#`— and to draw chips instead of rows. */
  const asked = readTyped(text);

  /* CHIPS are chosen when what is chosen is an attribute or a comparison, and
     rows when what is chosen is a whole question. */
  const asTags =
    asked.attribute === true || (step.field !== undefined && step.op === undefined);

  /* The unfolded row, while it is still offered: typing more keeps it open —«andr», «andres»
     narrow the same records— and a row that left the list takes its values with it. */
  const unfoldedRow = suggestions.find(
    (one): one is Extract<QuerySuggestion, { kind: "unfold" | "condition" }> =>
      one.id === unfolded &&
      (one.kind === "unfold" || (one.kind === "condition" && one.unfolds === true)),
  );
  /* Whose records are searched, and for what: the relation chosen with `#` (its records ARE
     the value step), or the relation row unfolded. */
  const searching: { field: QueryField; text: string; under?: string } | undefined = !records
    ? undefined
    : step.field?.relation !== undefined && step.op !== undefined
      ? { field: step.field, text: text.trim() }
      : unfoldedRow !== undefined && unfoldedRow.field.relation !== undefined
        ? {
            field: unfoldedRow.field,
            text: unfoldedRow.kind === "unfold" ? unfoldedRow.text : asked.value,
            under: unfoldedRow.id,
          }
        : undefined;
  const searchKey =
    searching === undefined ? "" : `${fieldKey(searching.field)}\u0000${searching.text}`;

  /* The records are ASKED, never filtered here: the application searches thousands where the
     bar would hold ten. A newer question cancels the one on its way (`signal`), and the
     records already shown stay while the next ones come — a list that empties on every key
     jumps under the hand. */
  useEffect(() => {
    if (searching === undefined || searchRecords === undefined) return;
    const relation = searching.field.relation;
    if (relation === undefined) return;
    const key = searchKey;
    const which = fieldKey(searching.field);
    const asking = searching.text;
    const controller = new AbortController();
    setFound((before) => ({
      key,
      field: which,
      status: "loading",
      options: before?.field === which ? before.options : [],
    }));
    const timer = window.setTimeout(() => {
      searchRecords({
        relation: relation.relation,
        path: [relation.name],
        text: asking,
        signal: controller.signal,
      }).then(
        (options) => {
          if (!controller.signal.aborted)
            setFound({ key, field: which, status: "ready", options: [...options] });
        },
        () => {
          if (!controller.signal.aborted)
            setFound({ key, field: which, status: "failed", options: [] });
        },
      );
    }, RECORDS_DELAY);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Asked again only when WHAT is searched changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  /** The records of the relation being searched, as rows: each one a value, then what the
   *  search says when there is nothing to list, then «Buscar más…». */
  function recordRows(field: QueryField, query: string, under?: string): Item[] {
    const which = fieldKey(field);
    const answer = found !== null && found.field === which ? found : null;
    const settled = answer !== null && answer.key === searchKey ? answer.status : "loading";
    const rows: Item[] = (answer?.options ?? []).map((option) => ({
      kind: "suggestion",
      id: `r:${which}:${option.id}`,
      suggestion: {
        kind: "value",
        id: `r:${which}:${option.id}`,
        label: option.name,
        hint: option.meta ?? "",
        field,
        option,
        ...(under === undefined ? {} : { under }),
      },
      ...(under === undefined ? {} : { child: true as const }),
      query,
    }));
    const nested = under === undefined ? {} : { child: true as const };
    const status =
      settled === "loading"
        ? copy.search.searchingRecords
        : settled === "failed"
          ? copy.search.recordsFailed
          : rows.length === 0
            ? copy.search.noRecords
            : undefined;
    if (status !== undefined)
      rows.push({ kind: "status", id: `s:${which}`, text: status, ...nested });
    if (browseRecords !== undefined) {
      rows.push({ kind: "more", id: `m:${which}`, field, text: query, ...nested });
    }
    return rows;
  }

  /** What an unfolded row opens into: a relation's records, or an enum's values. */
  function unfoldedRows(row: QuerySuggestion): Item[] {
    if (row.kind !== "unfold" && row.kind !== "condition") return [];
    const query = row.kind === "unfold" ? row.text : asked.value;
    if (row.field.relation !== undefined) return recordRows(row.field, query, row.id);
    return choiceValues(row.field, query).map((option) => ({
      kind: "suggestion",
      id: `v:${fieldKey(row.field)}:${option.id}`,
      suggestion: {
        kind: "value",
        id: `v:${fieldKey(row.field)}:${option.id}`,
        label: option.name,
        hint: "",
        field: row.field,
        option,
        under: row.id,
      },
      child: true,
      query,
    }));
  }

  /* THE EMPTY BAR OFFERS. Focused with nothing typed, it said nothing until a letter was
     pressed — and a person who does not know what can be searched does not know what to
     type. Now it shows what was searched lately and the fields it can search by: the second
     search of the day is one Enter, and the first one starts by reading. */
  const starting =
    starter &&
    focused &&
    text === "" &&
    step.field === undefined &&
    marked === null &&
    editing === null;
  const items: Item[] = [];
  if (starting) {
    const again = recent.filter(
      (one) => !criteria.some((each) => each.kind !== "join" && each.label === one.label),
    );
    if (again.length > 0) {
      items.push({ kind: "heading", id: "h:recent", text: copy.search.recent });
      for (const one of again)
        items.push({ kind: "recent", id: `rc:${one.label}`, criteria: one });
    }
    if (suggestions.length > 0)
      items.push({ kind: "heading", id: "h:by", text: copy.search.searchBy });
  }
  for (const one of suggestions) {
    items.push({ kind: "suggestion", id: one.id, suggestion: one });
    if (one.id === unfoldedRow?.id) items.push(...unfoldedRows(one));
  }
  if (searching !== undefined && searching.under === undefined) {
    items.push(...recordRows(searching.field, searching.text));
  }

  /* It opens when there is something to offer AND somebody has started: typing, or
     choosing a field, which is already having started. */
  const open =
    focused &&
    items.some(selectable) &&
    (text.trim() !== "" || step.field !== undefined || starting);
  /* THE WAY INTO THE BUILDER, under what is offered: whoever typed a question the bar cannot
     write —a range, a group of three, «ninguna línea con…»— is looking at this list when they
     find out. It was only at the foot of the panel, behind another button. */
  if (open && onOpenBuilder !== undefined && !asTags && step.field === undefined) {
    items.push({ kind: "advanced", id: "a:advanced" });
  }

  /* THE COMPLETION, in grey after the caret: «cli» shows «ente» and Tab takes «cliente» as
     the field. Only for a name being written —no operator, no value shape— and only when a
     field's name STARTS with it: completing from the middle of a word is guessing. */
  const typedName = text.startsWith("#") ? text.slice(1) : text;
  const completion =
    open && step.field === undefined && /^[\p{L}\p{N}_][\p{L}\p{N}_ ]*$/u.test(typedName)
      ? suggestions.find(
          (one): one is Extract<QuerySuggestion, { kind: "field" }> =>
            one.kind === "field" &&
            one.label.length > typedName.length &&
            fold(one.label).startsWith(fold(typedName)),
        )
      : undefined;
  const ghost = completion?.label.slice(typedName.length);

  const firstSelectable = items.findIndex(selectable);
  const markedRow = items.findIndex((one) => one.id === activeId && selectable(one));
  const active = markedRow >= 0 ? markedRow : firstSelectable;
  const activeItem = items[active];

  /* What is marked goes back to the first when what is offered changes: leaving the mark on the
     fourth row while you keep writing makes Enter take something that is no
     longer what the screen says. Only what `suggest` offers counts — records arriving under an
     unfolded row do not move the mark. */
  const shown = suggestions.map((one) => one.id).join("\u0000");
  useEffect(() => {
    setActiveId(null);
  }, [shown]);

  /** Marks the row `by` places away, skipping what cannot be chosen; it wraps around. */
  function move(by: 1 | -1) {
    const count = items.length;
    if (count === 0) return;
    for (let step = 1; step <= count; step++) {
      const next = items[(active + by * step + count * step) % count];
      if (next !== undefined && selectable(next)) {
        setActiveId(next.id);
        return;
      }
    }
  }

  /** A column with no options is not a column: the trigger would appear and the
   *  panel would open blank. Passing `[]` is what whoever has a list that
   *  declares no cut does, and it has to read the same as passing nothing. */
  const withOptions = (groups: readonly MenuGroup[]): boolean =>
    groups.some((group) => group.options.length > 0);

  const columns: Column[] = [
    ...(filters === undefined || !withOptions(filters)
      ? []
      : [
          {
            title: copy.search.filters,
            icon: ListFilter,
            groups: filters,
            checks: true,
            onSelect: onFilterSelect,
          },
        ]),
    ...(grouping === undefined
      ? []
      : [{ title: copy.search.groupBy, icon: Layers, content: grouping }]),
    ...(favorites === undefined || !withOptions(favorites)
      ? []
      : [
          {
            title: copy.search.favorites,
            icon: Star,
            groups: favorites,
            onSelect: onFavoriteSelect,
          },
        ]),
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
  /* The panel floats in the page's overlay layer (`Overlay`, a portal React Aria stacks with
     dialogs), placed against the field: a list's bar clips its search box sideways
     (`ListingBar`, so the field never paints over «1–80») and a page may clip its card, and a
     panel drawn inside them was cut wherever it outgrew the field. Placed this way it is as
     wide as `--container-cuts`, inside the screen, toward the side with room. */
  /* It hangs from the FUNNEL that opened it, its end on the funnel's end: hung from the field's
     edge, a bar as wide as the page opened it a screen away from the hand that asked. Near the
     left edge, React Aria slides it back inside the screen. */
  const { overlayProps: positionProps } = useOverlayPosition({
    targetRef: toolsButton,
    overlayRef: panelBox,
    placement: "bottom end",
    offset: 4,
    containerPadding: 16,
    shouldFlip: false,
    isOpen: panel,
  });
  /* With the focus still in the bar (the input, the button) and the panel open, Escape is
     the panel's too — used up the same way, so it does not reach the dialog either. With the
     panel closed, Escape is not the bar's and goes on to whoever owns it. */
  /**
   * THE PANEL FROM THE KEYBOARD. ↑ ↓ go through a column's options (and wrap), ← → jump to the
   * next column at the same height, Home / End to its ends, a letter to the next option that
   * starts with it, Space ticks — it is a button. Tab still goes through everything, in order.
   * It was Tab, option by option, through three columns: forty presses to reach a favourite.
   */
  const walkPanel = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const here = e.target as HTMLElement;
    const columnsNow = [
      ...e.currentTarget.querySelectorAll<HTMLElement>("[data-cuts-column]"),
    ];
    const stops = (column: Element) =>
      [...column.querySelectorAll<HTMLElement>("button:not([disabled])")].filter(
        (one) => one.getClientRects().length > 0,
      );
    const column = here.closest("[data-cuts-column]");
    if (column === null) return;
    /* In a column's box only ↓ is the panel's: the rest is writing. */
    if (here.tagName === "INPUT") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        stops(column)[0]?.focus();
      }
      return;
    }
    if (here.tagName !== "BUTTON") return;
    const list = stops(column);
    const at = list.indexOf(here);
    const go = (one: HTMLElement | undefined) => {
      if (one === undefined) return;
      e.preventDefault();
      one.focus();
    };
    if (e.key === "ArrowDown") go(list[(at + 1) % list.length]);
    else if (e.key === "ArrowUp") go(list[(at - 1 + list.length) % list.length]);
    else if (e.key === "Home") go(list[0]);
    else if (e.key === "End") go(list[list.length - 1]);
    else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      const next =
        columnsNow[
          columnsNow.indexOf(column as HTMLElement) + (e.key === "ArrowRight" ? 1 : -1)
        ];
      if (next === undefined) return;
      const there = stops(next);
      go(there[Math.min(Math.max(at, 0), there.length - 1)]);
    } else if (e.key.length === 1 && e.key !== " ") {
      const letter = fold(e.key);
      const after = [...list.slice(at + 1), ...list.slice(0, at + 1)];
      go(after.find((one) => fold(one.textContent?.trim() ?? "").startsWith(letter)));
    }
  };

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
    remember(one);
    settle();
  }

  /** Back to the start once something is set: no draft, nothing offered until asked. */
  function settle() {
    setText("");
    setStep({});
    setUnfolded(null);
    setStarter(false);
    input.current?.focus();
  }

  /* ── WHAT WAS SEARCHED LATELY ─────────────────────────────────────
     Only with `recentKey`, and only in this browser: a list's recent searches are the
     person's habit on this screen, not data of the application. Read after mounting — the
     server has no storage — and every read and write survives a private window that refuses
     it. */
  const recentStore =
    recentKey === undefined ? undefined : `sincpro-web-ui:search-recent:${recentKey}`;
  useEffect(() => {
    if (recentStore === undefined) return;
    try {
      setRecent(recentFromStorage(window.localStorage.getItem(recentStore)));
    } catch {
      /* No storage, or something that is not ours under the name: nothing remembered. */
    }
  }, [recentStore]);

  function remember(one: SearchCriteria) {
    if (recentStore === undefined || one.kind !== "filter") return;
    const kept = one;
    setRecent((before) => {
      const next = [kept, ...before.filter((each) => each.label !== kept.label)].slice(
        0,
        RECENT_MAX,
      );
      try {
        window.localStorage.setItem(recentStore, JSON.stringify(next));
      } catch {
        /* Remembered for this visit only. */
      }
      return next;
    });
  }

  /** A recent search, set again: a chip of values goes back into its field's chip; any other
   *  enters as a new instance. */
  function putRecent(one: SearchCriteria) {
    if (one.id.startsWith("v:")) {
      const there = criteria.findIndex((each) => each.id === one.id);
      onCriteriaChange(there < 0 ? [...criteria, one] : replaceAt(criteria, [there], one));
      remember(one);
      settle();
      return;
    }
    put({ ...one, id: criteriaId("f") });
  }

  /* ── REMOVING, AND TAKING IT BACK ──────────────────────────────────
     Undo over confirm (PRINCIPLES): a chip goes at once —its ×, Delete on a marked chip, the
     × that clears everything— and the bar offers it back. In the screen's notice stack when
     there is one (`ToastProvider`), in the bar itself when not. */
  function removeWithUndo(paths: readonly CriteriaPath[], label: string) {
    const removed = paths.flatMap((path) => {
      const node = at(criteria, path);
      return node === undefined ? [] : [{ path, node }];
    });
    if (removed.length === 0) return;
    /* The deepest and the last first, so each removal leaves the next path valid. */
    const ordered = [...paths].sort((a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (b[i] ?? -1) - (a[i] ?? -1);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    const next = ordered.reduce<SearchCriteria[]>(
      (left, path) => removeAt(left, path),
      [...criteria],
    );
    onCriteriaChange(next);
    /* If what was removed held the open group, it stops being so: writing inside something
       that no longer exists is writing into the air. */
    if (
      openGroup !== null &&
      (paths.some((path) => openGroup.join(".").startsWith(path.join("."))) ||
        at(next, openGroup)?.kind !== "join")
    )
      setOpenGroup(null);
    const removal: Removal = { label, removed, before: criteria, after: next };
    lastRemoval.current = removal;
    if (toasts === null) {
      setUndo(removal);
      return;
    }
    toasts.show({
      key: `search-undo-${id}`,
      message: fillCopy(copy.search.removed, { label }),
      action: { label: copy.search.undo, onSelect: () => takeBack(removal) },
    });
  }

  function takeBack(removal: Removal | null = lastRemoval.current) {
    if (removal === null) return;
    const next = restoreRemoval(criteriaNow.current, removal);
    if (next !== null) onCriteriaChange(next);
    lastRemoval.current = null;
    setUndo(null);
    input.current?.focus();
  }

  /* The offer in the bar lasts what a notice lasts: long enough to change one's mind, not so
     long that «Deshacer» undoes something nobody remembers. */
  useEffect(() => {
    if (undo === null) return;
    const timer = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  /** How a piece reads when it is named — marked, removed. */
  function facetLabel(paths: readonly CriteriaPath[]): string {
    return paths
      .map((path) => {
        const node = at(criteria, path);
        if (node === undefined) return "";
        if (node.kind !== "join") return node.label;
        return `${copy.search.joins[node.join === "not" ? "none" : node.join]} (${node.of.length})`;
      })
      .join(" › ");
  }

  /* A mark on a piece that is no longer there marks nothing. */
  useEffect(() => {
    if (marked !== null && marked >= pieces.length) setMarked(null);
  }, [marked, pieces.length]);

  /* «/» from anywhere that is not a field. */
  useEffect(() => {
    if (!focusOnSlash) return;
    const entry = input;
    slashBars.push(entry);
    if (slashBars.length === 1) window.addEventListener("keydown", onSlash);
    return () => {
      const where = slashBars.indexOf(entry);
      if (where >= 0) slashBars.splice(where, 1);
      if (slashBars.length === 0) window.removeEventListener("keydown", onSlash);
    };
  }, [focusOnSlash]);

  /** The edit in place ended. From the keyboard the bar takes the focus back at once — the
   *  keys go on writing —; after a click elsewhere the focus stays where it went. */
  function edited(giveBack: boolean) {
    setEditing(null);
    setMarked(null);
    if (giveBack) input.current?.focus();
  }

  /** The panel, opened from the keyboard: its first option takes the focus. */
  function openPanelFromKeys() {
    panelFromKeys.current = true;
    setPanel(true);
  }
  useEffect(() => {
    if (!panel || !panelFromKeys.current) return;
    panelFromKeys.current = false;
    const frame = window.requestAnimationFrame(() => {
      panelBox.current
        ?.querySelector<HTMLElement>(
          "[data-cuts-column] button:not([disabled]), [data-cuts-column] input, button:not([disabled])",
        )
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [panel]);

  function commit(field: QueryField, op: string, value: string) {
    put(conditionCriteria(field, op, value));
  }

  /**
   * A VALUE of a field —a record, an enum's word— where things land: into the chip that
   * already asks about that field, or as a new one (`withValue`). Inside the open group, the
   * same: «Cliente: A o B» is still one chip there.
   */
  function putValue(field: QueryField, option: RecordOption) {
    const node = openGroup === null ? undefined : at(criteria, openGroup);
    if (openGroup !== null && node?.kind === "join") {
      onCriteriaChange(
        replaceAt(criteria, openGroup, { ...node, of: withValue(node.of, field, option) }),
      );
    } else {
      onCriteriaChange(withValue(criteria, field, option));
    }
    remember(valuesCriteria(field, [option]));
    settle();
  }

  /** Several values of a field at once —what a chooser answers—, into the same chip. */
  function putValues(field: QueryField, options: readonly RecordOption[]) {
    if (options.length === 0) return;
    const node = openGroup === null ? undefined : at(criteria, openGroup);
    const into = (list: readonly SearchCriteria[]) =>
      options.reduce<SearchCriteria[]>((all, one) => withValue(all, field, one), [...list]);
    if (openGroup !== null && node?.kind === "join") {
      onCriteriaChange(replaceAt(criteria, openGroup, { ...node, of: into(node.of) }));
    } else {
      onCriteriaChange(into(criteria));
    }
    settle();
  }

  /** «Buscar más…»: the application's chooser over the relation, on what was typed. What is
   *  already in the relation's chip is said, so a chooser of many leaves it out. */
  function browse(field: QueryField, query: string) {
    const relation = field.relation;
    if (browseRecords === undefined || relation === undefined) return;
    const held = criteria.find((one) => one.id === `v:${fieldKey(field)}`);
    browseRecords({
      relation: relation.relation,
      path: [relation.name],
      label: field.label,
      text: query,
      many: true,
      chosen: held?.kind === "filter" ? (held.values ?? []) : [],
      choose: (records) => putValues(field, records),
    });
  }

  /** What was chosen in the dropdown, depending on what kind it is. */
  function pick(suggestion: QuerySuggestion) {
    if (suggestion.kind === "field") {
      /* A relation whose records can be searched skips the comparison: what is typed next
         searches its records, and choosing one is «es». «No es» and the rest are the
         builder's. */
      setStep(
        records && suggestion.field.relation !== undefined
          ? { field: suggestion.field, op: "=" }
          : { field: suggestion.field },
      );
      setText("");
      setUnfolded(null);
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "unfold") {
      setUnfolded(suggestion.id);
      input.current?.focus();
      return;
    }
    if (suggestion.kind === "value") {
      putValue(suggestion.field, suggestion.option);
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

  /** A row chosen — with Enter or the pointer. */
  function choose(item: Item | undefined) {
    if (item === undefined) return;
    if (item.kind === "suggestion") pick(item.suggestion);
    else if (item.kind === "recent") putRecent(item.criteria);
    else if (item.kind === "more") browse(item.field, item.text);
    else if (item.kind === "advanced") {
      /* What was typed was not a question the bar could write — that is why the builder was
         chosen —: it goes, and the dropdown with it, instead of staying open behind the
         builder. */
      setText("");
      setStep({});
      setUnfolded(null);
      onOpenBuilder?.();
    }
  }

  /** Opens or closes what is under a row; the mark stays on the row. */
  function toggle(id: string) {
    setUnfolded((current) => (current === id ? null : id));
    setActiveId(id);
    input.current?.focus();
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
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        /* Out of the bar —and not into its panel, which floats elsewhere in the DOM—: what is
           offered closes, and a mark on a chip is let go. */
        const next = event.relatedTarget;
        if (
          next instanceof Node &&
          (box.current?.contains(next) === true || panelBox.current?.contains(next) === true)
        )
          return;
        setFocused(false);
        setStarter(false);
        setMarked(null);
      }}
      /* `min-w-48`: placed in a flex row without a width, the bar used to collapse to its
         narrowest and the input slid UNDER the filters button («bu⊞car»). 12rem is the
         magnifier, a word of input and the buttons; a narrower container scrolls, it does
         not stack controls on top of each other. */
      data-ui="search"
      className="relative flex min-w-48 items-center gap-2"
    >
      {/* Three columns: the magnifier, what is set plus the input (the only part that wraps),
          and the buttons. The two ends sit on the FIRST line: when the middle wraps they
          stay where the eye starts reading, instead of floating to its middle. */}
      <div
        data-ui="search.field"
        /* A press on the field's own padding —not on a chip, not on a button— writes: the whole
           field reads as one input, so the whole field has to answer as one. */
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            input.current?.focus();
            setStarter(true);
          }
        }}
        className={`@container/bar flex min-h-(--size-control-md) w-full min-w-0 items-start rounded-ui-search border transition-colors duration-(--duration-instant) ${bySurface(
          sup,
          "border-ui-control-border bg-ui-control focus-within:border-primary/60",
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
            fields={fields}
            {...(marked === null ? {} : { marked })}
            {...(editing === null ? {} : { editing })}
            onEdited={edited}
            onReplace={(path, next) => onCriteriaChange(replaceAt(criteria, path, next))}
            {...(openGroup === null ? {} : { open: openGroup })}
            {...(onOpenBuilder === undefined ? {} : { onOpen: onOpenBuilder })}
            {...(collapseAfter === undefined ? {} : { collapseAfter })}
            onRemoveMany={(paths) => removeWithUndo(paths, facetLabel(paths))}
            onJoin={(path, join) => {
              const node = at(criteria, path);
              if (node?.kind !== "join") return;
              onCriteriaChange(replaceAt(criteria, path, { ...node, join }));
            }}
            onRemove={(path) => removeWithUndo([path], facetLabel([path]))}
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

          {/* In the first step the input sits in a box of its own, so the completion can be drawn
              right after what was typed —the same font, the same start— without being text in
              the input. In the value step the box steps aside (`contents`). */}
          <span
            className={
              step.field === undefined
                ? `relative flex h-7 ${criteria.length === 0 ? "min-w-24" : "min-w-16"} flex-1 items-center`
                : "contents"
            }
          >
            <input
              ref={input}
              {...(focusOnSlash ? { "aria-keyshortcuts": "/" } : {})}
              onFocus={(event) => {
                /* Entered from outside the bar: it offers. Coming back from a chip of its own,
                 it does not — the person is working on what is set. */
                const from = event.relatedTarget;
                if (!(from instanceof Node && box.current?.contains(from) === true))
                  setStarter(true);
              }}
              /* Named even when a placeholder shows: a placeholder is not a label, and once
               chips are set there is none at all. */
              aria-label={copy.choice.search}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open}
              {...(open ? { "aria-controls": listId } : {})}
              {...(open && !asTags && activeItem !== undefined
                ? { "aria-activedescendant": optionId(active) }
                : {})}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setMarked(null);
                setStarter(true);
              }}
              onKeyDown={(e) => {
                const mod = e.metaKey || e.ctrlKey;
                /* THE BAR'S OWN KEYS, before anything is read as text.
                 Mod+Enter: the advanced search, from where the hands already are.
                 Alt+↓: the panel, its first option focused — the combobox's «open the list».
                 Mod+Z on the empty bar: the last removal, back. */
                if (e.key === "Enter" && mod && onOpenBuilder !== undefined) {
                  e.preventDefault();
                  setText("");
                  setStep({});
                  setUnfolded(null);
                  onOpenBuilder();
                  return;
                }
                if (
                  e.key === "ArrowDown" &&
                  e.altKey &&
                  columns.length + (onOpenBuilder ? 1 : 0) > 0
                ) {
                  e.preventDefault();
                  openPanelFromKeys();
                  return;
                }
                if (
                  e.code === "KeyZ" &&
                  mod &&
                  !e.shiftKey &&
                  text === "" &&
                  lastRemoval.current
                ) {
                  e.preventDefault();
                  takeBack();
                  return;
                }

                /* A PIECE MARKED. ← on the empty bar marks the last one; ← → walk them, Delete or
                 Backspace removes the marked one (with its «Deshacer»), Enter edits it —its value
                 in place when it has one, the builder otherwise— and Escape lets it go.
                 Backspace used to remove the last chip at once: one key too many on an empty
                 bar and a filter was gone without a word. Now the first press shows what the
                 second one will take. */
                if (marked !== null) {
                  const piece = pieces[marked];
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setMarked(Math.max(0, marked - 1));
                    return;
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    setMarked(marked + 1 < pieces.length ? marked + 1 : null);
                    return;
                  }
                  if ((e.key === "Backspace" || e.key === "Delete") && piece !== undefined) {
                    e.preventDefault();
                    setMarked(null);
                    removeWithUndo(piece, facetLabel(piece));
                    return;
                  }
                  if (e.key === "Enter" && piece !== undefined) {
                    e.preventDefault();
                    const path = piece[0]!;
                    const node = at(criteria, path);
                    const parts = node === undefined ? undefined : chipParts(node, fields);
                    if (
                      piece.length === 1 &&
                      parts?.kind === "condition" &&
                      (parts.field.choices ?? []).length === 0 &&
                      !withoutValue(parts.op)
                    ) {
                      setEditing(marked);
                    } else {
                      setMarked(null);
                      onOpenBuilder?.(path);
                    }
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setMarked(null);
                    return;
                  }
                  /* Any other key goes back to writing. */
                  setMarked(null);
                }
                if (
                  (e.key === "ArrowLeft" || e.key === "Backspace") &&
                  text === "" &&
                  step.field === undefined &&
                  pieces.length > 0
                ) {
                  e.preventDefault();
                  setMarked(pieces.length - 1);
                  return;
                }
                /* Backspace on an empty draft goes back one step: the comparison, then the field. */
                if (e.key === "Backspace" && text === "" && step.field !== undefined) {
                  e.preventDefault();
                  setStep(
                    step.op !== undefined && !(records && step.field.relation !== undefined)
                      ? { field: step.field }
                      : {},
                  );
                  return;
                }
                /* Tab TAKES the completion drawn in grey: «cli» + Tab is «cliente», chosen as the
                 field, the way a terminal completes. Without a completion Tab is Tab. */
                if (
                  e.key === "Tab" &&
                  !e.shiftKey &&
                  completion !== undefined &&
                  e.currentTarget.selectionStart === text.length
                ) {
                  e.preventDefault();
                  pick(completion);
                  return;
                }
                /* The arrows TRAVERSE what is offered and Enter takes what is
                 marked. Without this, typing «#nom» and going down did nothing: the
                 list was seen and could not be touched without the mouse, which is
                 precisely what a search bar cannot ask for. ↓ on the closed empty bar
                 opens what it offers. */
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  if (!open) {
                    if (e.key === "ArrowDown" && text === "" && step.field === undefined) {
                      e.preventDefault();
                      setStarter(true);
                    }
                    return;
                  }
                  e.preventDefault();
                  move(e.key === "ArrowDown" ? 1 : -1);
                  return;
                }
                /* → OPENS what is under the marked row —a relation's records, an enum's values—
                 and ← closes it and goes back to the row, the way a tree and Odoo's bar do.
                 Only with the caret at the end: in the middle of the text the arrows are still
                 the text's. */
                const atEnd = e.currentTarget.selectionStart === text.length;
                if (e.key === "ArrowRight" && atEnd && open && unfoldable(activeItem)) {
                  if (activeItem !== undefined && activeItem.id !== unfolded) {
                    e.preventDefault();
                    toggle(activeItem.id);
                  }
                  return;
                }
                if (e.key === "ArrowLeft" && atEnd && open && unfolded !== null) {
                  const parent =
                    activeItem?.kind === "suggestion" &&
                    activeItem.suggestion.kind === "value"
                      ? activeItem.suggestion.under
                      : activeItem?.kind === "status" || activeItem?.kind === "more"
                        ? unfolded
                        : activeItem?.id === unfolded
                          ? unfolded
                          : undefined;
                  if (parent !== undefined) {
                    e.preventDefault();
                    setUnfolded(null);
                    setActiveId(parent);
                  }
                  return;
                }
                /* Enter takes what is MARKED, which starts out being the first — and the
                 first is the most likely: with «test» the first text field,
                 with «<= 100» the only one that can answer it. */
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (open) choose(activeItem);
                }
                /* Escape UNDOES, one step at a time and always the last: first what is
                 unfolded, then what is written, then the comparison, then the field. Whoever
                 got the field wrong wants to change it, not start over — and
                 whoever is not building anything does not expect anything to happen.

                 Before, it only dismantled the step when a field had already been chosen,
                 so with «vent» half-written it did nothing: the key that
                 everybody presses to undo did not undo. */
                if (e.key === "Escape" && unfolded !== null && open) {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveId(unfolded);
                  setUnfolded(null);
                  return;
                }
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
                    /* A relation searched by its records skipped the comparison: undoing goes
                     back to choosing the field, not to a step it never showed. */
                    setStep(
                      records && step.field?.relation !== undefined
                        ? {}
                        : { field: step.field },
                    );
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
                    return;
                  }
                  /* Nothing left to undo but what the empty bar offers: it closes. With nothing
                   open, Escape is not the bar's and goes on to whoever owns it. */
                  if (open) {
                    e.preventDefault();
                    e.stopPropagation();
                    setStarter(false);
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
                  ? `h-7 w-full min-w-0 bg-transparent text-meta outline-none ${bySurface(sup, "text-ink placeholder:text-muted", "text-chrome-ink placeholder:text-chrome-muted")}`
                  : `min-w-16 rounded-pill px-2 py-0.5 text-micro outline-none ${bySurface(
                      sup,
                      "bg-primary/8 text-ink placeholder:text-muted",
                      "bg-chrome-link/20 text-chrome-ink placeholder:text-chrome-muted",
                    )}`
              }
            />
            {ghost === undefined || step.field !== undefined ? null : (
              <span
                aria-hidden
                data-ui="search.completion"
                className="pointer-events-none absolute inset-y-0 left-0 flex max-w-full items-center overflow-hidden text-meta whitespace-pre"
              >
                <span className="invisible">{text}</span>
                <span className={bySurface(sup, "text-muted", "text-chrome-muted")}>
                  {ghost}
                </span>
                <kbd
                  className={`ml-1.5 rounded-control border px-1 font-mono text-micro leading-none touch:hidden ${bySurface(
                    sup,
                    "border-line text-muted",
                    "border-chrome-ink/30 text-chrome-muted",
                  )}`}
                >
                  Tab
                </kbd>
              </span>
            )}
          </span>
        </div>

        {/* What a screen reader needs to hear and the eye already sees: a chip marked, a
            removal that can be taken back. */}
        <span role="status" className="sr-only">
          {marked !== null && pieces[marked] !== undefined
            ? fillCopy(copy.search.chipMarked, { label: facetLabel(pieces[marked]) })
            : undo !== null
              ? fillCopy(copy.search.removed, { label: undo.label })
              : ""}
        </span>

        {/* «Deshacer», in the bar, when the screen has no notice stack to say it. */}
        {undo === null ? null : (
          <button
            type="button"
            data-ui="search.undo"
            onClick={() => takeBack(undo)}
            title={fillCopy(copy.search.removed, { label: undo.label })}
            className={`my-0.5 inline-flex h-(--size-control-sm) shrink-0 items-center gap-1 rounded-control px-1.5 text-micro font-medium transition-colors duration-(--duration-instant) motion-safe:animate-chip-in focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              sup,
              "text-primary hover:bg-primary/8",
              "text-chrome-link hover:bg-chrome-link/15",
            )}`}
          >
            <Undo2 className="size-(--size-icon-sm)" strokeWidth={2} aria-hidden />
            {copy.search.undo}
          </button>
        )}

        {/* «/» drawn where it works, while the bar waits — GitHub's way of teaching the key.
            Not for a finger, and gone once the bar is in use. */}
        {!focusOnSlash || focused || text !== "" || puestos > 0 || undo !== null ? null : (
          <span
            aria-hidden
            data-ui="search.slash"
            className="my-0.5 mr-1 inline-flex h-(--size-control-sm) shrink-0 items-center touch:hidden max-sm:hidden"
          >
            <kbd
              className={`rounded-control border px-1.5 font-mono text-micro leading-tight ${bySurface(
                sup,
                "border-line text-muted",
                "border-chrome-ink/30 text-chrome-muted",
              )}`}
            >
              /
            </kbd>
          </span>
        )}

        {puestos === 0 ? null : (
          <button
            type="button"
            onClick={() => {
              removeWithUndo(
                criteria.map((_, index) => [index]),
                pieces.map((piece) => facetLabel(piece)).join(", "),
              );
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
            onClick={(event) => {
              /* Opened with Enter or Space (no pointer, `detail` 0): the keys go on inside it. */
              if (!panel && event.detail === 0) panelFromKeys.current = true;
              setPanel((v) => !v);
            }}
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
                    "border-primary/30 bg-primary/8 text-primary",
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
          data-ui="search.suggestions"
          className={`absolute top-full z-30 mt-1 overflow-hidden rounded-ui-popover border border-ui-popover-border bg-ui-popover shadow-ui-popover ${
            /* As wide as what it offers, up to a reading width: two short rows stretched over a
               bar as wide as the page are two words lost in a band. */
            asTags
              ? "left-0 w-max max-w-full"
              : "left-0 w-full max-w-(--container-suggestions)"
          }`}
        >
          {/* WHERE WHAT IS CHOSEN WILL LAND. It goes above what is offered because it is
              the condition for everything below: the same question chosen lands in
              a different place depending on whether there is an open node or not. */}
          {openJoin === undefined ? null : (
            <div className="flex items-center gap-1.5 border-line border-b px-3 py-1.5 text-micro text-muted">
              <CornerDownRight className="size-3 shrink-0" strokeWidth={2} aria-hidden />
              <span className="min-w-0 truncate">{copy.search.landsHere}</span>
              <span className={`shrink-0 rounded-pill px-1.5 ${chosenTone("canvas")}`}>
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
            <>
              <div
                id={listId}
                role="listbox"
                aria-label={copy.search.suggestions}
                className="max-h-96 overflow-y-auto p-1"
              >
                {items.map((item, at) =>
                  item.kind === "heading" ? (
                    /* A block's title is not an option: the keys skip it, a reader hears it as
                       the group's start. */
                    <div
                      key={item.id}
                      role="presentation"
                      className="px-2 pt-2 pb-0.5 first:pt-1"
                    >
                      <SuggestionRow item={item} open={false} onToggle={() => {}} />
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      id={optionId(at)}
                      role="option"
                      aria-selected={at === active}
                      {...(item.kind === "status" ? { "aria-disabled": true } : {})}
                      data-ui={
                        item.kind === "advanced"
                          ? "search.advanced"
                          : item.kind === "recent"
                            ? "search.recent"
                            : item.kind === "suggestion" && item.child !== true
                              ? "search.suggestion"
                              : "search.record"
                      }
                      /* The input keeps the focus: pressing an option must not take it. */
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (item.kind === "suggestion" && item.suggestion.kind === "unfold") {
                          toggle(item.id);
                        } else choose(item);
                      }}
                      onMouseEnter={selectable(item) ? () => setActiveId(item.id) : undefined}
                      className={`flex w-full items-center gap-2 rounded-ui-option px-2 py-1.5 text-left text-meta transition-colors duration-(--duration-instant) ${
                        item.kind === "status" ? "cursor-default" : "cursor-pointer"
                      } ${
                        item.kind === "advanced" ? "mt-1" : ""
                      } ${at === active ? "bg-ui-option-active" : selectable(item) ? "hover:bg-ink/4" : ""}`}
                    >
                      <SuggestionRow
                        item={item}
                        open={item.id === unfoldedRow?.id}
                        onToggle={() => toggle(item.id)}
                        {...(renderRecord === undefined ? {} : { renderRecord })}
                      />
                    </div>
                  ),
                )}
              </div>
              {/* The keys, said once at the foot and drawn as keys — → is the one nobody
                  guesses, Tab only while there is something to complete, and the two that
                  leave the dropdown (the panel, the advanced search) only where they exist.
                  Not on a phone: there are no keys to press. */}
              <KeysHint
                keys={[
                  [["↑", "↓"], copy.search.keys.move],
                  [[keysLabel("Enter", platform)], copy.search.keys.put],
                  [["→"], copy.search.keys.open],
                  ...(ghost === undefined
                    ? []
                    : [[["Tab"], copy.search.keys.complete] as const]),
                  [[keysLabel("Escape", platform)], copy.search.keys.undo],
                  ...(columns.length === 0 && onOpenBuilder === undefined
                    ? []
                    : [
                        [
                          [keysLabel("Alt+ArrowDown", platform)],
                          copy.search.keys.panel,
                        ] as const,
                      ]),
                  ...(onOpenBuilder === undefined
                    ? []
                    : [
                        [
                          [keysLabel("Mod+Enter", platform)],
                          copy.search.keys.advanced,
                        ] as const,
                      ]),
                ]}
              />
            </>
          )}
        </div>
      ) : null}

      {/* The cuts panel. On a wide screen the three columns are seen at
          once —which is exactly the point: building a cut without opening three things—;
          on a narrow one they stack by themselves and it ends up looking like a popover,
          which is exactly what is needed on a phone. «Wide» is the screen's, not the
          field's: the panel grows up to `--container-cuts` whatever the field measures. */}
      {panel && (columns.length > 0 || onOpenBuilder !== undefined) ? (
        <Overlay>
          <div
            {...mergeProps(overlayProps, positionProps)}
            ref={panelBox}
            id={id}
            /* In the overlay layer, a modal around the bar (a dialog) makes everything outside
               itself inert — the panel included, since it is portalled out of the dialog's
               DOM. React Aria keeps the nodes marked as its top layer usable, as it does with
               its own popovers and live regions. */
            data-react-aria-top-layer=""
            data-ui="search.panel"
            onKeyDown={walkPanel}
            className="z-30 flex w-max max-w-(--container-cuts) flex-wrap overflow-hidden rounded-ui-popover border border-ui-popover-border bg-ui-popover shadow-ui-popover"
          >
            {columns.map((c, i) => {
              const total = c.groups?.reduce((n, g) => n + g.options.length, 0) ?? 0;
              const query = find[c.title] ?? "";
              const needle = fold(query.trim());
              const shown =
                needle === ""
                  ? c.groups
                  : c.groups
                      ?.map((g) => ({
                        ...g,
                        options: g.options.filter((o) =>
                          fold(`${o.label} ${o.hint ?? ""}`).includes(needle),
                        ),
                      }))
                      .filter((g) => g.options.length > 0);
              return (
                <div
                  key={c.title}
                  data-cuts-column=""
                  className={`flex min-w-48 flex-1 flex-col ${
                    i === 0 ? "" : "border-t border-line sm:border-t-0 sm:border-l"
                  }`}
                >
                  {/* The title is the column's heading, the top of the panel's three steps:
                  section (ink, semibold, its icon) › group (quiet, muted) › option. It was
                  the quiet size in muted, the same as the hints under it, so nothing said
                  where «Filtros» ended and «Agrupar por» began. Both columns start the
                  content at the same height. */}
                  <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1 text-meta font-semibold text-ink">
                    <c.icon
                      className="size-(--size-icon-sm) shrink-0 text-muted"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {c.title}
                  </div>
                  {/* A long column (grouping lists every field a model has) scrolls inside
                  itself, so the panel never grows past the screen. */}
                  {/* A long column —a model's every field, a year of dates— gets a box: typing
                    narrows it, ↓ goes down into what is left. */}
                  {c.content !== undefined || total <= FIND_AFTER ? null : (
                    <div className="px-2 pb-1">
                      <input
                        type="search"
                        value={query}
                        onChange={(event) =>
                          setFind((before) => ({ ...before, [c.title]: event.target.value }))
                        }
                        placeholder={fillCopy(copy.search.findIn, {
                          column: c.title.toLowerCase(),
                        })}
                        aria-label={fillCopy(copy.search.findIn, {
                          column: c.title.toLowerCase(),
                        })}
                        className="h-(--size-control-sm) w-full rounded-control border border-ui-control-border bg-ui-control px-2 text-micro text-ink outline-none placeholder:text-muted focus:border-primary/60"
                      />
                    </div>
                  )}
                  <div className="flex max-h-96 flex-col gap-0.5 overflow-y-auto p-1">
                    {c.content ??
                      (shown === undefined || shown.length === 0 ? (
                        <p className="px-1.5 py-1 text-micro text-muted">{copy.menu.empty}</p>
                      ) : (
                        shown.map((g, gi) => (
                          <Group
                            key={g.label ?? gi}
                            group={g}
                            first={gi === 0}
                            checks={c.checks === true}
                            onSelect={c.onSelect}
                            forceOpen={needle !== ""}
                          />
                        ))
                      ))}
                  </div>
                </div>
              );
            })}

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
              <div className="w-full border-t border-line p-1.5">
                {/* An ACTION, and it reads as one: the quiet row it was looked like one more
                    option of the columns above, and nobody found the builder behind it. */}
                <button
                  type="button"
                  data-ui="search.advanced"
                  title={copy.search.openBuilder}
                  onClick={() => {
                    onOpenBuilder();
                    setPanel(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-ui-option px-2 py-1.5 text-left text-meta font-medium text-primary transition-colors duration-(--duration-instant) hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                >
                  <SlidersHorizontal
                    className="size-(--size-icon-sm)"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {copy.search.advanced}
                </button>
              </div>
            )}
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}
