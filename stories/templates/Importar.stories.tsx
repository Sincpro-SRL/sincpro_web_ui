import {
  Destination,
  type ResourceRef,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  Button,
  Callout,
  type DataColumn,
  DataTable,
  DropZone,
  Field,
  List,
  Select,
  StepFlow,
  Table,
  Tag,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Upload, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  type Contact,
  CONTACT_FIELDS,
  type ContactField,
  EXISTING_CONTACTS,
  guessMapping,
  IMPORT_FILE,
  type ImportRow,
  type Mapping,
  mappingProblem,
  reviewRows,
} from "../support/erp-import";

/**
 * Context: **an operation in several steps, done in one sitting** — importing contacts from a
 * file: upload › map the columns › review. Each step needs the answer of the one before: the
 * columns to map ARE the file, and what gets created is the file read through the mapping.
 * That is what earns steps (`StepFlow`); a form whose fields do not depend on each other is
 * one page.
 *
 * It opens from the list as a composer MODAL that answers (`api.pick` → `api.answer`), the
 * same contract as «Registrar pago» over N invoices: the flow draws no dialog of its own, the
 * workspace does. The list applies what the import answers — the new contacts — and offers
 * «Deshacer» instead of a «¿seguro?». Closing the modal changes nothing.
 *
 * Every step that cannot go on SAYS why, next to the disabled «Siguiente»: no file yet, no
 * column chosen as the name, a field chosen twice, nothing left to import.
 */
const meta: Meta = {
  /* A screen a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "5 · Plantillas/Importar",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "«Importar» en la lista de contactos abre la operación en un MODAL de tres pasos: subir el archivo, decir qué columna es qué campo, y revisar qué se crea y qué filas tienen errores. «Importar N contactos» contesta a la lista, que los agrega y ofrece «Deshacer».",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const listRef: ResourceRef = { domain: "contactos", kind: "lista" };
const importRef: ResourceRef = { domain: "contactos", kind: "importar" };

const CONTACT_COLUMNS: DataColumn<Contact>[] = [
  { id: "name", header: "nombre", value: (c) => c.name },
  { id: "taxId", header: "NIT", value: (c) => c.taxId },
  { id: "email", header: "correo", value: (c) => c.email },
  { id: "city", header: "ciudad", value: (c) => c.city },
];

/** The list: the contacts, and «Importar» opens the flow over it. */
function Contacts({ api }: ViewProps) {
  const toast = useToast();
  const [contacts, setContacts] = useState<readonly Contact[]>(EXISTING_CONTACTS);
  useEffect(() => api.setTitle("Contactos"), [api]);

  const open = () =>
    api.pick<readonly Contact[]>(
      importRef,
      (created) => {
        const ids = new Set(created.map((c) => c.id));
        setContacts((now) => [...created, ...now]);
        toast.show({
          message: `Se importaron ${created.length} contactos.`,
          tone: "good",
          action: {
            label: "Deshacer",
            onSelect: () => setContacts((now) => now.filter((c) => !ids.has(c.id))),
          },
        });
      },
      { to: Destination.Modal, size: { w: 880, h: 620 } },
    );

  return (
    <List<Contact> items={contacts} keyOf={(c) => c.id} present="table">
      <List.Bar>
        <List.Identity title="Contactos" />
        <List.Actions>
          <Button role="primary" size="sm" icon={Upload} onClick={open}>
            Importar
          </Button>
        </List.Actions>
      </List.Bar>
      <List.Table<Contact> columns={CONTACT_COLUMNS} />
    </List>
  );
}

const REVIEW_COLUMNS: DataColumn<ImportRow>[] = [
  { id: "line", header: "fila", value: (r) => r.line, numeric: true },
  { id: "name", header: "nombre", value: (r) => r.name },
  { id: "taxId", header: "NIT", value: (r) => r.taxId },
  { id: "email", header: "correo", value: (r) => r.email },
  { id: "city", header: "ciudad", value: (r) => r.city },
  {
    id: "state",
    header: "estado",
    value: (r) => r.problem ?? "Se crea",
    cell: (r) =>
      r.problem === undefined ? (
        <Tag tone="good">Se crea</Tag>
      ) : (
        <Tag tone="bad">{r.problem}</Tag>
      ),
  },
];

/** The import: three steps over what it holds — the file, the mapping — and what it answers. */
function ImportContacts({ api }: ViewProps) {
  const [step, setStep] = useState("file");
  const [file, setFile] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Mapping>(() => guessMapping(IMPORT_FILE.columns));
  const [importing, setImporting] = useState(false);
  useEffect(() => api.setTitle("Importar contactos"), [api]);
  useEffect(() => api.setDirty(file !== null), [api, file]);

  const problem = mappingProblem(mapping);
  const rows = reviewRows(mapping);
  const good = rows.filter((r) => r.problem === undefined);
  const bad = rows.length - good.length;

  const finish = () => {
    setImporting(true);
    /* The server creates them; here, a moment of it. */
    setTimeout(() => {
      api.setDirty(false);
      api.answer(
        good.map((r) => ({
          id: `nuevo-${r.line}`,
          name: r.name,
          taxId: r.taxId,
          email: r.email,
          city: r.city,
        })),
      );
    }, 600);
  };

  return (
    <StepFlow
      current={step}
      onCurrentChange={setStep}
      onFinish={finish}
      onCancel={() => api.close()}
      busy={importing}
    >
      <StepFlow.Step
        id="file"
        title="Subir el archivo"
        description="Una planilla .csv o .xlsx con un contacto por fila y los nombres de las columnas en la primera."
        {...(file === null ? { blocked: "Elegí o soltá un archivo para seguir." } : {})}
      >
        <Field label="Archivo de contactos">
          <DropZone accept=".csv,.xlsx" onFile={(one) => setFile(one.name)} />
        </Field>
        {file === null ? null : (
          <Callout tone="good" title={`Leímos «${file}»`}>
            {IMPORT_FILE.detail}. En el paso siguiente decís qué columna es qué campo.
          </Callout>
        )}
      </StepFlow.Step>

      <StepFlow.Step
        id="map"
        title="Mapear columnas"
        description="Cada columna del archivo, a qué campo del contacto va. Lo que no sirve, «No importar»."
        {...(problem === undefined ? {} : { blocked: problem })}
        nextLabel={`Revisar ${rows.length} filas`}
      >
        <Table>
          <THead>
            <Th>Columna del archivo</Th>
            <Th>Ejemplo</Th>
            <Th>Campo del contacto</Th>
          </THead>
          <tbody>
            {IMPORT_FILE.columns.map((column, i) => (
              <Tr key={column.key}>
                <Td>{column.header}</Td>
                <Td>{IMPORT_FILE.rows[0]?.[i] ?? ""}</Td>
                <Td>
                  <Select
                    aria-label={`Campo para «${column.header}»`}
                    value={mapping[column.key] ?? "skip"}
                    options={CONTACT_FIELDS}
                    onChange={(next) =>
                      setMapping((now) => ({ ...now, [column.key]: next as ContactField }))
                    }
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </StepFlow.Step>

      <StepFlow.Step
        id="review"
        title="Revisar"
        description="Lo que se va a crear y lo que no. Las filas con errores no se importan."
        {...(good.length === 0 ? { blocked: "Ninguna fila se puede importar." } : {})}
        nextLabel={`Importar ${good.length} contactos`}
      >
        <Callout tone="good">{`Se van a crear ${good.length} contactos.`}</Callout>
        {bad === 0 ? null : (
          <Callout tone="warn">
            {`${bad} filas tienen errores y no se importan: corregilas en el archivo y volvé a subirlo.`}
          </Callout>
        )}
        <DataTable<ImportRow> data={rows} columns={REVIEW_COLUMNS} getRowId={(r) => r.id} />
      </StepFlow.Step>
    </StepFlow>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "contactos",
    kind: "lista",
    title: () => "Contactos",
    icon: Users,
    load: async () => Contacts,
  },
  {
    domain: "contactos",
    kind: "importar",
    title: () => "Importar contactos",
    icon: Upload,
    load: async () => ImportContacts,
  },
];

/** **Importar contactos de un archivo.** Subí el archivo, revisá qué columna va a qué campo y
 *  mirá qué se crea antes de crearlo. Al terminar, la lista los muestra y ofrece deshacer. */
export const ImportarContactos: Story = {
  name: "Importar contactos de un archivo",
  render: () => <Workspace views={VIEWS} start={listRef} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await userEvent.click(await canvas.findByRole("button", { name: "Importar" }));
    const dialog = within(await page.findByRole("dialog"));

    /* Step 1: nothing chosen — «Siguiente» is off and says why. */
    await expect(
      await dialog.findByRole("heading", { name: "Subir el archivo" }),
    ).toBeVisible();
    const next = dialog.getByRole("button", { name: "Siguiente" });
    await expect(next).toBeDisabled();
    await expect(next).toHaveAccessibleDescription("Elegí o soltá un archivo para seguir.");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(
      input,
      new File(["Razón social,NIT"], IMPORT_FILE.name, { type: "text/csv" }),
    );
    await expect(await dialog.findByText(`Leímos «${IMPORT_FILE.name}»`)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Siguiente" }));

    /* Step 2: the focus is on the new step; unmapping the name blocks it, with the reason. */
    const mapHeading = await dialog.findByRole("heading", { name: "Mapear columnas" });
    await waitFor(() => expect(mapHeading).toHaveFocus());
    await userEvent.click(dialog.getByRole("button", { name: /Campo para «Razón social»/ }));
    await userEvent.click(await page.findByRole("option", { name: "No importar" }));
    await expect(
      await dialog.findByText("Elegí qué columna es el «Nombre» para seguir."),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^Revisar/ })).toBeDisabled();
    await userEvent.click(dialog.getByRole("button", { name: /Campo para «Razón social»/ }));
    await userEvent.click(await page.findByRole("option", { name: "Nombre" }));
    await userEvent.click(dialog.getByRole("button", { name: "Revisar 9 filas" }));

    /* Step 3: what is created and what is not; the primary names what happens. */
    await expect(await dialog.findByText("Ya existe un contacto con ese NIT.")).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: "Importar 6 contactos" }));

    /* Answered: the list has them, and offers the way back. */
    await waitFor(() => expect(page.queryByRole("dialog")).toBeNull(), { timeout: 3000 });
    await expect(await page.findByText("Se importaron 6 contactos.")).toBeVisible();
    await expect(canvas.getByText("Librería Gisbert")).toBeVisible();
  },
};
