import { buildWorkbook } from "./workbook";
import type { WorkbookOptions, XlsxSheet } from "./workbook";

export { buildWorkbook, columnLetter } from "./workbook";
export type { XlsxRow, XlsxSheet, XlsxStyle, XlsxValue, WorkbookOptions } from "./workbook";
export { createZip, crc32 } from "./zip";
export type { ZipEntry } from "./zip";

/**
 * Trigger a browser download for a Blob. Uses an object URL and revokes it on
 * a short timer so the browser has time to start the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build a workbook and hand it to the browser in one step. */
export function downloadWorkbook(
  sheets: XlsxSheet[],
  filename: string,
  options?: WorkbookOptions,
): void {
  downloadBlob(buildWorkbook(sheets, options), filename);
}
