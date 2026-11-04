/* ==================================================================== *
 *  FILES — what a file IS, read from what the server says about it: its kind (for the icon
 *  and the thumbnail) and its size (for a person, not for a disk).
 *
 *  Pure on purpose: the list draws with it, and a test checks it without a browser.
 * ==================================================================== */

/** The five kinds a list of attachments tells apart. Five and not twenty: the icon is there
 *  to say «this one is the spreadsheet» at a glance, and twenty icons are read, not seen. */
export type AttachmentKind = "image" | "pdf" | "sheet" | "doc" | "other";

const BY_EXTENSION: Readonly<Record<string, AttachmentKind>> = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  avif: "image",
  heic: "image",
  pdf: "pdf",
  xlsx: "sheet",
  xls: "sheet",
  xlsm: "sheet",
  ods: "sheet",
  csv: "sheet",
  docx: "doc",
  doc: "doc",
  odt: "doc",
  rtf: "doc",
  txt: "doc",
  md: "doc",
};

/** The extension of a file name, lower-case, without the dot — `""` when it has none. A
 *  leading dot (`.env`) is a hidden file, not an extension. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/**
 * The kind of a file, from its MIME type and, failing that, its name.
 *
 * Context: the MIME type wins because it is what the server READ; the extension is what
 * somebody typed. But a server that does not sniff answers `application/octet-stream` for
 * everything, and then the name is all there is — so an unknown or generic type falls
 * through to the extension instead of to «other».
 */
export function attachmentKind(name: string, type?: string): AttachmentKind {
  const mime = (type ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("ms-excel") || mime === "text/csv") {
    return "sheet";
  }
  if (
    mime.includes("wordprocessing") ||
    mime.includes("msword") ||
    mime.includes("opendocument.text") ||
    mime === "text/plain" ||
    mime === "text/markdown"
  ) {
    return "doc";
  }
  return BY_EXTENSION[fileExtension(name)] ?? "other";
}

const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
/* A no-break space: «1,2» on one line and «MB» on the next reads as two values. */
const NO_BREAK = String.fromCharCode(0xa0);
const STEP = 1024;

/**
 * A size in bytes as a person reads it: «512 B», «34 KB», «1,2 MB» — in the copy's locale.
 *
 * Context: one decimal below ten and none above. «1,2 MB» and «1,9 MB» are different
 * files; «123,4 MB» and «123,9 MB» are the same one, and the decimal is noise. Steps of 1024,
 * the way the operating system that saved the file counts it — a file that says «1 MB» here
 * and «1,05 MB» in the folder it came from reads as a different file.
 *
 * The number is `Intl`'s and the unit is written here: `Intl`'s own byte units change with
 * the engine («byte», «kB», «B») and a column of sizes that writes its unit three ways is
 * worse than any of the three.
 */
export function formatFileSize(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  /* 1023,96 KB rounds to «1.024 KB»: that is the next unit, written in the wrong one. */
  const rounded = Number(value.toFixed(digits));
  if (rounded >= STEP && unit < UNITS.length - 1) {
    return formatFileSize(STEP ** (unit + 1), locale);
  }
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(rounded);
  return `${number}${NO_BREAK}${UNITS[unit]}`;
}
