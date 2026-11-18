/**
 * Example data for an OPERATIONS board: a mail server over the last 24 hours — messages in
 * and out per hour, the memory it holds, why it rejected what it rejected. It is the other
 * kind of board an application builds besides the sales one: time by the hour, units that
 * are not money (MB), a share that may have nothing to be computed from.
 */

/** The 24 hours of the window, oldest first. */
export const HOURS: readonly string[] = Array.from(
  { length: 24 },
  (_, at) => `${String((at + 2) % 24).padStart(2, "0")}:00`,
);

/** One hour of traffic. `queued` is what was waiting to go out when the hour closed. */
export type MailHour = { hour: string; received: number; sent: number; queued: number };

const RECEIVED = [
  3, 1, 0, 0, 1, 4, 9, 15, 22, 18, 14, 12, 16, 19, 21, 17, 12, 8, 6, 5, 4, 3, 2, 2,
];
const SENT = [1, 0, 0, 0, 0, 2, 5, 8, 11, 10, 7, 6, 9, 12, 10, 8, 6, 4, 3, 2, 2, 1, 1, 0];
const QUEUED = [0, 0, 0, 0, 0, 0, 1, 2, 3, 1, 0, 0, 1, 2, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0];

export const MAIL_HOURS: readonly MailHour[] = HOURS.map((hour, at) => ({
  hour,
  received: RECEIVED[at] ?? 0,
  sent: SENT[at] ?? 0,
  queued: QUEUED[at] ?? 0,
}));

/** The same window on a quiet server: nothing came in, nothing went out. */
export const QUIET_HOURS: readonly MailHour[] = HOURS.map((hour) => ({
  hour,
  received: 0,
  sent: 0,
  queued: 0,
}));

/** The memory the server held at the close of each hour, in bytes. */
export const MEMORY_BYTES: readonly (readonly [string, number])[] = HOURS.map((hour, at) => {
  const megabytes = [
    66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 47, 40, 52, 56, 56, 44, 47, 52, 61, 63,
    58, 50,
  ][at]!;
  return [hour, megabytes * 1_048_576] as const;
});

/** Why the server refused what it refused, in the window. A zero is an answer. */
export const REJECTIONS: Readonly<Record<string, number>> = {
  "Logins fallidos": 12,
  Spam: 3,
  "IP bloqueadas": 0,
  "Destinatario desconocido": 1,
  "Relay denegado": 0,
  "Límite de envío": 0,
};

/** Of the inbound messages, the ones classified as clean (ham). */
export const HAM = 141;

export const ACCOUNTS = 27;
export const DOMAINS = 2;

/** «52 MB»: a byte count where room is short — an axis, a stat tile. */
export const megabytes = (bytes: number) =>
  `${Math.round(bytes / 1_048_576).toLocaleString("es-BO")} MB`;

/** «52,3 MB»: the same, where there is room for one decimal — a tooltip. */
export const megabytesExact = (bytes: number) =>
  `${(bytes / 1_048_576).toLocaleString("es-BO", { maximumFractionDigits: 1 })} MB`;
