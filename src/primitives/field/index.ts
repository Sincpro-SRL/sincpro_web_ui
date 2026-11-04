/* THE CONTROLS a form is written with. The contract they speak with their `Field` —
   `useFieldIds`, `useFormMode`— is in `foundations/form`: an application's own control
   speaks it the same way.
   What ARRANGES them —the sheet, the section, the footer— lives in `components/form`: a
   control does not know a form exists, and is used the same way inside a cell, a filter or
   a dialog. */
/* A payment card: the control, and the same checks for the form to validate with. */
export {
  CARD_MAX_DIGITS,
  type CardBrand,
  cardBrand,
  cardBrandName,
  cardCodeLength,
  cardDigits,
  expiryDigits,
  expiryParts,
  formatCardNumber,
  formatExpiry,
  isExpiryValid,
  isValidCardNumber,
  luhnValid,
  maskCardNumber,
} from "@sincpro/web-ui/primitives/field/card";
export {
  CardCodeInput,
  CardExpiryInput,
  CardNumberInput,
} from "@sincpro/web-ui/primitives/field/CardNumberInput";
/* An address to reach someone: typed with its keyboard, read as a link. */
export { Checkbox, type CheckItem, CheckList } from "@sincpro/web-ui/primitives/field/Checks";
export { CodeInput } from "@sincpro/web-ui/primitives/field/CodeInput";
export { ColorInput } from "@sincpro/web-ui/primitives/field/ColorInput";
export {
  emailHref,
  isEmail,
  isUrl,
  telHref,
  urlHref,
  urlLabel,
  whatsappHref,
} from "@sincpro/web-ui/primitives/field/contact";
export {
  EmailInput,
  PhoneInput,
  UrlInput,
} from "@sincpro/web-ui/primitives/field/ContactInputs";
/* The copy button every field carries by its label — on by default, off by field or by form. */
export {
  FieldCopyProvider,
  shownText,
  useFieldCopy,
} from "@sincpro/web-ui/primitives/field/clipboard";
export { DropZone, type DropZoneProps } from "@sincpro/web-ui/primitives/field/DropZone";
/* A duration in hours, read «8:30». */
export { formatDuration, parseDuration } from "@sincpro/web-ui/primitives/field/duration";
export { DurationInput } from "@sincpro/web-ui/primitives/field/DurationInput";
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
/* An image the record holds (chosen, dropped, pasted, cropped) and a signature (drawn or typed). */
export { type ImageChange, ImageInput } from "@sincpro/web-ui/primitives/field/ImageInput";
export {
  type FieldLayout,
  FieldLayoutProvider,
  useSheetLayout,
} from "@sincpro/web-ui/primitives/field/layout";
export { PasswordInput } from "@sincpro/web-ui/primitives/field/PasswordInput";
/* Formatted text (an Odoo `html` field): Tiptap, loaded only on editing. */
export {
  type MentionItem,
  RichTextInput,
} from "@sincpro/web-ui/primitives/field/RichTextInput";
/* An identifier with a fixed shape: NIT, CI, account, IBAN. */
export {
  formatPattern,
  isPatternComplete,
  patternLength,
  patternValue,
} from "@sincpro/web-ui/primitives/field/pattern";
export { PatternInput } from "@sincpro/web-ui/primitives/field/PatternInput";
export { SignatureInput } from "@sincpro/web-ui/primitives/field/SignatureInput";
export { Suggest, type SuggestProps } from "@sincpro/web-ui/primitives/field/Suggest";
/* A note that belongs to one field: a card in the record's margin, or a flag by its label. */
export { type FieldNote } from "@sincpro/web-ui/primitives/field/note";
