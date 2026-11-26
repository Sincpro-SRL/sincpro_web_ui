"use client";

import {
  type CriteriaJoin,
  type CriteriaPath,
  filtersOf,
  groupsOf,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { JoinWord } from "@sincpro/web-ui/components/search/JoinWord";
import {
  type ChipParts,
  chipParts,
  opLabel,
  type QueryField,
  valueLabel,
  withoutValue,
  withParts,
  withTwoValues,
} from "@sincpro/web-ui/components/search/query";
import { WordChoice } from "@sincpro/web-ui/components/search/WordChoice";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { chosenTone } from "@sincpro/web-ui/primitives/tag/Tag";
import { ChevronRight, Layers, ListFilter, X } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  WHAT IS SET, DRAWN IN THE BAR.
 *
 *      [ año › mes › día ]   [ todas: (sólo vencidas) [ cualquiera: (A) (B) ] ]
 *        ↑ the GROUP ones      ↑ the FILTER ones, with their nesting
 *
 *  ── The group ones ALWAYS go on the left ───────────────────────────
 *
 *  And chained with «›» and not with a conjunction: they do not cross, they NEST. «Year
 *  and month» means nothing; «year, and inside it month» does, and the order IS
 *  the question. They go first because they change the SHAPE of what is being looked at —a
 *  list or heaps— and that is read before which rows are left.
 *
 *  ── The filter ones nest, and each node says how ────────────────────
 *
 *  Each node's word is touched and changed right there —all, any,
 *  none— without opening anything. It is the same list as the attribute selector, for
 *  the same reason: with three options, a rotating button does not say which there are nor
 *  which one is set.
 *
 *  ── Everything is touched, and everything opens the same thing ──────
 *
 *  Any instance opens the builder standing on it. There is not one that is
 *  edited here and another there: what you see in the bar and what is edited in the
 *  dialog are the same object.
 *
 *  ── A chip the bar wrote is read in its PARTS ──────────────────────
 *
 *      [ cliente  contiene  andina  × ]
 *        quiet    a word    strong
 *
 *  The field opens the builder on it, the comparison opens into the field's comparisons, the
 *  value is edited right there —or opens into an enum's words—. Changing 1000 to 2000 is
 *  touching 1000, not opening a dialog. A declared chip («sólo vencidas») is one piece: its
 *  name is somebody's decision.
 *
 *  ── The keyboard walks the pieces ───────────────────────────────────
 *
 *  The bar marks one (`marked`, ← on the empty bar): a ring, and never folded away — a mark on
 *  something hidden is a mark nobody sees.
 * ==================================================================== */

export type CriteriaChipsProps = {
  /** What the bar has set. Groups and filters mixed: here they are separated. */
  criteria: readonly SearchCriteria[];
  /** Open the builder on an instance. */
  onOpen?: (path: CriteriaPath) => void;
  /** Change how a node's ones are joined. */
  onJoin?: (path: CriteriaPath, join: CriteriaJoin) => void;
  /** Remove an instance, or a whole branch. */
  onRemove?: (path: CriteriaPath) => void;
  /** Remove several at once: the × of the grouping chain drops every level. */
  onRemoveMany?: (paths: readonly CriteriaPath[]) => void;
  /**
   * Which node is OPEN: where the next thing written will land.
   *
   * It is marked because otherwise, writing `#and` and then a condition puts it in a
   * place nobody chose by looking: the group exists, the condition goes in, and the
   * only one who knew where it was is the one who wrote it.
   */
  open?: CriteriaPath;
  /** How many facets show before the rest fold into «+N» (the grouping chain counts as one).
   *  Below `@md` of the bar only the first one shows. `Infinity` never folds. */
  collapseAfter?: number;
  /** The fields the bar asks about. With them a chip the bar wrote reads in its parts — field,
   *  comparison, value — and each part is touched on its own (see `chipParts`). */
  fields?: readonly QueryField[];
  /** One instance changed in place: a chip's comparison or value, edited on the chip. */
  onReplace?: (path: CriteriaPath, next: SearchCriteria) => void;
  /** The piece marked from the keyboard, by its place in `facetPaths`: ringed, never folded. */
  marked?: number;
  /** The piece whose value is being edited in place — Enter on a marked chip. */
  editing?: number;
  /** The edit in place ended — set or given up. `giveBack`: it ended from the keyboard (Enter,
   *  Escape) and the focus goes back to whoever owns it; a blur went somewhere on purpose. */
  onEdited?: (giveBack: boolean) => void;
  surface?: Surface;
};

export function CriteriaChips({
  criteria,
  onOpen,
  onJoin,
  onRemove,
  onRemoveMany,
  open,
  collapseAfter = 4,
  fields,
  onReplace,
  marked,
  editing,
  onEdited,
  surface,
}: CriteriaChipsProps) {
  const sup = useSurface(surface);
  const copy = useUiCopy();
  const [expanded, setExpanded] = useState(false);
  const groups = groupsOf(criteria);
  const filters = filtersOf(criteria);
  /* The path is counted over the WHOLE list and not over the drawn half: it is the
     instance's identity, and an identity that changes depending on which side
     you look at it from identifies nothing. */
  const pathOf = (one: SearchCriteria): CriteriaPath => [
    criteria.findIndex((each) => each.id === one.id),
  ];

  const facets: { key: string; label: string; node: ReactNode }[] = [
    ...(groups.length === 0
      ? []
      : [
          {
            key: "grouping",
            label: `${copy.search.groupedBy} ${groups.map((one) => one.label).join(" › ")}`,
            node: (
              <GroupChain
                groups={groups.map((one) => ({ label: one.label, path: pathOf(one) }))}
                {...(onOpen === undefined ? {} : { onOpen })}
                {...(onRemoveMany === undefined ? {} : { onRemoveMany })}
                surface={sup}
              />
            ),
          },
        ]),
    ...filters.map((one, at) => ({
      key: one.id,
      label: labelOf(one, copy.search.joins),
      node: (
        <Node
          node={one}
          path={pathOf(one)}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onJoin === undefined ? {} : { onJoin })}
          {...(onRemove === undefined ? {} : { onRemove })}
          {...(onReplace === undefined ? {} : { onReplace })}
          {...(open === undefined ? {} : { open })}
          {...(fields === undefined ? {} : { fields })}
          editing={editing === at + (groups.length === 0 ? 0 : 1)}
          {...(onEdited === undefined ? {} : { onEdited })}
          surface={sup}
        />
      ),
    })),
  ];

  /* Folding hides, it does not remove: the open node is where the next one lands, so while
     there is one everything shows. */
  const unfolded =
    expanded ||
    open !== undefined ||
    marked !== undefined ||
    editing !== undefined ||
    !Number.isFinite(collapseAfter);
  const beyondWide = Math.max(0, facets.length - collapseAfter);
  const beyondNarrow = Math.max(0, facets.length - 1);
  const more = (count: number, hidden: string, className: string) => (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      title={hidden}
      aria-label={`${fillCopy(copy.search.moreFacets, { count })}: ${hidden}`}
      className={`${className} shrink-0 items-center rounded-ui-tag border px-2 py-0.5 text-micro font-medium tabular-nums transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
        sup,
        "border-line-strong text-muted hover:bg-ink/5 hover:text-ink",
        "border-chrome-ink/30 text-chrome-muted hover:bg-chrome-ink/10 hover:text-chrome-ink",
      )}`}
    >
      {fillCopy(copy.search.moreFacets, { count })}
    </button>
  );
  const hiddenFrom = (from: number) =>
    facets
      .slice(from)
      .map((one) => one.label)
      .join(" · ");

  /* Each piece ARRIVES (`animate-chip-in`): set with Enter, the text clears and the dropdown
     closes, and without a landing the eye looks for where the question went. The key is the
     instance's id, so only the new one moves. */
  const drawn = (facet: (typeof facets)[number], index: number) => (
    <span
      key={facet.key}
      data-marked={marked === index ? "" : undefined}
      className={`min-w-0 max-w-full rounded-ui-tag motion-safe:animate-chip-in ${
        marked === index ? "ring-2 ring-primary ring-offset-1 ring-offset-ui-control" : ""
      } ${
        unfolded
          ? "inline-flex"
          : index >= collapseAfter
            ? "hidden"
            : index >= 1
              ? "inline-flex @max-md/bar:hidden"
              : "inline-flex"
      }`}
    >
      {facet.node}
    </span>
  );
  const offset = groups.length === 0 ? 0 : 1;

  return (
    <>
      {offset === 0 ? null : drawn(facets[0]!, 0)}
      {/* The lead word is no longer drawn — the chain has its icon, the filters are the rest —
          but a screen reader still hears what the chips are. `contents`, so they keep wrapping
          in the bar's line. */}
      {filters.length === 0 ? null : (
        <span role="group" aria-label={copy.search.narrowedBy} className="contents">
          {facets.slice(offset).map((facet, at) => drawn(facet, at + offset))}
        </span>
      )}
      {unfolded ? (
        expanded && facets.length > 1 ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={`shrink-0 rounded-control px-1 text-micro underline decoration-dotted underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
              sup,
              "text-muted hover:text-ink",
              "text-chrome-muted hover:text-chrome-ink",
            )}`}
          >
            {copy.search.fewerFacets}
          </button>
        ) : null
      ) : (
        <>
          {beyondWide === 0
            ? null
            : more(beyondWide, hiddenFrom(collapseAfter), "inline-flex @max-md/bar:hidden")}
          {beyondNarrow === 0
            ? null
            : more(beyondNarrow, hiddenFrom(1), "hidden @max-md/bar:inline-flex")}
        </>
      )}
    </>
  );
}

/** How a facet reads when it is folded away: in the «+N» title and for a screen reader. */
function labelOf(
  node: SearchCriteria,
  joins: { all: string; any: string; none: string },
): string {
  if (node.kind !== "join") return node.label;
  const word = joins[node.join === "not" ? "none" : node.join];
  return `${word} (${node.of.map((child) => labelOf(child, joins)).join(", ")})`;
}

/**
 * THE GROUPING, as ONE chip: «⧉ vendedor › trimestre › mes ×».
 *
 * Context: N chips with N crosses read as N filters, and the levels are not N things — they
 * are one shape, nested in order. Neutral and not gold: the grouping changes how the rows
 * are laid out, not which rows there are, and it must not read as one more filter. Each level
 * still opens the builder on itself; the × drops the whole chain.
 */
function GroupChain({
  groups,
  onOpen,
  onRemoveMany,
  surface,
}: {
  groups: readonly { label: string; path: CriteriaPath }[];
  onOpen?: (path: CriteriaPath) => void;
  onRemoveMany?: (paths: readonly CriteriaPath[]) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const chain = groups.map((one) => one.label).join(" › ");
  return (
    <span
      role="group"
      aria-label={`${copy.search.groupedBy} ${chain}`}
      title={`${copy.search.groupedBy} ${chain}`}
      className={`inline-flex min-w-0 max-w-(--container-chain) items-center gap-1 rounded-ui-tag border py-0.5 pl-1.5 text-micro ${bySurface(
        surface,
        "border-line-strong bg-surface text-ink",
        "border-chrome-ink/30 bg-chrome-ink/8 text-chrome-ink",
      )} ${onRemoveMany === undefined ? "pr-2" : "pr-0.5"}`}
    >
      <Layers
        className={`size-3 shrink-0 ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
        strokeWidth={2}
        aria-hidden
      />
      {/* Inline, not flex: the chain truncates at its END as one sentence. As flex items each
          level shrank on its own and a narrow bar read «v… › Fech… › Fech…». */}
      <span className="min-w-0 truncate">
        {groups.map((one, at) => (
          <Fragment key={one.path.join(".")}>
            {at === 0 ? null : (
              <ChevronRight
                className={`mx-0.5 inline size-3 align-middle ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
                strokeWidth={2}
                aria-hidden
              />
            )}
            {onOpen === undefined ? (
              <span>{one.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onOpen(one.path)}
                title={copy.search.openBuilderHere}
                className="inline rounded-control hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                {one.label}
              </button>
            )}
          </Fragment>
        ))}
      </span>
      {onRemoveMany === undefined ? null : (
        <button
          type="button"
          onClick={() => onRemoveMany(groups.map((one) => one.path))}
          aria-label={copy.search.removeGrouping}
          title={copy.search.removeGrouping}
          className={`hit-target inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors touch:size-6 duration-(--duration-instant) ${bySurface(
            surface,
            "hover:bg-ink/10",
            "hover:bg-chrome-ink/20",
          )}`}
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

function Node({
  node,
  path,
  onOpen,
  onJoin,
  onRemove,
  onReplace,
  open,
  fields,
  editing = false,
  onEdited,
  surface,
}: {
  node: SearchCriteria;
  path: CriteriaPath;
  onOpen?: (path: CriteriaPath) => void;
  onJoin?: (path: CriteriaPath, join: CriteriaJoin) => void;
  onRemove?: (path: CriteriaPath) => void;
  onReplace?: (path: CriteriaPath, next: SearchCriteria) => void;
  open?: CriteriaPath;
  fields?: readonly QueryField[];
  editing?: boolean;
  onEdited?: (giveBack: boolean) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();

  if (node.kind !== "join") {
    /* An instance that carries no expression has nothing to edit: the builder
       edits what TRAVELS, and this one is answered by whoever declared it. It is seen and removed
       like any other; what it does not do is promise a door that opens onto nothing. */
    const editable = node.kind === "group" || node.selection !== undefined;
    const parts = fields === undefined ? undefined : chipParts(node, fields);
    return (
      <Chip
        node={node}
        path={path}
        {...(parts === undefined ? {} : { parts })}
        {...(onOpen === undefined || !editable ? {} : { onOpen })}
        {...(onRemove === undefined ? {} : { onRemove })}
        {...(onReplace === undefined ? {} : { onReplace })}
        editing={editing}
        {...(onEdited === undefined ? {} : { onEdited })}
        surface={surface}
      />
    );
  }

  /* The open node is marked: it is where the next thing will land. A ring and not a
     background, because inside there are chips that already have their own. */
  const isOpen = open !== undefined && open.join(".") === path.join(".");

  return (
    <span
      className={`inline-flex min-w-0 flex-wrap items-center gap-1 rounded-control border px-1.5 py-0.5 ${bySurface(
        surface,
        "border-line bg-ink/4",
        "border-chrome-ink/25 bg-chrome-ink/8",
      )} ${isOpen ? "ring-1 ring-primary/60" : ""}`}
    >
      <FacetMark path={path} surface={surface} />
      <JoinWord
        join={node.join}
        {...(onJoin === undefined ? {} : { onChange: (next) => onJoin(path, next) })}
        surface={surface}
      />
      {node.of.length === 0 ? (
        /* A newly opened node has nothing inside, and an empty bracket reads
           as an error. It says it is waiting. */
        <span
          className={`shrink-0 text-micro italic ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
        >
          {copy.search.landsHere}
        </span>
      ) : null}
      {node.of.map((child, at) => (
        <Node
          key={child.id}
          node={child}
          path={[...path, at]}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onJoin === undefined ? {} : { onJoin })}
          {...(onRemove === undefined ? {} : { onRemove })}
          {...(onReplace === undefined ? {} : { onReplace })}
          {...(open === undefined ? {} : { open })}
          {...(fields === undefined ? {} : { fields })}
          surface={surface}
        />
      ))}
    </span>
  );
}

/**
 * What a facet IS, said once at its start: the funnel, as the grouping chain says ⧉. Only a
 * facet of the bar carries it (`path` of one step) — inside a node the node already says it.
 */
function FacetMark({ path, surface }: { path: CriteriaPath; surface: Surface }) {
  if (path.length !== 1) return null;
  return (
    <ListFilter
      data-ui="search.facet-mark"
      className={`size-3 shrink-0 ${bySurface(surface, "text-muted", "text-chrome-muted")}`}
      strokeWidth={2}
      aria-hidden
    />
  );
}

/** A part of a chip that is touched: a quiet hover inside the chip's own tone, and the ring. */
const PART =
  "min-w-0 rounded-control px-0.5 text-left outline-0 transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-primary";

function Chip({
  node,
  path,
  parts,
  onOpen,
  onRemove,
  onReplace,
  editing,
  onEdited,
  surface,
}: {
  node: Extract<SearchCriteria, { kind: "group" | "filter" }>;
  path: CriteriaPath;
  parts?: ChipParts;
  onOpen?: (path: CriteriaPath) => void;
  onRemove?: (path: CriteriaPath) => void;
  onReplace?: (path: CriteriaPath, next: SearchCriteria) => void;
  editing: boolean;
  onEdited?: (giveBack: boolean) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const label = node.label;
  /* Under a finger the chip grows to a size a thumb can aim at (32px, the label in the
     reading size); with a mouse it stays a line of the bar. */
  const shell = `inline-flex min-w-0 max-w-(--container-facet) items-center gap-1 rounded-ui-tag py-0.5 text-micro touch:min-h-8 touch:text-meta ${chosenTone(
    surface,
  )} ${onRemove === undefined ? "px-2" : "pr-0.5 pl-2"}`;

  const remove =
    onRemove === undefined ? null : (
      <button
        type="button"
        onClick={(event) => {
          /* Without this, removing it also opens it: the click arrives here and then
             bubbles up. */
          event.stopPropagation();
          onRemove(path);
        }}
        aria-label={copy.search.removeFilter.replace("{label}", label)}
        className={`hit-target inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors touch:size-6 duration-(--duration-instant) ${bySurface(
          surface,
          "hover:bg-primary/20",
          "hover:bg-chrome-link/25",
        )}`}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    );

  if (parts !== undefined) {
    return (
      /* The whole sentence in the title: a long value is cut at the chip's width. */
      <span data-ui="search.chip" data-parts="" title={label} className={shell}>
        <FacetMark path={path} surface={surface} />
        <PartsOf
          node={node}
          path={path}
          parts={parts}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onReplace === undefined ? {} : { onReplace })}
          editing={editing}
          {...(onEdited === undefined ? {} : { onEdited })}
          surface={surface}
        />
        {remove}
      </span>
    );
  }

  if (onOpen === undefined) {
    return (
      <span data-ui="search.chip" className={shell}>
        <FacetMark path={path} surface={surface} />
        <span className="min-w-0 truncate">{label}</span>
        {remove}
      </span>
    );
  }

  /* Two SIBLING buttons in the chip — open and remove — and never one inside the other. It
     used to be a `span role="button"` holding the × button: an interactive control inside
     another one, which a screen reader announces as one thing and axe flags
     (`nested-interactive`). Siblings, each with its own name, are both reachable. */
  return (
    <span data-ui="search.chip" className={shell}>
      <FacetMark path={path} surface={surface} />
      <button
        type="button"
        onClick={() => onOpen(path)}
        title={copy.search.openBuilderHere}
        className="min-w-0 truncate rounded-control text-left hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        {label}
      </button>
      {remove}
    </span>
  );
}

/**
 * The three parts of a chip the bar wrote: «cliente · contiene · andina».
 *
 * The field is quiet and opens the builder on the chip (the field is the one part that changes
 * the whole question, so it changes where the whole question is edited). The comparison opens
 * into the field's comparisons. The value is strong, and is edited right there: an enum's words
 * open as a list, anything else becomes the text it is, with Enter to set and Escape to leave it
 * as it was.
 */
function PartsOf({
  node,
  path,
  parts,
  onOpen,
  onReplace,
  editing,
  onEdited,
  surface,
}: {
  node: SearchCriteria;
  path: CriteriaPath;
  parts: ChipParts;
  onOpen?: (path: CriteriaPath) => void;
  onReplace?: (path: CriteriaPath, next: SearchCriteria) => void;
  editing: boolean;
  onEdited?: (giveBack: boolean) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const [writing, setWriting] = useState(false);
  /* Enter and Escape settle the edit; the blur that follows the input leaving must not set it
     a second time with the value it had before. */
  const settled = useRef(false);
  const field = parts.field;
  const quiet = bySurface(surface, "text-muted", "text-chrome-muted");
  const hover = bySurface(surface, "hover:bg-primary/12", "hover:bg-chrome-link/25");

  /* Enter on a marked chip asks to edit it: the value is what gets edited. */
  useEffect(() => {
    if (editing) setWriting(true);
  }, [editing]);
  useEffect(() => {
    if (writing) settled.current = false;
  }, [writing]);

  const fieldPart =
    onOpen === undefined ? (
      <span className={`shrink-0 ${quiet}`}>{field.label}</span>
    ) : (
      <button
        type="button"
        onClick={() => onOpen(path)}
        title={copy.search.openBuilderHere}
        className={`${PART} shrink-0 ${quiet} ${hover}`}
      >
        {field.label}
      </button>
    );

  if (parts.kind === "values") {
    const names = parts.values.slice(0, 3).map((one) => one.name);
    const said =
      parts.values.length > 3
        ? `${names.join(", ")} ${fillCopy(copy.search.andMore, { count: parts.values.length - 3 })}`
        : names.join(` ${copy.search.or} `);
    return (
      <>
        {fieldPart}
        <span className="min-w-0 truncate font-medium">{said}</span>
      </>
    );
  }

  const { op, value } = parts;
  /* The focus is given back BEFORE the input goes: an input removed while it holds the focus
     blurs in the middle of React's commit, and the focus falls to the page for a frame. */
  const finish = (giveBack: boolean) => {
    settled.current = true;
    onEdited?.(giveBack);
    setWriting(false);
  };
  const put = (nextOp: string, nextValue: string) => {
    onReplace?.(path, withParts(node, field, nextOp, nextValue));
  };

  const ops = field.ops.filter((one) => !withTwoValues(one));
  const opPart =
    onReplace === undefined || ops.length < 2 ? (
      <span className={`shrink-0 ${quiet}`}>{opLabel(op)}</span>
    ) : (
      <WordChoice
        value={op}
        options={ops.map((one) => ({ id: one, label: opLabel(one), note: one }))}
        onChange={(next) => {
          if (next === op) return;
          put(next, withoutValue(next) ? "" : value);
          /* From «está vacío» to a comparison that needs a value: there is none yet, so the
             value is asked right there instead of leaving a chip that asks for «nothing». */
          if (!withoutValue(next) && value === "") setWriting(true);
        }}
        label={fillCopy(copy.search.changeOp, { field: field.label })}
        word={opLabel(op)}
        className={`${PART} shrink-0 ${quiet} ${hover}`}
      />
    );

  const choices = field.choices;
  const valuePart = withoutValue(op) ? null : onReplace !== undefined &&
    choices !== undefined &&
    choices.length > 0 ? (
    <WordChoice
      value={value}
      options={choices.map((one) => ({ id: one, label: valueLabel(field, one) }))}
      onChange={(next) => {
        if (next !== value) put(op, next);
        onEdited?.(false);
      }}
      label={fillCopy(copy.search.editValue, { label: field.label })}
      word={valueLabel(field, value)}
      className={`${PART} truncate font-medium ${hover}`}
    />
  ) : onReplace !== undefined && writing ? (
    <input
      /* The person asked to edit this value: the focus goes where they will type. */
      autoFocus
      defaultValue={value}
      aria-label={fillCopy(copy.search.editValue, { label: field.label })}
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        /* The bar's keys are not this field's: Escape here leaves the value as it was, and
           does not undo a step of the bar nor close a dialog around it. */
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          const next = event.currentTarget.value.trim();
          if (next !== "" && next !== value) put(op, next);
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(true);
        }
      }}
      onBlur={(event) => {
        if (settled.current) return;
        const next = event.currentTarget.value.trim();
        if (next !== "" && next !== value) put(op, next);
        finish(false);
      }}
      style={{ fieldSizing: "content" }}
      className="min-w-8 rounded-control bg-ui-control px-1 font-medium text-ink outline-2 outline-primary"
    />
  ) : onReplace === undefined ? (
    <span className="min-w-0 truncate font-medium">{valueLabel(field, value)}</span>
  ) : (
    <button
      type="button"
      onClick={() => setWriting(true)}
      title={fillCopy(copy.search.editValue, { label: field.label })}
      className={`${PART} truncate font-medium ${hover}`}
    >
      {valueLabel(field, value)}
    </button>
  );

  return (
    <>
      {fieldPart}
      {opPart}
      {valuePart}
    </>
  );
}
