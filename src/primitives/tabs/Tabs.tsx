"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";
import { Tab, TabList, Tabs as AriaTabs } from "react-aria-components";

/**
 * UNA TIRA DE PESTAÑAS. La misma en todo el sistema.
 *
 * Context: esto vivía adentro del encabezado del registro y se llamaba
 * `Aspects`, así que el chatter —que necesita exactamente lo mismo— no podía
 * usarlo: un contexto no importa de otro contexto. El resultado era una tira de
 * pestañas de segunda mano, con el activo marcado de otra manera, en la misma
 * pantalla que la buena.
 *
 * Es una primitiva porque no sabe qué está separando: las caras de un registro,
 * las dos fuentes de una historia, o lo que venga.
 *
 * ── Por qué el activo es una PESTAÑA de carpeta ─────────────────────
 *
 * Y no un subrayado. Un subrayado dice «esto está elegido»; una pestaña que sale
 * del borde y tapa la línea dice «esto está ABIERTO y lo de abajo es su
 * contenido», que es la relación real. La diferencia importa cuando hay tres y
 * el contenido de abajo no cambia de forma al cambiar de una a otra.
 *
 * ── El contador apagado en cero ─────────────────────────────────────
 *
 * Un cero se dibuja, y apagado. Esconderlo obliga a abrir la pestaña para
 * descubrir que está vacía; pintarlo como los demás la hace parecer que tiene
 * algo. «No hay ninguna» es información y se dice.
 *
 * ── El contador y la NOTIFICACIÓN son dos cosas ─────────────────────
 *
 * El contador dice CUÁNTAS cosas hay detrás, y es neutro: «pagos 0» es una
 * respuesta tan válida como «pagos 5». La notificación dice que algo de ahí
 * PIDE que lo mires —falló, cambió, llegó— y por eso tiene color y por eso un
 * cero no se dibuja: no hay nada que pedir.
 *
 * Confundirlos se ve así: una pestaña con «3» al lado y nadie sabe si son tres
 * cosas o tres problemas. Son dos marcas porque son dos preguntas.
 */

/**
 * ALGO DE ESTA PESTAÑA PIDE ATENCIÓN.
 *
 * No es un conteo: un conteo dice cuántas cosas hay y esto dice que hay algo que
 * mirar. Por eso tiene color, por eso no se dibuja en cero, y por eso puede
 * convivir con el contador — «pagos 4 ⬤» es cuatro cosas, una de ellas
 * rechazada.
 */
export type TabNotice = {
  /**
   * Qué es lo que pide atención, en la voz del producto: «3 sin leer», «la
   * factura no se pudo enviar».
   *
   * Obligatorio, y por la misma razón que en `StatusDot`: un punto de color sin
   * su palabra al lado obliga a aprender una leyenda que no está escrita en
   * ningún lado, y no le dice nada a quien no distingue el rojo del verde. Acá
   * la marca acelera el barrido y la palabra informa — se lee al pasar por
   * encima y la lee un lector de pantalla.
   */
  label: string;
  /** Cuántas cosas lo piden. Sin esto es un punto, que es lo que se pone cuando
   *  llegó algo nuevo y contarlo no agrega nada. Un `0` no dibuja nada: no hay
   *  nada que pedir. */
  count?: number;
  /** De qué clase: `bad` algo falló, `warn` algo avisa, `accent` o `info` algo
   *  llegó. Sin esto, `bad` — que es el caso por el que esto existe. */
  tone?: Tone;
};

export type TabItem = {
  id: string;
  label: string;
  /** La marca de la pestaña. Con tres o más, el ícono es lo que se reconoce sin
   *  leer — y en una tira angosta es lo único que sobrevive al truncado. */
  icon?: LucideIcon;
  /** Cuántas cosas hay detrás. `undefined` = no se cuenta; `0` se dibuja
   *  apagado, que es distinto de no contar. */
  count?: number;
  /** Que algo de acá pide que lo mires. Aparte del contador: ver `TabNotice`. */
  notice?: TabNotice;
};

/* El color de la notificación. Estático y en una tabla porque Tailwind no puede
   componer una clase con un pedazo variable: `bg-${tone}/12` no existe en la
   hoja. */
const NOTICE_TONE: Record<Tone, string> = {
  neutral: "bg-ink/8 text-muted",
  info: "bg-info/12 text-info",
  good: "bg-good/12 text-good",
  warn: "bg-warn/14 text-warn",
  bad: "bg-bad/12 text-bad",
  accent: "bg-accent/14 text-accent",
};

const NOTICE_DOT: Record<Tone, string> = {
  neutral: "bg-muted",
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  accent: "bg-accent",
};

/**
 * The strip only: what each tab opens is drawn by whoever uses it (`Record`, `Chatter`).
 *
 * Built on React Aria's `Tabs`, so the strip is a real tab list for the keyboard: the
 * arrows move between tabs and select them, Home/End jump to the ends, and only the open
 * tab is in the Tab order. The hand-written version had the roles and none of the keys.
 */
export function Tabs({
  tabs,
  current,
  onSelect,
  label,
}: {
  tabs: readonly TabItem[];
  current: string;
  onSelect?: (id: string) => void;
  /** El rótulo accesible de la tira. Sin esto, «las caras del registro». */
  label?: string;
}) {
  const copy = useUiCopy();
  return (
    <AriaTabs selectedKey={current} onSelectionChange={(key) => onSelect?.(String(key))}>
      <TabList
        aria-label={label ?? copy.record.faces}
        className="flex min-w-0 flex-wrap items-end gap-1"
      >
        {tabs.map((a) => {
          const Icon = a.icon;
          const empty = a.count === 0;
          /* Un cero no pide nada, así que no se dibuja. Es la diferencia con el
             contador, donde «0» es una respuesta. */
          const notice = a.notice?.count === 0 ? undefined : a.notice;
          return (
            <Tab
              key={a.id}
              id={a.id}
              /* La palabra de la notificación viaja con la pestaña y no en un
                 elemento aparte: así la lee un lector de pantalla al llegar a la
                 pestaña, sin tener que entrar. */
              {...(notice === undefined
                ? {}
                : { "aria-label": `${a.label} · ${notice.label}` })}
              className={({ isSelected }) =>
                `inline-flex shrink-0 cursor-default items-center px-3 py-2 text-meta outline-0 transition-colors duration-(--duration-instant) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
                  isSelected
                    ? "-mb-px rounded-t-control border border-b-0 border-line-strong bg-surface font-medium text-ink"
                    : "border border-transparent text-muted hover:text-ink"
                }`
              }
            >
              {({ isSelected }) => (
                /* The `title` goes on the content and not on the tab: React Aria does not
                   forward it, and on the content the native tooltip still covers the
                   whole tab. */
                <span
                  className="inline-flex items-center gap-1.5"
                  {...(notice === undefined ? {} : { title: notice.label })}
                >
                  {Icon === undefined ? null : (
                    <Icon
                      className={`size-(--size-icon-sm) shrink-0 ${isSelected ? "text-ink" : "text-muted"}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                  {a.label}
                  {a.count === undefined ? null : (
                    <span
                      className={`rounded-pill px-1.5 text-micro tabular-nums ${
                        empty
                          ? "bg-ink/5 text-muted/70"
                          : isSelected
                            ? "bg-ink/8 text-ink"
                            : "bg-ink/8 text-muted"
                      }`}
                    >
                      {a.count.toLocaleString(copy.locale)}
                    </span>
                  )}
                  {notice === undefined ? null : notice.count === undefined ? (
                    /* Sin número, un punto. La palabra no se dibuja pero está: en el
                       `title` y en el nombre accesible de la pestaña. */
                    <span
                      className={`size-1.5 shrink-0 rounded-pill ${NOTICE_DOT[notice.tone ?? "bad"]}`}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={`rounded-pill px-1.5 text-micro font-medium tabular-nums ${
                        NOTICE_TONE[notice.tone ?? "bad"]
                      }`}
                      aria-hidden
                    >
                      {notice.count.toLocaleString(copy.locale)}
                    </span>
                  )}
                </span>
              )}
            </Tab>
          );
        })}
      </TabList>
    </AriaTabs>
  );
}
