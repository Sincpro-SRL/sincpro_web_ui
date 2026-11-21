/* What is shared by more than one family and belongs to none of them. */
/* THE MECHANISM of a copy catalog — web-ui's words are one; an application's own are another.
   What needs no React — the words, their store, a merge, a template, a pick by density or
   surface — comes from modules without `"use client"`, so a server component reads it
   (`tests/serverBoundary.test.ts`). */
export { type CopyCatalog, createCopy } from "@sincpro/web-ui/foundations/catalog";
export { UiCopyProvider, useUiCopy } from "@sincpro/web-ui/foundations/copy";
export { type CopyOverride, mergeCopyOver } from "@sincpro/web-ui/foundations/copyStore";
export { DensityProvider, useDensity } from "@sincpro/web-ui/foundations/density";
/* NOW, live — one shared ticking clock per interval, `null` on the server. */
export { useNow } from "@sincpro/web-ui/foundations/clock";
/* IDLE — nobody touched it for a while: a kiosk forgets the abandoned order. */
export { useIdle } from "@sincpro/web-ui/foundations/idle";
export { byDensity, bySurface } from "@sincpro/web-ui/foundations/pickBy";
export {
  currentCopy,
  currentCopyLocale,
  ENGLISH_COPY,
  fillCopy,
  installCopy,
  mergeCopy,
  type UiCopy,
  type UiCopyOverride,
} from "@sincpro/web-ui/foundations/uiCopy";
/* How a whole application draws its views — `traditional` or `modern` (the direction): the
   record's rail and the actions of a record and of a list. Set once, like the density. */
export {
  useViewStyle,
  type ViewStyle,
  ViewStyleProvider,
} from "@sincpro/web-ui/foundations/viewStyle";
/* A CONTROL'S CONTRACT — the ids its `Field` gives it and whether it is viewed or written. The
   package's controls and the application's speak it alike. */
export { controlName } from "@sincpro/web-ui/foundations/controlName";
export {
  FieldBoundary,
  type FieldIds,
  type FormMode,
  FormModeProvider,
  type FormStyle,
  FormStyleProvider,
  useFieldIds,
  useFormMode,
  useFormStyle,
} from "@sincpro/web-ui/foundations/form";
/* A SHORTCUT, drawn the way the person's keyboard says it («⌘K» on a Mac, «Ctrl K» elsewhere),
   and BOUND: `useShortcuts` runs it while the piece that declares it is on screen — the last
   mounted wins. A combination is written once («Alt+D», «Mod+S») and read by `foundations/keys`. */
export {
  type KeyPress,
  type Keys,
  keysAria,
  keysLabel,
  matchesKeys,
  type ModShortcut,
  modShortcut,
  needsModifier,
  type ParsedKeys,
  parseKeys,
} from "@sincpro/web-ui/foundations/keys";
export {
  type KeyboardPlatform,
  type Shortcut,
  useKeyboardPlatform,
  useKeysHint,
  useShortcuts,
} from "@sincpro/web-ui/foundations/shortcut";
/* THE POINTER — a finger or a mouse, when the application knows better than the device (a till
   is a touch monitor with a mouse plugged in). `tokens.css` reads `data-pointer`. */
export {
  isPointer,
  type Pointer,
  POINTER_ATTRIBUTE,
  pointerAttributes,
  POINTERS,
} from "@sincpro/web-ui/foundations/pointer";
/* THE THEME — light, dark or the operating system's. The palettes live in `tokens.css`; this
   only writes `data-theme`. */
export { SurfaceProvider, useSurface } from "@sincpro/web-ui/foundations/surface";
export {
  applyTheme,
  ThemeProvider,
  type ThemeProviderProps,
  useTheme,
} from "@sincpro/web-ui/foundations/theme";
export {
  isTheme,
  type ResolvedTheme,
  resolveTheme,
  type Theme,
  THEME_ATTRIBUTE,
  THEMES,
} from "@sincpro/web-ui/foundations/themeChoice";
export type {
  Density,
  OpenTarget,
  Size,
  Surface,
  Tone,
} from "@sincpro/web-ui/foundations/types";
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
  dateKeyYear,
  dateLabel,
  dateTick,
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
export { useScrollBox, useStickyLayer } from "@sincpro/web-ui/foundations/sticky";
export { STICKY_TOP, stickyReset, stickyTop } from "@sincpro/web-ui/foundations/stickyStyle";
export {
  columnName,
  writeXlsx,
  type XlsxCell,
  type XlsxMerge,
  type XlsxSheet,
} from "@sincpro/web-ui/foundations/xlsx";
export { downloadXlsx } from "@sincpro/web-ui/foundations/xlsxDownload";
