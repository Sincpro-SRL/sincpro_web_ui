/* How a view says that there is nothing, that it failed, or that nobody knows
   how to draw it. */
/* A notice about the whole application, across the top of the frame (`AppFrame banner`). */
export { Banner, type BannerProps } from "@sincpro/web-ui/primitives/notice/Banner";
export { Callout, type CalloutProps } from "@sincpro/web-ui/primitives/notice/Callout";
export { Flag, type FlagProps, type FlagTone } from "@sincpro/web-ui/primitives/notice/Flag";
export {
  Empty,
  type EmptyProps,
  Failed,
  ICONO_ROTO,
  Missing,
  Skeleton,
} from "@sincpro/web-ui/primitives/notice/Notice";
/* The END of an operation, said big: a kiosk's «tu número es 118», a paid checkout. */
export { Outcome, type OutcomeProps } from "@sincpro/web-ui/primitives/notice/Outcome";
export {
  ToastProvider,
  type ToastSpec,
  useToast,
  useToastIfAny,
} from "@sincpro/web-ui/primitives/notice/Toast";
export { type NoticeTone } from "@sincpro/web-ui/primitives/notice/tones";
