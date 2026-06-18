// Thin API client for the FastAPI backend.
// In dev, /api is proxied to http://localhost:8000 (see vite.config.js).

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (res.status === 204) return null

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.detail?.[0]?.msg || data.detail || data.message)) ||
      `Request failed (${res.status})`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

export const api = {
  // Dashboard
  dashboard: () => request('/dashboard'),

  // Categories
  listCategories: () => request('/categories'),
  createCategory: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id, body) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Products
  listProducts: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.search) qs.set('search', params.search)
    if (params.category_id) qs.set('category_id', params.category_id)
    if (params.status) qs.set('status', params.status)
    const q = qs.toString()
    return request(`/products${q ? `?${q}` : ''}`)
  },
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Movements
  listMovements: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.product_id) qs.set('product_id', params.product_id)
    if (params.limit) qs.set('limit', params.limit)
    const q = qs.toString()
    return request(`/movements${q ? `?${q}` : ''}`)
  },
  createMovement: (body) => request('/movements', { method: 'POST', body: JSON.stringify(body) }),

  // Audit
  listAudit: (limit = 100) => request(`/audit?limit=${limit}`),

  // Export
  exportCsvUrl: () => `${BASE}/export/csv`,
}
