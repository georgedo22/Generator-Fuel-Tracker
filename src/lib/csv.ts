export type CsvRow = Record<string, string>;

export function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  // BOM keeps Excel happy with non-ASCII characters.
  return "\uFEFF" + lines.join("\r\n");
}

/** Minimal RFC4180 CSV parser supporting quoted fields and escaped quotes. */
export function parseCsv(text: string): CsvRow[] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore, handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj: CsvRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
}

export const LOG_CSV_HEADERS = [
  "Generator Code",
  "Date",
  "Time",
  "Hour Reading",
  "Liters",
  "Price Per Liter",
  "Fuel Type",
  "Tank Full",
  "Hours Worked",
  "Consumption Per Hour",
  "Total Cost",
];

export function parseBool(value: string): boolean {
  return ["true", "1", "yes", "y", "full", "yes "].includes(
    value.trim().toLowerCase()
  );
}

export function parseFuelType(value: string): "PETROL" | "DIESEL" | "KEROSENE" {
  const v = value.trim().toUpperCase();
  if (v === "PETROL" || v === "GASOLINE" || v === "BENZIN") return "PETROL";
  if (v === "DIESEL" || v === "MAZOT" || v === "GASOIL") return "DIESEL";
  if (v === "KEROSENE" || v === "KEROSIN") return "KEROSENE";
  throw new Error(`Unknown fuel type: ${value}`);
}

/** Normalizes dates like 2026-01-05 or 05/01/2026 or 01/05/2026 (DD/MM). */
export function parseDate(value: string): Date {
  const v = value.trim();
  if (!v) throw new Error("Missing date");

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

  m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(v);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    // Prefer ISO-ish and unambiguous interpretations.
    const day = a > 12 ? a : b > 12 ? b : a;
    const month = a > 12 ? b : b > 12 ? a : b;
    return new Date(Date.UTC(+m[3], month - 1, day));
  }

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d;
}