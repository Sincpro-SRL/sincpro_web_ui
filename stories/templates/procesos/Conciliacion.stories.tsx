import type { ResourceRef, ViewProps, ViewSpec } from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  type LineItemColumn,
  LineItems,
  List,
  NumberInput,
  Pane,
  Panes,
  Record,
  SearchField,
  Select,
  Tag,
  Tags,
  TextInput,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Landmark } from "lucide-react";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../../support/composer";
import {
  bs,
  type JournalItem,
  OPEN_ITEMS,
  STATEMENT,
  type StatementLine,
} from "../../support/erp-bank";

/**
 * Context: **the bank reconciliation** — Odoo's screen of several sets at once. On the left,
 * what the bank sent; on the right, the line being matched and, under it, the open journal
 * items that could pay it, each list with its OWN search. Choosing a statement line opens it
 * on the right; choosing a journal item adds it to the match; when the difference is zero,
 * «Validar» closes the line and the next one opens.
 *
 * Two `List`s and a `Record` on one screen, held by `Panes`: each pane scrolls on its own, so
 * the right side does not leave the screen while the left one is scrolled, and each list's bar
 * sticks to its own pane instead of fighting for the screen's header. It is still the two
 * archetypes — N records and one record — side by side, not a third view.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Procesos/Conciliación · varios conjuntos a la vez",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Elegí una línea del extracto: se abre a la derecha con los apuntes abiertos que la pueden pagar, cada lista con su búsqueda. Elegir un apunte lo suma a la conciliación; con la diferencia en cero, «Validar» la cierra y abre la siguiente. Cada panel scrollea solo; en el teléfono se apilan.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const has = (text: string, query: string) =>
  text.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"));

/** A day as the statement reads it: day and month — the year is the statement's. */
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const STATEMENT_COLUMNS = (done: readonly string[]): DataColumn<StatementLine>[] => [
  { id: "date", header: "fecha", value: (l) => l.date, cell: (l) => dayMonth(l.date) },
  { id: "label", header: "concepto", value: (l) => l.label },
  {
    id: "state",
    header: "estado",
    value: (l) => (done.includes(l.id) ? "conciliada" : "por conciliar"),
    cell: (l) =>
      done.includes(l.id) ? <Tag tone="good">Conciliada</Tag> : <Tag>Por conciliar</Tag>,
  },
  {
    id: "amount",
    header: "monto",
    value: (l) => l.amount,
    cell: (l) => bs(l.amount),
    numeric: true,
  },
];

const ITEM_COLUMNS: DataColumn<JournalItem>[] = [
  { id: "move", header: "asiento", value: (i) => i.move, mono: true },
  { id: "partner", header: "contacto", value: (i) => i.partner },
  { id: "account", header: "cuenta", value: (i) => i.account },
  {
    id: "residual",
    header: "abierto",
    value: (i) => i.residual,
    cell: (i) => bs(i.residual),
    numeric: true,
  },
];

const MATCH_COLUMNS: readonly LineItemColumn<JournalItem>[] = [
  { id: "move", header: "asiento", value: (i) => i.move },
  { id: "partner", header: "contacto", value: (i) => i.partner },
  {
    id: "residual",
    header: "monto",
    value: (i) => i.residual,
    cell: (i) => bs(i.residual),
    numeric: true,
  },
];

function Reconciliation({ api }: ViewProps) {
  const toast = useToast();
  const [lineQuery, setLineQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>(STATEMENT[0]!.id);
  const [matched, setMatched] = useState<JournalItem[]>([]);
  useEffect(() => api.setTitle("Conciliación · Banco BNB"), [api]);

  const line = STATEMENT.find((one) => one.id === current)!;
  const lines = STATEMENT.filter(
    (one) => lineQuery === "" || has(`${one.label} ${one.partner ?? ""}`, lineQuery),
  );
  const candidates = OPEN_ITEMS.filter(
    (one) =>
      !used.includes(one.id) &&
      !matched.some((m) => m.id === one.id) &&
      (itemQuery === "" || has(`${one.move} ${one.partner}`, itemQuery)),
  );
  const total = matched.reduce((sum, one) => sum + one.residual, 0);
  const difference = Math.round((line.amount - total) * 100) / 100;
  const closed = done.includes(line.id);

  const open = (id: string) => {
    setCurrent(id);
    setMatched([]);
    setItemQuery("");
  };
  const validate = () => {
    const was = { line: line.id, items: matched.map((m) => m.id) };
    setDone((now) => [...now, was.line]);
    setUsed((now) => [...now, ...was.items]);
    const next = STATEMENT.find((one) => one.id !== was.line && !done.includes(one.id));
    if (next !== undefined) open(next.id);
    toast.show({
      message: `Línea conciliada con ${was.items.length} ${was.items.length === 1 ? "apunte" : "apuntes"}.`,
      tone: "good",
      action: {
        label: "Deshacer",
        onSelect: () => {
          setDone((now) => now.filter((id) => id !== was.line));
          setUsed((now) => now.filter((id) => !was.items.includes(id)));
        },
      },
    });
  };

  return (
    <Panes>
      <Pane size="narrow" label="Extracto">
        <List<StatementLine>
          items={lines}
          keyOf={(l) => l.id}
          present="table"
          onChoose={(l) => open(l.id)}
          filtered={lineQuery !== ""}
          empty={{ sentence: "El banco no mandó movimientos." }}
        >
          <List.Bar>
            <List.Identity title="Extracto · Banco BNB" />
            <List.Search>
              <SearchField
                value={lineQuery}
                onChange={setLineQuery}
                placeholder="Buscar en el extracto…"
              />
            </List.Search>
          </List.Bar>
          <List.Table<StatementLine> columns={STATEMENT_COLUMNS(done)} />
        </List>
      </Pane>

      <Pane label="Conciliar">
        <Record
          identity={{
            icon: Landmark,
            title: line.label,
            subtitle: line.partner ?? "Sin contacto",
            figure: { label: "monto", value: bs(line.amount) },
          }}
        >
          <Record.Rail>
            <Record.Actions>
              <Button
                role="primary"
                size="sm"
                disabled={closed || matched.length === 0 || difference !== 0}
                onClick={validate}
              >
                Validar
              </Button>
            </Record.Actions>
          </Record.Rail>
          <Record.Paper>
            {closed ? (
              <Tag tone="good">Conciliada</Tag>
            ) : (
              <>
                <LineItems<JournalItem>
                  lines={matched}
                  columns={MATCH_COLUMNS}
                  getLineId={(i) => i.id}
                  lineLabel={(i) => i.move}
                  onRemove={(id) => setMatched((now) => now.filter((one) => one.id !== id))}
                  totals={[
                    { label: "Extracto", value: bs(line.amount) },
                    { label: "Conciliado", value: bs(total) },
                    { label: "Diferencia", value: bs(difference), total: true },
                  ]}
                />
                <List<JournalItem>
                  items={candidates}
                  keyOf={(i) => i.id}
                  embedded
                  present="table"
                  onChoose={(i) => setMatched((now) => [...now, i])}
                  filtered={itemQuery !== ""}
                  empty={{ sentence: "No quedan apuntes abiertos." }}
                >
                  <List.Bar>
                    <List.Identity title="Apuntes abiertos" />
                    <List.Search>
                      <SearchField
                        value={itemQuery}
                        onChange={setItemQuery}
                        placeholder="Buscar un asiento o un contacto…"
                      />
                    </List.Search>
                  </List.Bar>
                  <List.Table<JournalItem> columns={ITEM_COLUMNS} />
                </List>
              </>
            )}
          </Record.Paper>
        </Record>
      </Pane>
    </Panes>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "contabilidad",
    kind: "conciliacion",
    title: () => "Conciliación",
    icon: Landmark,
    load: async () => Reconciliation,
  },
];
const start: ResourceRef = { domain: "contabilidad", kind: "conciliacion" };

/** **Conciliar el extracto.** Elegí la línea de la Clínica San Gabriel: la pagan dos facturas.
 *  Buscalas en los apuntes abiertos, elegí las dos y «Validar». */
export const Conciliar: Story = {
  name: "Conciliar el extracto",
  render: () => <Workspace views={VIEWS} start={start} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* Two panes, each with its own search. */
    const statement = within(await canvas.findByRole("region", { name: "Extracto" }));
    const work = within(canvas.getByRole("region", { name: "Conciliar" }));
    await userEvent.click(statement.getByText("ACH CLINICA SAN GABRIEL 0103 0115"));
    await expect(
      await work.findByRole("heading", { name: "ACH CLINICA SAN GABRIEL 0103 0115" }),
    ).toBeVisible();
    /* The journal items' search narrows only its own list. */
    await userEvent.type(work.getByRole("searchbox"), "San Gabriel");
    await expect(statement.getByText("QR DISTRIBUIDORA ANDINA")).toBeVisible();
    await userEvent.click(work.getByText("FAC/2026/0103"));
    await userEvent.click(work.getByText("FAC/2026/0115"));
    /* Two invoices pay the line: the difference is zero and «Validar» closes it. */
    const validate = work.getByRole("button", { name: "Validar" });
    await waitFor(() => expect(validate).toBeEnabled());
    await userEvent.click(validate);
    /* The toast is portalled to the page, outside the story's canvas. */
    await expect(
      await within(document.body).findByText(/Línea conciliada con 2 apuntes/),
    ).toBeVisible();
    await expect(statement.getByText("Conciliada")).toBeVisible();
  },
};

/* ==================================================================== *
 *  THREE WINDOWS — Odoo's reconciliation as three views of the workspace
 * ==================================================================== */

/**
 * The same reconciliation as Odoo 17 draws it, in THREE windows that composer places: the
 * statement as the page (the main thing, with its search), and on the right, stacked and
 * resizable, the ENTRY being built and the open ITEMS that can pay it (with their own search).
 * Each one is its own view; none imports the others. They read the same reconciliation — the
 * shared state stands for the server — and the person resizes, folds or takes any of them to
 * the page. The entry is editable where Odoo lets it be: a matched item can be paid in part,
 * and the difference becomes an adjustment line whose account, label and amount are written
 * in place.
 */

type EntryLine = {
  id: string;
  kind: "match" | "adjust";
  account: string;
  partner: string;
  label: string;
  amount: number;
  /** For a matched item: what was open, the most it can take. */
  open?: number;
};

const ACCOUNTS = [
  { value: "6991 Gastos bancarios", label: "6991 Gastos bancarios" },
  { value: "6992 Diferencias de cambio", label: "6992 Diferencias de cambio" },
  { value: "4991 Otros ingresos", label: "4991 Otros ingresos" },
  { value: "1121 Clientes", label: "1121 Clientes" },
];

type Reconcile = {
  current: string;
  open: (id: string) => void;
  entry: readonly EntryLine[];
  setEntry: (next: readonly EntryLine[]) => void;
  done: readonly string[];
  used: readonly string[];
  validate: () => { line: string; items: readonly string[] };
  undo: (was: { line: string; items: readonly string[] }) => void;
};
const ReconcileContext = createContext<Reconcile | null>(null);
function useReconcile(): Reconcile {
  const r = useContext(ReconcileContext);
  if (r === null) throw new Error("useReconcile outside ReconcileProvider");
  return r;
}
function ReconcileProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(STATEMENT[0]!.id);
  const [entry, setEntry] = useState<readonly EntryLine[]>([]);
  const [done, setDone] = useState<readonly string[]>([]);
  const [used, setUsed] = useState<readonly string[]>([]);
  const value: Reconcile = {
    current,
    open: (id) => {
      setCurrent(id);
      setEntry([]);
    },
    entry,
    setEntry,
    done,
    used,
    validate: () => {
      const was = {
        line: current,
        items: entry.filter((l) => l.kind === "match").map((l) => l.id),
      };
      setDone((now) => [...now, was.line]);
      setUsed((now) => [...now, ...was.items]);
      const next = STATEMENT.find((one) => one.id !== was.line && !done.includes(one.id));
      setEntry([]);
      if (next !== undefined) setCurrent(next.id);
      return was;
    },
    undo: (was) => {
      setDone((now) => now.filter((id) => id !== was.line));
      setUsed((now) => now.filter((id) => !was.items.includes(id)));
    },
  };
  return <ReconcileContext.Provider value={value}>{children}</ReconcileContext.Provider>;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The statement — the page. */
function StatementView({ api }: ViewProps) {
  const r = useReconcile();
  const [query, setQuery] = useState("");
  useEffect(() => api.setTitle("Extracto · Banco BNB"), [api]);
  const lines = STATEMENT.filter(
    (one) => query === "" || has(`${one.label} ${one.partner ?? ""}`, query),
  );
  const pending = STATEMENT.filter((one) => !r.done.includes(one.id)).length;
  return (
    <List<StatementLine>
      items={lines}
      keyOf={(l) => l.id}
      present="table"
      onChoose={(l) => r.open(l.id)}
      filtered={query !== ""}
      empty={{ sentence: "El banco no mandó movimientos." }}
    >
      <List.Bar>
        <List.Identity
          title="Extracto · Banco BNB"
          counters={[
            { label: "por conciliar", value: pending, tone: pending === 0 ? "good" : "warn" },
            { label: "conciliadas", value: r.done.length },
          ]}
        />
        <List.Search>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar en el extracto…"
          />
        </List.Search>
      </List.Bar>
      <List.Table<StatementLine> columns={STATEMENT_COLUMNS(r.done)} />
    </List>
  );
}

/** The entry being built — a panel. */
function EntryView({ api }: ViewProps) {
  const r = useReconcile();
  const toast = useToast();
  const line = STATEMENT.find((one) => one.id === r.current)!;
  useEffect(() => api.setTitle("Asiento"), [api]);
  const settled = round(r.entry.reduce((sum, one) => sum + one.amount, 0));
  const difference = round(line.amount - settled);
  const closed = r.done.includes(line.id);

  const columns: readonly LineItemColumn<EntryLine>[] = [
    {
      id: "account",
      header: "Cuenta",
      value: (l) => l.account,
      edit: (l, set) =>
        l.kind === "adjust" ? (
          <Select
            aria-label="Cuenta"
            value={l.account}
            options={ACCOUNTS}
            onChange={(account) => set({ ...l, account })}
          />
        ) : (
          l.account
        ),
    },
    { id: "partner", header: "Contacto", value: (l) => l.partner },
    {
      id: "label",
      header: "Etiqueta",
      value: (l) => l.label,
      edit: (l, set) => (
        <TextInput
          aria-label="Etiqueta"
          value={l.label}
          onChange={(label) => set({ ...l, label })}
        />
      ),
    },
    {
      id: "amount",
      header: "Monto",
      numeric: true,
      value: (l) => l.amount,
      cell: (l) => bs(l.amount),
      edit: (l, set) => (
        <NumberInput
          aria-label="Monto"
          value={l.amount}
          {...(l.open === undefined
            ? {}
            : l.open >= 0
              ? { min: 0, max: l.open }
              : { min: l.open, max: 0 })}
          onChange={(v) => set({ ...l, amount: v === "" ? 0 : v })}
        />
      ),
    },
  ];

  const validate = () => {
    const was = r.validate();
    toast.show({
      message: `Línea conciliada con ${r.entry.length} ${r.entry.length === 1 ? "apunte" : "apuntes"}.`,
      tone: "good",
      action: { label: "Deshacer", onSelect: () => r.undo(was) },
    });
  };

  return (
    <Record
      identity={{
        icon: Landmark,
        title: line.label,
        subtitle: line.partner ?? "Sin contacto",
        figure: { label: "monto", value: bs(line.amount) },
      }}
    >
      <Record.Rail>
        <Record.Actions>
          <Button
            role="primary"
            size="sm"
            disabled={closed || r.entry.length === 0 || difference !== 0}
            onClick={validate}
          >
            Validar
          </Button>
          <Button
            role="secondary"
            size="sm"
            disabled={closed || difference === 0}
            onClick={() =>
              r.setEntry([
                ...r.entry,
                {
                  id: `adj${r.entry.length}`,
                  kind: "adjust",
                  account: line.amount < 0 ? "6991 Gastos bancarios" : "4991 Otros ingresos",
                  partner: line.partner ?? "—",
                  label: line.amount < 0 ? "Comisión bancaria" : "Diferencia",
                  amount: difference,
                },
              ])
            }
          >
            Ajustar la diferencia
          </Button>
        </Record.Actions>
      </Record.Rail>
      <Record.Paper>
        {closed ? (
          <Tag tone="good">Conciliada</Tag>
        ) : (
          <LineItems<EntryLine>
            lines={r.entry}
            columns={columns}
            getLineId={(l) => l.id}
            lineLabel={(l) => l.label}
            onChange={(id, next) =>
              r.setEntry(r.entry.map((one) => (one.id === id ? next : one)))
            }
            onRemove={(id) => r.setEntry(r.entry.filter((one) => one.id !== id))}
            totals={[
              { label: "Extracto", value: bs(line.amount) },
              { label: "Conciliado", value: bs(settled) },
              { label: "Diferencia", value: bs(difference), total: true },
            ]}
          />
        )}
      </Record.Paper>
    </Record>
  );
}

/** The open items that can pay it — another panel, with its own search. */
function ItemsView({ api }: ViewProps) {
  const r = useReconcile();
  const [query, setQuery] = useState("");
  useEffect(() => api.setTitle("Apuntes por conciliar"), [api]);
  const line = STATEMENT.find((one) => one.id === r.current)!;
  const items = OPEN_ITEMS.filter(
    (one) =>
      !r.used.includes(one.id) &&
      !r.entry.some((m) => m.id === one.id) &&
      (query === "" || has(`${one.move} ${one.partner}`, query)),
  );
  const take = (item: JournalItem) => {
    const rest = round(line.amount - r.entry.reduce((sum, one) => sum + one.amount, 0));
    /* Odoo's way: the item takes what is still open, or only the rest of the line. */
    const amount =
      Math.abs(item.residual) > Math.abs(rest) && rest !== 0 ? rest : item.residual;
    r.setEntry([
      ...r.entry,
      {
        id: item.id,
        kind: "match",
        account: item.account,
        partner: item.partner,
        label: item.move,
        amount,
        open: item.residual,
      },
    ]);
  };
  return (
    <List<JournalItem>
      items={items}
      keyOf={(i) => i.id}
      present="table"
      onChoose={take}
      filtered={query !== ""}
      empty={{ sentence: "No quedan apuntes abiertos." }}
    >
      <List.Bar>
        <List.Identity title="Apuntes por conciliar" />
        <List.Search>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar un asiento o un contacto…"
          />
        </List.Search>
      </List.Bar>
      <List.Filters>
        <Tags
          size="md"
          label="Sugeridos"
          items={[
            {
              id: "partner",
              label: line.partner === null ? "Sin contacto" : `De ${line.partner}`,
              selected: query !== "" && line.partner !== null && has(line.partner, query),
              onSelect: () => setQuery(line.partner ?? ""),
            },
          ]}
        />
      </List.Filters>
      <List.Table<JournalItem> columns={ITEM_COLUMNS} />
    </List>
  );
}

const THREE: readonly ViewSpec[] = [
  {
    domain: "conciliacion",
    kind: "extracto",
    title: () => "Extracto",
    icon: Landmark,
    load: async () => StatementView,
  },
  {
    domain: "conciliacion",
    kind: "asiento",
    title: () => "Asiento",
    icon: Landmark,
    load: async () => EntryView,
  },
  {
    domain: "conciliacion",
    kind: "apuntes",
    title: () => "Apuntes por conciliar",
    icon: Landmark,
    load: async () => ItemsView,
  },
];

/** **Tres ventanas, como Odoo.** El extracto es la página; a la derecha, apilados, el asiento
 *  que se arma y los apuntes que lo pueden pagar. Elegí la línea de la Clínica San Gabriel,
 *  tocá «De Clínica San Gabriel» en los apuntes y sumá las dos facturas: la diferencia queda
 *  en cero. En la comisión del banco, «Ajustar la diferencia» crea la línea de gasto, editable. */
export const TresVentanas: Story = {
  name: "Tres ventanas · extracto, asiento y apuntes",
  render: () => (
    <ReconcileProvider>
      <Workspace
        views={THREE}
        start={{ domain: "conciliacion", kind: "extracto" }}
        panels={[
          { ref: { domain: "conciliacion", kind: "asiento" } },
          { ref: { domain: "conciliacion", kind: "apuntes" } },
        ]}
      />
    </ReconcileProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(await canvas.findByText("ACH CLINICA SAN GABRIEL 0103 0115"));
    await userEvent.click(await canvas.findByRole("row", { name: /De Clínica San Gabriel/ }));
    await userEvent.click(await canvas.findByText("FAC/2026/0103"));
    await userEvent.click(await canvas.findByText("FAC/2026/0115"));
    const validate = canvas.getByRole("button", { name: "Validar" });
    await waitFor(() => expect(validate).toBeEnabled());
    await userEvent.click(validate);
    await expect(await page.findByText(/Línea conciliada con 2 apuntes/)).toBeVisible();
    /* The bank's fee: no item pays it — the difference becomes an expense line. */
    await userEvent.click(canvas.getByText("COMISION MANTENIMIENTO CUENTA"));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Ajustar la diferencia" }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Validar" })).toBeEnabled(),
    );
  },
};
