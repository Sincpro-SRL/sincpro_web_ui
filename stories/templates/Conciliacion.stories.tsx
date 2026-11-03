import type { ResourceRef, ViewProps, ViewSpec } from "@sincpro/web-composer";
import {
  Button,
  type DataColumn,
  type LineItemColumn,
  LineItems,
  List,
  Pane,
  Panes,
  Record,
  SearchField,
  Tag,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  bs,
  type JournalItem,
  OPEN_ITEMS,
  STATEMENT,
  type StatementLine,
} from "../support/erp-bank";

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
  title: "5 · Plantillas/Conciliación · varios conjuntos a la vez",
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
