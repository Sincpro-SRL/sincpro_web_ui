import {
  type AttachmentFile,
  type AttachmentKind,
  fileExtension,
} from "@sincpro/web-ui/components/attachments/files";
import {
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  type LucideIcon,
} from "lucide-react";

/* ==================================================================== *
 *  FILE THUMB — what a file is, at the size of a row: shared by the record's list
 *  (`Attachments`) and the files inside a message or a section (`FileList`), so a PDF looks
 *  the same wherever it appears.
 * ==================================================================== */

const KIND_ICON: Record<AttachmentKind, LucideIcon> = {
  image: FileImage,
  pdf: FileText,
  sheet: FileSpreadsheet,
  doc: FileType,
  other: File,
};

/** The type, at the size of a row: the image itself when there is one, otherwise the icon
 *  of its kind over its extension. The extension is written because three of the five
 *  icons are a page with lines on it — «PDF» and «DOCX» are what tell them apart, and a
 *  word is never a colour that only some people see.
 *
 *  `sm` is the icon alone, for a line of text (a list of a release's assets): the name next
 *  to it already ends in its extension. */
export function FileThumb({
  file,
  kind,
  size = "md",
}: {
  file: AttachmentFile;
  kind: AttachmentKind;
  size?: "sm" | "md";
}) {
  const Icon = KIND_ICON[kind];
  if (size === "sm") {
    return (
      <Icon
        aria-hidden
        className="size-(--size-icon-md) shrink-0 text-muted"
        strokeWidth={1.75}
      />
    );
  }
  const picture =
    kind === "image" && file.status !== "failed" ? (file.thumbnail ?? file.url) : undefined;
  const extension = fileExtension(file.name).slice(0, 4);
  return (
    /* Decorative: the name next to it says which file it is, and the image's `alt` would
       say it twice. */
    <span
      aria-hidden
      className="flex size-(--size-control-lg) shrink-0 flex-col items-center justify-center gap-0.5 overflow-clip rounded-control border border-line bg-ink/4 text-muted"
    >
      {picture === undefined ? (
        <>
          <Icon className="size-(--size-icon-md)" strokeWidth={1.75} />
          {extension === "" ? null : (
            <span className="text-micro leading-none font-medium uppercase">{extension}</span>
          )}
        </>
      ) : (
        <img src={picture} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </span>
  );
}
