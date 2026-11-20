"use client";

/**
 * Download the bytes as a file.
 *
 * It is the only piece of the spreadsheet that needs a browser, and that is why it is
 * separate from `writeXlsx` (`xlsx.ts`): what is written and what is downloaded are two
 * things, and on the other side —the server, a phone, a test— the second does not exist.
 */
export function downloadXlsx(name: string, bytes: Uint8Array): void {
  const file = name.endsWith(".xlsx") ? name : `${name}.xlsx`;
  /* A copy, and not the bytes that arrived: a `Blob` only accepts a view
     over a plain `ArrayBuffer`, and what comes through the door might be
     over a shared one. It is a few kilobytes and the alternative is an
     assertion that says it cannot happen. */
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file;
  link.click();
  /* The URL is released after the click, not before: releasing it in the same turn
     cancels the download in some browsers. */
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
