import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import { formatDate } from '../utils.js'

export default function Movements({ onChanged }) {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [filterProduct, setFilterProduct] = useState('')
  const [filterType, setFilterType] = useState('')

  // quick record form
  const [productId, setProductId] = useState('')
  const [type, setType] = useState('in')
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const toast = useToast()

  const load = async () => {
    try {
      const [prods, moves] = await Promise.all([api.listProducts(), api.listMovements({ limit: 500 })])
      setProducts(prods)
      setMovements(moves)
    } catch (e) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedProduct = products.find((p) => p.id === Number(productId))

  const filtered = useMemo(() => {
    return movements.filter(
      (m) =>
        (!filterProduct || m.product_id === Number(filterProduct)) &&
        (!filterType || m.type === filterType),
    )
  }, [movements, filterProduct, filterType])

  const submit = async (e) => {
    e.preventDefault()
    if (!productId) {
      setErr('Select a product')
      return
    }
    const n = Number(qty)
    if (!Number.isInteger(n) || n <= 0) {
      setErr('Quantity must be a whole number > 0')
      return
    }
    if (type === 'out' && selectedProduct && n > selectedProduct.quantity) {
      setErr(`Only ${selectedProduct.quantity} in stock`)
      return
    }
    setSaving(true)
    try {
      await api.createMovement({ product_id: Number(productId), type, quantity: n, note: note.trim() })
      toast.success(`${type === 'in' ? 'Stocked in' : 'Stocked out'} ${n} unit(s)`)
      setQty('1')
      setNote('')
      setErr('')
      await load()
      onChanged()
    } catch (e2) {
      toast.error(e2.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-head"><h3>Record Stock Movement</h3></div>
        <form onSubmit={submit} className="form" noValidate>
          <div className="form-row">
            <div className="field grow">
              <label>Product *</label>
              <select className={`input ${err && !productId ? 'err' : ''}`} value={productId} onChange={(e) => { setProductId(e.target.value); setErr('') }}>
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.quantity} in stock</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Type *</label>
              <div className="segmented">
                <button type="button" className={type === 'in' ? 'active' : ''} onClick={() => setType('in')}>Stock In</button>
                <button type="button" className={type === 'out' ? 'active out' : ''} onClick={() => setType('out')}>Stock Out</button>
              </div>
            </div>
            <div className="field">
              <label>Quantity *</label>
              <input type="number" min="1" className="input" value={qty} onChange={(e) => { setQty(e.target.value); setErr('') }} />
            </div>
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / reference" />
          </div>
          {err && <span className="field-err">{err}</span>}
          <div className="form-actions">
            <button type="submit" className={`btn ${type === 'out' ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>
              {saving ? 'Recording…' : type === 'in' ? 'Record Stock In' : 'Record Stock Out'}
            </button>
          </div>
        </form>
      </div>

      <div className="panel no-pad">
        <div className="panel-head pad">
          <h3>Movement History</h3>
          <div className="inline-filters">
            <select className="input sm" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select className="input sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">In & Out</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Product</th>
                <th>Type</th>
                <th className="num">Qty</th>
                <th className="num">Resulting</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="empty">No movements recorded.</td></tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id}>
                    <td className="muted">{formatDate(m.created_at)}</td>
                    <td>
                      <div className="cell-strong">{m.product_name}</div>
                      <div className="cell-sub mono">{m.sku}</div>
                    </td>
                    <td>
                      <span className={`badge ${m.type === 'in' ? 'badge-in' : 'badge-out'}`}>
                        {m.type === 'in' ? '↓ In' : '↑ Out'}
                      </span>
                    </td>
                    <td className="num">{m.type === 'in' ? '+' : '−'}{m.quantity}</td>
                    <td className="num">{m.resulting_quantity}</td>
                    <td className="muted">{m.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">{filtered.length} movement(s)</div>
      </div>
    </div>
  )
}
