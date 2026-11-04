/* ==================================================================== *
 *  AN ADDRESS TO REACH SOMEONE — an email, a phone, a website.
 *
 *  Pure: the controls (`EmailInput`, `PhoneInput`, `UrlInput`) build their read
 *  mode links with it, and a form validates with the same checks.
 *
 *  ── A link is built, never trusted ──────────────────────────────────
 *
 *  What people type becomes an `href`. A website written «javascript:…» must not
 *  turn into a link that runs it, so a URL keeps only `http:` and `https:` —
 *  anything else with a scheme is no link at all, and a bare «sincpro.com.bo»
 *  gets `https://` in front, the way a browser's address bar reads it.
 * ==================================================================== */

/** Something that reads as an email: one `@`, a name before it and a domain with a dot after. */
export function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

/** The `mailto:` of an email, or `null` when it does not read as one. */
export function emailHref(text: string): string | null {
  const clean = text.trim();
  return isEmail(clean) ? `mailto:${clean}` : null;
}

/** The `tel:` of a phone as people write it — «+591 7 123-4567» → `tel:+59171234567`. `null`
 *  when there are no digits to call. */
export function telHref(text: string): string | null {
  const digits = text.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return /\d/.test(digits) ? `tel:${digits}` : null;
}

/** The `wa.me` link of a phone with its country code. `wa.me` takes digits only. */
export function whatsappHref(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === 0 ? null : `https://wa.me/${digits}`;
}

/** The `href` of a website, `https://` added when it has no scheme; `null` for anything that
 *  is not `http(s)` or does not parse — a «javascript:» never becomes a link. */
export function urlHref(text: string): string | null {
  const clean = text.trim();
  if (clean === "" || /\s/.test(clean)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(clean) ? clean : `https://${clean}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Something that reads as a website. */
export function isUrl(text: string): boolean {
  return urlHref(text) !== null;
}

/** How a website is read: without the scheme, the `www.` and the trailing slash —
 *  «https://www.sincpro.com.bo/» reads «sincpro.com.bo». */
export function urlLabel(text: string): string {
  return text
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}
