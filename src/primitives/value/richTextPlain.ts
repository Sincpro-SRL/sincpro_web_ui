/* Without `"use client"`, apart from `RichText.tsx`: a server component that writes a note's
   words in a summary — or asks whether it says anything — reads these. Cleaning the HTML
   (`sanitizeRichText`) stays there: it needs a DOM. */

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
