import { Children, cloneElement, Fragment, isValidElement, type ReactNode } from "react";

/**
 * LAS RANURAS — cómo un arquetipo se escribe como ÁRBOL.
 *
 * Context: la forma de una pantalla es opcional de una manera que una lista de
 * props no sabe decir. ¿Hay riel? ¿Hay pestañas? ¿Hay paginador? ¿Esta lista se
 * puede ver como tabla? Una lista de props contesta eso con `pager={undefined}`
 * y con una segunda prop que declara qué caras se ofrecen — dos lugares que se
 * pueden contradecir. Un árbol lo dice en voz alta: **si no está escrito, no
 * está.**
 *
 *     <Record>
 *       <Record.Rail>
 *         <Record.Pager index={12} total={80} />   ← hay paginador
 *       </Record.Rail>
 *     </Record>
 *
 * ── Por qué una MARCA y no la identidad del componente ──────────────
 *
 * Reconocer una ranura comparando `node.type === Record.Pager` falla en
 * silencio el día que hay dos copias del módulo en memoria —recarga en caliente,
 * un bundle mal deduplicado— y entonces el árbol se dibuja vacío sin un solo
 * error. La marca viaja con el componente y sobrevive a eso.
 *
 * ── Esto vive en `system/` y no adentro de un arquetipo ─────────────
 *
 * Porque lo hablan todos los que se escriben como árbol. Mientras estuvo
 * escondido adentro de `Record.tsx`, ser un árbol era un privilegio de los
 * registros: cualquier otro arquetipo tenía que copiar el mecanismo o quedarse
 * con treinta y seis props.
 */

/** Un componente marcado como ranura. La marca es el nombre, así que un árbol la
 *  lee sin saber de dónde salió el componente. */
export type Slotted<Name extends string> = { __slot?: Name };

/**
 * Marca un componente como ranura y lo devuelve.
 *
 * El componente NO dibuja nada: existe para ser leído por el arquetipo, que es
 * quien decide dónde va lo que trae adentro. Devolver `null` es lo correcto —
 * una ranura que se dibujara sola aparecería dos veces, una donde la escribieron
 * y otra donde el arquetipo la puso.
 */
export function slot<Name extends string, P>(
  name: Name,
  component: (props: P) => ReactNode,
): ((props: P) => ReactNode) & Slotted<Name> {
  const marked = component as ((props: P) => ReactNode) & Slotted<Name>;
  marked.__slot = name;
  return marked;
}

/** Qué ranura es un nodo, si es alguna. */
export function slotOf<Name extends string>(node: ReactNode): Name | undefined {
  if (!isValidElement(node)) return undefined;
  const type = node.type as Slotted<Name> | string;
  return typeof type === "string" ? undefined : type.__slot;
}

/**
 * Los hijos, con los fragmentos abiertos.
 *
 * `Children.toArray` aplana arreglos pero NO fragmentos, y un `<>…</>` en el
 * medio del árbol —lo que escribe cualquiera que ponga dos ranuras bajo un
 * condicional— escondería las ranuras que tiene adentro.
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

/** La primera ranura de ese nombre. */
export function pick<Name extends string>(
  nodes: readonly ReactNode[],
  name: Name,
): ReactNode | undefined {
  return nodes.find((node) => slotOf(node) === name);
}

/** Todas las ranuras de ese nombre, en el orden en que se escribieron. Lo usa el
 *  que acepta varias hermanas —las páginas de un cuaderno. */
export function pickAll<Name extends string>(
  nodes: readonly ReactNode[],
  name: Name,
): ReactNode[] {
  return nodes.filter((node) => slotOf(node) === name);
}

/** Las props con las que se escribió una ranura. Es lo único que el arquetipo
 *  necesita de ella: la ranura no dibuja, declara. */
export function propsOf<P>(node: ReactNode | undefined): P | undefined {
  return isValidElement(node) ? (node.props as P) : undefined;
}

/** Lo que NO es ninguna de esas ranuras. Es la escotilla: lo que el arquetipo no
 *  previó se dibuja igual, y que aparezca algo acá es la señal de que al
 *  arquetipo le falta una pieza. */
export function loose<Name extends string>(
  nodes: readonly ReactNode[],
  names: readonly Name[],
): ReactNode[] {
  return nodes.filter((node) => {
    const name = slotOf<Name>(node);
    return name === undefined || !names.includes(name);
  });
}
