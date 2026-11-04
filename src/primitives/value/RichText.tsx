"use client";

import { useUiCopy } from "@sincpro/web-ui/foundations/copy";
import DOMPurify from "dompurify";
import { useSyncExternalStore } from "react";

/* ==================================================================== *
 *  RICH TEXT, READ — the HTML of a note shown as what it says.
 *
 *  Context: this HTML comes from people (a description pasted from an email)
 *  and from engines (an Odoo `html` field), and either can carry a script, an
 *  `onerror`, a `javascript:` link. So it is never put on the page as it came:
 *  DOMPurify keeps the text and its structure (paragraphs, headings, lists,
 *  links, tables, a mention) and drops everything that runs. A link always
 *  opens in another tab, without handing that tab our window.
 *
 *  ── On the server there is no DOM to clean with ─────────────────────
 *
 *  DOMPurify needs a document. Without one (server rendering, a Node test), the
 *  safe answer is the TEXT, tags removed and escaped by React — never the HTML
 *  unchecked. The browser then upgrades it to the cleaned HTML; the switch goes
 *  through `useSyncExternalStore`, so hydration does not see two different trees.
 * ==================================================================== */

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "span",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
  "img",
];
const ALLOWED_ATTR = [
  "href",
  "title",
  "colspan",
  "rowspan",
  "src",
  "alt",
  "data-type",
  "data-id",
  "data-label",
];

let hooked = false;

/** The HTML with everything that runs taken out, or `null` where there is no DOM to do it. */
export function sanitizeRichText(html: string): string | null {
  if (typeof window === "undefined" || !DOMPurify.isSupported) return null;
  if (!hooked) {
    hooked = true;
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
      if (node.tagName === "IMG") {
        /* An image whose address was not allowed is a broken box: gone. One without a
           description is read as decoration (`alt=""`) instead of as its file name. */
        if (!node.hasAttribute("src")) node.remove();
        else if (!node.hasAttribute("alt")) node.setAttribute("alt", "");
      }
    });
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|data:image\/(?:png|jpeg|gif|webp);)/i,
  });
}

/** The words of an HTML, without its tags: what is shown where it cannot be cleaned. */
export function richTextPlain(html: string): string {
  return html
    .replace(/<(?:br|\/p|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nothing written: no text and no image — «<p></p>» from an emptied editor counts as nothing. */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (html === null || html === undefined) return true;
  return richTextPlain(html) === "" && !/<(?:img|hr|table)\b/i.test(html);
}

const subscribe = () => () => {};

/** The HTML of a note, read: cleaned, in the system's text style (`rich-text` in tokens.css). */
export function RichTextValue({ value }: { value: string | null | undefined }) {
  const unset = useUiCopy().field.unset;
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (isRichTextEmpty(value)) {
    return <span className="text-meta text-muted italic">{unset}</span>;
  }
  const html = value ?? "";
  const clean = inBrowser ? sanitizeRichText(html) : null;
  if (clean === null) return <p className="rich-text">{richTextPlain(html)}</p>;
  /* Cleaned by DOMPurify just above, with the tags and URLs listed there. */
  return <div className="rich-text min-w-0" dangerouslySetInnerHTML={{ __html: clean }} />;
}
