import {
  Destination,
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  ActivityBadge,
  type AppEntry,
  Avatar,
  Button,
  DataField,
  DatePicker,
  Field,
  FormActions,
  KanbanState,
  List,
  MessageComposer,
  type MessageKind,
  Metric,
  Metrics,
  Priority,
  Record,
  RecordCard,
  SearchField,
  SegmentedControl,
  SheetGroup,
  SheetGroups,
  Tag,
  TagsField,
  TextInput,
  TopBar,
  type TopMenu,
  UserChip,
  useToast,
  writeANote,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
  Handshake,
  LogOut,
  Mail,
  MessageCircle,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  ACTIVITY_TONE,
  bolivianos,
  CRM_EVENTS,
  CRM_MESSAGES,
  CRM_STAGES,
  type CrmStage,
  OPPORTUNITIES,
  type Opportunity,
} from "../support/erp-crm";

/**
 * A CRM — the pipeline of opportunities and one of them with its conversation.
 *
 * Context: the screen a salesperson lives in. The board is the pipeline by stage: the expected
 * revenue of each column on its head, the activity bar under it (overdue red, today amber,
 * planned green), quick create, «Ganado» and «Perdido» folded, and a card that says without
 * opening it how hot it is (stars), whether it can move on (the traffic light), who is waiting
 * on whom (the clock) and whose it is. The same records as a table and on a calendar of their
 * next activity. The opportunity is a record whose stages are chosen, with the conversation
 * with the customer — WhatsApp, mail and internal notes — in its activity.
 *
 * Built ONLY from the public API: no className, no style (tests/templates.test.ts).
 */

const APPS: AppEntry[] = [
  { id: "crm", label: "CRM", icon: Handshake, hint: "Oportunidades y pipeline" },
  { id: "ventas", label: "Ventas", icon: ShoppingCart, hint: "Cotizaciones y pedidos" },
  { id: "contactos", label: "Contactos", icon: Users, hint: "Clientes y proveedores" },
];

const MENUS: TopMenu[] = [
  {
    id: "ventas",
    label: "Ventas",
    groups: [
      {
        options: [
          { id: "pipeline", label: "Mi pipeline" },
          { id: "equipo", label: "Equipos" },
        ],
      },
    ],
  },
  {
    id: "informes",
    label: "Informes",
    groups: [
      { options: [{ id: "pronostico", label: "Pronóstico", icon: ChartNoAxesCombined }] },
    ],
  },
];

const ACCOUNT = [
  {
    options: [
      { id: "perfil", label: "Mi perfil", icon: UserCog },
      { id: "prefs", label: "Preferencias", icon: Settings },
    ],
  },
  { options: [{ id: "salir", label: "Cerrar sesión", icon: LogOut }] },
];

const MENU = (
  <TopBar
    apps={APPS}
    currentApp="crm"
    menus={MENUS}
    user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
    userGroups={ACCOUNT}
  />
);

/* The workspace's references: the views below never import each other, they open these. */
const pipelineRef = (present?: string): ResourceRef => ({
  domain: "crm",
  kind: "pipeline",
  ...(present === undefined ? {} : { params: { present } }),
});
const opportunityRef = (o: Opportunity): ResourceRef => ({
  domain: "crm",
  kind: "oportunidad",
  id: o.id,
});
const activityRef = (o: Opportunity): ResourceRef => ({
  domain: "crm",
  kind: "actividad",
  id: o.id,
});

/* The opportunities the views share: the pipeline and an opportunity are two views of the same
   records, so a stage changed in one is the stage in the other. In an app this is the server. */
type Crm = {
  items: readonly Opportunity[];
  update: (next: Opportunity) => void;
  add: (next: Opportunity) => void;
};
const CrmContext = createContext<Crm | null>(null);
function useCrm(): Crm {
  const crm = useContext(CrmContext);
  if (crm === null) throw new Error("useCrm outside CrmProvider");
  return crm;
}
function CrmProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<readonly Opportunity[]>(OPPORTUNITIES);
  const crm = useMemo<Crm>(
    () => ({
      items,
      update: (next) =>
        setItems((all) => all.map((one) => (one.id === next.id ? next : one))),
      add: (next) => setItems((all) => [...all, next]),
    }),
    [items],
  );
  return <CrmContext value={crm}>{children}</CrmContext>;
}

/* ---------------------------------------------------------------- *
 *  The pipeline
 * ---------------------------------------------------------------- */

function OpportunityCard({
  o,
  onOpen,
  onActivity,
  onChange,
}: {
  o: Opportunity;
  onOpen: () => void;
  onActivity: () => void;
  onChange: (next: Opportunity) => void;
}) {
  return (
    <RecordCard
      title={o.name}
      subtitle={o.customer}
      figure={bolivianos(o.expected)}
      tags={o.tags.map((tag) => (
        <Tag key={tag}>{tag}</Tag>
      ))}
      footer={
        <>
          <Priority
            value={o.priority}
            onChange={(priority) => onChange({ ...o, priority })}
          />
          <ActivityBadge
            state={o.activity}
            {...(o.activityDetail === "" ? {} : { detail: o.activityDetail })}
            onClick={onActivity}
          />
          <KanbanState value={o.state} onChange={(state) => onChange({ ...o, state })} />
          <Avatar name={o.salesperson} size="sm" />
        </>
      }
      onOpen={onOpen}
    />
  );
}

/** The pipeline, a VIEW of the workspace: a card opens the opportunity as the page (with its
 *  crumb back), its 👁 as a peek, its clock the activity in a modal over the pipeline. */
function Pipeline({ api, resource }: ViewProps) {
  const { items, update, add } = useCrm();
  const crumbs = useCrumbs(api);
  const onOpen = (o: Opportunity) => api.open(opportunityRef(o));
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<"board" | "table" | "calendar" | "rows">(
    (resource.params?.["present"] as "calendar" | undefined) ?? "board",
  );
  const wanted = query.trim().toLocaleLowerCase("es");
  const visible = items.filter((o) =>
    `${o.name} ${o.customer}`.toLocaleLowerCase("es").includes(wanted),
  );
  const open = items.filter((o) => o.stage !== "ganado" && o.stage !== "perdido");

  return (
    <List<Opportunity>
      items={visible}
      keyOf={(o) => o.id}
      present={shown}
      onPresentChange={(next) => setShown(next as typeof shown)}
      rowClick="open"
      onOpen={onOpen}
      onPeek={(o) => api.open(opportunityRef(o), { to: Destination.Peek })}
      filtered={wanted !== ""}
      empty={{ sentence: "Todavía no hay oportunidades." }}
    >
      <List.Bar>
        <List.Crumbs crumbs={crumbs} />
        <List.Identity
          title="Pipeline"
          description="las oportunidades del equipo, por etapa"
          counters={[
            { label: "abiertas", value: open.length },
            { label: "ganadas", value: items.filter((o) => o.stage === "ganado").length },
          ]}
        />
        <List.Search>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar una oportunidad o un cliente…"
          />
        </List.Search>
        <List.Actions>
          <Button role="primary" size="sm">
            Nueva oportunidad
          </Button>
        </List.Actions>
      </List.Bar>

      <List.Metrics>
        <Metrics>
          <Metric
            value={bolivianos(open.reduce((sum, o) => sum + o.expected, 0))}
            label="esperado en el pipeline"
          />
          <Metric
            value={bolivianos(
              open.reduce((sum, o) => sum + (o.expected * o.probability) / 100, 0),
            )}
            label="ponderado por probabilidad"
          />
          <Metric
            value={items.filter((o) => o.activity === "overdue").length}
            label="con actividades vencidas"
            tone="bad"
          />
        </Metrics>
      </List.Metrics>

      <List.Board<Opportunity>
        card={(o) => (
          <OpportunityCard
            o={o}
            onOpen={() => onOpen(o)}
            onActivity={() =>
              api.open(activityRef(o), { to: Destination.Modal, size: { w: 520, h: 420 } })
            }
            onChange={update}
          />
        )}
        stages={{
          of: (o) => o.stage,
          columns: CRM_STAGES,
          nameOf: (o) => o.name,
          total: (inside) => bolivianos(inside.reduce((sum, o) => sum + o.expected, 0)),
          progress: (o) => ACTIVITY_TONE[o.activity],
          defaultFolded: ["ganado", "perdido"],
          onMove: (o, to) => update({ ...o, stage: to as CrmStage }),
          onQuickCreate: (stage, name) =>
            add({
              ...OPPORTUNITIES[0]!,
              id: `nueva-${items.length + 1}`,
              name,
              customer: "sin cliente todavía",
              expected: 0,
              priority: 0,
              stage: stage as CrmStage,
              state: "normal",
              activity: "none",
              activityDetail: "",
              tags: [],
            }),
        }}
      />
      <List.Rows<Opportunity>
        header={{
          name: "oportunidad · cliente",
          meta: "esperado · probabilidad",
          tags: "etapa",
        }}
        row={(o) => ({
          avatar: { name: o.customer },
          name: `${o.name} · ${o.customer}`,
          meta: `${bolivianos(o.expected)} · ${o.probability} %`,
          tags: <Tag>{CRM_STAGES.find((s) => s.id === o.stage)?.label}</Tag>,
        })}
      />
      <List.Table<Opportunity>
        totals
        columns={[
          { id: "name", header: "Oportunidad", value: (o) => o.name },
          { id: "customer", header: "Cliente", value: (o) => o.customer },
          {
            id: "stage",
            header: "Etapa",
            value: (o) => CRM_STAGES.find((s) => s.id === o.stage)?.label ?? o.stage,
          },
          {
            id: "priority",
            header: "Prioridad",
            value: (o) => o.priority,
            cell: (o) => <Priority value={o.priority} />,
          },
          { id: "salesperson", header: "Vendedor", value: (o) => o.salesperson },
          {
            id: "expected",
            header: "Esperado (Bs.)",
            value: (o) => o.expected,
            numeric: true,
            aggregate: "sum",
          },
        ]}
      />
      <List.Calendar<Opportunity>
        titleOf={(o) => o.activityDetail || "Seguimiento"}
        startOf={(o) => o.activityAt}
        endOf={(o) => new Date(o.activityAt.getTime() + 60 * 60 * 1000)}
        toneOf={(o) => ACTIVITY_TONE[o.activity] ?? "neutral"}
        avatarOf={(o) => ({ name: o.salesperson })}
        metaOf={(o) => o.customer}
        date={new Date(2026, 10, 2)}
        onMove={(o, start) => update({ ...o, activityAt: start })}
      />
    </List>
  );
}

/* ---------------------------------------------------------------- *
 *  One opportunity, with its conversation
 * ---------------------------------------------------------------- */

const TEAM = ["Andrés Gutiérrez", "Josefa Muñoz", "Carla Rojas", "Lic. Mónica Vargas"];

const WAYS: MessageKind[] = [
  {
    id: "whatsapp",
    label: "Enviar por WhatsApp",
    recipients: ["Lic. Mónica Vargas · +591 71 456 210"],
    placeholder: "Escribile al cliente…",
  },
  {
    id: "correo",
    label: "Enviar un correo",
    recipients: ["mvargas@sangabriel.bo"],
    placeholder: "Asunto y mensaje…",
  },
];

/** One opportunity, a VIEW: its crumbs come from the workspace (the way back to the pipeline),
 *  its stage is the shared one, and «Programar actividad» is a modal over THIS record. */
function Opportunity_({ api, resource }: ViewProps) {
  const { items, update } = useCrm();
  const o = items.find((one) => one.id === resource.id) ?? OPPORTUNITIES[0]!;
  const crumbs = useCrumbs(api);
  useEffect(() => api.setTitle(o.name), [api, o.name]);
  const stage = o.stage;
  const setStage = (next: CrmStage) => update({ ...o, stage: next });
  const [priority, setPriority] = useState(o.priority);
  const [messages, setMessages] = useState(CRM_MESSAGES);
  const [followers, setFollowers] = useState<string[]>([o.salesperson, "Josefa Muñoz"]);
  const won = stage === "ganado";
  const lost = stage === "perdido";
  return (
    <Record
      identity={{
        icon: Handshake,
        title: o.name,
        subtitle: o.customer,
        tag: {
          label: CRM_STAGES.find((s) => s.id === stage)?.label ?? stage,
          tone: won ? "good" : lost ? "bad" : "info",
        },
        figure: { label: "Ingreso esperado", value: bolivianos(o.expected) },
      }}
    >
      <Record.Rail>
        <Record.Crumbs crumbs={crumbs} />
        <Record.Smart
          links={[
            { icon: FileText, count: 2, label: "cotizaciones" },
            { icon: CalendarDays, count: 3, label: "reuniones" },
            { icon: Mail, count: 5, label: "correos" },
          ]}
        />
        <Record.Actions>
          <Button role="primary" size="sm">
            Nueva cotización
          </Button>
          <Button
            role="secondary"
            size="sm"
            onClick={() =>
              api.open(activityRef(o), { to: Destination.Modal, size: { w: 520, h: 420 } })
            }
          >
            Programar actividad
          </Button>
          <Button role="secondary" size="sm" onClick={() => setStage("ganado")}>
            Ganado
          </Button>
          <Button role="secondary" size="sm" onClick={() => setStage("perdido")}>
            Perdido
          </Button>
        </Record.Actions>
        <Record.Status
          stages={CRM_STAGES.filter((s) => s.id !== "perdido")}
          current={stage}
          failed={lost}
          onSelect={(id) => setStage(id as CrmStage)}
        />
      </Record.Rail>

      <Record.Paper layout="horizontal">
        {won ? <Record.Ribbon label="Ganado" tone="good" /> : null}
        {lost ? <Record.Ribbon label="Perdido" tone="bad" /> : null}
        <SheetGroups columns={2}>
          <SheetGroup title="Cliente" icon={Users}>
            <DataField label="Empresa" value={o.customer} />
            <DataField label="Contacto" value={o.contact} />
            <DataField label="Correo" value={o.email} />
            <DataField label="Teléfono" value={o.phone} />
          </SheetGroup>
          <SheetGroup title="Oportunidad" icon={MessageCircle}>
            <DataField label="Probabilidad" value={`${o.probability} %`} />
            <DataField
              label="Prioridad"
              value={<Priority value={priority} onChange={setPriority} />}
            />
            <DataField label="Vendedor" value={<UserChip name={o.salesperson} />} />
            <Field label="Seguidores">
              <TagsField
                value={followers}
                onChange={setFollowers}
                options={TEAM.map((name) => ({ value: name, label: name, avatar: true }))}
              />
            </Field>
            <DataField
              label="Próxima actividad"
              value={
                <>
                  <ActivityBadge state={o.activity} detail={o.activityDetail} />
                  {o.activityDetail}
                </>
              }
            />
          </SheetGroup>
        </SheetGroups>
        <Record.Audit
          created={{ by: o.salesperson, at: "20/10/2026" }}
          updated={{ by: o.contact, at: "hace 1 día" }}
        />
      </Record.Paper>

      <Record.Activity
        events={CRM_EVENTS}
        messages={messages}
        composer={
          <MessageComposer
            kinds={[...WAYS, writeANote()]}
            onSend={(body, kind) =>
              setMessages((all) => [
                ...all,
                {
                  id: `c${all.length + 1}`,
                  author: "Andrés Gutiérrez",
                  at: new Date(2026, 10, 1, 9, 0),
                  body,
                  ...(kind.internal === true ? { internal: true } : {}),
                },
              ])
            }
          />
        }
      />
    </Record>
  );
}

/** «Programar actividad», a short task: a MODAL of the workspace over the surface that asked
 *  (the pipeline, or the opportunity), which blocks only that one. */
const KINDS = [
  { value: "llamada", label: "Llamada" },
  { value: "reunion", label: "Reunión" },
  { value: "correo", label: "Correo" },
];

function Activity_({ api, resource }: ViewProps) {
  const { items, update } = useCrm();
  const toast = useToast();
  const o = items.find((one) => one.id === resource.id) ?? OPPORTUNITIES[0]!;
  const [kind, setKind] = useState("llamada");
  const [summary, setSummary] = useState(o.activityDetail);
  const [day, setDay] = useState<string | null>("2026-11-05");
  useEffect(() => api.setTitle(`Programar actividad · ${o.name}`), [api, o.name]);
  return (
    <Record
      identity={{ icon: CalendarDays, title: "Programar actividad", subtitle: o.customer }}
    >
      <Record.Paper>
        <Field label="Tipo">
          <SegmentedControl value={kind} onChange={setKind} options={KINDS} />
        </Field>
        <Field label="Resumen">
          <TextInput
            value={summary}
            onChange={setSummary}
            placeholder="Llamar para confirmar la demo"
          />
        </Field>
        <Field label="Vence">
          <DatePicker value={day} onChange={setDay} />
        </Field>
        <FormActions
          secondary={
            <Button role="secondary" size="sm" onClick={() => api.close()}>
              Cancelar
            </Button>
          }
          primary={
            <Button
              role="primary"
              size="sm"
              onClick={() => {
                const [y, m, d] = (day ?? "2026-11-05").split("-").map(Number);
                update({
                  ...o,
                  activity: "planned",
                  activityDetail: summary === "" ? "Seguimiento" : summary,
                  activityAt: new Date(y ?? 2026, (m ?? 11) - 1, d ?? 5, 10),
                });
                toast.show({ tone: "good", message: "Actividad programada" });
                api.close();
              }}
            >
              Programar
            </Button>
          }
        />
      </Record.Paper>
    </Record>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "crm",
    kind: "pipeline",
    title: () => "Pipeline",
    icon: Handshake,
    goto: true,
    load: async () => Pipeline,
  },
  {
    domain: "crm",
    kind: "oportunidad",
    title: (ref) => OPPORTUNITIES.find((o) => o.id === ref.id)?.name ?? "Oportunidad",
    icon: Handshake,
    search: async (query) =>
      OPPORTUNITIES.filter((o) =>
        `${o.name} ${o.customer}`
          .toLocaleLowerCase("es")
          .includes(query.toLocaleLowerCase("es")),
      ).map((o) => ({ ref: opportunityRef(o), label: o.name, detail: o.customer })),
    load: async () => Opportunity_,
  },
  {
    domain: "crm",
    kind: "actividad",
    title: () => "Programar actividad",
    icon: CalendarDays,
    load: async () => Activity_,
  },
];

function Crm({ start }: { start: ResourceRef }) {
  return (
    <CrmProvider>
      <Workspace views={VIEWS} start={start} menu={MENU} />
    </CrmProvider>
  );
}

const meta: Meta = {
  title: "5 · Plantillas/CRM · pipeline y conversación",
  tags: ["screen"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "El CRM de una empresa de software: el pipeline por etapa (ingreso esperado por columna, barra de actividades, crear rápido, ganado y perdido plegados, tarjetas con prioridad, semáforo, actividad y responsable), la misma cartera en tabla y en el calendario de sus próximas actividades, y una oportunidad con sus etapas elegibles y la conversación con el cliente — WhatsApp, correo y notas internas.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** El pipeline: tocá una tarjeta para abrir la oportunidad; arrastrala a otra etapa (o Alt +
 *  ← / →); el «+» de una columna crea rápido. «Ganado» y «Perdido» están plegados. */
export const Pipeline_: Story = {
  name: "Pipeline",
  render: () => <Crm start={pipelineRef()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lane = (name: string) => within(canvas.getByRole("region", { name }));
    /* Quick create in «Nuevo»: the column counts one more. */
    await userEvent.click(
      await canvas.findByRole("button", { name: "Crear rápido en Nuevo" }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Crear rápido en Nuevo" }),
      "Chatbot de ventas{Enter}",
    );
    await expect(lane("Nuevo").getByText("Chatbot de ventas")).toBeVisible();
    /* Open a card: the opportunity, with its conversation. */
    await userEvent.click(
      canvas.getByRole("button", { name: "Implementación Odoo — ventas y POS" }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Implementación Odoo",
      ),
    );
  },
};

/** La misma cartera en el calendario de sus próximas actividades: arrastrar una la reprograma. */
export const Actividades: Story = {
  render: () => <Crm start={pipelineRef("calendar")} />,
};

/** Una oportunidad: las etapas se eligen en el riel, «Ganado» pone la cinta, y la actividad
 *  lleva la conversación con el cliente — WhatsApp, correo y notas internas. */
export const Oportunidad: Story = {
  render: () => <Crm start={opportunityRef(OPPORTUNITIES[0]!)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Ganado" }));
    await expect(canvas.getByText("Ganado", { selector: "[role=status]" })).toBeVisible();
  },
};
