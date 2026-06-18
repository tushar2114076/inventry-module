"""Inventory Management System — FastAPI backend.

In-memory store, no database required. Run with:

    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import csv
import io
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import models
from store import now, store

app = FastAPI(title="Inventory Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #
@app.get("/api/categories", response_model=List[models.Category])
def list_categories():
    with store.lock:
        return sorted(store.categories.values(), key=lambda c: c["name"].lower())


@app.post("/api/categories", response_model=models.Category, status_code=201)
def create_category(payload: models.CategoryCreate):
    with store.lock:
        name_lower = payload.name.lower()
        if any(c["name"].lower() == name_lower for c in store.categories.values()):
            raise HTTPException(409, "A category with this name already exists")
        cid = store.next_category_id()
        cat = {
            "id": cid,
            "name": payload.name,
            "description": payload.description,
            "created_at": now(),
        }
        store.categories[cid] = cat
        store.log("create", "category", cid, f"Created category '{payload.name}'")
        return cat


@app.put("/api/categories/{category_id}", response_model=models.Category)
def update_category(category_id: int, payload: models.CategoryUpdate):
    with store.lock:
        cat = store.categories.get(category_id)
        if not cat:
            raise HTTPException(404, "Category not found")
        if payload.name is not None:
            name_lower = payload.name.strip().lower()
            if not name_lower:
                raise HTTPException(422, "Category name cannot be empty")
            if any(
                c["id"] != category_id and c["name"].lower() == name_lower
                for c in store.categories.values()
            ):
                raise HTTPException(409, "A category with this name already exists")
            cat["name"] = payload.name.strip()
        if payload.description is not None:
            cat["description"] = payload.description
        store.log("update", "category", category_id, f"Updated category '{cat['name']}'")
        return cat


@app.delete("/api/categories/{category_id}", status_code=204)
def delete_category(category_id: int):
    with store.lock:
        cat = store.categories.get(category_id)
        if not cat:
            raise HTTPException(404, "Category not found")
        # Un-assign products in this category rather than blocking deletion.
        for p in store.products.values():
            if p["category_id"] == category_id:
                p["category_id"] = None
        del store.categories[category_id]
        store.log("delete", "category", category_id, f"Deleted category '{cat['name']}'")
    return None


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
def _stock_status(p: dict) -> str:
    if p["quantity"] <= 0:
        return "out"
    if p["quantity"] <= p["low_stock_threshold"]:
        return "low"
    return "in"


@app.get("/api/products", response_model=List[models.Product])
def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="in | low | out"),
):
    with store.lock:
        items = list(store.products.values())

    if search:
        q = search.lower().strip()
        items = [p for p in items if q in p["name"].lower() or q in p["sku"].lower()]
    if category_id is not None:
        items = [p for p in items if p["category_id"] == category_id]
    if status in {"in", "low", "out"}:
        items = [p for p in items if _stock_status(p) == status]

    return sorted(items, key=lambda p: p["name"].lower())


@app.get("/api/products/{product_id}", response_model=models.Product)
def get_product(product_id: int):
    with store.lock:
        p = store.products.get(product_id)
        if not p:
            raise HTTPException(404, "Product not found")
        return p


@app.post("/api/products", response_model=models.Product, status_code=201)
def create_product(payload: models.ProductCreate):
    with store.lock:
        sku_lower = payload.sku.lower()
        if any(p["sku"].lower() == sku_lower for p in store.products.values()):
            raise HTTPException(409, "A product with this SKU already exists")
        if payload.category_id is not None and payload.category_id not in store.categories:
            raise HTTPException(422, "Category does not exist")

        pid = store.next_product_id()
        ts = now()
        product = {
            "id": pid,
            "name": payload.name,
            "sku": payload.sku,
            "category_id": payload.category_id,
            "description": payload.description,
            "price": payload.price,
            "quantity": payload.quantity,
            "low_stock_threshold": payload.low_stock_threshold,
            "created_at": ts,
            "updated_at": ts,
        }
        store.products[pid] = product
        store.log("create", "product", pid, f"Created product '{payload.name}' ({payload.sku})")
        return product


@app.put("/api/products/{product_id}", response_model=models.Product)
def update_product(product_id: int, payload: models.ProductUpdate):
    with store.lock:
        p = store.products.get(product_id)
        if not p:
            raise HTTPException(404, "Product not found")

        data = payload.model_dump(exclude_unset=True)

        if "sku" in data and data["sku"]:
            sku_lower = data["sku"].lower()
            if any(
                other["id"] != product_id and other["sku"].lower() == sku_lower
                for other in store.products.values()
            ):
                raise HTTPException(409, "A product with this SKU already exists")
        if "category_id" in data and data["category_id"] is not None:
            if data["category_id"] not in store.categories:
                raise HTTPException(422, "Category does not exist")

        for key in (
            "name",
            "sku",
            "category_id",
            "description",
            "price",
            "quantity",
            "low_stock_threshold",
        ):
            if key in data:
                p[key] = data[key]
        p["updated_at"] = now()
        store.log("update", "product", product_id, f"Updated product '{p['name']}' ({p['sku']})")
        return p


@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: int):
    with store.lock:
        p = store.products.get(product_id)
        if not p:
            raise HTTPException(404, "Product not found")
        del store.products[product_id]
        store.log("delete", "product", product_id, f"Deleted product '{p['name']}' ({p['sku']})")
    return None


# --------------------------------------------------------------------------- #
# Stock movements
# --------------------------------------------------------------------------- #
@app.get("/api/movements", response_model=List[models.StockMovement])
def list_movements(
    product_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
):
    with store.lock:
        items = store.movements
        if product_id is not None:
            items = [m for m in items if m["product_id"] == product_id]
        return list(reversed(items[-limit:])) if product_id is None else list(reversed(items))[:limit]


@app.post("/api/movements", response_model=models.StockMovement, status_code=201)
def create_movement(payload: models.StockMovementCreate):
    with store.lock:
        p = store.products.get(payload.product_id)
        if not p:
            raise HTTPException(404, "Product not found")

        if payload.type == models.MovementType.OUT:
            if payload.quantity > p["quantity"]:
                raise HTTPException(
                    400,
                    f"Cannot remove {payload.quantity} units; only {p['quantity']} in stock",
                )
            p["quantity"] -= payload.quantity
        else:
            p["quantity"] += payload.quantity

        p["updated_at"] = now()

        mid = store.next_movement_id()
        movement = {
            "id": mid,
            "product_id": p["id"],
            "product_name": p["name"],
            "sku": p["sku"],
            "type": payload.type.value,
            "quantity": payload.quantity,
            "resulting_quantity": p["quantity"],
            "note": payload.note,
            "created_at": now(),
        }
        store.movements.append(movement)
        verb = "Stock in" if payload.type == models.MovementType.IN else "Stock out"
        store.log(
            "stock",
            "product",
            p["id"],
            f"{verb} {payload.quantity} × '{p['name']}' → {p['quantity']} in stock",
        )
        return movement


# --------------------------------------------------------------------------- #
# Audit log
# --------------------------------------------------------------------------- #
@app.get("/api/audit", response_model=List[models.AuditEntry])
def list_audit(limit: int = Query(100, ge=1, le=1000)):
    with store.lock:
        return list(reversed(store.audit[-limit:]))


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
@app.get("/api/dashboard")
def dashboard():
    with store.lock:
        products = list(store.products.values())
        total_products = len(products)
        total_units = sum(p["quantity"] for p in products)
        total_value = round(sum(p["price"] * p["quantity"] for p in products), 2)
        low = [p for p in products if _stock_status(p) == "low"]
        out = [p for p in products if _stock_status(p) == "out"]

        # value by category
        by_cat: dict = {}
        for p in products:
            cid = p["category_id"]
            name = store.categories[cid]["name"] if cid in store.categories else "Uncategorized"
            entry = by_cat.setdefault(name, {"category": name, "value": 0.0, "units": 0, "products": 0})
            entry["value"] += p["price"] * p["quantity"]
            entry["units"] += p["quantity"]
            entry["products"] += 1
        for e in by_cat.values():
            e["value"] = round(e["value"], 2)

        recent = list(reversed(store.audit[-8:]))

        return {
            "total_products": total_products,
            "total_units": total_units,
            "total_value": total_value,
            "total_categories": len(store.categories),
            "low_stock_count": len(low),
            "out_of_stock_count": len(out),
            "low_stock_items": [
                {"id": p["id"], "name": p["name"], "sku": p["sku"], "quantity": p["quantity"],
                 "threshold": p["low_stock_threshold"]}
                for p in sorted(low + out, key=lambda x: x["quantity"])
            ],
            "value_by_category": sorted(by_cat.values(), key=lambda x: -x["value"]),
            "recent_activity": recent,
        }


# --------------------------------------------------------------------------- #
# CSV export
# --------------------------------------------------------------------------- #
@app.get("/api/export/csv")
def export_csv():
    with store.lock:
        rows = list(store.products.values())
        cat_names = {cid: c["name"] for cid, c in store.categories.items()}

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["ID", "Name", "SKU", "Category", "Description", "Price", "Quantity",
         "Low Stock Threshold", "Stock Status", "Inventory Value"]
    )
    for p in sorted(rows, key=lambda x: x["name"].lower()):
        writer.writerow(
            [
                p["id"],
                p["name"],
                p["sku"],
                cat_names.get(p["category_id"], "Uncategorized"),
                p["description"],
                f"{p['price']:.2f}",
                p["quantity"],
                p["low_stock_threshold"],
                _stock_status(p),
                f"{p['price'] * p['quantity']:.2f}",
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_export.csv"},
    )


@app.get("/")
def root():
    return {"status": "ok", "service": "Inventory Management System API", "docs": "/docs"}
