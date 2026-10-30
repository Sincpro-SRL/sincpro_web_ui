"use client";

import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from "react";

/* ==================================================================== *
 *  LA PILA DE COSAS PEGADAS
 *
 *  Tres bandas se quedan arriba mientras se scrollea una vista larga, y cada
 *  una tiene que quedar DEBAJO de la anterior:
 *
 *      ┌─ TopNav ─────────────────────────────────┐  top: 0
 *      ├─ barra de la lista ──────────────────────┤  top: alto del TopNav
 *      │  🔍 buscar…  ⚙3          1–80 / 187 ‹ ›  │
 *      ├─ encabezado de la tabla ─────────────────┤  top: los dos de arriba
 *      │  número │ cliente │ fecha │ total        │
 *      ├──────────────────────────────────────────┤
 *      │  …las filas, que sí se van…              │
 *
 *  **Ninguna de las tres tiene alto fijo.** El `TopNav` crece cuando envuelve;
 *  la barra de la lista tiene dos renglones, o uno en compacto, o tres cuando
 *  las fichas del buscador envuelven. Un `top-[52px]` escrito a mano acierta en
 *  una ventana y deja un hueco o un solapamiento en las otras — y es la clase
 *  de número que nadie vuelve a tocar cuando la barra cambia.
 *
 *  Por eso cada banda MIDE lo que ocupa y lo suma a `--sticky-top` para lo que
 *  venga abajo. La variable cascadea, así que cada capa lee la de arriba sin
 *  que ninguna sepa cuántas capas hay.
 *
 *  ── La regla del que abre una caja con scroll propio ────────────────
 *
 *  Adentro de una caja con alto y `overflow`, el que scrollea es la caja y no
 *  la página, así que lo pegado se pega al borde de la caja: ahí la pila
 *  arranca de cero otra vez. Eso es `stickyReset()`.
 * ==================================================================== */

/** La variable que dice a qué altura arranca lo próximo que se pegue. */
export const STICKY_TOP = "--sticky-top";

/** Lo que va en `style` de algo pegajoso: se pega debajo de lo que ya hay. */
export const stickyTop: CSSProperties = { top: `var(${STICKY_TOP}, 0px)` };

/** Para una caja con scroll propio: adentro, la pila arranca de cero. */
export function stickyReset(): CSSProperties {
  return { [STICKY_TOP]: "0px" } as CSSProperties;
}

/**
 * LA CAJA DE UNA TABLA: cuándo tiene que ser un contenedor de scroll y cuándo no.
 *
 * Las tres tablas del sistema tienen el mismo dilema y lo resolvían con tres
 * copias de la misma medición. El dilema es de CSS y no se puede esquivar:
 * `overflow-x: auto` **obliga** a `overflow-y: auto` —la especificación dice que
 * `visible` junto a un valor que no sea `visible` ni `clip` computa a `auto`—,
 * así que en cuanto la caja permite scroll horizontal pasa a ser el scroller, y
 * el encabezado pegajoso se pega a SU borde en vez de al de la página.
 *
 * De ahí salen los tres casos, y son los únicos:
 *
 *     alto propio      la caja scrollea de verdad. `auto`, y la pila de cosas
 *                      pegadas arranca de cero adentro.
 *     sin alto, entra  no hace falta ninguna caja. `clip` —recorta las esquinas
 *                      redondeadas sin ser un scroller— y el encabezado se pega
 *                      a la página, debajo de la barra de la lista.
 *     sin alto, no entra   vuelve el scroll horizontal, y el encabezado se va
 *                      con las filas. Es el precio, y es el que hay.
 *
 * Devuelve la clase y el estilo ya resueltos para que ninguna tabla vuelva a
 * decidirlo por su cuenta.
 */
export function useScrollBox<T extends HTMLElement>(options: {
  /** El alto declarado. `undefined` o `"auto"` = crece con el contenido. */
  height?: number | string;
}): { ref: RefObject<T | null>; className: string; style: CSSProperties } {
  const ref = useRef<T>(null);
  const crece = options.height === undefined || options.height === "auto";
  const [desborda, setDesborda] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null || !crece) return;
    /* Se mide el CONTENIDO y no la caja, y es la diferencia entre que esto
       funcione y que se trabe: con `overflow: clip` la caja deja de ser un
       contenedor de scroll, así que su `scrollWidth` pasa a ser su propio ancho
       y nunca volvería a reportar desborde. Una vez recortada, se quedaría
       recortada para siempre. El hijo sí sabe cuánto mide de verdad. */
    const dentro = node.firstElementChild;
    const medir = () => {
      const ancho = dentro === null ? node.scrollWidth : dentro.getBoundingClientRect().width;
      setDesborda(ancho > node.clientWidth + 1);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(medir);
    observer.observe(node);
    /* También el contenido: las columnas cambian de ancho sin que la caja
       cambie de tamaño. */
    if (dentro !== null) observer.observe(dentro);
    return () => observer.disconnect();
  }, [crece]);

  const suelta = crece && !desborda;
  return {
    ref,
    className: suelta ? "overflow-clip" : "overflow-auto",
    style: suelta
      ? {}
      : {
          ...(crece || options.height === undefined ? {} : { height: options.height }),
          ...stickyReset(),
        },
  };
}

/**
 * Mide el alto de un elemento y devuelve el estilo que empuja la pila para sus
 * hermanos de abajo.
 *
 * `useLayoutEffect` y `ResizeObserver` y no un alto declarado: el alto depende
 * de si las fichas del buscador envolvieron, y eso recién se sabe después de
 * pintar.
 */
export function useStickyLayer<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  /** Va en el elemento que se pega. */
  self: CSSProperties;
  /** Va en lo que viene DEBAJO, para que se pegue más abajo todavía. */
  below: CSSProperties;
} {
  const ref = useRef<T>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;

    /* El valor de abajo se calcula en JS y se escribe en PÍXELES, no como
       `calc(var(--sticky-top) + 44px)`. Context: esa forma parece la natural y
       no funciona — poner `--sticky-top` en un elemento leyendo `var(--sticky-top)`
       del MISMO elemento es un ciclo, CSS lo declara inválido, y los
       descendientes heredan «nada»: todo se pegaba en 0 y las bandas se
       superponían. Se midió en el navegador, no se dedujo. */
    const measure = () => {
      const inherited = Number.parseFloat(
        getComputedStyle(node).getPropertyValue(STICKY_TOP),
      );
      const above = Number.isFinite(inherited) ? inherited : 0;
      setTop(above + node.getBoundingClientRect().height);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    /* La altura de una capa de ARRIBA cambia sin que este observador se entere
       —el `TopNav` envuelve al angostar—, así que también se remide al cambiar
       el tamaño de la ventana, que es cuando eso pasa. */
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return {
    ref,
    self: stickyTop,
    below: { [STICKY_TOP]: `${top}px` } as CSSProperties,
  };
}
