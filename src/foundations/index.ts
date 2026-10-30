/* What is shared by more than one family and belongs to none of them. */
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
/* EL TEMA — claro, oscuro o el del sistema operativo. Las paletas viven en `tokens.css`; esto
   sólo escribe `data-theme`. */
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
export type { Size, Surface, Tone } from "@sincpro/web-ui/foundations/types";
/** El castellano del sistema, para quien lo quiera instalar entero. */
export { SPANISH_COPY } from "@sincpro/web-ui/foundations/copy.es";
/* LAS RANURAS — cómo un arquetipo se escribe como ÁRBOL. Vive acá y no adentro
   de uno porque lo hablan todos los que lo son: mientras estuvo escondido en
   `Record.tsx`, ser un árbol era un privilegio de los registros. */
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
/* EL CALENDARIO — de una fecha a una clave y de una clave a un rótulo. Los meses
   y los días de la semana los dice `Intl` con el `locale` de la copia; la semana
   y el trimestre son las dos únicas palabras que hay que escribir. */
export {
  dateKey,
  dateLabel,
  grainName,
  monthName,
} from "@sincpro/web-ui/foundations/calendar";
/* LA AGRUPACIÓN — el vocabulario, que hablan las dos capas: la lista arma el
   árbol de montones y la tabla lo dibuja. Vive acá y no en `contexts/list`
   porque una primitiva no puede importar de un contexto. */
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
  pileIsOpen,
  pileItems,
  pileLabel,
  type PileLabelOf,
  type PileOf,
  pilesFrom,
  pilesOf,
} from "@sincpro/web-ui/foundations/grouping";
/* EL PIVOTE — el mismo reparto: el vocabulario acá, la grilla en `primitives`.
   Que los márgenes vengan de la base y que un agujero no sea un cero son reglas
   del CONTRATO, no del dibujo, y por eso viven de este lado. */
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
/* LA PLANILLA: la misma grilla, en un archivo. El escritor es genérico y no
   sabe de pivotes; `pivotSheet` es el que traduce uno. */
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
