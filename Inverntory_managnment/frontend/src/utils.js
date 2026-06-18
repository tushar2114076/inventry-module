export function currency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(n || 0),
  )
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function stockStatus(p) {
  if (p.quantity <= 0) return 'out'
  if (p.quantity <= p.low_stock_threshold) return 'low'
  return 'in'
}

export const STATUS_LABEL = {
  in: 'In Stock',
  low: 'Low Stock',
  out: 'Out of Stock',
}
