from datetime import datetime
from uuid import UUID

from backend.schemas.base_schemas import ModelResponse


class WarrantyResponse(ModelResponse):
    sale_item_id: UUID
    serialized_unit_id: UUID | None
    customer_id: UUID | None
    start_date: datetime
    end_date: datetime
    status: str


class WarrantyLookupResponse(WarrantyResponse):
    """A warranty with the details a cashier needs at the counter."""

    coverage: str
    days_remaining: int
    unit_identifier: str | None
    description: str
    sale_id: UUID
    invoice_number: str
    sold_at: datetime | None
    customer_name: str | None
    customer_phone: str | None
