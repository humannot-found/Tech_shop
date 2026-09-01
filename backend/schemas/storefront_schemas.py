from decimal import Decimal
from uuid import UUID

from backend.models.enums import TrackingType
from backend.schemas.base_schemas import BaseSchema


class StorefrontCategoryResponse(BaseSchema):
    id: UUID
    parent_id: UUID | None
    name: str
    slug: str
    description: str | None
    product_count: int


class StorefrontBrandResponse(BaseSchema):
    id: UUID
    name: str
    description: str | None
    product_count: int


class StorefrontProductImageResponse(BaseSchema):
    url: str
    alt_text: str | None
    position: int


class StorefrontVariantResponse(BaseSchema):
    id: UUID
    name: str
    sku: str
    tracking_type: TrackingType
    attributes: dict
    selling_price: Decimal
    available_quantity: int
    is_available: bool


class StorefrontProductResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    description: str | None
    category_id: UUID | None
    category_name: str | None
    category_slug: str | None
    brand_id: UUID | None
    brand_name: str | None
    warranty_months: int
    starting_price: Decimal | None
    available_quantity: int
    is_available: bool
    images: list[StorefrontProductImageResponse]
    variants: list[StorefrontVariantResponse]
