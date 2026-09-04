from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from backend.api.dependencies import DatabaseSession, require_permission
from backend.models.enums import FulfillmentStatus, SaleStatus
from backend.schemas.base_schemas import Page
from backend.schemas.online_order_schemas import (
    OnlineOrderAllocate,
    OnlineOrderNote,
    OnlineOrderPaymentCreate,
    OnlineOrderResponse,
)
from backend.schemas.sales_schemas import ReceiptResponse
from backend.services import online_orders as online_order_service
from backend.services.auth import AuthPrincipal

router = APIRouter(prefix="/orders", tags=["staff-online-orders"])
OrdersPrincipal = Annotated[
    AuthPrincipal, Depends(require_permission("orders.fulfill"))
]


@router.get("", response_model=Page[OnlineOrderResponse])
def list_online_orders(
    principal: OrdersPrincipal,
    db: DatabaseSession,
    branch_id: UUID | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    order_status: SaleStatus | None = Query(default=None, alias="status"),
    fulfillment_status: FulfillmentStatus | None = None,
) -> Page[OnlineOrderResponse]:
    items, total = online_order_service.list_orders(
        db,
        principal,
        branch_id=branch_id,
        page=page,
        page_size=page_size,
        status=order_status,
        fulfillment_status=fulfillment_status,
    )
    return Page[OnlineOrderResponse](
        items=items, total=total, page=page, page_size=page_size
    )


@router.post("/{order_id}/payments", response_model=OnlineOrderResponse)
def record_online_order_payment(
    order_id: UUID,
    payload: OnlineOrderPaymentCreate,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    item = online_order_service.record_payment(db, principal, order_id, payload)
    db.commit()
    return item


@router.post("/{order_id}/allocate", response_model=OnlineOrderResponse)
def allocate_online_order(
    order_id: UUID,
    payload: OnlineOrderAllocate,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    item = online_order_service.allocate_order(db, principal, order_id, payload)
    db.commit()
    return item


@router.post("/{order_id}/ready", response_model=OnlineOrderResponse)
def mark_online_order_ready(
    order_id: UUID,
    payload: OnlineOrderNote,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    item = online_order_service.mark_ready(db, principal, order_id, payload)
    db.commit()
    return item


@router.post("/{order_id}/fulfill", response_model=OnlineOrderResponse)
def fulfill_online_order(
    order_id: UUID,
    payload: OnlineOrderNote,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    item = online_order_service.fulfill_order(db, principal, order_id, payload)
    db.commit()
    return item


@router.post("/{order_id}/cancel", response_model=OnlineOrderResponse)
def cancel_online_order(
    order_id: UUID,
    payload: OnlineOrderNote,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    item = online_order_service.cancel_order(db, principal, order_id, payload)
    db.commit()
    return item


@router.get("/{order_id}/receipt", response_model=ReceiptResponse)
def online_order_receipt(
    order_id: UUID,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> ReceiptResponse:
    return online_order_service.receipt(db, principal, order_id)


@router.get("/{order_id}", response_model=OnlineOrderResponse)
def get_online_order(
    order_id: UUID,
    principal: OrdersPrincipal,
    db: DatabaseSession,
) -> OnlineOrderResponse:
    return online_order_service.get_order(db, principal, order_id)
