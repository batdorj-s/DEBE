/**
 * Minimal ZIP writer.
 *
 * An .xlsx file is just a ZIP archive of XML parts, so this is all we need to
 * produce a real workbook without a spreadsheet dependency.
 *
 * Entries are STORED (compression method 0) rather than deflated. Stored
 * entries are valid ZIP and Excel/Numbers open them without complaint, and for
 * a few dozen rows the size difference is irrelevant. Staying synchronous also
 * keeps the whole export path free of async edge cases during a live demo.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Forward-slash path inside the archive, e.g. "xl/workbook.xml" */
  path: string;
  /** UTF-8 text content */
  data: string;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
/** Bit 11: file name is UTF-8. Required for the Cyrillic sheet names. */
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const VERSION = 20;

class ByteWriter {
  readonly parts: Uint8Array[] = [];
  private length = 0;

  push(bytes: Uint8Array): void {
    this.parts.push(bytes);
    this.length += bytes.length;
  }

  u16(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.push(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  toBlob(type: string): Blob {
    return new Blob(this.parts as BlobPart[], { type });
  }
}
/** MS-DOS packed date/time, which is what the ZIP headers store. */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

export function createZip(entries: ZipEntry[]): Blob {
  const { time, date } = dosDateTime(new Date());
  const encoder = new TextEncoder();

  const local = new ByteWriter();
  const central = new ByteWriter();

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes = encoder.encode(entry.data);
    const crc = crc32(dataBytes);
    const offset = local.length;

    // --- local file header ---
    local.u32(SIG_LOCAL);
    local.u16(VERSION);
    local.u16(FLAG_UTF8);
    local.u16(METHOD_STORE);
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(dataBytes.length); // compressed size (stored == raw)
    local.u32(dataBytes.length); // uncompressed size
    local.u16(nameBytes.length);
    local.u16(0); // extra field length
    local.push(nameBytes);
    local.push(dataBytes);

    // --- central directory record ---
    central.u32(SIG_CENTRAL);
    central.u16(VERSION); // version made by
    central.u16(VERSION); // version needed
    central.u16(FLAG_UTF8);
    central.u16(METHOD_STORE);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(dataBytes.length);
    central.u32(dataBytes.length);
    central.u16(nameBytes.length);
    central.u16(0); // extra
    central.u16(0); // comment
    central.u16(0); // disk number start
    central.u16(0); // internal attributes
    central.u32(0); // external attributes
    central.u32(offset);
    central.push(nameBytes);
  }

  const centralBytes: BlobPart[] = [];
  const centralSize = central.length;

  const eocd = new ByteWriter();
  eocd.u32(SIG_EOCD);
  eocd.u16(0); // this disk
  eocd.u16(0); // disk with central directory
  eocd.u16(entries.length);
  eocd.u16(entries.length);
  eocd.u32(centralSize);
  eocd.u32(local.length); // offset of central directory
  eocd.u16(0); // comment length

  return new Blob(
    [...local.parts, ...central.parts, ...eocd.parts],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  );
}
