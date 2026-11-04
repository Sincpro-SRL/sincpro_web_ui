/* Show a number or a datum so that it reads as such and not as text. */
export {
  Copyable,
  type CopyableProps,
  CopyButton,
} from "@sincpro/web-ui/primitives/value/Copyable";
export {
  DateValue,
  formatDateTime,
  formatRelative,
} from "@sincpro/web-ui/primitives/value/DateValue";
export { Markdown, type MarkdownProps } from "@sincpro/web-ui/primitives/value/Markdown";
export {
  Meter,
  type MeterLevel,
  meterLevel,
  type MeterProps,
  type MeterThresholds,
} from "@sincpro/web-ui/primitives/value/Meter";
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
export {
  isRichTextEmpty,
  richTextPlain,
  RichTextValue,
  sanitizeRichText,
} from "@sincpro/web-ui/primitives/value/RichText";
export {
  type Rounding,
  type RoundingMethod,
  roundTo,
} from "@sincpro/web-ui/primitives/value/rounding";
export {
  Totals,
  type TotalsCredit,
  type TotalsDeduction,
  type TotalsFact,
  type TotalsProps,
  type TotalsRow,
} from "@sincpro/web-ui/primitives/value/Totals";
export {
  Cell,
  formatCount,
  formatDistance,
  formatNumber,
  formatWith,
  KeyValue,
  Numeric,
} from "@sincpro/web-ui/primitives/value/Value";
