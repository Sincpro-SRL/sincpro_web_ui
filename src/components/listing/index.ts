/* LISTING — the pieces a collection of N records is drawn with: rows, columns, paging,
   sorting, grouping. The `List` view composes them; any other component may reuse them. */
export {
  type ColumnControl,
  type ColumnSpec,
  defaultVisibleIds,
  reconcileVisible,
  toggleColumn,
  useColumnControl,
  visibleColumns,
} from "@sincpro/web-ui/components/listing/columns";
export {
  ColumnsMenu,
  specsFromColumns,
} from "@sincpro/web-ui/components/listing/ColumnsMenu";
export { Listing } from "@sincpro/web-ui/components/listing/Listing";
export { type ListIdentity, ListingBar } from "@sincpro/web-ui/components/listing/ListingBar";
export {
  type ClaimedField,
  claimedFields,
  columnsFromModel,
  readModelValue,
} from "@sincpro/web-ui/components/listing/modelColumns";
export {
  type CursorSource,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  type Pages,
  type PaginationBridge,
  type ServerPage,
  useCursorPagination,
  usePagination,
} from "@sincpro/web-ui/components/listing/pages";
export { Pagination } from "@sincpro/web-ui/components/listing/Pagination";
export { RecordLink } from "@sincpro/web-ui/components/listing/RecordLink";
export { GroupHeader, Row } from "@sincpro/web-ui/components/listing/Row";
export { type Selection, useSelection } from "@sincpro/web-ui/components/listing/selection";
export { type SetControl, useSetControl } from "@sincpro/web-ui/components/listing/set";
export {
  toggleCollapsed,
  type TreeControl,
  useTreeControl,
} from "@sincpro/web-ui/components/listing/tree";
export {
  type ViewOption,
  ViewSwitcher,
} from "@sincpro/web-ui/components/listing/ViewSwitcher";

/* El control de los niveles. El vocabulario está en `system/grouping.ts`. */
export {
  type BoardColumn,
  BoardColumns,
  type BoardStages,
} from "@sincpro/web-ui/components/listing/BoardColumns";
export {
  type GroupingControl,
  useGroupingControl,
} from "@sincpro/web-ui/components/listing/grouping";
export {
  GroupingLevels,
  type GroupingLevelsProps,
} from "@sincpro/web-ui/components/listing/GroupingLevels";
export {
  PivotExplorer,
  type PivotExplorerProps,
} from "@sincpro/web-ui/components/listing/PivotExplorer";
export { RecordCard } from "@sincpro/web-ui/components/listing/RecordCard";
export {
  type SortField,
  SortMenu,
  type SortMenuProps,
} from "@sincpro/web-ui/components/listing/SortMenu";
