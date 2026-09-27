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
