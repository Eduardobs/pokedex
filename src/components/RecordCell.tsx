import type { ReactNode } from 'react'

/** Visible mobile context supplements, without duplicating, the table column header. */
export function RecordCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td>
      <span className="record-cell-label" aria-hidden="true">
        {label}
      </span>
      {children}
    </td>
  )
}
