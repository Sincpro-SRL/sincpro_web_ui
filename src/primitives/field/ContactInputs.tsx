"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import { useFieldIds, useFormMode } from "@sincpro/web-ui/foundations/form";
import { FieldGroup } from "@sincpro/web-ui/primitives/field/aria";
import {
  emailHref,
  telHref,
  urlHref,
  urlLabel,
  whatsappHref,
} from "@sincpro/web-ui/primitives/field/contact";
import { type ControlProps, nameOf, ReadValue } from "@sincpro/web-ui/primitives/field/Field";
import { Globe, type LucideIcon, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Input, TextField as AriaTextField } from "react-aria-components";

/* ==================================================================== *
 *  EMAIL, PHONE, WEBSITE — a text that is an ADDRESS.
 *
 *  Context: written into a `TextInput` they were plain text twice over. In
 *  edit mode the phone's keyboard was the letters one, the browser offered no
 *  autofill and underlined «agutierrez@» as a misspelling; in read mode an
 *  email was a string you had to select and paste into the mail client.
 *
 *  So each one asks for its keyboard (`inputMode`), its autofill
 *  (`autoComplete`) and its `type`, draws its icon inside the box so the field
 *  says what it holds before anything is typed, and in read mode is a LINK —
 *  `mailto:`, `tel:` (and WhatsApp when asked), the website in a new tab. The
 *  links are built by `contact.ts`, which never turns «javascript:…» into one.
 *
 *  Whether the value is WRONG is the form's to say, on trying: `isEmail` and
 *  `isUrl` are exported for that, like `isValidCardNumber`.
 * ==================================================================== */

const LINK =
  "min-w-0 truncate rounded-mark text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary";

type AddressProps = ControlProps & {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
};

/** The shared box: React Aria's `TextField`, its keyboard and autofill, the icon in front. */
function AddressInput({
  id: ownId,
  value,
  onChange,
  placeholder,
  describedBy: ownDescribedBy,
  invalid: ownInvalid,
  disabled = false,
  "aria-label": ariaLabel,
  icon: Icon,
  type,
  inputMode,
  autoComplete,
}: AddressProps & {
  icon: LucideIcon;
  type: "email" | "tel" | "url";
  inputMode: "email" | "tel" | "url";
  autoComplete: string;
}) {
  const { id, labelledBy, describedBy, invalid } = useFieldIds({
    id: ownId,
    describedBy: ownDescribedBy,
    invalid: ownInvalid,
  });
  return (
    <AriaTextField
      id={id}
      aria-labelledby={labelledBy}
      aria-label={nameOf(labelledBy, ariaLabel, placeholder)}
      value={value}
      onChange={(next) => onChange?.(next)}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      isInvalid={invalid}
      isDisabled={disabled}
      className="w-full min-w-0"
    >
      <FieldGroup isInvalid={invalid} isDisabled={disabled}>
        <Icon
          aria-hidden
          className="ml-2.5 size-(--size-icon-sm) shrink-0 text-muted"
          strokeWidth={2}
        />
        <Input
          aria-describedby={describedBy}
          placeholder={placeholder}
          spellCheck={false}
          className={`h-full min-w-0 flex-1 bg-transparent px-2 text-meta text-ink outline-0 placeholder:text-muted disabled:cursor-not-allowed ${
            type === "tel" ? "tabular-nums" : ""
          }`}
        />
      </FieldGroup>
    </AriaTextField>
  );
}

/** The read mode: a link when the value makes one, the plain text when it does not. */
function ReadLink({
  value,
  href,
  label,
  external = false,
  after,
}: {
  value: string;
  href: string | null;
  label?: string;
  external?: boolean;
  after?: ReactNode;
}) {
  const copy = useUiCopy();
  if (value.trim() === "") return <ReadValue value={null} />;
  if (href === null) return <ReadValue value={value} />;
  return (
    <ReadValue
      value={
        <span className="flex min-w-0 items-center gap-2">
          <a
            href={href}
            className={LINK}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label ?? value}
            {external ? <span className="sr-only"> ({copy.field.newTab})</span> : null}
          </a>
          {after}
        </span>
      }
    />
  );
}

/** An email: the email keyboard and autofill; in read mode, a `mailto:` link. */
export function EmailInput({ mode, ...props }: AddressProps) {
  if (useFormMode(mode) === "read") {
    return <ReadLink value={props.value} href={emailHref(props.value)} />;
  }
  return (
    <AddressInput
      {...props}
      icon={Mail}
      type="email"
      inputMode="email"
      autoComplete="email"
    />
  );
}

/** A phone as people write it — «+591 7 123-4567», kept as typed. The phone keyboard and
 *  autofill; in read mode a `tel:` link, and with `whatsapp` a second link to write there. */
export function PhoneInput({
  mode,
  whatsapp = false,
  ...props
}: AddressProps & {
  /** Also offer WhatsApp in read mode — the number needs its country code. */
  whatsapp?: boolean;
}) {
  const copy = useUiCopy();
  if (useFormMode(mode) === "read") {
    const chat = whatsapp ? whatsappHref(props.value) : null;
    return (
      <ReadLink
        value={props.value}
        href={telHref(props.value)}
        after={
          chat === null ? null : (
            <a
              href={chat}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${copy.person.whatsapp} (${copy.field.newTab})`}
              title={copy.person.whatsapp}
              data-copy-skip=""
              className="inline-flex shrink-0 items-center rounded-mark p-0.5 text-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <MessageCircle aria-hidden className="size-(--size-icon-sm)" strokeWidth={2} />
            </a>
          )
        }
      />
    );
  }
  return (
    <AddressInput {...props} icon={Phone} type="tel" inputMode="tel" autoComplete="tel" />
  );
}

/** A website: the URL keyboard; in read mode a link that opens in a new tab, read without
 *  its `https://`. A bare «sincpro.com.bo» is kept as typed and linked with `https://`. */
export function UrlInput({ mode, ...props }: AddressProps) {
  if (useFormMode(mode) === "read") {
    return (
      <ReadLink
        value={props.value}
        href={urlHref(props.value)}
        label={urlLabel(props.value)}
        external
      />
    );
  }
  return (
    <AddressInput {...props} icon={Globe} type="url" inputMode="url" autoComplete="url" />
  );
}
