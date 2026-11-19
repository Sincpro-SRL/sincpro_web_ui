import {
  DataField,
  Field,
  FormSection,
  FormStyleProvider,
  Record,
  SegmentedControl,
  TextInput,
} from "@sincpro/web-ui";
import { type Meta, type StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

const meta: Meta = {
  /* Screens a person works on: one primary action, and a second pass in dark (vitest). */
  tags: ["screen"],
  title: "4 · Vistas/Registro/Edición",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Editar un registro: guardar y descartar sin acciones en el riel, y el estilo de formulario «settings».",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * **Editar un registro que no declara acciones.** Lo que se escribe es lo que la persona está
 * haciendo: que aparezca «Guardar» no puede mover el papel. Sin `Record.Actions` el registro
 * se montaba sin papel y, con la primera letra, `dirty` lo pasaba a papel: el árbol cambiaba,
 * el campo se desmontaba y el foco se perdía después de una sola letra.
 */
export const EditarSinAcciones: Story = {
  render: function Render() {
    const [name, setName] = useState("Constructora Illimani");
    const [saved, setSaved] = useState(name);
    const [saving, setSaving] = useState(false);
    /* A save that takes a moment, like a real one: what the rail says while it runs and
       right after is the point of this story. */
    const save = () => {
      setSaving(true);
      setTimeout(() => {
        setSaved(name);
        setSaving(false);
      }, 400);
    };
    const changed = name !== saved;
    return (
      <Record
        identity={{ title: saved }}
        {...(changed
          ? { dirty: { onSave: save, onDiscard: () => setName(saved), saving, changes: 1 } }
          : {})}
      >
        <Record.Paper>
          <Field label="Razón social" changed={changed}>
            <TextInput value={name} onChange={setName} />
          </Field>
        </Record.Paper>
      </Record>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole("textbox", { name: "Razón social" });
    await userEvent.click(field);
    await userEvent.type(field, " SRL");
    /* Every letter landed in the same field, and it still has the focus. */
    await expect(field).toHaveValue("Constructora Illimani SRL");
    await expect(field).toHaveFocus();
    /* What changed is said by the field. The rail adds no third «sin guardar» mark: its
       two buttons only exist while something changed. The count still reaches a screen
       reader, as the Save button's description. */
    await expect(field).toHaveAccessibleDescription("modificado");
    await expect(
      canvas.queryAllByText(/sin guardar/).every((mark) => mark.offsetParent === null),
    ).toBe(true);
    /* The rail's, not the phone's thumb bar (hidden on a desk). */
    const save = canvas
      .getAllByRole("button", { name: /Guardar/ })
      .find((button) => button.offsetParent !== null)!;
    await expect(save).toHaveAccessibleDescription("1 cambio sin guardar");
    /* Saving, the button keeps the focus and says it is busy; a second press is not a
       second save. */
    await userEvent.click(save);
    const busy = canvas.getByRole("button", { name: /Guardando/ });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toHaveFocus();
    /* Then it says it is done, by itself. */
    await expect(
      await canvas.findByText("Guardado", { selector: "[role=status]" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Constructora Illimani SRL",
    );
    /* Save left with the save, and the focus did not fall to the page: it is on the name. */
    await waitFor(() => expect(canvas.getByRole("heading", { level: 1 })).toHaveFocus());
  },
};

/**
 * **El estilo «ajustes»: cada campo una fila que dice qué pide.** Una aplicación lo elige
 * una vez (`FormStyleProvider value="settings"`) y todos sus registros cambian: la etiqueta y
 * su ayuda escrita a la izquierda, el control a la derecha, «(opcional)» donde puede quedar
 * vacío; cada sección una tarjeta, con el índice de las secciones a la izquierda; y
 * Guardar flotando abajo, al centro, apenas algo cambia.
 *
 * Es para formularios que se llenan de vez en cuando y se leen antes de escribir — la
 * cuenta de un usuario, la configuración de un colegio —. La hoja densa de un ERP sigue
 * siendo `dense`, el de siempre.
 */
export const Ajustes: Story = {
  render: function Render() {
    const inicial = {
      tipo: "usuario",
      usuario: "info",
      dominio: "staging.sincpro.dev",
      nombre: "",
      telefono: "",
      correo: "",
    };
    const [guardado, setGuardado] = useState(inicial);
    const [cuenta, setCuenta] = useState(inicial);
    const [guardando, setGuardando] = useState(false);
    /* A save that takes a moment, like a real one: «Guardado» answers it where Save was. */
    const guardar = () => {
      setGuardando(true);
      setTimeout(() => {
        setGuardado(cuenta);
        setGuardando(false);
      }, 300);
    };
    const poner = (campo: keyof typeof inicial) => (valor: string) =>
      setCuenta((antes) => ({ ...antes, [campo]: valor }));
    const cambio = (campo: keyof typeof inicial) => cuenta[campo] !== guardado[campo];
    const cambios = (Object.keys(inicial) as (keyof typeof inicial)[]).filter(cambio).length;
    return (
      <FormStyleProvider value="settings">
        <Record
          identity={{ title: "Editar cuenta" }}
          placement="page"
          {...(cambios === 0
            ? {}
            : {
                dirty: {
                  onSave: guardar,
                  onDiscard: () => setCuenta(guardado),
                  saving: guardando,
                  changes: cambios,
                },
              })}
        >
          <Record.Rail>
            <Record.Crumbs crumbs={[{ label: "Cuentas", onClick: () => undefined }]} />
          </Record.Rail>
          <Record.Paper layout="horizontal">
            <FormSection title="Cuenta">
              <Field
                label="Tipo de cuenta"
                hint="Una cuenta de grupo reparte el correo entre sus miembros."
                changed={cambio("tipo")}
              >
                <SegmentedControl
                  value={cuenta.tipo}
                  onChange={poner("tipo")}
                  options={[
                    { value: "usuario", label: "Usuario" },
                    { value: "grupo", label: "Grupo" },
                  ]}
                />
              </Field>
              <Field
                label="Usuario"
                hint="El nombre de la cuenta: la parte del correo antes de la @."
                required
                changed={cambio("usuario")}
              >
                <TextInput value={cuenta.usuario} onChange={poner("usuario")} />
              </Field>
              <DataField
                label="Dominio"
                hint="Se elige al crear la cuenta y no cambia."
                value={cuenta.dominio}
              />
              <Field
                label="Nombre completo"
                hint="Cómo aparece en los correos que envía."
                optional
                changed={cambio("nombre")}
              >
                <TextInput value={cuenta.nombre} onChange={poner("nombre")} />
              </Field>
            </FormSection>
            <FormSection title="Contacto" hint="Para avisos de la cuenta, no se publica.">
              <Field label="Teléfono" optional changed={cambio("telefono")}>
                <TextInput value={cuenta.telefono} onChange={poner("telefono")} />
              </Field>
              <Field
                label="Correo de recuperación"
                hint="Adonde llega el enlace para elegir una contraseña nueva."
                optional
                changed={cambio("correo")}
              >
                <TextInput value={cuenta.correo} onChange={poner("correo")} />
              </Field>
            </FormSection>
          </Record.Paper>
        </Record>
      </FormStyleProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* The help is written out, and it is what describes the control. */
    const usuario = canvas.getByRole("textbox", { name: /Usuario/ });
    await expect(usuario).toHaveAccessibleDescription(
      "El nombre de la cuenta: la parte del correo antes de la @.",
    );
    await expect(
      canvas.getByText("El nombre de la cuenta: la parte del correo antes de la @."),
    ).toBeVisible();
    /* A field that may stay empty says so; a required one does not. */
    await expect(canvas.getAllByText("(opcional)")).toHaveLength(3);
    /* The index names the sections. */
    const indice = canvas.getByRole("navigation", { name: "Secciones del formulario" });
    await expect(
      within(indice)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Cuenta", "Contacto"]);
    /* Nothing changed: no Save anywhere. */
    await expect(canvas.queryByRole("button", { name: /Guardar/ })).toBeNull();
    /* The first change brings Save, floating — not in the rail. */
    await userEvent.type(canvas.getByRole("textbox", { name: /Nombre completo/ }), "Info");
    const guardar = canvas
      .getAllByRole("button", { name: /Guardar/ })
      .filter((button) => button.offsetParent !== null);
    await expect(guardar).toHaveLength(1);
    await expect(guardar[0]?.closest("[data-ui='dirty.bar']")).not.toBeNull();
    await userEvent.click(guardar[0]!);
    await expect(
      await canvas.findByText("Guardado", { selector: "[role=status]" }),
    ).toBeInTheDocument();
  },
};
