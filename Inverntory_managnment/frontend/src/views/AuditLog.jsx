import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { formatDate } from '../utils.js'

const ACTION_LABEL = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  stock: 'Stock',
  seed: 'Seed',
}

export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('')
  const toast = useToast()

  useEffect(() => {
    api.listAudit(500).then(setEntries).catch((e) => toast.error(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = filter ? entries.filter((e) => e.action === filter) : entries

  return (
    <div className="stack">
      <div className="toolbar">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="stock">Stock changes</option>
        </select>
        <div className="spacer" />
      </div>

      <div className="panel no-pad">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={4} className="empty">No audit entries.</td></tr>
              ) : (
                shown.map((e) => (
                  <tr key={e.id}>
                    <td className="muted">{formatDate(e.created_at)}</td>
                    <td><span className={`badge badge-action-${e.action}`}>{ACTION_LABEL[e.action] || e.action}</span></td>
                    <td className="capitalize">{e.entity}</td>
                    <td>{e.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">{shown.length} entr(y/ies)</div>
      </div>
    </div>
  )
}
