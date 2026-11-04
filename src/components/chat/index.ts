/* A conversation: the thread, the composer and the list of conversations. */
export {
  ChatComposer,
  type ChatComposerProps,
} from "@sincpro/web-ui/components/chat/ChatComposer";
export { ChatThread, type ChatThreadProps } from "@sincpro/web-ui/components/chat/ChatThread";
export {
  type Conversation,
  ConversationList,
  type ConversationListProps,
} from "@sincpro/web-ui/components/chat/ConversationList";
export {
  type ChatMessage,
  type DayGroup,
  dayKey,
  dayLabel,
  groupByDay,
  startsRun,
} from "@sincpro/web-ui/components/chat/model";
