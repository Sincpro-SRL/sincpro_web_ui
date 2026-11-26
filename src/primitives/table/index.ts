/* The presentation (`Table`) is ours and is used on its own; `DataTable` is the
   wiring to TanStack for grouping and sorting. See the note in `DataTable.tsx`. */
export { CELL_TONE } from "@sincpro/web-ui/primitives/table/cellTone";
export {
  type Aggregate,
  type DataColumn,
  DataTable,
  type DataTableCreate,
  type GroupColumn,
  type YesNoColumn,
} from "@sincpro/web-ui/primitives/table/DataTable";
export {
  EditableTable,
  type EditAdd,
  type EditBands,
  type EditCellState,
  type EditColumn,
  type EditFlag,
  type EditLayout,
  type EditRowState,
} from "@sincpro/web-ui/primitives/table/EditableTable";
export {
  sectionLines,
  type StackPlace,
  stackPlaces,
  type TabTarget,
  tabTarget,
} from "@sincpro/web-ui/primitives/table/editRules";
export { levelNameOf } from "@sincpro/web-ui/primitives/table/levels";
export { PileFootLine } from "@sincpro/web-ui/primitives/table/PileFootLine";
export {
  PivotTable,
  type PivotTableProps,
} from "@sincpro/web-ui/primitives/table/PivotTable";
export {
  type ReportColumn,
  type ReportRow,
  type ReportRowKind,
  ReportTable,
} from "@sincpro/web-ui/primitives/table/ReportTable";
export { type RowAction, RowActions } from "@sincpro/web-ui/primitives/table/RowActions";
export { type SheetColumn, SheetTable } from "@sincpro/web-ui/primitives/table/SheetTable";
export {
  compareBy,
  flipSort,
  moveSort,
  pressSort,
  type SortDirection,
  sortPosition,
  type SortState,
} from "@sincpro/web-ui/primitives/table/sorting";
export { Table, Td, Th, THead, Tr } from "@sincpro/web-ui/primitives/table/Table";
