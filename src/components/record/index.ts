/* RECORD PARTS — the header, status bar, pager and skeleton of one record. The `Record` view
   composes them. */
/* The actions FLOATING, as data (experimental): what is seen and what waits in «Más» is
   decided by `dockPlan`. */
export {
  ActionDock,
  type ActionDockProps,
  type DockLook,
  type DockPlacement,
  type RecordDockPlacement,
  type RecordDockProps,
} from "@sincpro/web-ui/components/record/ActionDock";
export { Breadcrumb, type Crumb } from "@sincpro/web-ui/components/record/Breadcrumb";
export {
  DirtyActions,
  type DirtyState,
} from "@sincpro/web-ui/components/record/DirtyActions";
export {
  type DockAction,
  dockOption,
  type DockPlan,
  dockPlan,
  moreGroups,
} from "@sincpro/web-ui/components/record/dock";
export { Pager } from "@sincpro/web-ui/components/record/Pager";
export { RecordAudit, type RecordStamp } from "@sincpro/web-ui/components/record/RecordAudit";
export { RecordRibbon } from "@sincpro/web-ui/components/record/RecordRibbon";
export { RecordSkeleton } from "@sincpro/web-ui/components/record/RecordSkeleton";
export { SmartButton, SmartButtons } from "@sincpro/web-ui/components/record/SmartButtons";
export {
  type Stage,
  StatusBar,
  type StatusLook,
} from "@sincpro/web-ui/components/record/StatusBar";
/* How a whole application draws its records — `traditional` or `modern` (experimental). */
export {
  type RecordStyle,
  RecordStyleProvider,
  useRecordStyle,
} from "@sincpro/web-ui/components/record/style";
