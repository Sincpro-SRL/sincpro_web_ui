/* ACTIVITY — everything around a record: its notices, its conversation and its history. */
export {
  Activity,
  type ActivityAlert,
  type ActivityEvent,
  type ActivityLayout,
  type ActivityProps,
  useActivity,
} from "@sincpro/web-ui/components/activity/Activity";
export {
  ActivityBadge,
  type ActivityState,
} from "@sincpro/web-ui/components/activity/ActivityBadge";
export {
  type Message,
  MessageComposer,
  type MessageComposerProps,
  type MessageKind,
  writeANote,
} from "@sincpro/web-ui/components/activity/Messages";
export {
  Timeline,
  type TimelineItemProps,
  type TimelineProps,
} from "@sincpro/web-ui/components/activity/Timeline";
