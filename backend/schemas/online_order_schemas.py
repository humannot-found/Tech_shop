from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field, model_validator

from backend.models.enums import (
    FulfillmentStatus,
    PaymentMethod,
    SaleStatus,
    TrackingType,
)
from backend.schemas.base_schemas import BaseSchema, ModelResponse
from backend.schemas.payments_schemas import PaymentResponse


class OnlineOrderCustomerSummary(BaseSchema):
    customer_id: UUID | None
    full_name: str | None
    phone: str | None
    email: str | None


class OnlineOrderItemResponse(ModelResponse):
    sale_id: UUID
    variant_id: UUID
    serialized_unit_id: UUID | None
    description: str
    sku: str
    tracking_type: TrackingType
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal
    serial_number: str | None
    imei: str | None


class OnlineOrderResponse(ModelResponse):
    branch_id: UUID
    branch_name: str
    order_number: str
    status: SaleStatus
    fulfillment_status: FulfillmentStatus
    customer: OnlineOrderCustomerSummary
    delivery_method: str
    delivery_address: str | None
    customer_note: str | None
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    reservation_expires_at: datetime | None
    completed_at: datetime | None
    items: list[OnlineOrderItemResponse]
    payments: list[PaymentResponse]


class OnlineOrderPaymentCreate(BaseSchema):
    method: PaymentMethod
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    till_session_id: UUID | None = None
    provider_reference: str | None = Field(default=None, max_length=150)
    payer_phone: str | None = Field(default=None, max_length=20)
    payer_name: str | None = Field(default=None, max_length=150)
    payer_account_reference: str | None = Field(default=None, max_length=150)
    idempotency_key: str = Field(min_length=8, max_length=150)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def provider_reference_required_for_non_cash(self) -> "OnlineOrderPaymentCreate":
        if self.method != PaymentMethod.CASH and not self.provider_reference:
            raise ValueError("non-cash payments require a provider reference")
        return self


class OnlineOrderAllocationItem(BaseSchema):
    sale_item_id: UUID
    serialized_unit_id: UUID | None = None


class OnlineOrderAllocate(BaseSchema):
    auto_assign_serialized_units: bool = True
    items: list[OnlineOrderAllocationItem] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=500)


class OnlineOrderNote(BaseSchema):
    note: str | None = Field(default=None, max_length=500)
