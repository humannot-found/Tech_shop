from decimal import Decimal
from uuid import UUID

from pydantic import EmailStr, Field, model_validator

from backend.models.enums import FulfillmentStatus, SaleStatus
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


class StorefrontOrderCustomerCreate(BaseSchema):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=255)


class StorefrontOrderItemCreate(BaseSchema):
    variant_id: UUID
    quantity: int = Field(gt=0, le=100)


class StorefrontOrderCreate(BaseSchema):
    customer: StorefrontOrderCustomerCreate
    items: list[StorefrontOrderItemCreate] = Field(min_length=1, max_length=50)
    branch_id: UUID | None = None
    delivery_method: str = Field(default="pickup", pattern="^(pickup|delivery)$")
    delivery_address: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def delivery_address_required_for_delivery(self) -> "StorefrontOrderCreate":
        if self.delivery_method == "delivery" and not self.delivery_address:
            raise ValueError("delivery_address is required for delivery orders")
        return self


class StorefrontOrderItemResponse(BaseSchema):
    variant_id: UUID
    sku: str
    product_name: str
    variant_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class StorefrontCustomerSummary(BaseSchema):
    full_name: str
    phone: str
    email: EmailStr | None


class StorefrontOrderResponse(BaseSchema):
    id: UUID
    order_number: str
    branch_id: UUID
    status: SaleStatus
    fulfillment_status: FulfillmentStatus
    customer: StorefrontCustomerSummary
    delivery_method: str
    delivery_address: str | None
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    notes: str | None
    items: list[StorefrontOrderItemResponse]
