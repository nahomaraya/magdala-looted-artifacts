/**
 * Minimal RFC-4180 CSV parser. Handles quoted fields containing commas,
 * embedded newlines, and escaped quotes (""), plus the UTF-8 BOM that
 * Airtable exports often include.
 *
 * Also trims whitespace off header names so "BOM<space>wp_id"-style
 * column headers (yes, Airtable does this) lookup as "wp_id".
 *
 * Not as feature-complete as `csv-parse` or `papaparse` - on purpose, to
 * keep dependencies down. Drop in a real lib if you start needing things
 * like per-field type coercion or streaming for large files.
 */
export function parseCsv(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else {
        field += c; i++;
      }
    } else if (c === '"') {
      inQuotes = true; i++;
    } else if (c === ',') {
      row.push(field); field = ''; i++;
    } else if (c === '\r') {
      i++; // swallow CR; LF below ends the row
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; i++;
    } else {
      field += c; i++;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(v => v !== ''))   // drop blank lines
    .map(r => Object.fromEntries(headers.map((h, idx) => [h, r[idx] ?? ''])));
}

/**
 * Minimal TSV parser for `data/*.tsv` files produced by fill_qids.py.
 * Those files replace any embedded tabs or newlines inside field values
 * before writing, so a plain split-on-tab is correct — no quote handling
 * needed.
 */
export function parseTsv(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split('\t');
    return Object.fromEntries(headers.map((h, idx) => [h, cells[idx] ?? '']));
  });
}
