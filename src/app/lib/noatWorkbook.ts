import { buildWorkbook } from "@/lib/xlsx";
import type { XlsxSheet } from "@/lib/xlsx";

export type NoatStatus = "matched" | "partial" | "unmatched";

export interface NoatRow {
  id: string;
  date: string;
  supplier: string;
  amount: number;
  ddtd: string | null;
  status: NoatStatus;
  score: number;
  tier: number;
}

export interface NoatSummary {
  total: number;
  matched: number;
  partial: number;
  unmatched: number;
}

const STATUS_LABEL: Record<NoatStatus, string> = {
  matched: "Тулгарсан",
  partial: "Хэсэгчлэн",
  unmatched: "Тулгараагүй",
};

const STATUS_STYLE = {
  matched: "boldGreen",
  partial: "boldYellow",
  unmatched: "boldRed",
} as const;

const COLUMN_WIDTHS = [10, 12, 26, 14, 18, 8, 8, 12];

const HEADER: XlsxSheet["rows"][number][] = [
  ["ProcureMind — НӨАТ тулгалтын тайлан"],
  [{ value: "Үүсгэсэн", style: "bold" }, { value: new Date().toLocaleString("mn-MN"), style: "bold" }],
  [],
];

function summaryRows(summary: NoatSummary): XlsxSheet["rows"][number][] {
  return [
    [{ value: "Нийт гүйлгээ", style: "bold" }, { value: summary.total, style: "number" }],
    [
      { value: "Тулгарсан", style: "boldGreen" },
      { value: summary.matched, style: "number" },
    ],
    [
      { value: "Хэсэгчлэн", style: "boldYellow" },
      { value: summary.partial, style: "number" },
    ],
    [
      { value: "Тулгараагүй", style: "boldRed" },
      { value: summary.unmatched, style: "number" },
    ],
    [],
  ];
}

const TABLE_HEADER: XlsxSheet["rows"][number][] = [
  ["ID", "Огноо", "Нийлүүлэгч", "Дүн", "ДДТД", "Шат", "Оноо", "Төлөв"].map((h) => ({
    value: h,
    style: "bold" as const,
  })),
];

function dataRows(rows: NoatRow[]): XlsxSheet["rows"][number][] {
  return rows.map((row) => [
    row.id,
    row.date,
    row.supplier,
    { value: row.amount, style: "number" as const },
    row.ddtd ?? "—",
    row.tier,
    row.score,
    { value: STATUS_LABEL[row.status], style: STATUS_STYLE[row.status] },
  ]);
}

/** Build the three-sheet NOAT report described in the product plan (§8). */
export function buildNoatWorkbook(rows: NoatRow[], summary: NoatSummary): Blob {
  const byStatus = (status: NoatStatus) => rows.filter((r) => r.status === status);

  const sheets: XlsxSheet[] = [
    {
      // The summary block lives on the first sheet per the plan.
      name: "Тулгасан",
      columnWidths: COLUMN_WIDTHS,
      rows: [
        ...HEADER,
        ...summaryRows(summary),
        ...TABLE_HEADER,
        ...dataRows(byStatus("matched")),
      ],
    },
    {
      name: "Хянах",
      columnWidths: COLUMN_WIDTHS,
      rows: [
        ...TABLE_HEADER,
        [{ value: `Нийт: ${summary.partial}`, style: "boldYellow" }],
        [],
        ...dataRows(byStatus("partial")),
      ],
    },
    {
      name: "Тулгараагүй",
      columnWidths: COLUMN_WIDTHS,
      rows: [
        ...TABLE_HEADER,
        [{ value: `Нийт: ${summary.unmatched}`, style: "boldRed" }],
        [],
        ...dataRows(byStatus("unmatched")),
      ],
    },
  ];

  return buildWorkbook(sheets, {
    title: "ProcureMind — НӨАТ тулгалтын тайлан",
    creator: "ProcureMind",
  });
}
