import {
  AssistedValue,
  AssistMark,
  AssistPending,
  AssistSuggestion,
  Button,
  ChangeReview,
  ChangeReviewDialog,
  Field,
  NumberInput,
  Timeline,
  ToastProvider,
} from "@sincpro/web-ui";
import { assistEvent } from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

import {
  ASSISTED_INVOICE,
  ORDER_SOURCE,
  SUGGESTED_TERM,
  TERM_SOURCE,
} from "../support/erp-assist";

/**
 * Context: **el asistente dentro de una pantalla de negocio.** La IA propone; una persona decide.
 * Se confía en ella si siempre se puede contestar tres preguntas: de dónde sacó eso (la
 * fuente, un enlace), qué cambia exactamente (el antes → después) y cómo se deshace
 * («Deshacer», no «¿estás seguro?»). Nunca se marca solo con color: ícono y palabra.
 */
const meta: Meta = {
  title: "3 · Componentes/Asistente · IA con fuente, vista previa y deshacer",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function Card({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="max-w-xl rounded-box border border-line bg-surface p-5">{children}</div>
    </ToastProvider>
  );
}

/** **Una sugerencia en un campo.** Aceptá: se aplica y el aviso ofrece «Deshacer». El ×
 *  la descarta. La sugerencia NO se escribe en el campo: un campo ya lleno parece decidido. */
export const SugerenciaEnUnCampo: Story = {
  name: "Sugerencia en un campo",
  render: function Render() {
    const [days, setDays] = useState<number | "">(ASSISTED_INVOICE.termDays);
    const [open, setOpen] = useState(true);
    return (
      <Card>
        <Field label="Plazo de pago" hint="En días desde la fecha de la factura.">
          <NumberInput value={days} onChange={setDays} unit="días" />
          {open && days !== SUGGESTED_TERM ? (
            <AssistSuggestion
              value={`${SUGGESTED_TERM} días`}
              source={TERM_SOURCE}
              field="Plazo de pago"
              onAccept={() => {
                const before = days;
                setDays(SUGGESTED_TERM);
                return () => setDays(before);
              }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </Field>
        {open ? null : (
          <div className="mt-3">
            <Button role="ghost" size="sm" onClick={() => setOpen(true)}>
              Volver a mostrar la sugerencia
            </Button>
          </div>
        )}
      </Card>
    );
  },
};

/** **El asistente trabaja.** No bloquea nada: el campo sigue editable y «Cancelar» lo detiene. */
export const Trabajando: Story = {
  render: function Render() {
    const [working, setWorking] = useState(true);
    const [days, setDays] = useState<number | "">(15);
    return (
      <Card>
        <Field label="Plazo de pago">
          <NumberInput value={days} onChange={setDays} unit="días" />
          {working ? (
            <AssistPending
              label="Revisando las últimas facturas del cliente…"
              onCancel={() => setWorking(false)}
            />
          ) : (
            <Button role="ghost" size="sm" onClick={() => setWorking(true)}>
              Pedir otra sugerencia
            </Button>
          )}
        </Field>
      </Card>
    );
  },
};

/** **Esqueleto de una propuesta** que está por llegar: dónde va a aparecer, sin tapar nada. */
export const TrabajandoConEsqueleto: Story = {
  name: "Trabajando · con esqueleto",
  render: () => (
    <Card>
      <AssistPending
        label="Leyendo la orden de compra PO/2026/0042…"
        rows={3}
        onCancel={() => {}}
      />
    </Card>
  ),
};

/** **Procedencia después de aceptar.** El robot chico junto al valor: quién, cuándo y de dónde. */
export const Procedencia: Story = {
  render: () => (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-meta">
          <span className="text-muted">Plazo de pago</span>
          <AssistedValue
            origin={{
              at: "2026-10-30T10:12:00Z",
              source: TERM_SOURCE,
              acceptedBy: "Andrés Gutiérrez",
            }}
          >
            30 días
          </AssistedValue>
        </div>
        <div className="flex items-center gap-2 text-meta">
          <span className="text-muted">Referencia</span>
          <span>PO/2026/0042</span>
          <AssistMark origin={{ at: "2026-10-30T10:12:00Z", source: ORDER_SOURCE }} />
        </div>
        <Timeline>
          {[
            (() => {
              const e = assistEvent({
                id: "a1",
                label: "completó 2 líneas desde la orden de compra",
                at: "2026-10-30T10:12:00Z",
                source: ORDER_SOURCE,
                acceptedBy: "Andrés Gutiérrez",
              });
              return (
                <Timeline.Item
                  key={e.id}
                  label={`${e.by}: ${String(e.label)}`}
                  at={e.at}
                  tone="info"
                  action={e.detail}
                />
              );
            })(),
          ]}
        </Timeline>
      </div>
    </Card>
  ),
};

const changes = (
  <>
    <ChangeReview.Group title="Campos">
      <ChangeReview.Change id="term" label="Plazo de pago" before="15 días" after="30 días" />
      <ChangeReview.Change
        id="ref"
        label="Referencia del cliente"
        before={null}
        after="PO/2026/0042"
      />
    </ChangeReview.Group>
    <ChangeReview.Group title="Líneas">
      <ChangeReview.Change
        id="L-lic"
        label="Licencia de usuario adicional"
        detail="LIC-USR"
        before="10 × Bs. 350,00"
        after="12 × Bs. 350,00"
      />
      <ChangeReview.Change
        id="L-cap"
        label="Capacitación presencial (por hora)"
        after="8 × Bs. 420,00"
      />
      <ChangeReview.Change
        id="L-imp"
        label="Implementación Odoo — módulo de ventas"
        before="1 × Bs. 12.500,00"
        unchosen
        source={{ label: "no figura en la orden" }}
      />
    </ChangeReview.Group>
  </>
);

/** **Vista previa de cambios, en la página.** Cada cambio es un check con su antes → después;
 *  el tipo está escrito («nuevo», «cambia», «se quita»). «Aplicar» cuenta y es la única primaria. */
export const VistaPreviaEnLaPagina: Story = {
  name: "Vista previa de cambios",
  render: function Render() {
    const [log, setLog] = useState("Todavía no se aplicó nada.");
    return (
      <ToastProvider>
        <div className="flex max-w-3xl flex-col gap-3">
          <ChangeReview
            title="Completar la factura desde la orden de compra"
            summary="Leí la orden y propongo estos cambios. Elegí cuáles aplicar."
            source={ORDER_SOURCE}
            onApply={(ids) => {
              setLog(`Se aplicaron: ${ids.join(", ")}`);
              return () => setLog("Se deshizo.");
            }}
            onDiscard={() => setLog("Se descartó la propuesta.")}
          >
            {changes}
          </ChangeReview>
          <p className="text-micro text-muted">{log}</p>
        </div>
      </ToastProvider>
    );
  },
};

/** **La misma revisión en un diálogo** (hoja inferior en el teléfono). */
export const VistaPreviaEnUnDialogo: Story = {
  name: "Vista previa en un diálogo",
  render: function Render() {
    const [open, setOpen] = useState(true);
    return (
      <ToastProvider>
        <Button role="secondary" onClick={() => setOpen(true)}>
          Revisar la propuesta del asistente
        </Button>
        <ChangeReviewDialog
          open={open}
          onClose={() => setOpen(false)}
          context={{ kind: "factura", label: ASSISTED_INVOICE.number }}
          title="Completar la factura desde la orden de compra"
          summary="Elegí qué cambios se aplican."
          source={ORDER_SOURCE}
          onApply={() => () => {}}
          onDiscard={() => {}}
        >
          {changes}
        </ChangeReviewDialog>
      </ToastProvider>
    );
  },
};
