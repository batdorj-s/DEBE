/**
 * OOXML workbook builder.
 *
 * Emits the minimum set of parts Excel needs to open a workbook: content
 * types, package rels, the workbook part, its rels, a styles part, and one
 * worksheet per sheet. Strings are written as inline strings so there is no
 * sharedStrings.xml to keep in sync.
 */

import { createZip, type ZipEntry } from "./zip";

export type XlsxValue = string | number | null | undefined;

/** Named cell styles resolved to a `cellXfs` index by `STYLE_INDEX`. */
export type XlsxStyle =
  | "default"
  | "bold"
  | "number"
  | "green"
  | "yellow"
  | "red"
  | "boldGreen"
  | "boldYellow"
  | "boldRed";

export type XlsxRow = Array<XlsxValue | { value: XlsxValue; style: XlsxStyle }>;

export interface XlsxSheet {
  name: string;
  rows: XlsxRow[];
  /** Column widths in Excel's character units. */
  columnWidths?: number[];
}

export interface WorkbookOptions {
  title?: string;
  creator?: string;
}

/**
 * cellXfs order. Index 0 and 1 of `fills` are reserved by the format
 * (`none` and `gray125`), so custom fills start at 2.
 */
const FILLS = ["FFC6EFCE", "FFFFEB9C", "FFFFC7CE"] as const; // green, yellow, red

const STYLE_INDEX = {
  default: 0,
  bold: 1,
  number: 2,
  green: 3,
  yellow: 4,
  red: 5,
  boldGreen: 6,
  boldYellow: 7,
  boldRed: 8,
} as const satisfies Record<XlsxStyle, number>;

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

/** 0 -> A, 25 -> Z, 26 -> AA */
export function columnLetter(index: number): string {
  let n = index;
  let letters = "";
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

function isPlainCell(cell: XlsxRow[number]): cell is XlsxValue {
  return cell === null || cell === undefined || typeof cell !== "object";
}

function buildSheetXml(sheet: XlsxSheet): string {
  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";

  const rows = sheet.rows
    .map((row, rowIndex) => {
      if (row.length === 0) return "";
      const cells = row
        .map((cell, colIndex) => {
          if (cell === null || cell === undefined) return "";

          const styled = !isPlainCell(cell);
          const value = styled ? cell.value : cell;
          const style: XlsxStyle = styled ? cell.style : "default";

          if (value === null || value === undefined || value === "") return "";
          const ref = `${columnLetter(colIndex)}${rowIndex + 1}`;
          const s = STYLE_INDEX[style];

          if (typeof value === "number" && Number.isFinite(value)) {
            return `<c r="${ref}" s="${s}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr><dimension ref="A1"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData></worksheet>`;
}

function buildStylesXml(): string {
  const customFills = FILLS.map(
    (rgb) =>
      `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`,
  );

  const xfs = [
    /* 0 default  */ `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`,
    /* 1 bold     */ `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>`,
    /* 2 number   */ `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`,
    /* 3 green    */ `<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1"/>`,
    /* 4 yellow   */ `<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/>`,
    /* 5 red      */ `<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/>`,
    /* 6 boldGreen */ `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
    /* 7 boldYell */ `<xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
    /* 8 boldRed  */ `<xf numFmtId="0" fontId="1" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="${2 + FILLS.length}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${customFills.join("")}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

/** Excel rejects these characters in sheet names and caps them at 31 chars. */
function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return cleaned.length > 0 ? cleaned : `Sheet${index + 1}`;
}

export function buildWorkbook(sheets: XlsxSheet[], options: WorkbookOptions = {}): Blob {
  if (sheets.length === 0) {
    throw new Error("buildWorkbook requires at least one sheet");
  }

  const names = sheets.map((sheet, i) => sanitizeSheetName(sheet.name, i));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><workbookPr/><sheets>${names
    .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("")}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(options.title ?? "ProcureMind export")}</dc:title><dc:creator>${escapeXml(options.creator ?? "ProcureMind")}</dc:creator></cp:coreProperties>`;

  const entries: ZipEntry[] = [
    { path: "[Content_Types].xml", data: contentTypes },
    { path: "_rels/.rels", data: rootRels },
    { path: "docProps/core.xml", data: core },
    { path: "xl/workbook.xml", data: workbookXml },
    { path: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { path: "xl/styles.xml", data: buildStylesXml() },
    ...sheets.map((sheet, i) => ({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      data: buildSheetXml(sheet),
    })),
  ];

  return createZip(entries);
}
