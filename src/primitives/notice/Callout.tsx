"use client";

import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import type { Tone } from "@sincpro/web-ui/foundations/types";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * UN AVISO sobre lo que se está mirando.
 *
 * Context: `Empty`, `Failed` y `Missing` dicen que NO HAY contenido y ocupan el
 * lugar de la vista. Esto es lo contrario: hay contenido, se ve, y hace falta
 * decir algo ADEMÁS —«hay asientos sin registrar en este período», «este período
 * está cerrado», «se guardó»—. Sin esta pieza, cada pantalla se lo inventaba
 * con un `div` y un color a ojo, y así es como el mismo grado de urgencia
 * terminaba pintado de tres maneras.
 *
 * ── El tono es la ÚNICA decisión ────────────────────────────────────
 *
 *     info     un dato que cambia cómo se lee lo de abajo
 *     warn     algo que conviene mirar antes de seguir
 *     bad      algo que está mal y ya tuvo consecuencias
 *     good     algo salió bien y no hay nada que hacer
 *
 * El ícono sale del tono y no se elige: un aviso rojo con un tilde verde adentro
 * es una contradicción que alguien va a escribir si se lo dejamos escribir.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────
 *
 * No se cierra solo, no tiene temporizador y no se apila. Un aviso que
 * desaparece a los cuatro segundos es un aviso que alguien no llegó a leer — eso
 * es un `Toast`, que es otra pieza y otra pregunta («pasó algo lejos de acá»).
 * Éste habla de lo que está en pantalla, así que se queda mientras sea cierto.
 */

export type CalloutProps = {
  /** Qué pasa. Una oración, en la voz del producto. */
  children: ReactNode;
  /** Sin esto, `info`. */
  tone?: Extract<Tone, "info" | "warn" | "bad" | "good">;
  /** El encabezado, cuando la oración sola no alcanza. La mayoría no lo
   *  necesita: un aviso de dos renglones con título es un cartel. */
  title?: ReactNode;
  /** Lo que resuelve el aviso, si hay algo que apretar. */
  action?: ReactNode;
  /** Presente = se puede cerrar. Ausente = no, porque lo que dice sigue siendo
   *  cierto lo mire quien lo mire. */
  onDismiss?: () => void;
  /** El rótulo accesible de la ×. */
  dismissLabel?: string;
  /** Un ícono propio, cuando el del tono no dice lo suficiente. */
  icon?: LucideIcon;
};

const ICON: Record<NonNullable<CalloutProps["tone"]>, LucideIcon> = {
  info: Info,
  warn: AlertTriangle,
  bad: OctagonAlert,
  good: CheckCircle2,
};

/* El fondo es una capa del color sobre el papel y no un color propio: así el
   aviso se lee sobre el piso y sobre el papel blanco sin dos juegos de tokens, y
   sigue funcionando el día que cambie la paleta. */
const SKIN: Record<NonNullable<CalloutProps["tone"]>, string> = {
  info: "border-info/25 bg-info/8 text-info",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/25 bg-bad/8 text-bad",
  good: "border-good/25 bg-good/8 text-good",
};

export function Callout({
  children,
  tone = "info",
  title,
  action,
  onDismiss,
  dismissLabel,
  icon,
}: CalloutProps) {
  const d = useDensity();
  const Icon = icon ?? ICON[tone];

  return (
    <div
      /* `status` y no `alert`: `alert` interrumpe al lector de pantalla y se
         reserva para lo que pasó JUSTO AHORA. Un aviso que ya estaba cuando la
         pantalla abrió no interrumpe nada. */
      role="status"
      className={`flex min-w-0 items-start gap-2.5 rounded-box border ${SKIN[tone]} ${byDensity(
        d,
        "px-3 py-2.5",
        "px-2.5 py-2",
      )}`}
    >
      <Icon className="mt-0.5 size-(--size-icon-sm) shrink-0" strokeWidth={2} aria-hidden />

      {/* The sentence and its action share a row that WRAPS: the sentence asks for at
          least `--container-name` and, when the action does not fit beside it (a phone, a
          long label), the action drops under the sentence instead of squeezing it into a
          column of three words. On a desk nothing moves. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-(--container-name) flex-col gap-1">
          {title === undefined ? null : (
            <p className="text-meta font-medium text-ink">{title}</p>
          )}
          {/* El texto va en tinta normal y no en el color del tono: un párrafo
              entero pintado se lee peor, y el color ya lo pone el marco. El tono
              se queda en el ícono y en el borde, que es donde alcanza. */}
          <div className="min-w-0 text-meta text-ink">{children}</div>
        </div>

        {action === undefined ? null : <span className="shrink-0">{action}</span>}
      </div>

      {onDismiss === undefined ? null : (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel ?? "cerrar"}
          title={dismissLabel ?? "cerrar"}
          className="-mr-1 shrink-0 rounded-control p-0.5 text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink"
        >
          <X className="size-(--size-icon-sm)" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
