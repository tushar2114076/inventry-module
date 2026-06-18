import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useToast } from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'

export default function Categories({ categories, onChanged, reload }) {
  const [counts, setCounts] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteFor, setDeleteFor] = useState(null)
  const toast = useToast()

  // Count products per category for display.
  useEffect(() => {
    api
      .listProducts()
      .then((products) => {
        const c = {}
        products.forEach((p) => {
          if (p.category_id != null) c[p.category_id] = (c[p.category_id] || 0) + 1
        })
        setCounts(c)
      })
      .catch(() => {})
  }, [categories])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setErr('')
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setName(c.name)
    setDescription(c.description || '')
    setErr('')
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErr('Category name is required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.updateCategory(editing.id, { name: name.trim(), description: description.trim() })
        toast.success(`Updated "${name.trim()}"`)
      } else {
        await api.createCategory({ name: name.trim(), description: description.trim() })
        toast.success(`Added "${name.trim()}"`)
      }
      setShowForm(false)
      reload()
      onChanged()
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    try {
      await api.deleteCategory(deleteFor.id)
      toast.success(`Deleted "${deleteFor.name}"`)
      setDeleteFor(null)
      reload()
      onChanged()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn btn-primary" onClick={openCreate}>+ Add Category</button>
      </div>

      <div className="card-grid">
        {categories.length === 0 ? (
          <div className="empty">No categories yet. Add one to get started.</div>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="cat-card">
              <div className="cat-head">
                <h3>{c.name}</h3>
                <span className="pill">{counts[c.id] || 0} products</span>
              </div>
              <p className="cat-desc">{c.description || <span className="muted">No description</span>}</p>
              <div className="cat-actions">
                <button className="btn btn-ghost sm" onClick={() => openEdit(c)}>Edit</button>
                <button className="btn btn-ghost sm danger" onClick={() => setDeleteFor(c)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Category' : 'Add Category'} onClose={() => setShowForm(false)} width={440}>
          <form onSubmit={submit} className="form" noValidate>
            <div className="field">
              <label>Name *</label>
              <input
                className={`input ${err ? 'err' : ''}`}
                value={name}
                autoFocus
                onChange={(e) => { setName(e.target.value); setErr('') }}
              />
              {err && <span className="field-err">{err}</span>}
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteFor && (
        <Modal title="Delete Category" onClose={() => setDeleteFor(null)} width={440}>
          <p>
            Delete <strong>{deleteFor.name}</strong>? Products in this category will become
            uncategorized.
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
