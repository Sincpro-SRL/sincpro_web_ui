/* THE APPLICATION FRAME — what sits above every view. */
export { AppFrame } from "@sincpro/web-ui/components/shell/AppFrame";
/* A product's mark: an image's URL, or an inline <svg> that paints with the tokens. */
export { type BrandLogo } from "@sincpro/web-ui/components/shell/brandMark";
/* The whole chrome in one column, for a back office with no bar on top. */
export {
  Sidebar,
  type SidebarAction,
  type SidebarProps,
} from "@sincpro/web-ui/components/shell/Sidebar";
/* The way into the application's palette, drawn: «Buscar…  ⌘K». The sidebar and the bar draw
   it from their `search`; on its own, for any other place. */
export {
  SearchEntry,
  type SearchEntryProps,
} from "@sincpro/web-ui/components/shell/SearchEntry";
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
