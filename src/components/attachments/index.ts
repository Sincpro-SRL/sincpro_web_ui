/* ATTACHMENTS — the files of a record (`Attachments`: add, remove, undo), files shown inside a
   message, a card or a section (`FileList`), and how to save one fetched by code. */
export {
  Attachments,
  type AttachmentsProps,
} from "@sincpro/web-ui/components/attachments/Attachments";
export { downloadFile } from "@sincpro/web-ui/components/attachments/download";
export {
  FileList,
  type FileListLayout,
  type FileListProps,
} from "@sincpro/web-ui/components/attachments/FileList";
export {
  type AttachmentFile,
  type AttachmentKind,
  attachmentKind,
  type AttachmentStatus,
  fileExtension,
  formatFileSize,
} from "@sincpro/web-ui/components/attachments/files";
