/* THE CONTROLS a form is written with.
   What ARRANGES them —the sheet, the section, the footer— lives in `components/form`: a
   control does not know a form exists, and is used the same way inside a cell, a filter or
   a dialog. */
export { Checkbox, type CheckItem, CheckList } from "@sincpro/web-ui/primitives/field/Checks";
export { type FieldIds, useFieldIds } from "@sincpro/web-ui/primitives/field/context";
/* The copy button every field carries by its label — on by default, off by field or by form. */
export {
  FieldCopyProvider,
  shownText,
  useFieldCopy,
} from "@sincpro/web-ui/primitives/field/copy";
export { DropZone, type DropZoneProps } from "@sincpro/web-ui/primitives/field/DropZone";
export {
  controlClasses,
  DataField,
  Field,
  NumberInput,
  ReadValue,
  Select,
  type SelectOption,
  TextArea,
  TextInput,
} from "@sincpro/web-ui/primitives/field/Field";
export {
  type FieldLayout,
  FieldLayoutProvider,
  useSheetLayout,
} from "@sincpro/web-ui/primitives/field/layout";
export {
  type FormMode,
  FormModeProvider,
  useFormMode,
} from "@sincpro/web-ui/primitives/field/mode";
export { Suggest, type SuggestProps } from "@sincpro/web-ui/primitives/field/Suggest";
/* A note that belongs to one field: a card in the record's margin, or a flag by its label. */
export { type FieldNote } from "@sincpro/web-ui/primitives/field/note";
