"""In-memory data store with seed data.

All state lives in process memory (no database). A single :class:`Store`
instance is shared across the app and guarded by a lock so concurrent
requests stay consistent.
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from itertools import count
from typing import Dict, List, Optional


def now() -> datetime:
    return datetime.now(timezone.utc)


class Store:
    def __init__(self) -> None:
        self._lock = threading.RLock()

        self.categories: Dict[int, dict] = {}
        self.products: Dict[int, dict] = {}
        self.movements: List[dict] = []
        self.audit: List[dict] = []

        self._cat_id = count(1)
        self._prod_id = count(1)
        self._mov_id = count(1)
        self._audit_id = count(1)

        self._seed()

    # ------------------------------------------------------------------ #
    # helpers
    # ------------------------------------------------------------------ #
    @property
    def lock(self) -> threading.RLock:
        return self._lock

    def log(self, action: str, entity: str, entity_id: Optional[int], detail: str) -> None:
        self.audit.append(
            {
                "id": next(self._audit_id),
                "action": action,
                "entity": entity,
                "entity_id": entity_id,
                "detail": detail,
                "created_at": now(),
            }
        )

    def next_category_id(self) -> int:
        return next(self._cat_id)

    def next_product_id(self) -> int:
        return next(self._prod_id)

    def next_movement_id(self) -> int:
        return next(self._mov_id)

    # ------------------------------------------------------------------ #
    # seed
    # ------------------------------------------------------------------ #
    def _seed(self) -> None:
        cats = [
            ("Electronics", "Devices and gadgets"),
            ("Accessories", "Cables, cases and add-ons"),
            ("Office Supplies", "Stationery and consumables"),
        ]
        cat_ids = {}
        for name, desc in cats:
            cid = self.next_category_id()
            self.categories[cid] = {
                "id": cid,
                "name": name,
                "description": desc,
                "created_at": now(),
            }
            cat_ids[name] = cid

        products = [
            ("Wireless Mouse", "ELEC-001", "Electronics", "Ergonomic 2.4GHz wireless mouse", 24.99, 45, 10),
            ("Mechanical Keyboard", "ELEC-002", "Electronics", "RGB mechanical keyboard, blue switches", 79.99, 8, 10),
            ("USB-C Cable 2m", "ACC-001", "Accessories", "Braided USB-C to USB-C cable", 9.99, 120, 25),
            ("Laptop Stand", "ACC-002", "Accessories", "Aluminium adjustable laptop stand", 34.50, 0, 5),
            ("27\" Monitor", "ELEC-003", "Electronics", "4K UHD IPS monitor", 299.00, 15, 5),
            ("Notebook A5", "OFF-001", "Office Supplies", "Dotted hardcover notebook", 6.50, 3, 20),
            ("Ballpoint Pens (12)", "OFF-002", "Office Supplies", "Pack of 12 blue ballpoint pens", 4.25, 200, 30),
            ("Webcam 1080p", "ELEC-004", "Electronics", "Full HD webcam with mic", 49.99, 22, 8),
        ]
        for name, sku, cat, desc, price, qty, threshold in products:
            pid = self.next_product_id()
            ts = now()
            self.products[pid] = {
                "id": pid,
                "name": name,
                "sku": sku,
                "category_id": cat_ids.get(cat),
                "description": desc,
                "price": price,
                "quantity": qty,
                "low_stock_threshold": threshold,
                "created_at": ts,
                "updated_at": ts,
            }

        self.log("seed", "system", None, "Seeded demo categories and products")


store = Store()
