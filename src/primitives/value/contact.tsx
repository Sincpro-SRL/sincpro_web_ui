"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import type { LucideIcon } from "lucide-react";
import { Mail, MessageCircle, Phone } from "lucide-react";

/** The ways to reach a person. Each one that is present becomes a row of the contact card. */
export type PersonContact = {
  email?: string;
  /** As people write it — «+591 7 123-4567». The `tel:` link keeps only the digits and `+`. */
  phone?: string;
  /** The WhatsApp number with its country code, written any way; `wa.me` gets the digits. */
  whatsapp?: string;
};

/** The three contact links, built from what people type. `wa.me` takes digits only — a `+`,
 *  a space or a dash breaks it — and `tel:` takes digits and the leading `+`. */
export function contactRows(
  contact: PersonContact,
  copy: ReturnType<typeof useUiCopy>["person"],
): { key: string; icon: LucideIcon; label: string; value: string; href: string }[] {
  const rows = [];
  if (contact.email !== undefined && contact.email !== "") {
    rows.push({
      key: "email",
      icon: Mail,
      label: copy.email,
      value: contact.email,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.phone !== undefined && contact.phone !== "") {
    rows.push({
      key: "call",
      icon: Phone,
      label: copy.call,
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
    });
  }
  if (contact.whatsapp !== undefined && contact.whatsapp !== "") {
    rows.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: copy.whatsapp,
      value: contact.whatsapp,
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`,
    });
  }
  return rows;
}

/**
 * The ways to reach someone, one ROW each — write, call, WhatsApp — on the card of any record
 * that is a person or a company. Each way is a row and not a bare icon: the address and the
 * number are drawn, because often what the person wants is to read the number aloud, not to
 * dial it from the browser. Every row is a real link (`mailto:`, `tel:`, `wa.me`), so
 * middle-click, «copy address» and the phone's own dialer work. Internal: `RelationCard` draws
 * it from its `contact`.
 */
export function ContactRows({ contact }: { contact: PersonContact }) {
  const rows = contactRows(contact, useUiCopy().person);
  if (rows.length === 0) return null;
  return (
    <ul className="-mx-1 flex flex-col border-t border-line pt-2">
      {rows.map(({ key, icon: Icon, label, value, href }) => (
        <li key={key}>
          <a
            href={href}
            data-contact={key}
            {...(key === "whatsapp" ? { target: "_blank", rel: "noreferrer" } : {})}
            className="flex min-w-0 items-center gap-2.5 rounded-control px-1 py-1.5 no-underline outline-primary outline-offset-2 hover:bg-ink/6 focus-visible:outline-2 forced-colors:outline-[Highlight]"
          >
            <Icon
              aria-hidden
              className="size-(--size-icon-md) shrink-0 text-primary"
              strokeWidth={2}
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-meta font-medium text-ink">{label}</span>
              <span className="truncate text-micro tabular-nums text-muted">{value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
