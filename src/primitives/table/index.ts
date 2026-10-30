/* The presentation (`Table`) is ours and is used on its own; `DataTable` is the
   wiring to TanStack for grouping and sorting. See the note in `DataTable.tsx`. */
export {
  type Aggregate,
  type DataColumn,
  DataTable,
  type GroupColumn,
} from "@sincpro/web-ui/primitives/table/DataTable";
export {
  EditableTable,
  type EditColumn,
  type EditLayout,
  type StackPlace,
  stackPlaces,
} from "@sincpro/web-ui/primitives/table/EditableTable";
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
  CELL_TONE,
  type SortDirection,
  type SortState,
  Table,
  Td,
  Th,
  THead,
  Tr,
} from "@sincpro/web-ui/primitives/table/Table";
