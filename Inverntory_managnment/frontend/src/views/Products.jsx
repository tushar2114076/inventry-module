import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import { currency, STATUS_LABEL, stockStatus } from '../utils.js'

const EMPTY = {
  name: '',
  sku: '',
  category_id: '',
  description: '',
  price: '',
  quantity: '',
  low_stock_threshold: '10',
}

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.sku.trim()) errors.sku = 'SKU is required'
  if (form.price === '' || isNaN(form.price)) errors.price = 'Price is required'
  else if (Number(form.price) < 0) errors.price = 'Price cannot be negative'
  if (form.quantity === '' || isNaN(form.quantity)) errors.quantity = 'Quantity is required'
  else if (Number(form.quantity) < 0 || !Number.isInteger(Number(form.quantity)))
    errors.quantity = 'Quantity must be a whole number ≥ 0'
  if (form.low_stock_threshold === '' || Number(form.low_stock_threshold) < 0)
    errors.low_stock_threshold = 'Threshold must be ≥ 0'
  return errors
}

export default function Products({ categories, onChanged }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  const [editing, setEditing] = useState(null) // product or null
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [moveFor, setMoveFor] = useState(null) // product for stock in/out
  const [deleteFor, setDeleteFor] = useState(null)

  const toast = useToast()
  const catName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.listProducts({
        search,
        category_id: categoryFilter || undefined,
        status: statusFilter || undefined,
      })
      setProducts(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 200) // debounce search
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, statusFilter])

  const sorted = useMemo(() => {
    const arr = [...products]
    const { key, dir } = sort
    arr.sort((a, b) => {
      let av, bv
      if (key === 'category') {
        av = catName[a.category_id] || ''
        bv = catName[b.category_id] || ''
      } else if (key === 'status') {
        av = stockStatus(a)
        bv = stockStatus(b)
      } else {
        av = a[key]
        bv = b[key]
      }
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return dir === 'asc' ? -1 : 1
      if (av > bv) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [products, sort, catName])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  const sortIcon = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')

  // ---- form handlers ----
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name,
      sku: p.sku,
      category_id: p.category_id ?? '',
      description: p.description,
      price: String(p.price),
      quantity: String(p.quantity),
      low_stock_threshold: String(p.low_stock_threshold),
    })
    setErrors({})
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      description: form.description.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
    }

    setSaving(true)
    try {
      if (editing) {
        await api.updateProduct(editing.id, payload)
        toast.success(`Updated "${payload.name}"`)
      } else {
        await api.createProduct(payload)
        toast.success(`Added "${payload.name}"`)
      }
      setShowForm(false)
      await load()
      onChanged()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await api.deleteProduct(deleteFor.id)
      toast.success(`Deleted "${deleteFor.name}"`)
      setDeleteFor(null)
      await load()
      onChanged()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="stack">
      <div className="toolbar">
        <input
          className="input search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openCreate}>
          + Add Product
        </button>
      </div>

      <div className="panel no-pad">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('name')}>Name{sortIcon('name')}</th>
                <th className="sortable" onClick={() => toggleSort('sku')}>SKU{sortIcon('sku')}</th>
                <th className="sortable" onClick={() => toggleSort('category')}>Category{sortIcon('category')}</th>
                <th className="sortable num" onClick={() => toggleSort('price')}>Price{sortIcon('price')}</th>
                <th className="sortable num" onClick={() => toggleSort('quantity')}>Qty{sortIcon('quantity')}</th>
                <th className="sortable" onClick={() => toggleSort('status')}>Status{sortIcon('status')}</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="empty">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="empty">No products match your filters.</td></tr>
              ) : (
                sorted.map((p) => {
                  const st = stockStatus(p)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-strong">{p.name}</div>
                        {p.description && <div className="cell-sub">{p.description}</div>}
                      </td>
                      <td className="mono">{p.sku}</td>
                      <td>{catName[p.category_id] || <span className="muted">—</span>}</td>
                      <td className="num">{currency(p.price)}</td>
                      <td className="num">{p.quantity}</td>
                      <td>
                        <span className={`badge badge-${st}`}>{STATUS_LABEL[st]}</span>
                      </td>
                      <td className="actions-col">
                        <div className="row-actions">
                          <button className="chip chip-in" title="Stock in" onClick={() => setMoveFor({ product: p, type: 'in' })}>+ In</button>
                          <button className="chip chip-out" title="Stock out" onClick={() => setMoveFor({ product: p, type: 'out' })}>− Out</button>
                          <button className="icon-btn" title="Edit" onClick={() => openEdit(p)}>✎</button>
                          <button className="icon-btn danger" title="Delete" onClick={() => setDeleteFor(p)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="table-foot">{sorted.length} product(s)</div>
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="form" noValidate>
            <div className="field">
              <label>Name *</label>
              <input className={`input ${errors.name ? 'err' : ''}`} value={form.name} onChange={set('name')} />
              {errors.name && <span className="field-err">{errors.name}</span>}
            </div>
            <div className="form-row">
              <div className="field">
                <label>SKU *</label>
                <input className={`input ${errors.sku ? 'err' : ''}`} value={form.sku} onChange={set('sku')} />
                {errors.sku && <span className="field-err">{errors.sku}</span>}
              </div>
              <div className="field">
                <label>Category</label>
                <select className="input" value={form.category_id} onChange={set('category_id')}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={set('description')} />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Price (USD) *</label>
                <input type="number" step="0.01" min="0" className={`input ${errors.price ? 'err' : ''}`} value={form.price} onChange={set('price')} />
                {errors.price && <span className="field-err">{errors.price}</span>}
              </div>
              <div className="field">
                <label>Quantity *</label>
                <input type="number" min="0" className={`input ${errors.quantity ? 'err' : ''}`} value={form.quantity} onChange={set('quantity')} />
                {errors.quantity && <span className="field-err">{errors.quantity}</span>}
              </div>
              <div className="field">
                <label>Low-stock at</label>
                <input type="number" min="0" className={`input ${errors.low_stock_threshold ? 'err' : ''}`} value={form.low_stock_threshold} onChange={set('low_stock_threshold')} />
                {errors.low_stock_threshold && <span className="field-err">{errors.low_stock_threshold}</span>}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {moveFor && (
        <StockMoveModal
          product={moveFor.product}
          type={moveFor.type}
          onClose={() => setMoveFor(null)}
          onDone={async () => {
            setMoveFor(null)
            await load()
            onChanged()
          }}
        />
      )}

      {deleteFor && (
        <Modal title="Delete Product" onClose={() => setDeleteFor(null)} width={420}>
          <p>
            Delete <strong>{deleteFor.name}</strong> ({deleteFor.sku})? This cannot be undone.
          </p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setDeleteFor(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function StockMoveModal({ product, type, onClose, onDone }) {
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const isOut = type === 'out'

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(qty)
    if (!Number.isInteger(n) || n <= 0) {
      setErr('Enter a whole number greater than 0')
      return
    }
    if (isOut && n > product.quantity) {
      setErr(`Only ${product.quantity} in stock`)
      return
    }
    setSaving(true)
    try {
      await api.createMovement({ product_id: product.id, type, quantity: n, note: note.trim() })
      toast.success(`${isOut ? 'Removed' : 'Added'} ${n} × ${product.name}`)
      onDone()
    } catch (e2) {
      toast.error(e2.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={`${isOut ? 'Stock Out' : 'Stock In'} — ${product.name}`} onClose={onClose} width={440}>
      <form onSubmit={submit} className="form" noValidate>
        <div className="move-summary">
          <span>Current stock</span>
          <strong>{product.quantity}</strong>
        </div>
        <div className="field">
          <label>{isOut ? 'Quantity to remove' : 'Quantity to add'} *</label>
          <input
            type="number"
            min="1"
            className={`input ${err ? 'err' : ''}`}
            value={qty}
            autoFocus
            onChange={(e) => { setQty(e.target.value); setErr('') }}
          />
          {err && <span className="field-err">{err}</span>}
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isOut ? 'e.g. Sale order #1234' : 'e.g. Restock from supplier'} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn ${isOut ? 'btn-danger' : 'btn-primary'}`} disabled={saving}>
            {saving ? 'Saving…' : isOut ? 'Remove Stock' : 'Add Stock'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
