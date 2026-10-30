"use client";

import type { Message } from "@sincpro/web-ui/components/chatter/Messages";
import { usePagination } from "@sincpro/web-ui/components/listing/pages";
import { Pagination } from "@sincpro/web-ui/components/listing/Pagination";
import { fillCopy, type UiCopy, useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import { Empty } from "@sincpro/web-ui/primitives/notice/Notice";
import { Tabs } from "@sincpro/web-ui/primitives/tabs/Tabs";
import { Tag } from "@sincpro/web-ui/primitives/tag/Tag";
import { DateValue } from "@sincpro/web-ui/primitives/value/Fecha";
import { Avatar } from "@sincpro/web-ui/primitives/value/Person";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  History,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Rows3,
  Zap,
} from "lucide-react";
import { Lock } from "lucide-react";
import { type ReactNode, useState } from "react";

/**
 * What a record has been through: what the system logged and what people wrote,
 * in one place.
 *
 * Odoo calls it the chatter and the idea is the one worth taking: a record's
 * history is not one more section of the record — it is the CONTEXT for
 * everything else on the screen. Reading «the assessment failed» while looking
 * at the inputs that produced it is the whole point.
 *
 * ── The merge is the default, and that is the decision ──────────────
 *
 * **Everything together comes first**, because the question somebody actually
 * has is «what happened here», not «what happened here *according to the
 * system*». A payment that bounced and the message somebody left about it are one
 * story; splitting them by who wrote them makes the reader join them back by
 * hand, comparing two timestamps in two lists.
 *
 * The other two tabs are for when you already know which half you want: «who
 * said what» and «what ran». They are a narrowing of the first, never a
 * different content.
 *
 * ── Why the tabs live HERE and not in whoever composes ──────────────
 *
 * They used to be a generic `tabs` array and every screen decided its own: same
 * component, a different chatter on each record. What a record has been through
 * is the same question everywhere, so the answer is the component's, not the
 * screen's. The screen passes what it HAS —messages, events, a composer— and
 * this decides how it is read.
 *
 * A tab with no source behind it is not drawn: with only events there is
 * nothing to merge and nothing to separate, so it shows the stream and no tab
 * bar at all.
 *
 * ── Cut into pages, like any other list ─────────────────────────────
 *
 * A record with six months behind it has hundreds of entries, and a column that
 * only scrolls turns the history into something you give up on. The pages are
 * this component's and not the screen's for the same reason the tabs are: it is
 * the same list on every record.
 *
 * ── Beside on a wide panel, underneath on a narrow one ──────────────
 *
 * It asks `@container`, not `lg:`, for the reason `SectionGrid` already wrote
 * down: with four panels open each one measures 380 px on a 1.600 screen, and a
 * window rule would put a 22rem column inside a 380 px panel. **Whoever mounts
 * it has to declare `@container` on the container** — `Record` does.
 */

/**
 * Algo que el sistema anotó.
 *
 * Deliberadamente NO es el evento del producto: lo que una historia necesita
 * para dibujar uno es qué pasó, cuándo, quién, y —cuando las hay— las tres cosas
 * que uno termina yendo a buscar a otro lado.
 *
 * ── Las tres que faltaban, y por qué cada una ───────────────────────
 *
 *     by       QUIÉN. «se publicó la factura» no dice si la publicó una persona o un
 *              cron, y esa es la primera pregunta cuando algo cambió sin aviso.
 *              Ausente = lo hizo el sistema, que también es una respuesta.
 *
 *     moved    DE QUÉ A QUÉ. «el proyecto cambió de estado» obliga a mirar el
 *              evento anterior para saber de dónde venía. «borrador →
 *              confirmado» se lee de una y es la línea más útil de una historia
 *              de gestión.
 *
 *     error    QUÉ falló, entero y textual. Un evento rojo que dice «falló» sin
 *              decir por qué manda a alguien a los logs — y quien mira esta
 *              pantalla muchas veces no tiene acceso a los logs.
 */
export type ChatterEvent = {
  id: string;
  /** Qué pasó, en una oración y en pasado. */
  label: ReactNode;
  at: Date | string | number;
  tone?: Tone;
  /** Quién lo hizo. Ausente = el sistema. */
  by?: string;
  /** El cambio de estado, cuando lo hubo. `from` ausente = nació así. */
  moved?: { from?: string; to: string };
  /** Lo que hay que saber además del título, cuando el título no alcanza. */
  detail?: ReactNode;
  /** Lo que falló, textual. Se muestra la PRIMERA línea y el resto se abre: un
   *  stack de cuarenta renglones adentro de una historia tapa la historia, y lo
   *  que casi siempre alcanza es el primer renglón. */
  error?: string;
  /** El ícono del punto, cuando el tono no dice lo suficiente. Sin esto sale del
   *  tono, que es lo que evita un evento rojo con un tilde verde adentro. */
  icon?: LucideIcon;
};

export type ChatterProps = {
  /** What people wrote. Absent —not empty— while there is no service behind it:
   *  an empty thread says «nobody wrote yet», which is a different claim. */
  messages?: readonly Message[];
  /** What the system logged. */
  events?: readonly ChatterEvent[];
  /** The box to write in, when this record takes messages. It stays on top of
   *  the stream: writing is the thing you came to do, reading is what you do
   *  next. */
  composer?: ReactNode;
  /** Which tab is showing. Uncontrolled from «everything» when absent. */
  current?: ChatterView;
  onCurrentChange?: (next: ChatterView) => void;
  open: boolean;
  onToggle: () => void;
  label?: string;
  /** Dentro de la hoja del registro: no lleva marco propio, la hoja ya lo
   *  tiene. Sin esto es una tarjeta, que es como se ve cuando vive solo. */
  embedded?: boolean;
  /**
   * Dónde vive el chatter respecto del registro.
   *
   *     page    DEBAJO y a TODO EL ANCHO, como una hoja propia. **Es el
   *             default**, y no por comodidad: un formulario necesita su ancho
   *             para que los campos no se apilen, y el de al costado se lo come
   *             en cuanto la pantalla no sobra. Abajo, la conversación no compite
   *             con el registro — es la otra mitad de la página.
   *     aside   AL COSTADO cuando hay ancho, DEBAJO cuando no. Es para un
   *             registro que se LEE más de lo que se edita, donde tener la
   *             historia a la vista mientras se mira el dato vale el ancho que
   *             cuesta.
   *
   * La diferencia no es cosmética. En `aside` el ancho es escaso, así que el
   * mensaje se lee en una columna de veintipico de caracteres; en `page` hay
   * ancho de sobra y el texto se acota a una medida legible en vez de estirarse
   * de punta a punta, que es donde un párrafo deja de poder seguirse.
   *
   * **Plegar es de pantalla chica.** En `page` el chatter no se pliega cuando
   * hay ancho: plegarlo ahí esconde media pantalla para no ganar nada.
   */
  layout?: ChatterLayout;
};

export type ChatterLayout = "aside" | "page";

export type ChatterView = "all" | "messages" | "events";

/* The tab names come from the copy table: the same three words on every record. */
const TAB_LABEL: Record<ChatterView, (copy: UiCopy) => string> = {
  all: (copy) => copy.chatter.tabAll,
  messages: (copy) => copy.chatter.tabMessages,
  events: (copy) => copy.chatter.tabEvents,
};

/* El ícono de cada pestaña. Con tres, es lo que se reconoce sin leer — y en el
   chatter angosto, lo único que sobrevive cuando el rótulo se trunca. */
const TAB_ICON: Record<ChatterView, LucideIcon> = {
  all: Rows3,
  messages: MessageSquare,
  events: History,
};

type Entry =
  | { kind: "message"; at: number; message: Message }
  | { kind: "event"; at: number; event: ChatterEvent };

/* UN SOLO ÍCONO para todos los eventos: el rayo, que es lo que pasó — algo se
   ejecutó. Había uno por tono y eso convertía la historia en un muestrario:
   cinco formas y cinco colores para decir cinco veces «pasó algo».
   Lo que SÍ hay que distinguir es si falló, y eso lo dice el contenedor. */
const EVENT_ICON: LucideIcon = Zap;

/* DOS estados y no seis: pasó, o falló.
 *
 * El rojo de un fallo queda en la fila entera: es el único color, y tiene que
 * verse sin señalar. El hover no lo reemplaza. Es una marca metida adentro,
 * redondeada, para no pintar el riel. */
const ROW_SKIN = {
  ok: "",
  failed: "bg-bad/6",
} as const;

const ROW_HOVER = {
  ok: "group-hover/entry:bg-ink/4",
  failed: "group-hover/entry:bg-bad/10",
} as const;

const NODE_SKIN = {
  ok: "bg-ink/8 text-muted",
  failed: "bg-bad/12 text-bad",
} as const;

function at(when: Date | string | number): number {
  return when instanceof Date ? when.getTime() : new Date(when).getTime();
}

function MessageEntry({ message }: { message: Message }) {
  const copy = useUiCopy();
  /* Mismo relleno que un evento: las dos clases de entrada viven en la misma
     lista y con relleno distinto se leen como dos listas pegadas. Antes el
     mensaje iba a ras del borde y el evento tenía caja, así que el nombre de
     quien escribió quedaba más cerca del filo que el texto de al lado. */
  return (
    <li className="flex min-w-0 gap-2.5 px-2.5 py-2">
      <Avatar name={message.author} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-meta font-medium text-ink">{message.author}</span>
          <DateValue when={message.at} format="relative" />
          {message.internal !== true ? null : (
            <span
              className="inline-flex items-center gap-1 text-micro text-muted"
              title={copy.chatter.internalNote}
            >
              <Lock className="size-3" aria-hidden />
              {copy.chatter.internal}
            </span>
          )}
        </div>
        <p
          className={`mt-0.5 text-body whitespace-pre-line ${
            message.internal === true
              ? "rounded-control border border-warn/40 bg-warn/6 px-2 py-1 text-ink"
              : "text-ink"
          }`}
        >
          {message.body}
        </p>
      </div>
    </li>
  );
}

/** El cambio de estado, cuando lo hubo: de qué a qué.
 *
 *  Es la línea más útil de una historia de gestión y la que peor se contaba: «el
 *  proyecto cambió de estado» obliga a buscar el evento anterior para saber de
 *  dónde venía. Dos fichas y una flecha se leen sin buscar nada.
 *
 *  El ESTADO VIEJO va apagado y el nuevo en tinta: lo que importa es dónde
 *  quedó, y el de antes está para dar contexto, no para competir.
 *
 *  La cápsula es la de `Tag`: pastilla, pelo, mismo relleno. Dos radios
 *  distintos para la misma idea de «una ficha» es una familia de más. */
const STATE_CHIP =
  "inline-flex max-w-32 min-w-0 items-center truncate rounded-pill border border-line-strong bg-ink/5 px-2 py-0.5 text-micro";

function Moved({ from, to }: { from?: string; to: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {from === undefined ? null : (
        <>
          <span className={`${STATE_CHIP} text-muted`}>{from}</span>
          <ArrowRight
            className="size-3 shrink-0 text-muted/60"
            strokeWidth={2.5}
            aria-hidden
          />
        </>
      )}
      <span className={`${STATE_CHIP} font-medium text-ink`}>{to}</span>
    </span>
  );
}

/**
 * UN EVENTO, como línea de una línea de tiempo.
 *
 * ── Por qué hay un riel y no sólo puntos ────────────────────────────
 *
 * El riel —la línea vertical que une los puntos— es lo que convierte una lista
 * en una CRONOLOGÍA. Sin él son renglones sueltos que casualmente tienen fecha;
 * con él se lee que una cosa pasó después de la otra, que es la pregunta que
 * alguien trae cuando abre esto.
 *
 * ── El color es del punto y de nada más ─────────────────────────────
 *
 * El tono pinta el punto, y el texto se queda en tinta normal. Un renglón entero
 * en rojo no se lee más urgente: se lee peor, y cuando hay tres seguidos deja de
 * significar nada. El punto alcanza para encontrar los rojos de un vistazo, que
 * es para lo que el color sirve en una lista larga.
 */
/** El error: la primera línea, y el resto a un clic.
 *
 *  Un stack de cuarenta renglones adentro de una historia tapa la historia; el
 *  primer renglón casi siempre alcanza. Pero el resto tiene que estar —quien
 *  mira esta pantalla muchas veces no tiene acceso a los logs— así que se
 *  guarda, no se descarta.
 *
 *  Sin color propio: el rojo ya lo puso el nodo. Esto es una cita textual de la
 *  máquina, así que se ve como lo que es — monoespaciada sobre el piso. */
function ErrorLine({ error }: { error: string }) {
  const copy = useUiCopy();
  const [open, setOpen] = useState(false);
  const lineas = error.split("\n");
  const primera = lineas[0] ?? "";
  const hayMas = lineas.length > 1 || primera.length > 120;

  return (
    <div className="min-w-0 rounded-control border border-line bg-ground px-2 py-1">
      <p
        className={`min-w-0 font-mono text-micro text-ink ${
          open ? "break-words whitespace-pre-wrap" : "truncate"
        }`}
      >
        {open ? error : primera}
      </p>
      {!hayMas ? null : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="mt-0.5 cursor-pointer text-micro text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {open ? copy.chatter.less : copy.chatter.more}
        </button>
      )}
    </div>
  );
}

/**
 * UN EVENTO: una FILA que se aprieta, no un renglón.
 *
 * ── Qué se ve sin abrir ─────────────────────────────────────────────
 *
 * El rótulo, quién —si lo hubo— y cuándo. Nada más. Es lo que alguien lee para
 * recorrer la historia; todo lo demás es para cuando ese renglón no alcanzó.
 *
 * ── Un solo ícono, y el contenedor dice si falló ────────────────────
 *
 * El rayo, porque eso es lo que pasó: algo se ejecutó. Había un ícono y un color
 * por tono, y seis colores no señalan nada — una historia de veinte eventos
 * quedaba como una bolsa de caramelos, y el que falló no saltaba más que los
 * otros. El rojo sirve exactamente mientras sea el único.
 *
 * Lo que distingue un error es el TINTE DE LA FILA, translúcido. Y sirve dos
 * veces: dice que falló, y dice que la fila es una zona que se puede apretar —
 * que era lo que no se notaba.
 */
function EventEntry({ event }: { event: ChatterEvent }) {
  const failed = event.tone === "bad" || event.error !== undefined;
  const skin = failed ? "failed" : "ok";
  const Icon = event.icon ?? EVENT_ICON;
  /* Arranca CERRADO: lo de adentro es para cuando el renglón no alcanzó. */
  const [open, setOpen] = useState(false);
  const hayMas =
    event.moved !== undefined || event.detail !== undefined || event.error !== undefined;

  const fila = (
    <>
      {/* EL NODO. Su disco tapa el riel —por el `ring`— así la línea pasa por
          detrás y no lo atraviesa. */}
      <span
        className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-pill ring-2 ring-surface ${NODE_SKIN[skin]}`}
      >
        <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      </span>

      <span className="min-w-0 flex-1 truncate text-meta text-ink">{event.label}</span>

      {event.by === undefined ? null : (
        <span className="hidden shrink-0 truncate text-micro text-muted @xs:inline">
          {event.by}
        </span>
      )}
      <span className="shrink-0">
        <DateValue when={event.at} format="relative" />
      </span>

      {hayMas ? (
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted transition-transform duration-(--duration-instant) ${
            open ? "rotate-90" : ""
          }`}
          strokeWidth={2.5}
          aria-hidden
        />
      ) : (
        /* Hueco del mismo ancho: sin él, las filas que no se abren corren la
           fecha y la columna deja de estar alineada. */
        <span className="size-3.5 shrink-0" aria-hidden />
      )}
    </>
  );

  return (
    <li className="group/event relative @container">
      {/* EL RIEL, por detrás de los nodos y cruzando el hueco hasta el
          siguiente. Es lo que hace que esto se lea como una cronología y no como
          renglones con fecha. */}
      <span
        aria-hidden
        className="absolute top-8 left-5.5 w-px bg-line group-last/event:hidden"
      />

      {hayMas ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`group/entry relative flex w-full min-w-0 cursor-pointer items-center rounded-box px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-primary ${ROW_SKIN[skin]}`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-control ${ROW_HOVER[skin]}`}
          />
          <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5">
            {fila}
          </span>
        </button>
      ) : (
        <div
          className={`flex w-full min-w-0 items-center gap-2.5 rounded-box px-2.5 py-2 ${
            failed ? "bg-bad/6" : ""
          }`}
        >
          {fila}
        </div>
      )}

      {!open ? null : (
        /* Lo de adentro, alineado bajo el rótulo y sobre el piso: es el DETALLE
           de esa línea, no una línea más de la historia. */
        <div className="mt-0.5 mb-1 ml-11 flex min-w-0 flex-col gap-1.5 rounded-box bg-ground px-2.5 py-2">
          {event.moved === undefined ? null : (
            <Moved
              {...(event.moved.from === undefined ? {} : { from: event.moved.from })}
              to={event.moved.to}
            />
          )}
          {event.by === undefined ? null : (
            <span className="text-micro text-muted @xs:hidden">{event.by}</span>
          )}
          {event.detail === undefined ? null : (
            <div className="min-w-0 text-micro text-muted">{event.detail}</div>
          )}
          {event.error === undefined ? null : <ErrorLine error={event.error} />}
        </div>
      )}
    </li>
  );
}

export function Chatter({
  messages,
  events,
  composer,
  current,
  onCurrentChange,
  open,
  onToggle,
  label: ownLabel,
  layout = "page",
  embedded = false,
}: ChatterProps) {
  const copy = useUiCopy();
  const label = ownLabel ?? copy.chatter.history;
  const [owned, setOwned] = useState<ChatterView>("all");
  const view = current ?? owned;
  const setView = onCurrentChange ?? setOwned;

  const hasMessages = messages !== undefined;
  const hasEvents = events !== undefined;
  /* Las tres pestañas sólo cuando hay DOS fuentes: con una sola, «todo» y esa
     una son la misma lista, y tres solapas donde dos dicen lo mismo es un
     control que no decide nada. */
  const tabs: ChatterView[] = hasMessages && hasEvents ? ["all", "messages", "events"] : [];
  const showing = tabs.length === 0 ? "all" : view;

  const entries: Entry[] = [
    ...(showing === "events" ? [] : (messages ?? [])).map<Entry>((message) => ({
      kind: "message",
      at: at(message.at),
      message,
    })),
    ...(showing === "messages" ? [] : (events ?? [])).map<Entry>((event) => ({
      kind: "event",
      at: at(event.at),
      event,
    })),
  ].sort((a, b) => b.at - a.at);

  const total = (messages?.length ?? 0) + (events?.length ?? 0);
  /* Cortado acá y no por quien compone: es la misma lista en todos los
     registros, y una historia que sólo hace scroll es una historia que se
     abandona a la mitad. */
  const pages = usePagination(entries, { pageSize: 15 });

  const page = layout === "page";

  /* Plegado. Embebido es la última fila de la hoja: el marco lo pone la hoja
     y el hover es una marca redondeada adentro, para no pintar la línea que
     la separa del papel. Suelta, o al costado, sí es una tarjeta. */
  if (!open) {
    const strip = page && embedded;
    const face = (
      <>
        <MessageSquare className="size-4 shrink-0 text-muted" aria-hidden />
        <span
          className={
            page
              ? "min-w-0 truncate text-meta text-muted"
              : "min-w-0 truncate text-meta text-muted @4xl:hidden"
          }
        >
          {label}
        </span>
        {total === 0 ? null : <Tag tone="neutral">{total}</Tag>}
        <PanelRightOpen
          className={
            page
              ? "ml-auto size-4 shrink-0 text-muted"
              : "ml-auto size-4 shrink-0 text-muted @4xl:ml-0"
          }
          aria-hidden
        />
      </>
    );
    return (
      <button
        type="button"
        onClick={onToggle}
        title={fillCopy(copy.chatter.open, { label })}
        className={
          page
            ? strip
              ? "group/strip relative flex w-full shrink-0 cursor-pointer items-center px-3 py-2.5"
              : "flex w-full shrink-0 cursor-pointer items-center gap-2 rounded-box border border-line bg-surface px-3 py-2.5 hover:bg-ground"
            : "flex w-full shrink-0 cursor-pointer items-center gap-2 self-start rounded-box border border-line bg-surface px-2.5 py-2 hover:bg-ground @4xl:w-auto @4xl:flex-col @4xl:px-1.5 @4xl:py-2.5"
        }
      >
        {strip ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-control group-hover/strip:bg-ground"
          />
        ) : null}
        {strip ? (
          <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">{face}</span>
        ) : (
          face
        )}
      </button>
    );
  }

  return (
    <aside
      className={
        page
          ? embedded
            ? "flex w-full flex-col"
            : "flex w-full flex-col rounded-box border border-line bg-surface"
          : "flex w-full shrink-0 flex-col self-start rounded-box border border-line bg-surface @4xl:w-(--container-chatter)"
      }
    >
      {/* Las pestañas son las MISMAS del registro: `Tabs`, la primitiva. Acá
          había una tira propia —pastilla gris para el activo, contador en texto
          plano— que se leía distinto que la del cuaderno en la misma pantalla.
          Dos maneras de marcar «esto está abierto» es una de más. */}
      {/* La tira va sobre el PISO y no sobre el papel, igual que en el registro.
          Sobre papel, la pestaña activa —que es `bg-surface`— queda del mismo
          color que su fondo: se ve el borde flotando y se lee montada en vez de
          abierta. Sobre el piso, el papel de la pestaña sale hacia adelante y la
          relación «esto está abierto y lo de abajo es su contenido» se lee sola.

          `pt-2 px-2` es el aire que le faltaba arriba; abajo no lleva, porque el
          borde inferior es justamente la línea que la pestaña muerde. */}
      <header
        className={`flex min-w-0 items-end gap-1 border-b border-line bg-ground px-2 pt-2 ${
          page && embedded ? "" : "rounded-t-box"
        }`}
      >
        {tabs.length === 0 ? (
          <span className="px-2 py-1.5 text-meta font-medium text-ink">
            {label}
            {total === 0 ? null : (
              <span className="ml-1.5 text-micro text-muted">{total}</span>
            )}
          </span>
        ) : (
          <Tabs
            label={label}
            current={showing}
            onSelect={(id) => setView(id as ChatterView)}
            tabs={tabs.map((tab) => ({
              id: tab,
              label: TAB_LABEL[tab](copy),
              icon: TAB_ICON[tab],
              count:
                tab === "messages"
                  ? (messages?.length ?? 0)
                  : tab === "events"
                    ? (events?.length ?? 0)
                    : total,
            }))}
          />
        )}
        {/* Ícono solo, la misma pastilla que cerrar un diálogo. El piso ya es
            `bg-ground`: un hover del mismo color no se ve. `mb-1.5` lo separa
            de la línea que la pestaña muerde. */}
        <button
          type="button"
          onClick={onToggle}
          title={fillCopy(copy.chatter.fold, { label })}
          className="mb-1.5 ml-auto inline-flex size-(--size-control-sm) shrink-0 cursor-pointer items-center justify-center rounded-pill text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <PanelRightClose className="size-(--size-icon-md)" aria-hidden />
        </button>
      </header>

      {/* A todo el ancho el texto se acota a una MEDIDA de lectura. Un párrafo
          de punta a punta en una pantalla de 1700 px es una línea que se pierde
          al volver al principio — es el mismo motivo por el que un diario tiene
          columnas y no una sola línea por página. Al costado no hace falta: el
          ancho ya es escaso. */}
      <div
        className={
          page
            ? "flex w-full min-w-0 max-w-(--container-prose) flex-col gap-3 px-3.5 py-3"
            : "flex min-w-0 flex-col gap-3 px-2.5 py-2.5"
        }
      >
        {composer === undefined || showing === "events" ? null : composer}
        {entries.length === 0 ? (
          <Empty sentence={copy.chatter.empty} />
        ) : (
          <>
            <ol className="flex flex-col">
              {pages.pageItems.map((entry) =>
                entry.kind === "message" ? (
                  <MessageEntry key={`m:${entry.message.id}`} message={entry.message} />
                ) : (
                  <EventEntry key={`e:${entry.event.id}`} event={entry.event} />
                ),
              )}
            </ol>
            {entries.length <= 15 ? null : <Pagination {...pages.bridge} />}
          </>
        )}
      </div>
    </aside>
  );
}

/** Whether the chatter is open, when the page has no better answer.
 *
 *  **Starts folded.** It began the other way round —a history nobody opens is a
 *  history nobody reads— and seeing it took the argument apart: open, it holds a
 *  22rem column of context on every record you open, before anybody asked for
 *  any. Folded it still says how many there are, which is the half that has to
 *  be free; reading them is a click, and a click you chose.
 *
 *  It is the same answer for both layouts. A default that depends on the width
 *  would mean the same record shows a different screen depending on how many
 *  panels happen to be open next to it, and that is not a default, it is a
 *  surprise. */
export function useChatter(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    toggle: () => setOpen((current) => !current),
    /** Open it without closing it if it already was. What a button from outside
     *  needs —«events 12»— when pressing it twice must not hide the very thing
     *  it promised to show. */
    show: () => setOpen(true),
  };
}
