/* The assistant inside a business screen: a suggestion with its source, a preview of the
   changes it proposes, the mark it leaves on what it set, and its working state. */
export {
  ASSIST_ICON,
  type AssistApply,
  type AssistOrigin,
  type AssistSource,
  type ChangeKind,
  type ProposedChange,
} from "@sincpro/web-ui/components/assist/assist";
export {
  AssistedValue,
  assistEvent,
  AssistLabel,
  AssistMark,
  type AssistMarkProps,
  AssistSourceLink,
} from "@sincpro/web-ui/components/assist/AssistMark";
export {
  AssistPending,
  type AssistPendingProps,
} from "@sincpro/web-ui/components/assist/AssistPending";
export {
  AssistSuggestion,
  type AssistSuggestionProps,
} from "@sincpro/web-ui/components/assist/AssistSuggestion";
export {
  ChangeReview,
  ChangeReviewDialog,
  type ChangeReviewDialogProps,
  type ChangeReviewProps,
} from "@sincpro/web-ui/components/assist/ChangeReview";
