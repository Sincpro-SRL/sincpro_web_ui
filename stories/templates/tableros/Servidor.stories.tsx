import {
  AppFrame,
  BarList,
  Board,
  BoardStat,
  BoardStats,
  BoardTile,
  Chart,
  chartFromPivot,
  chartFromRecord,
  Field,
  type GroupLevel,
  IconButton,
  type PivotFold,
  pivotFrom,
  Select,
  TopBar,
} from "@sincpro/web-ui";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Ban,
  Clock,
  Globe,
  Inbox,
  Mail,
  MemoryStick,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { expect, within } from "storybook/test";

import {
  ACCOUNTS,
  DOMAINS,
  HAM,
  MAIL_HOURS,
  type MailHour,
  megabytes,
  megabytesExact,
  MEMORY_BYTES,
  QUIET_HOURS,
  REJECTIONS,
} from "../../support/mail-server";

/**
 * Context: **an operations board** — a mail server over the last 24 hours — built only from
 * the package. It is the other board an application builds besides the sales one, and it
 * asks different things of the same pieces:
 *
 *   - **time by the hour**, 24 points: the axis writes one tick every few hours, evenly;
 *   - **units that are not money**: the memory reads «76 MB» on its axis (`formatShort`)
 *     and «52,3 MB» in the tooltip (`format`);
 *   - **a figure that may have nothing to be computed from**: with no inbound mail there is
 *     no share of clean mail, and the tile says «Sin datos», not 0 % nor «—»;
 *   - **a state said in colour AND in words**: a share of clean mail under its floor tints
 *     its tile (`tone`), and its detail says why;
 *   - **a ranking as a list** (`BarList`): six reasons and a count each, a zero included;
 *   - **tiles of two rows** beside two stacked ones, so the page is one grid.
 */
const meta: Meta = {
  tags: ["screen"],
  title: "5 · Plantillas/Tableros/Servidor de correo",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Un tablero de operación hecho sólo con el paquete: cifras con su tendencia de las últimas horas, mensajes por hora, la memoria en MB, un ranking de rechazos y una cifra que puede no tener de dónde calcularse.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* The share of clean mail under which the board calls it out. */
const CLEAN_FLOOR = 0.9;

type Traffic = { hour: string; direction: string; count: number };

const MESSAGES: PivotFold<Traffic> = {
  id: "count",
  header: "mensajes",
  additive: true,
  fold: (all) => all.reduce((sum, one) => sum + one.count, 0),
};

const percent = (share: number) =>
  share.toLocaleString("es-BO", { style: "percent", maximumFractionDigits: 0 });

function MailBoard({ hours }: { hours: readonly MailHour[] }) {
  const [period, setPeriod] = useState("24h");

  const charts = useMemo(() => {
    const traffic: Traffic[] = hours.flatMap((one) => [
      { hour: one.hour, direction: "recibidos", count: one.received },
      { hour: one.hour, direction: "enviados", count: one.sent },
    ]);
    const quiet = hours.every((one) => one.received === 0 && one.sent === 0);
    return {
      messages: chartFromPivot(
        pivotFrom(traffic, {
          rows: [{ field: "hour" }],
          columns: [{ field: "direction" }],
          of: (one: Traffic, level: GroupLevel) =>
            level.field === "hour" ? one.hour : one.direction,
          measures: [MESSAGES],
          labelOf: (level) => (level.field === "hour" ? "hora" : "dirección"),
        }),
      ),
      /* The server holds memory whether or not mail moves. */
      memory: chartFromRecord(MEMORY_BYTES, {
        header: "memoria",
        format: megabytesExact,
        formatShort: megabytes,
        additive: false,
      }),
      rejections: chartFromRecord(
        quiet
          ? Object.fromEntries(Object.keys(REJECTIONS).map((one) => [one, 0]))
          : REJECTIONS,
        { header: "rechazos" },
      ),
    };
  }, [hours]);

  const received = hours.reduce((sum, one) => sum + one.received, 0);
  const sent = hours.reduce((sum, one) => sum + one.sent, 0);
  const queued = hours[hours.length - 1]?.queued ?? 0;
  const ham = received === 0 ? 0 : Math.min(HAM, received);
  const share = received === 0 ? undefined : ham / received;
  const memoryNow = MEMORY_BYTES[MEMORY_BYTES.length - 1]?.[1] ?? 0;

  return (
    <Board
      title="Servidor de correo"
      description="mail.sincpro.dev · últimas 24 horas"
      filters={
        <>
          <Field label="Período">
            <Select
              value={period}
              onChange={setPeriod}
              options={[
                { value: "24h", label: "Últimas 24 horas" },
                { value: "7d", label: "Últimos 7 días" },
                { value: "30d", label: "Últimos 30 días" },
              ]}
            />
          </Field>
          <IconButton icon={RefreshCw} label="Actualizar" />
        </>
      }
      metrics={
        <BoardStats>
          <BoardStat
            label="Recibidos"
            icon={Inbox}
            hint="Los mensajes que entraron por SMTP en el período."
            value={received}
            trend={hours.map((one) => one.received)}
          />
          <BoardStat
            label="Enviados"
            icon={Send}
            hint="Los que el servidor entregó a otro servidor."
            value={sent}
            trend={hours.map((one) => one.sent)}
          />
          <BoardStat
            label="En cola"
            icon={Clock}
            hint="Los que esperaban salir al cerrar la última hora."
            value={queued}
            trend={hours.map((one) => one.queued)}
          />
          <BoardStat
            label="Memoria del servidor"
            icon={Server}
            value={megabytes(memoryNow)}
            trend={MEMORY_BYTES.map(([, bytes]) => bytes)}
          />
        </BoardStats>
      }
    >
      <BoardTile
        title="Mensajes"
        icon={Mail}
        description="por hora, recibidos y enviados"
        span={2}
        rows={2}
      >
        <Chart data={charts.messages} kind="line" label="Mensajes por hora" />
      </BoardTile>
      <BoardStat
        label="Correo limpio"
        icon={ShieldCheck}
        hint="De los mensajes que entraron, los que se clasificaron como legítimos (no spam)."
        hero
        {...(share === undefined
          ? { detail: "no entró ningún mensaje en el período" }
          : {
              value: percent(share),
              detail:
                share < CLEAN_FLOOR
                  ? `${String(ham)} de ${String(received)} · debajo del ${percent(CLEAN_FLOOR)} esperado`
                  : `${String(ham)} de ${String(received)} recibidos`,
              ...(share < CLEAN_FLOOR ? { tone: "warn" as const } : {}),
            })}
      />
      <BoardTile
        title="Rechazos"
        icon={Ban}
        hint="Lo que el servidor rechazó en el período, por motivo."
      >
        <BarList data={charts.rejections} label="Rechazos por motivo" />
      </BoardTile>
      <BoardTile
        title="Uso de memoria"
        icon={MemoryStick}
        description="al cierre de cada hora"
        span={2}
        rows={2}
      >
        <Chart data={charts.memory} kind="area" label="Memoria del servidor por hora" />
      </BoardTile>
      <BoardStat label="Cuentas" icon={Users} value={ACCOUNTS} detail="usuarios y grupos" />
      <BoardStat label="Dominios" icon={Globe} value={DOMAINS} />
    </Board>
  );
}

function Page({ hours }: { hours: readonly MailHour[] }) {
  return (
    <AppFrame
      menu={
        <TopBar
          app={{ label: "Correo", icon: Mail }}
          user={{ name: "Andrés Gutiérrez", detail: "Sincpro S.R.L." }}
        />
      }
    >
      <MailBoard hours={hours} />
    </AppFrame>
  );
}

/**
 * **Un día de tráfico.** Arriba, cada cifra con la forma de sus últimas 24 horas. El correo
 * limpio está debajo de su piso: el recuadro se tiñe Y lo dice. Los rechazos son una lista de
 * barras, con sus ceros. La memoria se lee en MB en el eje y con un decimal en el tooltip.
 */
export const UnDia: Story = {
  name: "Un día de tráfico",
  render: () => <Page hours={MAIL_HOURS} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Servidor de correo", level: 1 }),
    ).toBeVisible();
    /* The headline figures carry their trend. */
    await expect(canvas.getByRole("img", { name: "Recibidos" })).toBeVisible();
    /* The state is said in words, not only tinted. */
    const clean = canvas.getByRole("region", { name: "Correo limpio" });
    await expect(clean).toHaveAttribute("data-tone", "warn");
    await expect(within(clean).getByText(/debajo del 90/)).toBeVisible();
    /* A zero is a row of the ranking, not a missing one. */
    const rejections = canvas.getByRole("list", { name: "Rechazos por motivo" });
    await expect(within(rejections).getByText("Spam")).toBeVisible();
    await expect(within(rejections).getByText("Relay denegado")).toBeVisible();
    /* The memory's axis says its unit. */
    await expect((await canvas.findAllByText(/^\d+ MB$/)).length).toBeGreaterThan(1);
  },
};

/**
 * **Un servidor quieto.** Nada entró ni salió: las cifras son ceros con su tendencia en el
 * piso, y el correo limpio dice «Sin datos» — no hay de dónde sacar un porcentaje, y un 0 %
 * diría que todo fue spam.
 */
export const Quieto: Story = {
  name: "Un servidor quieto",
  render: () => <Page hours={QUIET_HOURS} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const clean = await canvas.findByRole("region", { name: "Correo limpio" });
    await expect(within(clean).getByText("Sin datos")).toBeVisible();
    await expect(clean).not.toHaveAttribute("data-tone");
  },
};
