import { Children, cloneElement, Fragment, isValidElement, type ReactNode } from "react";

/**
 * THE SLOTS — how an archetype is written as a TREE.
 *
 * Context: the shape of a screen is optional in a way that a list of
 * props cannot express. Is there a rail? Are there tabs? Is there a pager? Can this list
 * be seen as a table? A list of props answers that with `pager={undefined}`
 * and with a second prop that declares which faces are offered — two places that
 * can contradict each other. A tree says it out loud: **if it is not written, it is
 * not there.**
 *
 *     <Record>
 *       <Record.Rail>
 *         <Record.Pager index={12} total={80} />   ← there is a pager
 *       </Record.Rail>
 *     </Record>
 *
 * ── Why a MARK and not the component's identity ─────────────────────
 *
 * Recognising a slot by comparing `node.type === Record.Pager` fails
 * silently the day there are two copies of the module in memory —hot reload,
 * a badly deduplicated bundle— and then the tree is drawn empty without a single
 * error. The mark travels with the component and survives that.
 *
 * ── This lives in `system/` and not inside an archetype ─────────────
 *
 * Because everything written as a tree speaks it. While it was
 * hidden inside `Record.tsx`, being a tree was a privilege of
 * records: any other archetype had to copy the mechanism or make do
 * with thirty-six props.
 */

/** A component marked as a slot. The mark is the name, so a tree reads it
 *  without knowing where the component came from. */
export type Slotted<Name extends string> = { __slot?: Name };

/**
 * Marks a component as a slot and returns it.
 *
 * The component draws NOTHING: it exists to be read by the archetype, which is
 * the one deciding where what it carries goes. Returning `null` is right —
 * a slot that drew itself would appear twice, once where it was written
 * and once where the archetype put it.
 */
export function slot<Name extends string, P>(
  name: Name,
  component: (props: P) => ReactNode,
): ((props: P) => ReactNode) & Slotted<Name> {
  const marked = component as ((props: P) => ReactNode) & Slotted<Name>;
  marked.__slot = name;
  return marked;
}

/** Which slot a node is, if any. */
export function slotOf<Name extends string>(node: ReactNode): Name | undefined {
  if (!isValidElement(node)) return undefined;
  const type = node.type as Slotted<Name> | string;
  return typeof type === "string" ? undefined : type.__slot;
}

/**
 * The children, with the fragments opened.
 *
 * `Children.toArray` flattens arrays but NOT fragments, and a `<>…</>` in the
 * middle of the tree —what anyone writes who puts two slots under a
 * conditional— would hide the slots inside it.
 */
export function flatten(children: ReactNode, prefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Fragment) {
      /* The fragment's children are keyed from zero again («.0», «.1»…): without the
         fragment's own key in front they collide with their new siblings. */
      out.push(
        ...flatten(
          (child.props as { children?: ReactNode }).children,
          `${prefix}${String(child.key)}/`,
        ),
      );
    } else if (prefix !== "" && isValidElement(child)) {
      out.push(cloneElement(child, { key: `${prefix}${String(child.key)}` }));
    } else {
      out.push(child);
    }
  }
  return out;
}

/** The first slot of that name. */
export function pick<Name extends string>(
  nodes: readonly ReactNode[],
  name: Name,
): ReactNode | undefined {
  return nodes.find((node) => slotOf(node) === name);
}

/** All the slots of that name, in the order they were written. Used by whoever
 *  accepts several sisters —a notebook's pages. */
export function pickAll<Name extends string>(
  nodes: readonly ReactNode[],
  name: Name,
): ReactNode[] {
  return nodes.filter((node) => slotOf(node) === name);
}

/** The props a slot was written with. It is the only thing the archetype
 *  needs from it: the slot does not draw, it declares. */
export function propsOf<P>(node: ReactNode | undefined): P | undefined {
  return isValidElement(node) ? (node.props as P) : undefined;
}

/** What is NOT any of those slots. It is the escape hatch: what the archetype did not
 *  foresee is drawn anyway, and something showing up here is the sign that the
 *  archetype is missing a piece. */
export function loose<Name extends string>(
  nodes: readonly ReactNode[],
  names: readonly Name[],
): ReactNode[] {
  return nodes.filter((node) => {
    const name = slotOf<Name>(node);
    return name === undefined || !names.includes(name);
  });
}
