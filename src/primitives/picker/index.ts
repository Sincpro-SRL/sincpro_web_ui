/* CHOOSING RECORDS — one (`Picker`, the many2one) or several (`TagsField`, the many2many).
   The replacement for `<select>` when you have to SEE in order to choose. */
export {
  Picker,
  type PickerItem,
  type PickerOptionState,
  type PickerProps,
} from "@sincpro/web-ui/primitives/picker/Picker";
/* What was searched, marked: so an option of your own (`renderOption`) says it like the others do. */
export { MatchedText } from "@sincpro/web-ui/primitives/picker/MatchedText";
/* The many2many: the chosen chips plus an input that adds the next one. */
export { type TagOption } from "@sincpro/web-ui/primitives/picker/tagChoices";
export { TagsField, type TagsFieldProps } from "@sincpro/web-ui/primitives/picker/TagsField";
