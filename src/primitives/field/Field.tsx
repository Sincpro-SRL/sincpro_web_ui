"use client";

import { AriaLocale } from "@sincpro/web-ui/foundations/aria";
import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { byDensity, useDensity } from "@sincpro/web-ui/foundations/density";
import { focusRing, tv } from "@sincpro/web-ui/foundations/variants";
import { FieldGroup, listOptionStyles } from "@sincpro/web-ui/primitives/field/aria";
import {
  type FieldIds,
  FieldIdsContext,
  useFieldIds,
} from "@sincpro/web-ui/primitives/field/context";
import { useSheetLayout } from "@sincpro/web-ui/primitives/field/layout";
import {
  type FormMode,
  FormModeProvider,
  useFormMode,
} from "@sincpro/web-ui/primitives/field/mode";
import { Hint } from "@sincpro/web-ui/primitives/hint/Hint";
import { Popover } from "@sincpro/web-ui/primitives/overlay/Popover";
import { AlertCircle, Check, ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useId } from "react";
import {
  Button as AriaButton,
  Input,
  ListBox,
  ListBoxItem,
  NumberField as AriaNumberField,
  Select as AriaSelect,
  SelectValue,
  TextArea as AriaTextArea,
  TextField as AriaTextField,
} from "react-aria-components";

/* ==================================================================== *
 *  THE CONTROLS — the label is not optional and the error is not a color.
 *
 *  The state we came from is on record: twenty raw controls across six files,
 *  **none of them with an associated label or `aria-describedby`**, and all of
 *  them 24 px tall. That is not a matter of abstract accessibility: a `label`
 *  without `htmlFor` is a label that does not enlarge the click area, and a hint
 *  that is not linked is a hint a screen reader never reads.
 *
 *  ── The error says WHAT to do, not that something is wrong ──────────
 *
 *  "Invalid value" is no use. An error message has to say what was expected
 *  —"it has to be a number between 0 and 1"— because whoever made the mistake
 *  already knows they made it: what they don't know is what to put.
 *
 *  And it is never ONLY color: it carries an icon and text. A red border is
 *  invisible to someone who doesn't tell red apart, and also to someone who is
 *  looking at another part of the screen.
 *
 *  ── The hint sits on the label, the error BELOW the control ─────────
 *
 *  Help is a `?` next to the name, opened with a press. A paragraph above the
 *  control ate a line on every field. The error still goes below, close to
 *  the cursor, and it says what to put.
 * ==================================================================== */

export function Field({
  label,
  hint,
  error,
  required = false,
  children,
  htmlFor,
  layout,
  action,
  mode,
}: {
  label: string;
  /** What is expected. A `?` on the label that opens it on press. */
  hint?: string;
  /** What has to be corrected. It goes BELOW, close to the cursor, and it says
   *  what to put. */
  error?: string;
  required?: boolean;
  /** The control. Written directly — `<Field label="Nombre"><TextInput … /></Field>` — it
   *  reads its id, description and error state from the field. The render prop
   *  `{(aria) => …}` is still there for a control that is not one of the system's. */
  children: ReactNode | ((ids: FieldIds) => ReactNode);
  htmlFor?: string;
  /** `inline` puts the label on the LEFT, in a fixed-width column. It is what
   *  turns twenty stacked fields into a record that reads at a glance: every
   *  value starts on the same vertical, so the eye goes down a column instead of
   *  bouncing. It needs width — in a narrow drawer, the label eats the field.
   *  Omit it to inherit the sheet: `horizontal` there is this, `stacked` is the
   *  label above. */
  layout?: "stacked" | "inline";
  /** A button attached to the label: "generate", "clear", "pick from the
   *  catalog". It goes above and not below the control because it belongs to the
   *  FIELD, not to the form — what goes below is what closes the whole form. */
  action?: ReactNode;
  /** Forces the mode of this field. By default it inherits it from the view. */
  mode?: FormMode;
}) {
  const d = useDensity();
  const copy = useUiCopy();
  const auto = useId();
  const id = htmlFor ?? auto;
  const sheetLayout = useSheetLayout();
  const inline =
    layout === "inline" || (layout === undefined && sheetLayout === "horizontal");

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter((x) => x !== null)
      .join(" ") || undefined;

  const labelNode = (
    <span
      className={`flex min-w-0 items-center gap-1 text-micro font-medium text-muted ${inline ? "pt-2" : ""}`}
    >
      <label id={`${id}-label`} htmlFor={id} className={inline ? "min-w-0 truncate" : ""}>
        {label}
        {required ? (
          <>
            {/* Ink, not danger. Red means «this is wrong». Spending it on
                «you still have to fill this» makes a fresh form look failed. */}
            <span className="text-ink" aria-hidden>
              {" "}
              *
            </span>
            <span className="sr-only">, {copy.field.required}</span>
          </>
        ) : null}
      </label>
      {hint === undefined ? null : <Hint id={hintId}>{hint}</Hint>}
    </span>
  );

  /* The field's `mode` propagates INWARDS and is not used here: what knows how
     to draw itself as data is the control, not the label. That way a computed
     field stays in read mode inside a form that is being edited, without the
     consumer having to pass it to the control as well. */
  const ids: FieldIds = {
    id,
    labelId: `${id}-label`,
    describedBy,
    invalid: error !== undefined,
  };
  /* The render prop gets the same context as a control written directly: a system control
     inside it then also finds the label that names it, not only the id it is handed. */
  const content = (
    <FieldIdsContext.Provider value={ids}>
      {typeof children === "function" ? children(ids) : children}
    </FieldIdsContext.Provider>
  );
  const body = (
    <>
      {mode === undefined ? (
        content
      ) : (
        <FormModeProvider value={mode}>{content}</FormModeProvider>
      )}
      {error === undefined ? null : (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-micro text-danger"
        >
          <AlertCircle
            className="mt-px size-(--size-icon-sm) shrink-0"
            strokeWidth={2}
            aria-hidden
          />
          <span className="max-w-prose">{error}</span>
        </p>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="grid-label grid min-w-0 items-start gap-x-4 gap-y-1">
        {labelNode}
        <div className="flex min-w-0 flex-col gap-1">{body}</div>
        {action === undefined ? null : (
          <div data-under-control className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-1", "gap-0.5")}`}>
      <div className="flex min-w-0 items-center gap-2">
        {labelNode}
        {action === undefined ? null : <span className="ml-auto shrink-0">{action}</span>}
      </div>

      {body}
    </div>
  );
}

/**
 * A label with its VALUE, without a control below. What was missing to show a
 * record without pretending it is being edited.
 *
 * Context: until now, showing a value with its name in a form forced you to put
 * a disabled `TextInput`. That draws the box, the border and the height of
 * something you write into, and a whole record like that is twelve boxes empty
 * of meaning.
 *
 * It uses the same geometry as `Field`, so a field that goes from being looked
 * at to being edited does not move anything around it.
 */
export function DataField({
  label,
  value,
  hint,
  layout,
  mono = false,
  action,
}: {
  label: string;
  /** `undefined` and `null` are drawn with the missing mark: saying there is no
   *  data is information, and a blank line does not give it. */
  value: ReactNode;
  hint?: string;
  layout?: "stacked" | "inline";
  /** The value was written by the machine: an id, a code, an account number. */
  mono?: boolean;
  action?: ReactNode;
}) {
  const d = useDensity();
  const sheetLayout = useSheetLayout();
  const inline =
    layout === "inline" || (layout === undefined && sheetLayout === "horizontal");
  const empty = value === undefined || value === null || value === "";
  const unset = useUiCopy().field.unset;

  const labelNode = (
    <span
      className={`flex min-w-0 items-center gap-1 text-micro font-medium text-muted ${inline ? "pt-0.5" : ""}`}
    >
      <span className={inline ? "min-w-0 truncate" : ""}>{label}</span>
      {hint === undefined ? null : <Hint>{hint}</Hint>}
    </span>
  );

  const valueNode = (
    <span
      className={`min-w-0 text-meta ${empty ? "text-muted italic" : "text-ink"} ${
        mono ? "font-mono tabular-nums" : ""
      }`}
    >
      {empty ? unset : value}
    </span>
  );

  if (inline) {
    return (
      <div className="grid-label grid min-w-0 items-baseline gap-x-4 gap-y-0.5">
        {labelNode}
        <span className="flex min-w-0 items-baseline gap-2">
          {valueNode}
          {action}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 flex-col ${byDensity(d, "gap-1", "gap-0.5")}`}>
      <div className="flex min-w-0 items-center gap-2">
        {labelNode}
        {action === undefined ? null : <span className="ml-auto shrink-0">{action}</span>}
      </div>
      {valueNode}
    </div>
  );
}

/** What a control draws when the form is LOOKED AT instead of written into.
 *
 *  It is a single piece and not an `if` repeated in every control: if each one
 *  solves its read mode its own way, the record ends up with six different ways
 *  of saying the same thing. */
export function ReadValue({ value, mono = false }: { value: ReactNode; mono?: boolean }) {
  const unset = useUiCopy().field.unset;
  const empty = value === undefined || value === null || value === "";
  return (
    <span
      className={`flex min-h-(--size-control-md) min-w-0 items-center text-meta ${
        empty ? "text-muted italic" : "text-ink"
      } ${mono ? "font-mono tabular-nums" : ""}`}
    >
      {empty ? unset : value}
    </span>
  );
}

/** The shared look of everything that is written into or chosen from.
 *
 *  It exists as a function and not as a loose class so that a new control cannot
 *  be born with another height, another radius or another focus. That was the
 *  original defect: every file wrote its own `<input className="…">`. */
export function controlClasses(invalid = false): string {
  return `h-(--size-control-md) w-full min-w-0 rounded-control border bg-surface px-2.5 text-meta text-ink transition-colors duration-(--duration-instant) placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-ground disabled:text-muted ${
    invalid
      ? "border-danger focus-visible:border-danger focus-visible:outline-danger"
      : "border-line-strong focus-visible:border-primary focus-visible:outline-primary"
  }`;
}

/** What every text control shares: the field's wiring, overridable prop by prop. */
type ControlProps = {
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Forces the mode. By default it inherits the form's: in read mode it draws the value. */
  mode?: FormMode;
  /** The name of the control when it is NOT inside a `Field` — a cell of an editable table,
   *  the box of a message. Inside a field, the field's label names it. */
  "aria-label"?: string;
};

/* `aria-describedby` goes on the INPUT and not on React Aria's field: the field adds the ids
   of its own description and error slots, which this system never renders (`Field` draws
   them), and the input's own prop replaces that list with the field's real one. */

/** The accessible name of a control. Inside a `Field` the field's label names it; outside,
 *  the consumer's `aria-label`, and as a last resort the placeholder — which is what a
 *  browser reads for a bare `<input placeholder>` anyway, so a control outside a form is
 *  never nameless. */
function nameOf(labelledBy: string | undefined, ariaLabel?: string, placeholder?: string) {
  return labelledBy === undefined ? (ariaLabel ?? placeholder) : ariaLabel;
}

/**
 * One line of text: a business name, a reference, a NIT.
 *
 * Context: it is React Aria's `TextField` — the field's label, hint and error reach the real
 * `<input>` through `useFieldIds`, and React Aria adds the rest of what a text input owes a
 * screen reader. What it draws is `controlClasses()`, the one box every control shares.
 */
export function TextInput({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  mono = false,
  spellCheck,
  "aria-label": ariaLabel,
}: ControlProps & {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  /** The value was written by the machine and gets compared with the one next to it: an
   *  id, a key, an account code. See the family rule in Typography. */
  mono?: boolean;
  /** `false` for a value that is a token and not prose — a product code, a reference, an
   *  account code — so the browser stops underlining identifiers as misspellings. */
  spellCheck?: boolean;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  if (useFormMode(mode) === "read") return <ReadValue value={value} mono={mono} />;

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={value}
      onChange={(next) => onChange?.(next)}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <Input
        aria-describedby={describedBy}
        placeholder={placeholder}
        spellCheck={spellCheck}
        className={`${controlClasses(invalid)} ${mono ? "font-mono tabular-nums" : ""}`}
      />
    </AriaTextField>
  );
}

/** The amount, the quantity, the percentage — read in the copy's locale, every time. */
function useReadNumber(format: Intl.NumberFormatOptions | undefined) {
  const { locale } = useUiCopy();
  const formatter = new Intl.NumberFormat(locale, format);
  return (value: number) => formatter.format(value);
}

const stepper =
  "flex min-h-0 flex-1 cursor-default items-center justify-center px-1 text-muted transition-colors duration-(--duration-instant) outline-0 hover:bg-ink/6 hover:text-ink pressed:bg-ink/10 disabled:cursor-not-allowed disabled:text-line-strong disabled:hover:bg-transparent forced-colors:disabled:text-[GrayText]";

/**
 * A number typed the way the person writes it: «1.234,56» in Bolivia, «1,234.56» in the
 * United States.
 *
 * Context: it was an `<input type="number">`, and that input only understands the
 * browser's idea of a number — on a Spanish form, «1.234,56» was either refused or read as
 * one point two. It is React Aria's `NumberField` now, inside `AriaLocale`: it parses and
 * formats in the locale of the copy table, not the browser's, so an amount reads the same
 * here as in the listing next to it. `format` takes `Intl.NumberFormatOptions` — a
 * currency, a percentage, two fixed decimals — and the field types and shows it that way.
 *
 * The arrow keys (and the two small buttons) step by `step`; on leaving the field the value
 * is clamped to `min`/`max` and snapped to `step`, so what the form submits is always a
 * number the field would have accepted. The value stays a plain `number`, and `""` is the
 * empty field — never `NaN`, which is how React Aria says it inside.
 */
export function NumberInput({
  id: ownId,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  format,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  value: number | "";
  onChange?: (next: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  /** The unit, attached to the field: "días", "u.", "kg". A number without a unit in a
   *  form is half a question. For money, prefer `format` with a currency. */
  unit?: string;
  /** How the number is written: `{ style: "currency", currency: "BOB" }`,
   *  `{ style: "percent" }`, `{ minimumFractionDigits: 2 }`. In the copy's locale. */
  format?: Intl.NumberFormatOptions;
  placeholder?: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  const read = useReadNumber(format);
  if (useFormMode(mode) === "read") {
    return (
      <ReadValue
        value={
          value === "" ? null : (
            <span className="tabular-nums">
              {read(value)}
              {unit === undefined ? "" : ` ${unit}`}
            </span>
          )
        }
      />
    );
  }

  return (
    <AriaLocale>
      <AriaNumberField
        id={id}
        aria-labelledby={labelledBy}
        aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
        value={value === "" ? Number.NaN : value}
        onChange={(next) => onChange?.(Number.isNaN(next) ? "" : next)}
        minValue={min}
        maxValue={max}
        step={step}
        formatOptions={format}
        isInvalid={invalid}
        isDisabled={disabled}
        className="flex w-full min-w-0 items-center gap-2"
      >
        <FieldGroup>
          <Input
            aria-describedby={describedBy}
            placeholder={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-meta text-ink tabular-nums outline-0 placeholder:text-muted disabled:cursor-not-allowed"
          />
          <span className="flex h-full shrink-0 flex-col border-l border-line">
            <AriaButton slot="increment" className={stepper}>
              <ChevronUp aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
            </AriaButton>
            <AriaButton slot="decrement" className={`${stepper} border-t border-line`}>
              <ChevronDown aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
            </AriaButton>
          </span>
        </FieldGroup>
        {unit === undefined ? null : (
          <span className="shrink-0 text-meta whitespace-nowrap text-muted">{unit}</span>
        )}
      </AriaNumberField>
    </AriaLocale>
  );
}

/**
 * Several lines of prose: the notes of an order, the reason of a credit note.
 *
 * Context: React Aria's `TextField` with a `TextArea` inside — the same wiring as
 * `TextInput`, the same box, taller and resizable only downwards, because a note grows in
 * lines, not in width.
 */
export function TextArea({
  id: ownId,
  value,
  onChange,
  placeholder,
  rows = 3,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  /* The paragraph in read mode keeps its line breaks: a long text without them
     is a block, and whoever wrote it put them there for a reason. */
  if (useFormMode(mode) === "read") {
    return value === "" ? (
      <ReadValue value={null} />
    ) : (
      <span className="text-meta whitespace-pre-line text-ink">{value}</span>
    );
  }

  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={value}
      onChange={(next) => onChange?.(next)}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <AriaTextArea
        aria-describedby={describedBy}
        rows={rows}
        placeholder={placeholder}
        className={`${controlClasses(invalid)} h-auto resize-y py-1.5 leading-relaxed`}
      />
    </AriaTextField>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const selectTrigger = tv({
  extend: focusRing,
  base: "flex h-(--size-control-md) w-full min-w-0 cursor-default items-center gap-2 rounded-control border bg-surface pr-2 pl-2.5 text-start text-meta text-ink transition-colors duration-(--duration-instant) forced-colors:bg-[Field]",
  variants: {
    isFocusVisible: {
      true: "border-primary",
    },
    isInvalid: {
      false: "border-line-strong forced-colors:border-[ButtonBorder]",
      true: "border-danger outline-danger forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "cursor-not-allowed bg-ground text-muted forced-colors:text-[GrayText]",
    },
  },
});

/** The system's select, for SHORT and closed lists: the payment terms, the currency, the
 *  warehouse.
 *
 *  Context: it was a native `<select>`, and its open list was the operating system's — its
 *  font, its colors, its radius, in the middle of a form drawn with the system's. It is
 *  React Aria's `Select` now: the trigger is the system's control box and the list floats
 *  on the system's `Popover`, row for row the same as `ComboBox`'s. The keyboard is still a
 *  select's: arrows open it and move, typing a letter jumps to the option, Enter picks.
 *
 *  As soon as the list has to show two pieces of data per option —a name and its tax id—
 *  or grows past a screen, it is a `ComboBox` (type to find) or a `Picker` (records with
 *  their metadata). An option here is ONE LINE OF TEXT. */
export function Select({
  id: ownId,
  value,
  options,
  onChange,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  placeholder,
  mode,
  "aria-label": ariaLabel,
}: ControlProps & {
  /** The chosen option's `value`; `""` is nothing chosen, and draws the placeholder. */
  value: string;
  options: readonly SelectOption[];
  onChange?: (next: string) => void;
  placeholder?: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  /* In read mode the option's LABEL is drawn, not its value: `CONTADO` is the backend's
     key, and what the form promised to show was «Al contado». */
  if (useFormMode(mode) === "read") {
    return <ReadValue value={options.find((o) => o.value === value)?.label ?? null} />;
  }

  return (
    <AriaLocale>
      <AriaSelect
        id={id}
        aria-labelledby={labelledBy}
        aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
        aria-describedby={describedBy}
        value={value === "" ? null : value}
        onChange={(next) => onChange?.(next === null ? "" : String(next))}
        placeholder={placeholder}
        isInvalid={invalid}
        isDisabled={disabled}
        className="w-full min-w-0"
      >
        <AriaButton className={(state) => selectTrigger({ ...state, isInvalid: invalid })}>
          {/* The option's TEXT, not its row: the row carries the check mark of the list. */}
          <SelectValue className="min-w-0 flex-1 truncate data-placeholder:text-muted">
            {({ isPlaceholder, selectedText, defaultChildren }) =>
              isPlaceholder ? defaultChildren : selectedText
            }
          </SelectValue>
          <ChevronDown
            aria-hidden
            className="size-(--size-icon-md) shrink-0 text-muted"
            strokeWidth={2}
          />
        </AriaButton>
        {/* At least as wide as the trigger, because the list continues it. */}
        <Popover placement="bottom start" className="min-w-(--trigger-width)">
          <ListBox items={options} className="max-h-[inherit] overflow-auto p-1 outline-0">
            {(option) => (
              <ListBoxItem
                id={option.value}
                textValue={option.label}
                isDisabled={option.disabled}
                className={listOptionStyles}
              >
                {({ isSelected }) => (
                  <>
                    <span
                      className={`min-w-0 flex-1 truncate ${isSelected ? "font-medium" : ""}`}
                    >
                      {option.label}
                    </span>
                    <span className="flex size-(--size-icon-md) shrink-0 items-center justify-center">
                      {isSelected ? (
                        <Check
                          aria-hidden
                          className="size-(--size-icon-md) text-primary forced-colors:text-[HighlightText]"
                          strokeWidth={2}
                        />
                      ) : null}
                    </span>
                  </>
                )}
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </AriaSelect>
    </AriaLocale>
  );
}
