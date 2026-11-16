/* THE APPLICATION FRAME — what sits above every view. */
export { AppFrame } from "@sincpro/web-ui/components/shell/AppFrame";
/* The whole chrome in one column, for a back office with no bar on top. */
export {
  Sidebar,
  type SidebarAction,
  type SidebarProps,
} from "@sincpro/web-ui/components/shell/Sidebar";
/* The sidebar's phone drawer, for a bar an application writes itself. */
export {
  type SidebarDrawer,
  SidebarToggle,
  useSidebarDrawer,
} from "@sincpro/web-ui/components/shell/sidebarDrawer";
export {
  type AppEntry,
  SystrayButton,
  TopBar,
  type TopMenu,
} from "@sincpro/web-ui/components/shell/TopBar";
/* A screen of N sets side by side — the reconciliation: each pane scrolls on its own. */
export { Pane, Panes } from "@sincpro/web-ui/components/shell/Panes";
