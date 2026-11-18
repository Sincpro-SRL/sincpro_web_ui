"use client";

/* ==================================================================== *
 *  DOWNLOAD — save a file the application fetched by code, with its name.
 *
 *  Context: a link with `download` is the best download there is — the browser streams it to
 *  disk, middle-click and «save as» work — and `FileList` uses one whenever the file has a
 *  `url`. But some files are not behind a plain URL: the request needs a token in a header,
 *  the server signs a URL on demand, an Odoo attachment comes through an RPC. Then the
 *  application fetches the bytes and has a `Blob` in its hand, and saving it with the right
 *  name is the same ten lines in every application. They are here once.
 *
 *    onDownload={async (file) => downloadFile(await api.attachment(file.id), file.name)}
 * ==================================================================== */

/**
 * Saves `source` — a `Blob` already in memory, or a URL the browser can reach — as `name`.
 *
 * A `Blob` gets an object URL for the length of the click and is released after it, so a
 * 40 MB PDF does not stay pinned in the tab. A URL on another origin ignores `download` (the
 * browser's rule, not ours): it opens instead of saving, and the server should send
 * `Content-Disposition: attachment` — or the application fetches it and passes the `Blob`.
 */
export function downloadFile(source: Blob | string, name: string): void {
  const href = typeof source === "string" ? source : URL.createObjectURL(source);
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.rel = "noopener";
  /* Firefox only follows a click on a link that is in the document. */
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  /* Released on the next task, not now: Safari reads the object URL after `click` returns. */
  if (typeof source !== "string") setTimeout(() => URL.revokeObjectURL(href), 0);
}
