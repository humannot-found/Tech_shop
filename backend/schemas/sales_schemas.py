from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from backend.models.enums import (
    CashMovementKind,
    FulfillmentStatus,
    PaymentMethod,
    SaleChannel,
    SaleStatus,
    TillSessionStatus,
)
from backend.schemas.base_schemas import BaseSchema, ModelResponse


class TillCreate(BaseSchema):
    branch_id: UUID
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=30)


class TillUpdate(BaseSchema):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    is_active: bool | None = None


class TillResponse(ModelResponse):
    branch_id: UUID
    name: str
    code: str
    is_active: bool


class TillSessionOpen(BaseSchema):
    till_id: UUID
    opening_float: Decimal = Field(default=Decimal("0.00"), ge=0)


class TillCashMovementCreate(BaseSchema):
    kind: CashMovementKind
    amount: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    reason: str = Field(min_length=3, max_length=200)


class TillCashMovementResponse(ModelResponse):
    till_session_id: UUID
    kind: CashMovementKind
    amount: Decimal
    reason: str
    created_by_id: UUID


class TillDrawerSummary(BaseSchema):
    till_session_id: UUID
    opening_float: Decimal
    cash_sales: Decimal
    cash_refunds: Decimal
    cash_in: Decimal
    paid_out: Decimal
    cash_drop: Decimal
    expected_cash: Decimal


class ShiftPaymentLine(BaseSchema):
    method: str
    received: Decimal
    refunded: Decimal
    net: Decimal


class ShiftMovementLine(BaseSchema):
    kind: CashMovementKind
    amount: Decimal
    reason: str
    created_at: datetime


class TillShiftReport(BaseSchema):
    """End-of-shift (Z) report for one till session."""

    till_session_id: UUID
    till_name: str
    till_code: str
    branch_name: str
    cashier_name: str
    status: TillSessionStatus
    opened_at: datetime
    closed_at: datetime | None
    sale_count: int
    voided_count: int
    items_sold: int
    gross_sales: Decimal
    discounts: Decimal
    net_sales: Decimal
    repair_payments: Decimal
    return_count: int
    refunds_total: Decimal
    payments: list[ShiftPaymentLine]
    opening_float: Decimal
    cash_sales: Decimal
    cash_refunds: Decimal
    cash_in: Decimal
    paid_out: Decimal
    cash_drop: Decimal
    # Hidden from the cashier while their own till is still open (blind count).
    expected_cash: Decimal | None
    closing_cash: Decimal | None
    variance: Decimal | None
    movements: list[ShiftMovementLine]


class TillSessionClose(BaseSchema):
    closing_cash: Decimal = Field(ge=0)


class TillSessionResponse(ModelResponse):
    till_id: UUID
    cashier_id: UUID
    status: TillSessionStatus
    opened_at: datetime
    closed_at: datetime | None
    opening_float: Decimal
    expected_cash: Decimal | None
    closing_cash: Decimal | None


class SaleItemCreate(BaseSchema):
    variant_id: UUID
    serialized_unit_id: UUID | None = None
    quantity: int = Field(gt=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)


class DiscountApproval(BaseSchema):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class SaleCreate(BaseSchema):
    branch_id: UUID
    customer_id: UUID | None = None
    till_session_id: UUID | None = None
    channel: SaleChannel
    notes: str | None = Field(default=None, max_length=500)
    discount_approval: DiscountApproval | None = None
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleItemResponse(ModelResponse):
    sale_id: UUID
    variant_id: UUID
    serialized_unit_id: UUID | None
    description: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal


class POSSaleItemResponse(ModelResponse):
    sale_id: UUID
    variant_id: UUID
    serialized_unit_id: UUID | None
    description: str
    quantity: int
    unit_price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    line_total: Decimal


class SaleResponse(ModelResponse):
    branch_id: UUID
    customer_id: UUID | None
    cashier_id: UUID | None
    till_session_id: UUID | None
    invoice_number: str
    channel: SaleChannel
    status: SaleStatus
    fulfillment_status: FulfillmentStatus
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    notes: str | None
    completed_at: datetime | None
    items: list[SaleItemResponse] = Field(default_factory=list)


class POSSaleResponse(ModelResponse):
    branch_id: UUID
    customer_id: UUID | None
    cashier_id: UUID | None
    till_session_id: UUID | None
    invoice_number: str
    channel: SaleChannel
    status: SaleStatus
    fulfillment_status: FulfillmentStatus
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    notes: str | None
    completed_at: datetime | None
    items: list[POSSaleItemResponse] = Field(default_factory=list)


class SaleVoidRequest(BaseSchema):
    till_session_id: UUID
    reason: str = Field(min_length=3, max_length=500)


class SaleReturnItemCreate(BaseSchema):
    sale_item_id: UUID
    quantity: int = Field(gt=0)
    condition: str = Field(min_length=2, max_length=30)
    restock: bool = False


class SaleReturnCreate(BaseSchema):
    till_session_id: UUID
    reason: str = Field(min_length=3, max_length=500)
    items: list[SaleReturnItemCreate] = Field(min_length=1)


class SaleReturnItemResponse(ModelResponse):
    return_id: UUID
    sale_item_id: UUID
    quantity: int
    condition: str
    restock: bool


class SaleReturnResponse(ModelResponse):
    sale_id: UUID
    till_session_id: UUID | None
    return_number: str
    requested_by_id: UUID
    approved_by_id: UUID | None
    status: str
    reason: str
    refund_amount: Decimal
    items: list[SaleReturnItemResponse] = Field(default_factory=list)


class ReceiptPaymentLine(BaseSchema):
    method: PaymentMethod
    amount: Decimal
    provider_reference: str | None
    payer_phone: str | None
    payer_name: str | None
    payer_account_reference: str | None
    paid_at: datetime | None


class ReceiptResponse(BaseSchema):
    invoice_number: str
    sale_status: SaleStatus
    branch_name: str
    branch_code: str
    branch_address: str | None
    customer_name: str | None
    customer_phone: str | None
    cashier_name: str | None
    items: list[POSSaleItemResponse]
    payments: list[ReceiptPaymentLine]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    completed_at: datetime | None
