import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import { useToast } from './components/Toast.jsx'
import Dashboard from './views/Dashboard.jsx'
import Products from './views/Products.jsx'
import Categories from './views/Categories.jsx'
import Movements from './views/Movements.jsx'
import AuditLog from './views/AuditLog.jsx'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'products', label: 'Products', icon: '📦' },
  { key: 'categories', label: 'Categories', icon: '🏷️' },
  { key: 'movements', label: 'Stock Movements', icon: '🔄' },
  { key: 'audit', label: 'Audit Log', icon: '📝' },
]

export default function App() {
  const [view, setView] = useState('dashboard')
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const toast = useToast()

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await api.listCategories())
    } catch (e) {
      toast.error(e.message)
    }
  }, [toast])

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await api.dashboard())
    } catch (e) {
      // dashboard is non-critical for badges; stay quiet on failure
      console.error(e)
    }
  }, [])

  // Anything that changes inventory should refresh the shared badges.
  const refresh = useCallback(() => {
    loadCategories()
    loadSummary()
  }, [loadCategories, loadSummary])

  useEffect(() => {
    refresh()
  }, [refresh])

  const alertCount =
    (summary?.low_stock_count ?? 0) + (summary?.out_of_stock_count ?? 0)

  const go = (key) => {
    setView(key)
    setNavOpen(false)
  }

  return (
    <div className="app">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">▣</span>
          <div>
            <div className="brand-title">StockPilot</div>
            <div className="brand-sub">Inventory System</div>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.key}
              className={`nav-item ${view === n.key ? 'active' : ''}`}
              onClick={() => go(n.key)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.key === 'dashboard' && alertCount > 0 && (
                <span className="nav-badge">{alertCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">In-memory demo · FastAPI + React</div>
      </aside>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setNavOpen((o) => !o)}>
            ☰
          </button>
          <h1>{NAV.find((n) => n.key === view)?.label}</h1>
          <div className="spacer" />
          <a className="btn btn-ghost" href={api.exportCsvUrl()}>
            ⬇ Export CSV
          </a>
        </header>

        <div className="content">
          {view === 'dashboard' && (
            <Dashboard summary={summary} onNavigate={go} reload={loadSummary} />
          )}
          {view === 'products' && (
            <Products categories={categories} onChanged={refresh} />
          )}
          {view === 'categories' && (
            <Categories categories={categories} onChanged={refresh} reload={loadCategories} />
          )}
          {view === 'movements' && (
            <Movements categories={categories} onChanged={refresh} />
          )}
          {view === 'audit' && <AuditLog />}
        </div>
      </main>
    </div>
  )
}
