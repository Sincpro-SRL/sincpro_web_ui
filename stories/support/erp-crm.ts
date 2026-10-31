import type {
  ActivityEvent,
  ActivityState,
  KanbanStateValue,
  Message,
  Tone,
} from "@sincpro/web-ui";

/**
 * Context: the CRM of a company like Sincpro — opportunities for software, Odoo, ISO and AI
 * projects, moving through a pipeline. Realistic on purpose: long customer names, amounts in
 * bolivianos, activities overdue, a conversation over WhatsApp and mail with the customer.
 */

export type CrmStage =
  "nuevo" | "calificado" | "propuesta" | "negociacion" | "ganado" | "perdido";

export const CRM_STAGES: readonly { id: CrmStage; label: string; tone?: Tone }[] = [
  { id: "nuevo", label: "Nuevo" },
  { id: "calificado", label: "Calificado" },
  { id: "propuesta", label: "Propuesta" },
  { id: "negociacion", label: "Negociación" },
  { id: "ganado", label: "Ganado", tone: "good" },
  { id: "perdido", label: "Perdido", tone: "bad" },
];

export type Opportunity = {
  id: string;
  name: string;
  customer: string;
  contact: string;
  email: string;
  phone: string;
  expected: number;
  probability: number;
  priority: number;
  stage: CrmStage;
  state: KanbanStateValue;
  activity: ActivityState;
  activityDetail: string;
  /** When the next activity is due: what the calendar shows. */
  activityAt: Date;
  salesperson: string;
  tags: readonly string[];
};

const at = (day: number, hour: number) => new Date(2026, 10, day, hour);

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "op1",
    name: "Implementación Odoo — ventas y POS",
    customer: "Clínica San Gabriel S.A.",
    contact: "Lic. Mónica Vargas",
    email: "mvargas@sangabriel.bo",
    phone: "+591 71 456 210",
    expected: 96_000,
    probability: 60,
    priority: 2,
    stage: "propuesta",
    state: "done",
    activity: "today",
    activityDetail: "Llamar para confirmar la demo",
    activityAt: at(2, 10),
    salesperson: "Andrés Gutiérrez",
    tags: ["Odoo", "POS"],
  },
  {
    id: "op2",
    name: "Certificación ISO 9001:2015",
    customer: "Constructora Illimani",
    contact: "Ing. Raúl Quispe",
    email: "rquispe@illimani.bo",
    phone: "+591 72 118 400",
    expected: 45_500,
    probability: 40,
    priority: 1,
    stage: "calificado",
    state: "normal",
    activity: "overdue",
    activityDetail: "Enviar diagnóstico preliminar",
    activityAt: at(3, 9),
    salesperson: "Josefa Muñoz",
    tags: ["ISO 9001"],
  },
  {
    id: "op3",
    name: "Asistente IA conectado al ERP",
    customer: "Importadora y Exportadora del Oriente Boliviano Ltda.",
    contact: "Lic. Daniela Rojas",
    email: "drojas@ieob.bo",
    phone: "+591 73 900 112",
    expected: 132_000,
    probability: 25,
    priority: 3,
    stage: "nuevo",
    state: "normal",
    activity: "planned",
    activityDetail: "Reunión de descubrimiento",
    activityAt: at(5, 15),
    salesperson: "Andrés Gutiérrez",
    tags: ["IA", "MCP"],
  },
  {
    id: "op4",
    name: "Portal de pedidos para distribuidores",
    customer: "Distribuidora Andina S.R.L.",
    contact: "Sr. Marco Fernández",
    email: "mfernandez@andina.bo",
    phone: "+591 70 223 981",
    expected: 78_400,
    probability: 70,
    priority: 2,
    stage: "negociacion",
    state: "blocked",
    activity: "overdue",
    activityDetail: "Esperando contrato firmado",
    activityAt: at(4, 11),
    salesperson: "Carla Rojas",
    tags: ["Desarrollo"],
  },
  {
    id: "op5",
    name: "Soporte Odoo — plan anual",
    customer: "Ferretería El Progreso",
    contact: "Sra. Elena Torrico",
    email: "etorrico@elprogreso.bo",
    phone: "+591 74 555 019",
    expected: 21_600,
    probability: 90,
    priority: 1,
    stage: "negociacion",
    state: "done",
    activity: "planned",
    activityDetail: "Enviar contrato para firma",
    activityAt: at(6, 16),
    salesperson: "Josefa Muñoz",
    tags: ["Odoo", "Soporte"],
  },
  {
    id: "op6",
    name: "Migración a Odoo 18",
    customer: "Panadería Doña Julia",
    contact: "Sra. Julia Mamani",
    email: "julia@donajulia.bo",
    phone: "+591 76 410 777",
    expected: 18_900,
    probability: 30,
    priority: 0,
    stage: "nuevo",
    state: "normal",
    activity: "none",
    activityDetail: "",
    activityAt: at(9, 9),
    salesperson: "Carla Rojas",
    tags: ["Odoo"],
  },
  {
    id: "op7",
    name: "ISO 27001 — seguridad de la información",
    customer: "Clínica San Gabriel S.A.",
    contact: "Dr. Hugo Salazar",
    email: "hsalazar@sangabriel.bo",
    phone: "+591 71 456 299",
    expected: 64_000,
    probability: 50,
    priority: 2,
    stage: "propuesta",
    state: "normal",
    activity: "planned",
    activityDetail: "Presentar propuesta técnica",
    activityAt: at(10, 14),
    salesperson: "Andrés Gutiérrez",
    tags: ["ISO 27001"],
  },
  {
    id: "op8",
    name: "App móvil de cobranzas",
    customer: "Constructora Illimani",
    contact: "Lic. Paola Choque",
    email: "pchoque@illimani.bo",
    phone: "+591 72 118 455",
    expected: 54_000,
    probability: 100,
    priority: 2,
    stage: "ganado",
    state: "done",
    activity: "none",
    activityDetail: "",
    activityAt: at(12, 9),
    salesperson: "Carla Rojas",
    tags: ["Desarrollo", "Móvil"],
  },
  {
    id: "op9",
    name: "Tablero de indicadores BI",
    customer: "Distribuidora Andina S.R.L.",
    contact: "Sr. Marco Fernández",
    email: "mfernandez@andina.bo",
    phone: "+591 70 223 981",
    expected: 32_000,
    probability: 0,
    priority: 0,
    stage: "perdido",
    state: "normal",
    activity: "none",
    activityDetail: "",
    activityAt: at(13, 9),
    salesperson: "Josefa Muñoz",
    tags: ["BI"],
  },
];

export const ACTIVITY_TONE: Record<ActivityState, Tone | undefined> = {
  overdue: "bad",
  today: "warn",
  planned: "good",
  none: undefined,
};

export function bolivianos(value: number): string {
  return `Bs. ${value.toLocaleString("es-BO", { maximumFractionDigits: 0 })}`;
}

/** The conversation with the customer of an opportunity: WhatsApp and mail in, notes inside. */
export const CRM_MESSAGES: Message[] = [
  {
    id: "c1",
    author: "Lic. Mónica Vargas",
    at: "2026-10-27T09:14:00Z",
    body: "Buenos días. Vimos la demo del punto de venta y nos interesa para las tres farmacias. ¿El precio incluye la capacitación del personal?",
  },
  {
    id: "c2",
    author: "Andrés Gutiérrez",
    at: "2026-10-27T09:40:00Z",
    body: "Buenos días, Lic. Sí: dos jornadas de capacitación por sucursal y un mes de acompañamiento. Le envío la propuesta actualizada hoy.",
  },
  {
    id: "c3",
    author: "Andrés Gutiérrez",
    at: "2026-10-27T10:05:00Z",
    internal: true,
    body: "Ojo: quieren facturación electrónica del SIN desde el día uno. Sumar el módulo SIAT a la propuesta.",
  },
  {
    id: "c4",
    author: "Lic. Mónica Vargas",
    at: "2026-10-30T16:22:00Z",
    body: "Recibida la propuesta. La revisa el directorio el lunes; si aprueban, firmamos esa misma semana.",
  },
];

export const CRM_EVENTS: ActivityEvent[] = [
  {
    id: "v1",
    label: "se creó la oportunidad",
    at: "2026-10-20T08:30:00Z",
    by: "Andrés Gutiérrez",
    moved: { to: "Nuevo" },
  },
  {
    id: "v2",
    label: "pasó a Calificado",
    at: "2026-10-22T15:10:00Z",
    by: "Andrés Gutiérrez",
    moved: { from: "Nuevo", to: "Calificado" },
  },
  {
    id: "v3",
    label: "pasó a Propuesta",
    at: "2026-10-27T11:00:00Z",
    by: "Andrés Gutiérrez",
    moved: { from: "Calificado", to: "Propuesta" },
    detail: "Propuesta PRO-2026-041 · Bs. 96.000",
  },
];
