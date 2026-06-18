import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currency, formatDate } from '../utils.js'

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat-card ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ summary, onNavigate }) {
  if (!summary) {
    return <div className="empty">Loading dashboard…</div>
  }

  const chartData = summary.value_by_category.map((c) => ({
    name: c.category,
    value: c.value,
    units: c.units,
  }))

  return (
    <div className="stack">
      <div className="stat-grid">
        <Stat label="Total Products" value={summary.total_products} sub={`${summary.total_categories} categories`} />
        <Stat label="Inventory Value" value={currency(summary.total_value)} sub={`${summary.total_units} units in stock`} tone="primary" />
        <Stat label="Low Stock" value={summary.low_stock_count} sub="needs restock soon" tone={summary.low_stock_count ? 'warn' : ''} />
        <Stat label="Out of Stock" value={summary.out_of_stock_count} sub="unavailable items" tone={summary.out_of_stock_count ? 'danger' : ''} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Inventory Value by Category</h3>
          </div>
          {chartData.length === 0 ? (
            <div className="empty">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => currency(v)} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Units by Category</h3>
          </div>
          {chartData.length === 0 ? (
            <div className="empty">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="units"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(e) => e.name}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Low / Out of Stock Alerts</h3>
            <button className="link-btn" onClick={() => onNavigate('products')}>
              View products →
            </button>
          </div>
          {summary.low_stock_items.length === 0 ? (
            <div className="empty">All stocked up 🎉</div>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th className="num">Qty</th>
                  <th className="num">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {summary.low_stock_items.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td className="muted">{p.sku}</td>
                    <td className="num">
                      <span className={`pill ${p.quantity === 0 ? 'pill-danger' : 'pill-warn'}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="num muted">{p.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Recent Activity</h3>
            <button className="link-btn" onClick={() => onNavigate('audit')}>
              Full log →
            </button>
          </div>
          {summary.recent_activity.length === 0 ? (
            <div className="empty">No activity yet</div>
          ) : (
            <ul className="activity">
              {summary.recent_activity.map((a) => (
                <li key={a.id}>
                  <span className={`dot dot-${a.action}`} />
                  <div>
                    <div className="activity-text">{a.detail}</div>
                    <div className="activity-time">{formatDate(a.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
