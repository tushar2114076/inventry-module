"""Pydantic models / schemas for the Inventory Management System."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# --------------------------------------------------------------------------- #
# Categories
# --------------------------------------------------------------------------- #
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    description: str = Field("", max_length=255)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        return v


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=60)
    description: Optional[str] = Field(None, max_length=255)


class Category(CategoryBase):
    id: int
    created_at: datetime


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    sku: str = Field(..., min_length=1, max_length=60)
    category_id: Optional[int] = None
    description: str = Field("", max_length=500)
    price: float = Field(..., ge=0)
    quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(10, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    sku: Optional[str] = Field(None, min_length=1, max_length=60)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=0)
    low_stock_threshold: Optional[int] = Field(None, ge=0)


class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Stock movements
# --------------------------------------------------------------------------- #
class MovementType(str, Enum):
    IN = "in"
    OUT = "out"


class StockMovementCreate(BaseModel):
    product_id: int
    type: MovementType
    quantity: int = Field(..., gt=0)
    note: str = Field("", max_length=255)


class StockMovement(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    type: MovementType
    quantity: int
    resulting_quantity: int
    note: str
    created_at: datetime


# --------------------------------------------------------------------------- #
# Audit log
# --------------------------------------------------------------------------- #
class AuditEntry(BaseModel):
    id: int
    action: str
    entity: str
    entity_id: Optional[int]
    detail: str
    created_at: datetime
