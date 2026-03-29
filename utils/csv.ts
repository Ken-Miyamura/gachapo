/**
 * Parse CSV text handling quoted fields with commas and newlines.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n") {
        row.push(current);
        current = "";
        if (row.length > 1 || row[0] !== "") {
          rows.push(row);
        }
        row = [];
      } else if (ch === "\r") {
        // skip
      } else {
        current += ch;
      }
    }
  }
  // last field
  row.push(current);
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  return rows;
}

export function csvToObjects<T>(
  text: string,
  mapRow: (headers: string[], values: string[]) => T,
): T[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((values) => mapRow(headers, values));
}
