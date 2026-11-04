/* CHOOSING RECORDS — one (`Picker`, the many2one) or several (`TagsField`, the many2many).
   The replacement for `<select>` when you have to SEE in order to choose. */
export {
  Picker,
  type PickerItem,
  type PickerOptionState,
  type PickerProps,
} from "@sincpro/web-ui/primitives/picker/Picker";
/* Lo buscado, marcado: para que una opción propia (`renderOption`) lo diga como las demás. */
export { MatchedText } from "@sincpro/web-ui/primitives/picker/MatchedText";
/* El many2many: las fichas elegidas más una entrada que agrega la siguiente. */
export { type TagOption } from "@sincpro/web-ui/primitives/picker/tagChoices";
export { TagsField, type TagsFieldProps } from "@sincpro/web-ui/primitives/picker/TagsField";
