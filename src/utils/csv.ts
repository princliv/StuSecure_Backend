/**
 * Minimal, dependency-free CSV helpers.
 *
 * Escaping rule (RFC 4180): a field is wrapped in double quotes if it
 * contains a comma, a double quote, or a newline; any double quote inside
 * the field is doubled.
 */
export function toCsvRow(fields: Array<string | number | null | undefined>): string {
  return fields
    .map((field) => {
      const value = field === null || field === undefined ? "" : String(field);
      if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
    .join(",");
}

export function rowsToCsv(header: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [toCsvRow(header), ...rows.map((row) => toCsvRow(row))];
  // CRLF is the RFC 4180-recommended line ending and what most spreadsheet
  // tools (Excel included) expect.
  return lines.join("\r\n") + "\r\n";
}

/**
 * Minimal, dependency-free RFC 4180 CSV parser (pairs with `toCsvRow`/
 * `rowsToCsv` above). Handles quoted fields, embedded commas/newlines inside
 * quotes, and doubled `""` as an escaped quote. Accepts `\n`, `\r\n`, or
 * lone `\r` as row terminators. Does not assume a header row — callers that
 * expect one (e.g. CSV import) should skip `rows[0]` themselves.
 *
 * A completely empty input returns `[]`. A trailing newline does not produce
 * a spurious empty trailing row; a genuinely blank line (e.g. a blank line
 * in the middle of the file) does produce a `[""]` row — callers should
 * filter those out if blank lines aren't meaningful to them.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      if (input[i] === "\n") i += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush the final field/row, unless the input ended exactly on a row
  // terminator (in which case it was already flushed above).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
