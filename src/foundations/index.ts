/* What is shared by more than one family and belongs to none of them. */
/* THE MECHANISM of a copy catalog — web-ui's words are one; an application's own are another. */
export {
  type CopyCatalog,
  type CopyOverride,
  createCopy,
  mergeCopyOver,
} from "@sincpro/web-ui/foundations/catalog";
export {
  currentCopy,
  currentCopyLocale,
  ENGLISH_COPY,
  fillCopy,
  installCopy,
  mergeCopy,
  type UiCopy,
  type UiCopyOverride,
  UiCopyProvider,
  useUiCopy,
} from "@sincpro/web-ui/foundations/copy";
export {
  byDensity,
  type Density,
  DensityProvider,
  useDensity,
} from "@sincpro/web-ui/foundations/density";
/* A CONTROL'S CONTRACT — the ids its `Field` gives it and whether it is viewed or written. The
   package's controls and the application's speak it alike. */
export {
  controlName,
  FieldBoundary,
  type FieldIds,
  type FormMode,
  FormModeProvider,
  useFieldIds,
  useFormMode,
} from "@sincpro/web-ui/foundations/form";
/* THE THEME — light, dark or the operating system's. The palettes live in `tokens.css`; this
   only writes `data-theme`. */
export { bySurface, SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
export {
  applyTheme,
  isTheme,
  type ResolvedTheme,
  resolveTheme,
  type Theme,
  THEME_ATTRIBUTE,
  ThemeProvider,
  type ThemeProviderProps,
  THEMES,
  useTheme,
} from "@sincpro/web-ui/foundations/theme";
export type { OpenTarget, Size, Surface, Tone } from "@sincpro/web-ui/foundations/types";
/** The system's Spanish, for whoever wants to install it whole. */
export { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
/* THE SLOTS — how an archetype is written as a TREE. It lives here and not inside
   one because all of them speak it: while it was hidden in
   `Record.tsx`, being a tree was a privilege of records. */
export {
  flatten,
  loose,
  pick,
  pickAll,
  propsOf,
  slot,
  slotOf,
  type Slotted,
} from "@sincpro/web-ui/foundations/slots";
/* THE CALENDAR — from a date to a key and from a key to a label. The months
   and the days of the week are said by `Intl` with the copy's `locale`; the week
   and the quarter are the only two words that have to be written. */
export {
  dateKey,
  dateKeysBetween,
  dateLabel,
  grainName,
  monthName,
  nextDateKey,
} from "@sincpro/web-ui/foundations/calendar";
/* THE GROUPING — the vocabulary, which both layers speak: the list builds the
   tree of buckets and the table draws it. It lives here and not in `contexts/list`
   because a primitive cannot import from a context. */
export {
  GRAIN_ORDER,
  type GroupableField,
  type GroupGrain,
  type Grouping,
  type GroupLevel,
  itemPath,
  levelKey,
  moveLevel,
  normalizeLevels,
  pathKey,
  pathLabels,
  type Pile,
  pileCount,
  type PileFoot,
  pileFoot,
  pileIsOpen,
  pileItems,
  pileLabel,
  type PileLabelOf,
  type PileOf,
  pilesFrom,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
/* THE PIVOT — the same split: the vocabulary here, the grid in `primitives`.
   That margins come from the base and that a hole is not a zero are rules
   of the CONTRACT, not of the drawing, and that is why they live on this side. */
export {
  axisLabels,
  axisSpans,
  keyStarts,
  type Pivot,
  type PivotAxis,
  type PivotCell,
  type PivotCrossing,
  type PivotFold,
  pivotFrom,
  pivotIsEmpty,
  type PivotKey,
  type PivotLevel,
  type PivotMargin,
  type PivotMeasure,
  pivotOf,
  type PivotSource,
  type PivotSpec,
} from "@sincpro/web-ui/foundations/pivot";
/* THE CHART — a pivot read as marks. It reads the same `Pivot`, so it serves equally for
   records, a dataset or what was folded on the server; a dictionary comes in through its helper. */
export {
  chartCompare,
  type ChartData,
  chartFromPivot,
  chartFromRecord,
  type ChartKind,
  type ChartMeasure,
  chartMeasures,
  type ChartOrder,
  type ChartPoint,
  type ChartReading,
  COUNT_MEASURE,
  orderChart,
  SERIES_COLORS,
} from "@sincpro/web-ui/foundations/chart";
/* THE SHEET: the same grid, in a file. The writer is generic and knows
   nothing of pivots; `pivotSheet` is what translates one. */
export {
  downloadPivot,
  pivotSheet,
  type PivotSheetOptions,
  pivotXlsx,
} from "@sincpro/web-ui/foundations/pivotSheet";
export {
  STICKY_TOP,
  stickyReset,
  stickyTop,
  useScrollBox,
  useStickyLayer,
} from "@sincpro/web-ui/foundations/sticky";
export {
  columnName,
  downloadXlsx,
  writeXlsx,
  type XlsxCell,
  type XlsxMerge,
  type XlsxSheet,
} from "@sincpro/web-ui/foundations/xlsx";
