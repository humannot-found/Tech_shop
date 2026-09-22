from datetime import datetime
from uuid import UUID

from typing import Literal

from pydantic import Field

from backend.models.enums import StockCountStatus, TrackingType
from backend.schemas.base_schemas import BaseSchema, ModelResponse


class StockCountCreate(BaseSchema):
    branch_id: UUID
    variant_ids: list[UUID] | None = None
    notes: str | None = Field(default=None, max_length=500)


class StockCountItemUpdate(BaseSchema):
    counted_quantity: int = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)


class StockCountScanCreate(BaseSchema):
    identifier: str = Field(min_length=3, max_length=120)


class StockCountScanResponse(ModelResponse):
    stock_count_item_id: UUID
    serialized_unit_id: UUID
    scanned_by_id: UUID
    # Not a model column; filled in from the serialized unit when building the response.
    unit_identifier: str = ""


class SerializedUnitReviewDecision(BaseSchema):
    decision: Literal["lost", "found"]
    notes: str | None = Field(default=None, max_length=500)


class StockCountItemResponse(ModelResponse):
    stock_count_id: UUID
    variant_id: UUID
    expected_quantity: int
    counted_quantity: int | None
    variance: int | None
    notes: str | None
    # Not model columns; filled in from the product variant and its scans when
    # building the response.
    tracking_type: TrackingType = TrackingType.BULK
    scans: list[StockCountScanResponse] = Field(default_factory=list)
    unexpected_scan_count: int = 0


class StockCountResponse(ModelResponse):
    branch_id: UUID
    count_number: str
    status: StockCountStatus
    created_by_id: UUID
    approved_by_id: UUID | None
    submitted_at: datetime | None
    approved_at: datetime | None
    notes: str | None
    items: list[StockCountItemResponse] = Field(default_factory=list)
