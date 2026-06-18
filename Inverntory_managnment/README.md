# 📦 Inventory Management System

A full-stack inventory management web application built with **React** (frontend) and **Python FastAPI** (backend). All state is held **in-memory** on the backend — no database required.

![Tech](https://img.shields.io/badge/frontend-React%2018-61dafb) ![Tech](https://img.shields.io/badge/backend-FastAPI-009688)

## ✨ Features

### Core
- **Product Management** — add, edit, delete and view products (name, SKU, category, description, price, quantity, low-stock threshold)
- **Inventory Tracking** — live stock levels with **In / Low / Out-of-stock** highlighting
- **Stock In / Stock Out** — record incoming and outgoing stock with notes and timestamps (stock-out is validated against available quantity)
- **Categories** — create, edit and delete categories; deleting a category leaves its products *uncategorized* rather than blocking
- **Search & Filter** — search by name or SKU; filter by category and stock status
- **Dashboard** — totals (products, units, inventory value), low/out-of-stock alerts and recent activity

### UI / UX
- Clean, professional, responsive UI (desktop → mobile with a collapsible sidebar)
- Sortable table columns for the product grid
- Full client-side **and** server-side form validation
- Toast notifications for every action (added / updated / deleted / stock change / errors)

### Bonus
- ✅ **Export inventory as CSV**
- ✅ **Audit log** of every create/update/delete and stock change
- ✅ **Charts** — inventory value by category (bar) and units by category (pie)

## 🗂 Project Structure

```
Inverntory_managnment/
├── backend/            # FastAPI app (in-memory store)
│   ├── main.py         # API routes
│   ├── models.py       # Pydantic schemas + validation
│   ├── store.py        # In-memory data store + seed data
│   └── requirements.txt
└── frontend/           # React + Vite app
    ├── src/
    │   ├── App.jsx
    │   ├── api.js       # API client
    │   ├── components/  # Toast, Modal
    │   └── views/       # Dashboard, Products, Categories, Movements, AuditLog
    └── package.json
```

## 🚀 Getting Started

You need **two terminals** — one for the backend, one for the frontend.

### 1. Backend (FastAPI) — port 8000

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs are available at **http://localhost:8000/docs**.

> Requires Python 3.9+. (Tested on Python 3.14 — dependencies are unpinned to the latest versions so prebuilt wheels are used.)

### 2. Frontend (React) — port 5173

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the backend on port 8000, so no extra CORS config is needed.

## 🔌 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Summary metrics, alerts, charts data, recent activity |
| GET/POST | `/api/products` | List (with `search`, `category_id`, `status` filters) / create |
| PUT/DELETE | `/api/products/{id}` | Update / delete |
| GET/POST | `/api/categories` | List / create |
| PUT/DELETE | `/api/categories/{id}` | Update / delete |
| GET/POST | `/api/movements` | Movement history / record stock in or out |
| GET | `/api/audit` | Audit log |
| GET | `/api/export/csv` | Download inventory as CSV |

## 📝 Notes

- **In-memory state**: data resets when the backend restarts. The store is seeded with demo categories and products on startup.
- Concurrency-safe: the in-memory store is guarded by a lock.
