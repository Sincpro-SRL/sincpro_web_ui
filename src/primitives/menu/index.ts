/* A data-driven dropdown: the actions `⋯` and "+ Create". */
export { Menu, type MenuGroup, type MenuOption } from "@sincpro/web-ui/primitives/menu/Menu";
/* A trigger's look without the menu, without `"use client"`: a server component calls it. */
export { menuTriggerClasses } from "@sincpro/web-ui/primitives/menu/classes";
/* The same menu opened AT the pointer: right click, a finger held, Shift+F10 on a row or a card. */
export {
  ContextMenu,
  type ContextMenuProps,
} from "@sincpro/web-ui/primitives/menu/ContextMenu";
