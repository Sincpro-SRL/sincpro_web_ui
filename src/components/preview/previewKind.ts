import { attachmentKind, fileExtension } from "@sincpro/web-ui/components/attachments/files";

/* Without `"use client"`, apart from `FilePreview.tsx` (which draws the file, and loads a PDF
   viewer to do it): a server component that decides how a file will be shown reads this. */

const TEXT_EXTENSIONS = new Set(["txt", "csv", "json", "log", "xml", "yaml", "yml"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);

export type PreviewKind = "image" | "pdf" | "markdown" | "text" | "other";

/** The renderer for a file. Pure, so the choice is tested without a browser. */
export function previewKind(name: string, type?: string): PreviewKind {
  const kind = attachmentKind(name, type);
  if (kind === "image" || kind === "pdf") return kind;
  const extension = fileExtension(name).toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
  if (TEXT_EXTENSIONS.has(extension) || type?.startsWith("text/") === true) return "text";
  return "other";
}
