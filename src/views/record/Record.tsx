"use client";

import {
  Sheet,
  type SheetField,
  type SheetLayout,
} from "@sincpro/web-ui/components/form/Sheet";
import type { Crumb } from "@sincpro/web-ui/components/record/Breadcrumb";
import type { DirtyState } from "@sincpro/web-ui/components/record/DirtyActions";
import { Pager as PagerControl } from "@sincpro/web-ui/components/record/Pager";
import { RecordHeader } from "@sincpro/web-ui/components/record/RecordHeader";
import { RecordSkeleton } from "@sincpro/web-ui/components/record/RecordSkeleton";
import { SmartButton, SmartButtons } from "@sincpro/web-ui/components/record/SmartButtons";
import { type Stage, StatusBar } from "@sincpro/web-ui/components/record/StatusBar";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import {
  flatten,
  pick as pickSlot,
  propsOf,
  slot,
  slotOf,
} from "@sincpro/web-ui/foundations/slots";
import type { Surface, Tone } from "@sincpro/web-ui/foundations/types";
import { Failed } from "@sincpro/web-ui/primitives/notice/Notice";
import { type TabNotice, Tabs } from "@sincpro/web-ui/primitives/tabs/Tabs";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * ARCHETYPE 2 — ONE record, written as a TREE.
 *
 * Context: the shape of a record is optional in a way a prop list cannot say.
 * Is there a rail? Are there tabs? Is there a pager? A prop list answers that
 * with `pager={undefined}`, and it needs several different mouths for one role
 * — the body above the notebook, the body inside it, the summary — so the
 * shape ends up hidden inside a record type. A tree says it out loud:
 * **if there is no `<Record.Pager />`, there is no pager.**
 *
 *     <Record identity={…}>
 *       <Record.Rail>
 *         <Record.Crumbs crumbs={…} />
 *         <Record.Pager index={12} total={80} onNext={…} />
 *         <Record.Smart links={…} />
 *         <Record.Actions>…</Record.Actions>
 *         <Record.Status stages={…} current="posted" />
 *       </Record.Rail>
 *       <Record.Paper layout="horizontal">
 *         <InvoiceHeader />                 ← domain: a child, not a prop
 *         <Record.Pages current={page} onChange={setPage}>
 *           <Record.Page id="lines" label="líneas">…</Record.Page>
 *           <Record.Page id="payments" label="pagos" count={2}>…</Record.Page>
 *         </Record.Pages>
 *       </Record.Paper>
 *     </Record>
 *
 * ── Reading order IS screen order ───────────────────────────────────
 *
 * Whatever is written above `<Record.Pages>` is drawn above the notebook, and
 * whatever is written below it is drawn below the current page. With no
 * notebook, the paper is just its children in order. There is no third rule to
 * remember.
 *
 * ── What did NOT become a tree ──────────────────────────────────────
 *
 * `identity` stays a prop: a record without a name is not a record, so there
 * is no geometry to express by leaving it out. Same for `error` and `dirty` —
 * they are states of the whole record, not regions of it.
 */

/* ---------------------------------------------------------------- *
 *  Las ranuras
 *
 *  El mecanismo vive en `system/slots.ts` y lo hablan los dos arquetipos que
 *  se escriben como árbol. Acá quedan sólo los NOMBRES, que son de un registro.
 * ---------------------------------------------------------------- */

type SlotName =
  | "rail"
  | "crumbs"
  | "pager"
  | "smart"
  | "actions"
  | "status"
  | "paper"
  | "chatter"
  | "facts"
  | "pages"
  | "page";

const pick = (nodes: readonly ReactNode[], name: SlotName) => pickSlot(nodes, name);

/* ---------------------------------------------------------------- *
 *  Los tipos que el árbol usa
 * ---------------------------------------------------------------- */

export type RecordIdentity = {
  icon?: LucideIcon;
  title: ReactNode;
  /** Who or what it is about, under the title — the customer of an invoice, the
   *  supplier of an order. Second in the hierarchy: bigger than a fact, smaller than
   *  the title. */
  subtitle?: ReactNode;
  tag?: { label: string; tone?: Tone };
  /** THE figure of the record — the total of an invoice, the balance of an account —
   *  drawn as large as the title, on the right. A record usually has one number people
   *  open it for; set among the facts at body size it is just another fact. */
  figure?: { label: string; value: ReactNode };
};

/** What hangs off the record. It leads somewhere else; it is not a datum. */
export type SmartLink = {
  icon: LucideIcon;
  count?: number;
  label: string;
  onClick?: () => void;
};

/** My place in the set I came from. Not pagination: it says I can move to the
 *  next one without going back to the list. */
export type RecordPager = {
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
};

export type { SheetField };

/* ---------------------------------------------------------------- *
 *  Las piezas del riel
 * ---------------------------------------------------------------- */

type RailProps = {
  children?: ReactNode;
  /** The rail's surface. `canvas` (the default) is a light control bar; `chrome` is the dark
   *  band, an explicit choice. The application bar is the screen's one dark band — a dark
   *  rail under it reads as two headers and the record loses its top. */
  surface?: Surface;
};
type CrumbsProps = { crumbs: readonly Crumb[] };
type SmartProps = { links: readonly SmartLink[] };
type ActionsProps = { children?: ReactNode };
type StatusProps = {
  stages?: readonly Stage[];
  /** Cuál de las etapas es la de ahora. Sin esto, la primera. */
  current?: string;
  failed?: boolean;
  /** La escotilla del estado, para lo que no es ninguna de las dos. */
  children?: ReactNode;
};

/** El riel: mi lugar delante del registro. Sin él, no hay banda — y eso
 *  es exactamente lo que un diálogo quiere. */
const Rail = slot("rail", (_props: RailProps): ReactNode => null);

const Crumbs = slot("crumbs", (_props: CrumbsProps): ReactNode => null);

const PagerSlot = slot("pager", (_props: RecordPager): ReactNode => null);

const Smart = slot("smart", (_props: SmartProps): ReactNode => null);

/** Los botones de acción. A lo sumo tres visibles + un `Menu` con `iconOnly`, y
 *  la regla de cuáles tres: los que PRODUCEN algo nuevo, nunca los de navegar.
 *  Van sin `surface`: lo toman del riel (claro por defecto; oscuro con `Rail surface="chrome"`).
 *
 *  Context: on a narrow record (a phone, below `--container-handheld`) the one written
 *  with `role="primary"` leaves the rail for a bar stuck to the bottom of the screen,
 *  where the thumb is — and with `dirty`, Save and Discard take that bar instead. The
 *  rest stay here. Nothing to declare: see THE THUMB BAR in `RecordHeader`. */
const Actions = slot("actions", (_props: ActionsProps): ReactNode => null);

/** El estado, como DATOS y no como nodo: la barra vive en el riel y
 *  quien la pasaba armada tenía que acordarse de la superficie del riel. Olvidarlo
 *  pintaba la paleta del lienzo encima del chrome, y pasó. */
const Status = slot("status", (_props: StatusProps): ReactNode => null);

/* ---------------------------------------------------------------- *
 *  Las piezas del papel
 * ---------------------------------------------------------------- */

type PaperProps = {
  /** Cómo ponen la etiqueta los campos de adentro. `horizontal` es etiqueta |
   *  valor, que es la forma de Odoo. */
  layout?: SheetLayout;
  columns?: 1 | 2 | 3 | 4;
  children?: ReactNode;
};
type FactsProps = { fields: readonly SheetField[] };
type PagesProps = {
  current?: string;
  onChange?: (id: string) => void;
  children?: ReactNode;
};
type PageProps = {
  id: string;
  label: string;
  /** La marca de la cara. Con tres o más pestañas, el ícono es lo que se
   *  reconoce sin leer. */
  icon?: LucideIcon;
  /** Cuántas cosas hay detrás. `0` se dibuja apagado: «no hay ninguna» es una
   *  respuesta, y esconderla obliga a abrir la pestaña para averiguarla. */
  count?: number;
  /** Que algo de esta cara PIDE que lo mires — falló, cambió, llegó. Aparte del
   *  contador, porque son dos preguntas: ver `TabNotice`. */
  notice?: TabNotice;
  children?: ReactNode;
};

/** El papel: el registro. El `<sheet>` blanco sobre el piso. */
const Paper = slot("paper", (_props: PaperProps): ReactNode => null);

/** Lo que al registro le PASÓ, al costado: mensajes y eventos en una columna.
 *
 *  Va al lado y no abajo porque la historia es el contexto de todo lo demás que
 *  está en pantalla — leer «la factura fue rechazada» mirando los datos que la
 *  produjeron es justamente para lo que sirve, y una sección más abajo obliga a
 *  ver una cosa o la otra. Lo que va adentro lo arma quien compone: el kit no
 *  sabe qué es un evento de este producto. */
const ChatterSlot = slot(
  "chatter",
  (_props: {
    children?: ReactNode;
    /** `page` lo pone SIEMPRE debajo y a todo el ancho, como una hoja propia. Sin
     *  esto va al costado cuando hay ancho, que es la forma angosta. */
    layout?: "aside" | "page";
  }): ReactNode => null,
);

/** Los hechos globales del registro. Están en TODAS las páginas, y por eso van
 *  arriba del cuaderno y no adentro de una. */
const Facts = slot("facts", (_props: FactsProps): ReactNode => null);

/** El cuaderno. Las solapas salen de las páginas que tenga adentro: una página
 *  que no está escrita no tiene solapa, y ésa es toda la declaración. */
const Pages = slot("pages", (_props: PagesProps): ReactNode => null);

const Page = slot("page", (_props: PageProps): ReactNode => null);

/* ---------------------------------------------------------------- *
 *  El registro
 * ---------------------------------------------------------------- */

export type RecordProps = {
  identity: RecordIdentity;
  /** Lo que falló al operar sobre el registro. Va arriba del papel, adentro. */
  error?: string | null;
  /** Hay cambios sin guardar. Su presencia REEMPLAZA los botones de acción por
   *  guardar y descartar — ver la nota en `RecordHeader`. */
  dirty?: DirtyState;
  children?: ReactNode;
};

export function Record({ identity, error = null, dirty, children }: RecordProps) {
  const d = useDensity();
  const copy = useUiCopy();

  const top = flatten(children);
  const railNode = pick(top, "rail");
  const paperNode = pick(top, "paper");
  const chatterSlot = propsOf<{ children?: ReactNode; layout?: "aside" | "page" }>(
    pick(top, "chatter"),
  );
  const chatter = chatterSlot?.children;
  /* La escotilla: lo que el arquetipo no previó se dibuja igual, en el papel.
     Que aparezca algo acá es la señal de que al arquetipo le falta una pieza. */
  const loose = top.filter(
    (node) =>
      slotOf(node) !== "rail" && slotOf(node) !== "paper" && slotOf(node) !== "chatter",
  );

  const rail = flatten(propsOf<RailProps>(railNode)?.children);
  const crumbs = propsOf<CrumbsProps>(pick(rail, "crumbs"))?.crumbs;
  const pager = propsOf<RecordPager>(pick(rail, "pager"));
  const smart = propsOf<SmartProps>(pick(rail, "smart"))?.links;
  const actions = propsOf<ActionsProps>(pick(rail, "actions"))?.children;
  const status = propsOf<StatusProps>(pick(rail, "status"));

  /* Las dos preguntas del estado, con la superficie ya resuelta: «¿dónde
     está?» y «¿qué pasó para llegar acá?». */
  const onTheRail =
    crumbs !== undefined ||
    pager !== undefined ||
    actions !== undefined ||
    dirty !== undefined;
  const railSurface = propsOf<RailProps>(railNode)?.surface ?? "canvas";
  const surface = onTheRail && d === "comfortable" ? railSurface : "canvas";

  const statusBlock =
    status === undefined ? undefined : (
      /* Apiladas en un bloque: arriba dónde está, abajo qué pasó para llegar.
         Lado a lado competían por el ancho con los botones y quedaban las dos
         truncadas; una debajo de la otra, cada una tiene su línea entera. */
      <div className="flex min-w-0 flex-col items-end gap-1.5">
        {status.stages === undefined ? null : (
          <StatusBar
            stages={status.stages}
            current={status.current ?? status.stages[0]?.id ?? ""}
            failed={status.failed ?? false}
            surface={surface}
          />
        )}
        {status.children}
      </div>
    );

  const paper = propsOf<PaperProps>(paperNode);
  const inPaper = [...flatten(paper?.children), ...loose];
  const fields = propsOf<FactsProps>(pick(inPaper, "facts"))?.fields;

  const notebook = propsOf<PagesProps>(pick(inPaper, "pages"));
  const pages = flatten(notebook?.children).filter((node) => slotOf(node) === "page");
  const tabs = pages
    .map((node) => propsOf<PageProps>(node))
    .filter((page): page is PageProps => page !== undefined)
    .map(({ id, label, icon, count, notice }) => ({
      id,
      label,
      ...(icon === undefined ? {} : { icon }),
      ...(count === undefined ? {} : { count }),
      ...(notice === undefined ? {} : { notice }),
    }));
  const current = notebook?.current ?? tabs[0]?.id ?? "";
  const pageBody = pages
    .map((node) => propsOf<PageProps>(node))
    .find((page) => page?.id === current)?.children;

  /* El orden de lectura es el orden de la pantalla: lo escrito ARRIBA del
     cuaderno se dibuja arriba —lo que antes era `sheetBody`—, lo escrito
     debajo se dibuja debajo de la página en curso. Sin cuaderno, el papel es
     sus hijos en orden y no hay una segunda regla. */
  const notebookAt = inPaper.findIndex((node) => slotOf(node) === "pages");
  const free = (nodes: readonly ReactNode[]) =>
    nodes.filter((node) => slotOf(node) === undefined);
  const above = notebookAt === -1 ? [] : free(inPaper.slice(0, notebookAt));
  const below = notebookAt === -1 ? free(inPaper) : free(inPaper.slice(notebookAt + 1));

  const hasFacts = fields !== undefined && fields.length > 0;
  const globalSheet = hasFacts || above.length > 0;
  const aspectsNode =
    tabs.length === 0 ? undefined : (
      <Tabs
        tabs={tabs}
        current={current}
        {...(notebook?.onChange === undefined ? {} : { onSelect: notebook.onChange })}
      />
    );

  return (
    /* `flex-1`: the record takes the height its frame gives it, so on a phone the thumb
       bar (last in it, `mt-auto`) reaches the bottom of the screen even when the record is
       shorter than the screen. The extra height has no paint of its own: on a desk
       nothing changes. */
    <article className="flex min-w-0 flex-1 flex-col">
      <RecordHeader
        railSurface={surface}
        {...(dirty === undefined ? {} : { dirty })}
        {...(crumbs === undefined ? {} : { crumbs })}
        {...(pager === undefined
          ? {}
          : {
              pager: (
                <PagerControl
                  index={pager.index}
                  total={pager.total}
                  surface={surface}
                  {...(pager.onPrev === undefined ? {} : { onPrev: pager.onPrev })}
                  {...(pager.onNext === undefined ? {} : { onNext: pager.onNext })}
                />
              ),
            })}
        {...(actions === undefined ? {} : { actions })}
        {...(statusBlock === undefined ? {} : { status: statusBlock })}
        {...(identity.icon === undefined ? {} : { icon: identity.icon })}
        title={identity.title}
        {...(identity.subtitle === undefined ? {} : { subtitle: identity.subtitle })}
        {...(identity.figure === undefined ? {} : { figure: identity.figure })}
        {...(identity.tag === undefined ? {} : { tag: identity.tag })}
        {...(smart === undefined || smart.length === 0
          ? {}
          : {
              smart: (
                <SmartButtons>
                  {smart.map((s) => (
                    <SmartButton
                      key={s.label}
                      icon={s.icon}
                      {...(s.count === undefined ? {} : { count: s.count })}
                      label={s.label}
                      layout={onTheRail && d === "comfortable" ? "inline" : "stacked"}
                      {...(s.onClick === undefined ? {} : { onClick: s.onClick })}
                    />
                  ))}
                </SmartButtons>
              ),
            })}
        {...(aspectsNode === undefined || globalSheet ? {} : { aspects: aspectsNode })}
        {...(chatter === undefined ? {} : { chatter })}
        {...(chatterSlot?.layout === undefined ? {} : { chatterLayout: chatterSlot.layout })}
      >
        <div
          className={`flex min-w-0 flex-col ${byDensity(
            d,
            "gap-(--spacing-block) px-4 pt-(--spacing-block) pb-4",
            "gap-2.5 pt-2.5 pb-2",
          )}`}
        >
          {error === null ? null : (
            <Failed heading={copy.failed.operation} sentence={error} />
          )}
          <Sheet
            layout={paper?.layout ?? "stacked"}
            columns={paper?.columns ?? 2}
            {...(hasFacts ? { fields } : {})}
            {...(above.length > 0 || (globalSheet && aspectsNode !== undefined)
              ? {
                  head: (
                    <>
                      {above}
                      {globalSheet && aspectsNode !== undefined ? (
                        <div
                          className={`border-b border-line-strong ${byDensity(d, "-mx-4 px-4", "")}`}
                        >
                          {aspectsNode}
                        </div>
                      ) : null}
                    </>
                  ),
                }
              : {})}
          >
            {pageBody}
            {below}
          </Sheet>
        </div>
      </RecordHeader>
    </article>
  );
}

Record.Skeleton = RecordSkeleton;
Record.Rail = Rail;
Record.Crumbs = Crumbs;
Record.Pager = PagerSlot;
Record.Smart = Smart;
Record.Actions = Actions;
Record.Status = Status;
Record.Paper = Paper;
Record.Chatter = ChatterSlot;
Record.Facts = Facts;
Record.Pages = Pages;
Record.Page = Page;
