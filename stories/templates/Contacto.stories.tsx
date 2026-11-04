import {
  type ResourceRef,
  useCrumbs,
  type ViewProps,
  type ViewSpec,
} from "@sincpro/web-composer";
import {
  type AppEntry,
  Button,
  cardBrand,
  CardCodeInput,
  CardExpiryInput,
  CardNumberInput,
  ColorInput,
  DurationInput,
  EmailInput,
  Field,
  FormModeProvider,
  NumberInput,
  PatternInput,
  PhoneInput,
  Record,
  SheetGroup,
  SheetGroups,
  TopBar,
  UrlInput,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Building2,
  Clock,
  CreditCard,
  Handshake,
  Landmark,
  Mail,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Workspace } from "../support/composer";
import {
  BOARD_COLORS,
  changedFields,
  PARTNER,
  type Partner,
  PARTNER_CURRENCIES,
} from "../support/erp-partner";

/**
 * The card of a contact — Odoo's `res.partner` — read, and edited in place.
 *
 * Context: the screen where the system's ADDRESS and SHAPED controls meet a real record.
 * Read, every datum is something to act on: the email a `mailto:`, the phone a `tel:` with
 * WhatsApp beside it, the website a link in a new tab read without `https://`, the NIT and
 * the bank account with their separators, the credit limit in its currency, the colour as a
 * swatch, the hours as «8:30», and the card on file as its brand and last four — its code
 * never. «Editar» turns the same fields into their controls without the screen rearranging
 * (the labels stay); a change puts «Guardar» and «Descartar» in the rail, and saving goes back
 * to reading, the rail saying «Guardado».
 *
 * Built ONLY from the public API: no className, no style (tests/templates.test.ts).
 */

const APPS: AppEntry[] = [
  { id: "contactos", label: "Contactos", icon: Users, hint: "Clientes y proveedores" },
  { id: "ventas", label: "Ventas", icon: ShoppingCart, hint: "Cotizaciones y pedidos" },
  { id: "crm", label: "CRM", icon: Handshake, hint: "Oportunidades y pipeline" },
];

const MENU = (
  <TopBar
    apps={APPS}
    currentApp="contactos"
    user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
  />
);

const partnerRef: ResourceRef = { domain: "contactos", kind: "contacto", id: "san-gabriel" };

const money = (value: number | "", currency: string) =>
  value === ""
    ? "—"
    : new Intl.NumberFormat("es-BO", { style: "currency", currency }).format(value);

/** One contact, a VIEW. Read by default: a contact is looked up far more often than changed. */
function Contact({ api }: ViewProps) {
  const crumbs = useCrumbs(api);
  const [saved, setSaved] = useState<Partner>(PARTNER);
  const [partner, setPartner] = useState<Partner>(PARTNER);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState("ventas");
  const [saving, setSaving] = useState(false);
  const changes = changedFields(partner, saved);
  const dirty = changes.length > 0;
  const set =
    <K extends keyof Partner>(key: K) =>
    (value: Partner[K]) =>
      setPartner((now) => ({ ...now, [key]: value }));
  const changed = (key: keyof Partner) => changes.includes(key);

  useEffect(() => api.setTitle(partner.name), [api, partner.name]);
  /* While something is unsaved, a crumb or a close asks before throwing it away. */
  useEffect(() => api.setDirty(dirty), [api, dirty]);

  /* A save is a round trip to the server: `saving` while it goes, and then the rail itself
     says «Guardado» where «Guardar» was — no toast to write. */
  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaved(partner);
      setSaving(false);
      setEditing(false);
    }, 300);
  };
  const discard = () => {
    setPartner(saved);
    setEditing(false);
  };

  return (
    /* The whole record reads or edits: every control below takes the mode from here. */
    <FormModeProvider value={editing ? "edit" : "read"}>
      <Record
        identity={{
          icon: Building2,
          title: partner.name,
          subtitle: partner.kind,
          tag: { label: "Cliente", tone: "info" },
          figure: {
            label: "Límite de crédito",
            value: money(partner.creditLimit, partner.currency),
          },
        }}
        {...(dirty
          ? {
              dirty: {
                onSave: save,
                onDiscard: discard,
                changes: changes.length,
                saving,
              },
            }
          : {})}
      >
        <Record.Rail>
          <Record.Crumbs crumbs={crumbs} />
          <Record.Smart
            links={[
              { icon: ShoppingCart, count: 14, label: "ventas" },
              { icon: Landmark, count: 3, label: "facturas abiertas" },
              { icon: Mail, count: 6, label: "correos" },
            ]}
          />
          <Record.Actions>
            {editing ? (
              /* Editing without a change yet: the way back to reading, quiet. With a change,
                 the record puts «Guardar» and «Descartar» here instead. */
              <Button role="secondary" size="sm" onClick={() => setEditing(false)}>
                Ver
              </Button>
            ) : (
              <Button role="primary" size="sm" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </Record.Actions>
        </Record.Rail>

        <Record.Paper layout="horizontal">
          <SheetGroups columns={2}>
            <SheetGroup title="Cómo contactarlo" icon={Mail}>
              <Field label="Correo" changed={changed("email")}>
                <EmailInput
                  value={partner.email}
                  onChange={set("email")}
                  placeholder="nombre@empresa.bo"
                />
              </Field>
              <Field label="Teléfono" changed={changed("phone")}>
                <PhoneInput value={partner.phone} onChange={set("phone")} whatsapp />
              </Field>
              <Field label="Sitio web" changed={changed("website")}>
                <UrlInput
                  value={partner.website}
                  onChange={set("website")}
                  placeholder="empresa.bo"
                />
              </Field>
            </SheetGroup>
            <SheetGroup title="Identificación" icon={Building2}>
              <Field label="NIT" changed={changed("nit")}>
                <PatternInput value={partner.nit} onChange={set("nit")} pattern="#######-#" />
              </Field>
              <Field
                label="Cuenta bancaria"
                hint="BNB, en bolivianos."
                changed={changed("bankAccount")}
              >
                <PatternInput
                  value={partner.bankAccount}
                  onChange={set("bankAccount")}
                  pattern="####-#######-#"
                />
              </Field>
            </SheetGroup>
          </SheetGroups>

          <Record.Pages current={page} onChange={setPage}>
            <Record.Page id="ventas" label="ventas" icon={ShoppingCart}>
              <SheetGroups columns={2}>
                <SheetGroup title="Crédito">
                  <Field
                    label="Límite de crédito"
                    changed={changed("creditLimit") || changed("currency")}
                  >
                    <NumberInput
                      value={partner.creditLimit}
                      onChange={set("creditLimit")}
                      format={{ style: "currency", currency: partner.currency }}
                      units={{
                        options: PARTNER_CURRENCIES,
                        value: partner.currency,
                        onChange: set("currency"),
                      }}
                    />
                  </Field>
                </SheetGroup>
                <SheetGroup title="En el tablero">
                  <Field label="Color de la tarjeta" changed={changed("color")}>
                    <ColorInput
                      value={partner.color}
                      onChange={set("color")}
                      swatches={BOARD_COLORS}
                    />
                  </Field>
                </SheetGroup>
              </SheetGroups>
            </Record.Page>

            <Record.Page id="horario" label="horario" icon={Clock}>
              <SheetGroups columns={2}>
                <SheetGroup title="Atención">
                  <Field
                    label="Jornada típica"
                    hint="Las horas que la clínica atiende proveedores por día."
                    changed={changed("hoursPerDay")}
                  >
                    <DurationInput
                      value={partner.hoursPerDay}
                      onChange={set("hoursPerDay")}
                    />
                  </Field>
                  <Field label="Respuesta acordada" changed={changed("responseTime")}>
                    <DurationInput
                      value={partner.responseTime}
                      onChange={set("responseTime")}
                    />
                  </Field>
                </SheetGroup>
              </SheetGroups>
            </Record.Page>

            <Record.Page id="pago" label="pago" icon={CreditCard}>
              <SheetGroups columns={2}>
                <SheetGroup title="Tarjeta para débitos">
                  <Field label="Número de tarjeta" changed={changed("cardNumber")}>
                    <CardNumberInput
                      value={partner.cardNumber}
                      onChange={set("cardNumber")}
                    />
                  </Field>
                  <Field label="Vence" changed={changed("cardExpiry")}>
                    <CardExpiryInput
                      value={partner.cardExpiry}
                      onChange={set("cardExpiry")}
                    />
                  </Field>
                  {/* The code is never copied, not even its dots. */}
                  <Field
                    label="Código de seguridad"
                    copy={false}
                    changed={changed("cardCode")}
                  >
                    <CardCodeInput
                      value={partner.cardCode}
                      onChange={set("cardCode")}
                      brand={cardBrand(partner.cardNumber)}
                    />
                  </Field>
                </SheetGroup>
              </SheetGroups>
            </Record.Page>
          </Record.Pages>

          <Record.Audit
            created={{ by: "Josefa Muñoz", at: "14/03/2021" }}
            updated={{ by: "Andrés Gutiérrez", at: "hace 3 días" }}
          />
        </Record.Paper>
      </Record>
    </FormModeProvider>
  );
}

const VIEWS: readonly ViewSpec[] = [
  {
    domain: "contactos",
    kind: "contacto",
    title: () => PARTNER.name,
    icon: Building2,
    load: async () => Contact,
  },
];

const meta: Meta = {
  title: "5 · Plantillas/Ficha de contacto",
  tags: ["screen"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "La ficha de un contacto (`res.partner`) leída y editada en el lugar: el correo es un `mailto:`, el teléfono un `tel:` con WhatsApp, la web un enlace en otra pestaña; el NIT y la cuenta con su forma fija, el límite de crédito en la moneda elegida, el color de su tarjeta, las horas de atención como «8:30» y la tarjeta guardada como su marca y los últimos cuatro — el código, nunca.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** La ficha: «Editar» vuelve controles los mismos campos (los rótulos no se mueven); un
 *  cambio pone «Guardar» y «Descartar» en el riel, y guardar vuelve a la lectura. En la
 *  pestaña «pago» la tarjeta se lee como su marca y los últimos cuatro. */
export const Ficha: Story = {
  render: () => <Workspace views={VIEWS} start={partnerRef} menu={MENU} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* Read: the email is a link to write, not text to copy into the mail client. */
    await expect(
      await canvas.findByRole("link", { name: "compras@sangabriel.bo" }),
    ).toHaveAttribute("href", "mailto:compras@sangabriel.bo");

    /* Edit, change the email: the rail offers to save it. */
    await userEvent.click(canvas.getByRole("button", { name: "Editar" }));
    const email = canvas.getByLabelText("Correo", { selector: "input" });
    await userEvent.clear(email);
    await userEvent.type(email, "proveedores@sangabriel.bo");
    await userEvent.click(canvas.getByRole("button", { name: /^Guardar/ }));

    /* Back to reading: the new address is the link, and the card is its last four. */
    await waitFor(() =>
      expect(canvas.getByRole("link", { name: "proveedores@sangabriel.bo" })).toHaveAttribute(
        "href",
        "mailto:proveedores@sangabriel.bo",
      ),
    );
    await expect(canvas.queryByRole("textbox", { name: "Correo" })).toBeNull();
    await userEvent.click(canvas.getByRole("tab", { name: /pago/ }));
    await expect(await canvas.findByText("Visa •••• 4242")).toBeVisible();
    await expect(canvas.queryByText(/4242 4242/)).toBeNull();
    await expect(canvas.queryByText("123")).toBeNull();
  },
};
