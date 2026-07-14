/** Helpers for Cambridge listening / completion tables from DeepSeek JSON. */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export type ListeningTableRow = Record<string, string>

export type ListeningTableModel = {
  columns: string[]
  rows: ListeningTableRow[]
}

/** Detect problem/contact row arrays or { columns, rows } table objects. */
export function isListeningTableShape(raw: Record<string, unknown>): boolean {
  if (Array.isArray(raw.table) && raw.table.length > 0 && raw.table.every(isRecord)) {
    return true
  }
  if (isRecord(raw.table) && Array.isArray(raw.table.rows) && raw.table.rows.length > 0) {
    return true
  }
  return false
}

export function parseListeningTable(raw: Record<string, unknown>): ListeningTableModel | null {
  const table = raw.table
  if (Array.isArray(table) && table.length > 0 && table.every(isRecord)) {
    const keys = new Set<string>()
    for (const row of table) {
      for (const k of Object.keys(row as Record<string, unknown>)) keys.add(k)
    }
    const columns = [...keys]
    const rows: ListeningTableRow[] = table.map((row) => {
      const out: ListeningTableRow = {}
      for (const c of columns) {
        const v = (row as Record<string, unknown>)[c]
        out[c] = v == null ? "" : String(v)
      }
      return out
    })
    return { columns, rows }
  }

  if (isRecord(table) && Array.isArray(table.rows)) {
    const rowsRaw = table.rows.filter(isRecord)
    const columnsFromMeta = Array.isArray(table.columns)
      ? table.columns.map(String)
      : []
    const keySet = new Set<string>(columnsFromMeta)
    for (const row of rowsRaw) {
      for (const k of Object.keys(row)) {
        if (k !== "blanks") keySet.add(k)
      }
    }
    const columns = columnsFromMeta.length ? columnsFromMeta : [...keySet]
    const rows: ListeningTableRow[] = rowsRaw.map((row) => {
      const out: ListeningTableRow = {}
      for (const c of columns) {
        const direct = row[c]
        if (direct != null) {
          out[c] = String(direct)
          continue
        }
        const lower = c.toLowerCase().replace(/\s+/g, "_")
        const hit = Object.keys(row).find(
          (k) =>
            k.toLowerCase() === lower ||
            k.toLowerCase().replace(/\s+/g, " ") === c.toLowerCase(),
        )
        out[c] = hit != null ? String(row[hit] ?? "") : ""
      }
      if (columns.every((c) => !out[c])) {
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === "string") out[k] = v
        }
      }
      return out
    })
    const finalColumns =
      columns.length && rows.some((r) => columns.some((c) => r[c]))
        ? columns
        : [...new Set(rows.flatMap((r) => Object.keys(r)))]
    return { columns: finalColumns, rows }
  }

  return null
}

export function countTableGaps(model: ListeningTableModel): number {
  let n = 0
  const re = /\d+[.)]?\s*_{2,}|_{2,}|\u2026{2,}|\.{3,}|…+/g
  for (const row of model.rows) {
    for (const cell of Object.values(row)) {
      const matches = cell.match(re)
      if (matches) n += matches.length
    }
  }
  return n
}
