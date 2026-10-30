/* How a view says that there is nothing, that it failed, or that nobody knows
   how to draw it. */
export { Callout, type CalloutProps } from "@sincpro/web-ui/primitives/notice/Callout";
export { Flag, type FlagProps, type FlagTone } from "@sincpro/web-ui/primitives/notice/Flag";
export {
  Empty,
  Failed,
  ICONO_ROTO,
  Missing,
  Skeleton,
} from "@sincpro/web-ui/primitives/notice/Notice";
export {
  ToastLayer,
  ToastProvider,
  type ToastSpec,
  useToast,
  useToastIfAny,
} from "@sincpro/web-ui/primitives/notice/Toast";
