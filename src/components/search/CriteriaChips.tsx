"use client";

import {
  type CriteriaJoin,
  type CriteriaPath,
  filtersOf,
  groupsOf,
  type SearchCriteria,
} from "@sincpro/web-ui/components/search/criteria";
import { JoinWord } from "@sincpro/web-ui/components/search/JoinWord";
import { fillCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { bySurface, useSurface } from "@sincpro/web-ui/foundations/surface";
import type { Surface } from "@sincpro/web-ui/foundations/types";
import { ChevronRight, Layers, X } from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

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
    ...filters.map((one) => ({
      key: one.id,
      label: labelOf(one, copy.search.joins),
      node: (
        <Node
          node={one}
          path={pathOf(one)}
          {...(onOpen === undefined ? {} : { onOpen })}
          {...(onJoin === undefined ? {} : { onJoin })}
          {...(onRemove === undefined ? {} : { onRemove })}
          {...(open === undefined ? {} : { open })}
          surface={sup}
        />
      ),
    })),
  ];

  /* Folding hides, it does not remove: the open node is where the next one lands, so while
     there is one everything shows. */
  const unfolded = expanded || open !== undefined || !Number.isFinite(collapseAfter);
  const beyondWide = Math.max(0, facets.length - collapseAfter);
  const beyondNarrow = Math.max(0, facets.length - 1);
  const more = (count: number, hidden: string, className: string) => (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      title={hidden}
      aria-label={`${fillCopy(copy.search.moreFacets, { count })}: ${hidden}`}
      className={`${className} shrink-0 items-center rounded-pill border px-2 py-0.5 text-micro font-medium tabular-nums transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${bySurface(
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

  const drawn = (facet: (typeof facets)[number], index: number) => (
    <span
      key={facet.key}
      className={`min-w-0 max-w-full ${
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
      className={`inline-flex min-w-0 max-w-(--container-chain) items-center gap-1 rounded-pill border py-0.5 pl-1.5 text-micro ${bySurface(
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
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) ${bySurface(
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
  open,
  surface,
}: {
  node: SearchCriteria;
  path: CriteriaPath;
  onOpen?: (path: CriteriaPath) => void;
  onJoin?: (path: CriteriaPath, join: CriteriaJoin) => void;
  onRemove?: (path: CriteriaPath) => void;
  open?: CriteriaPath;
  surface: Surface;
}) {
  const copy = useUiCopy();

  if (node.kind !== "join") {
    /* An instance that carries no expression has nothing to edit: the builder
       edits what TRAVELS, and this one is answered by whoever declared it. It is seen and removed
       like any other; what it does not do is promise a door that opens onto nothing. */
    const editable = node.kind === "group" || node.selection !== undefined;
    return (
      <Chip
        label={node.label}
        path={path}
        {...(onOpen === undefined || !editable ? {} : { onOpen })}
        {...(onRemove === undefined ? {} : { onRemove })}
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
          {...(open === undefined ? {} : { open })}
          surface={surface}
        />
      ))}
    </span>
  );
}

function Chip({
  label,
  path,
  onOpen,
  onRemove,
  surface,
}: {
  label: string;
  path: CriteriaPath;
  onOpen?: (path: CriteriaPath) => void;
  onRemove?: (path: CriteriaPath) => void;
  surface: Surface;
}) {
  const copy = useUiCopy();
  const shell = `inline-flex min-w-0 max-w-(--container-facet) items-center gap-1 rounded-pill border py-0.5 text-micro ${bySurface(
    surface,
    "border-accent/40 bg-accent/18 text-ink",
    "border-chrome-link/35 bg-chrome-link/18 text-chrome-link",
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
        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-pill transition-colors duration-(--duration-instant) ${bySurface(
          surface,
          "hover:bg-primary/20",
          "hover:bg-chrome-link/25",
        )}`}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    );

  if (onOpen === undefined) {
    return (
      <span className={shell}>
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
    <span className={shell}>
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
