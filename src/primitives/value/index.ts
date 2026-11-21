/* Show a number or a datum so that it reads as such and not as text. */
export {
  Copyable,
  type CopyableProps,
  CopyButton,
} from "@sincpro/web-ui/primitives/value/Copyable";
export { DateValue } from "@sincpro/web-ui/primitives/value/DateValue";
/* The formatters, without `"use client"`: a server component writes a number or a date the
   same way. */
export {
  formatCount,
  formatDateTime,
  formatDistance,
  formatNumber,
  formatRelative,
  formatWith,
} from "@sincpro/web-ui/primitives/value/format";
export { Markdown, type MarkdownProps } from "@sincpro/web-ui/primitives/value/Markdown";
export { Meter, type MeterProps } from "@sincpro/web-ui/primitives/value/Meter";
export {
  type MeterLevel,
  meterLevel,
  type MeterThresholds,
} from "@sincpro/web-ui/primitives/value/meterLevel";
export { Metric, type MetricProps, Metrics } from "@sincpro/web-ui/primitives/value/Metric";
export {
  Avatar,
  type AvatarSize,
  type PersonContact,
  UserChip,
  type UserChipProps,
  UserStack,
} from "@sincpro/web-ui/primitives/value/Person";
export {
  ProgressBar,
  type ProgressBarProps,
} from "@sincpro/web-ui/primitives/value/ProgressBar";
export {
  RelationCard,
  type RelationCardProps,
  type RelationSummary,
  RelationValue,
  type RelationValueProps,
} from "@sincpro/web-ui/primitives/value/Relation";
/* The HTML of a note, read — cleaned of anything that runs. */
export { RichTextValue, sanitizeRichText } from "@sincpro/web-ui/primitives/value/RichText";
export {
  isRichTextEmpty,
  richTextPlain,
} from "@sincpro/web-ui/primitives/value/richTextPlain";
export {
  type Rounding,
  type RoundingMethod,
  roundTo,
} from "@sincpro/web-ui/primitives/value/rounding";
/* HOW LONG IT HAS BEEN WAITING — a kitchen's ticket, a case under an SLA: live, in a tone by
   two thresholds. The arithmetic is pure (`elapsedTime.ts`), so a sort or a server reads it. */
export { Elapsed, type ElapsedProps } from "@sincpro/web-ui/primitives/value/Elapsed";
export {
  elapsedMillis,
  type ElapsedSince,
  type ElapsedThresholds,
  elapsedTone,
  formatElapsed,
  sinceMillis,
} from "@sincpro/web-ui/primitives/value/elapsedTime";
export {
  Totals,
  type TotalsCredit,
  type TotalsDeduction,
  type TotalsFact,
  type TotalsProps,
  type TotalsRow,
} from "@sincpro/web-ui/primitives/value/Totals";
export { Cell, KeyValue, Numeric } from "@sincpro/web-ui/primitives/value/Value";
export { YesNo, type YesNoLook } from "@sincpro/web-ui/primitives/value/YesNo";
