import type { Tone } from "@sincpro/web-ui/foundations/types";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
  OctagonAlert,
} from "lucide-react";

/** The four degrees of a notice that stays on screen — `Callout` inside a view, `Banner`
 *  across the whole application. */
export type NoticeTone = Extract<Tone, "info" | "warn" | "bad" | "good">;

/* Context: one table for both, so the same urgency is painted the same way in a view and
   across the frame. The icon comes from the tone and is not chosen: a red notice with a green
   tick inside is a contradiction someone will write if we let them. */
export const NOTICE_ICON: Record<NoticeTone, LucideIcon> = {
  info: Info,
  warn: AlertTriangle,
  bad: OctagonAlert,
  good: CheckCircle2,
};

/* The background is a layer of the colour over what is below and not a colour of its own: the
   notice reads on the floor and on white paper without two sets of tokens, and keeps working
   the day the palette changes. The text stays ink — the tone is on the icon and the edge. */
export const NOTICE_SKIN: Record<NoticeTone, string> = {
  info: "border-info/25 bg-info/8 text-info",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/25 bg-bad/8 text-bad",
  good: "border-good/25 bg-good/8 text-good",
};

/* The × answers to a whole target (`hit-target`) though it is drawn at 18px, and shows where
   the focus is — it had no ring, so a keyboard reached it unseen. */
export const NOTICE_DISMISS =
  "hit-target -mr-1 shrink-0 rounded-control p-0.5 text-muted transition-colors duration-(--duration-instant) hover:bg-ink/6 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";
