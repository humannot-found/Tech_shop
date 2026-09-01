from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.core.permissions import ADMIN
from backend.models.branch import Branch
from backend.models.customer import Customer
from backend.models.enums import (
    FulfillmentStatus,
    PaymentDirection,
    PaymentMethod,
    PaymentStatus,
    SaleChannel,
    SaleStatus,
    SerializedUnitStatus,
    StockMovementType,
    TillSessionStatus,
    TrackingType,
)
from backend.models.inventory import SerializedUnit, StockBalance, StockReservation
from backend.models.inventory_movement import StockMovement
from backend.models.payments import Payment
from backend.models.products import ProductVariant
from backend.models.sales import Sale, SaleItem, Till, TillSession
from backend.schemas.online_order_schemas import (
    OnlineOrderAllocate,
    OnlineOrderCustomerSummary,
    OnlineOrderItemResponse,
    OnlineOrderNote,
    OnlineOrderPaymentCreate,
    OnlineOrderResponse,
)
from backend.schemas.payments_schemas import PaymentResponse
from backend.services.audit import record_audit
from backend.services.auth import AuthPrincipal
from backend.services.authorization import enforce_branch_scope, enforce_permission
from backend.services.exceptions import ConflictError, NotFoundError, ValidationError
from backend.services.sales import create_warranties_for_sale, money


def _delivery_field(notes: str | None, key: str) -> str | None:
    if not notes:
        return None
    prefix = f"{key}:"
    for line in notes.splitlines():
        if line.startswith(prefix):
            value = line.removeprefix(prefix).strip()
            return value or None
    return None


def _effective_branch_id(
    principal: AuthPrincipal, branch_id: UUID | None
) -> UUID | None:
    if branch_id is not None:
        enforce_branch_scope(principal, branch_id)
        return branch_id
    if principal.role_code == ADMIN:
        return None
    if principal.branch_id is None:
        raise ValidationError("branch_id is required for branch-scoped users")
    return principal.branch_id


def _order_items(
    db: Session, sale_id: UUID, *, lock: bool = False
) -> list[SaleItem]:
    statement = (
        select(SaleItem)
        .where(SaleItem.sale_id == sale_id, SaleItem.is_deleted.is_(False))
        .order_by(SaleItem.created_at, SaleItem.id)
    )
    if lock:
        statement = statement.with_for_update()
    return list(db.scalars(statement).all())


def _online_order_model(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    *,
    lock: bool = False,
) -> Sale:
    enforce_permission(principal, "orders.fulfill")
    statement = select(Sale).where(
        Sale.id == sale_id,
        Sale.channel == SaleChannel.ONLINE,
        Sale.is_deleted.is_(False),
    )
    if lock:
        statement = statement.with_for_update()
    sale = db.scalar(statement)
    if sale is None:
        raise NotFoundError("online order not found")
    enforce_branch_scope(principal, sale.branch_id)
    return sale


def _active_reservations(
    db: Session, sale_id: UUID, *, lock: bool = False
) -> list[StockReservation]:
    statement = (
        select(StockReservation)
        .where(
            StockReservation.reference_type == "online_order",
            StockReservation.reference_id == sale_id,
            StockReservation.status == "active",
            StockReservation.is_deleted.is_(False),
        )
        .order_by(StockReservation.created_at, StockReservation.id)
    )
    if lock:
        statement = statement.with_for_update()
    return list(db.scalars(statement).all())


def _reservation_expires_at(db: Session, sale_id: UUID) -> datetime | None:
    return db.scalar(
        select(func.max(StockReservation.expires_at)).where(
            StockReservation.reference_type == "online_order",
            StockReservation.reference_id == sale_id,
            StockReservation.status == "active",
            StockReservation.is_deleted.is_(False),
        )
    )


def _order_response(db: Session, sale: Sale) -> OnlineOrderResponse:
    branch = db.get(Branch, sale.branch_id)
    customer = db.get(Customer, sale.customer_id) if sale.customer_id else None
    rows = db.execute(
        select(SaleItem, ProductVariant, SerializedUnit)
        .join(ProductVariant, ProductVariant.id == SaleItem.variant_id)
        .outerjoin(SerializedUnit, SerializedUnit.id == SaleItem.serialized_unit_id)
        .where(SaleItem.sale_id == sale.id, SaleItem.is_deleted.is_(False))
        .order_by(SaleItem.created_at, SaleItem.id)
    ).all()
    payments = list(
        db.scalars(
            select(Payment)
            .where(
                Payment.sale_id == sale.id,
                Payment.direction == PaymentDirection.INCOMING,
                Payment.is_deleted.is_(False),
            )
            .order_by(Payment.paid_at, Payment.created_at)
        ).all()
    )
    return OnlineOrderResponse(
        id=sale.id,
        created_at=sale.created_at,
        updated_at=sale.updated_at,
        is_deleted=sale.is_deleted,
        branch_id=sale.branch_id,
        branch_name=branch.name if branch else "",
        order_number=sale.invoice_number,
        status=sale.status,
        fulfillment_status=sale.fulfillment_status,
        customer=OnlineOrderCustomerSummary(
            customer_id=customer.id if customer else None,
            full_name=customer.full_name if customer else None,
            phone=customer.phone if customer else None,
            email=customer.email if customer else None,
        ),
        delivery_method=_delivery_field(sale.notes, "Delivery method") or "pickup",
        delivery_address=_delivery_field(sale.notes, "Delivery address"),
        customer_note=_delivery_field(sale.notes, "Customer note"),
        subtotal=sale.subtotal,
        tax_amount=sale.tax_amount,
        discount_amount=sale.discount_amount,
        total_amount=sale.total_amount,
        paid_amount=sale.paid_amount,
        balance_due=money(sale.total_amount - sale.paid_amount),
        reservation_expires_at=_reservation_expires_at(db, sale.id),
        completed_at=sale.completed_at,
        items=[
            OnlineOrderItemResponse(
                id=item.id,
                created_at=item.created_at,
                updated_at=item.updated_at,
                is_deleted=item.is_deleted,
                sale_id=item.sale_id,
                variant_id=item.variant_id,
                serialized_unit_id=item.serialized_unit_id,
                description=item.description,
                sku=variant.sku,
                tracking_type=variant.tracking_type,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_amount=item.discount_amount,
                tax_amount=item.tax_amount,
                line_total=item.line_total,
                serial_number=unit.serial_number if unit else None,
                imei=unit.imei if unit else None,
            )
            for item, variant, unit in rows
        ],
        payments=[PaymentResponse.model_validate(payment) for payment in payments],
    )


def list_orders(
    db: Session,
    principal: AuthPrincipal,
    *,
    branch_id: UUID | None = None,
    page: int,
    page_size: int,
    status: SaleStatus | None = None,
    fulfillment_status: FulfillmentStatus | None = None,
) -> tuple[list[OnlineOrderResponse], int]:
    enforce_permission(principal, "orders.fulfill")
    effective_branch_id = _effective_branch_id(principal, branch_id)
    conditions = [Sale.channel == SaleChannel.ONLINE, Sale.is_deleted.is_(False)]
    if effective_branch_id is not None:
        conditions.append(Sale.branch_id == effective_branch_id)
    if status is not None:
        conditions.append(Sale.status == status)
    if fulfillment_status is not None:
        conditions.append(Sale.fulfillment_status == fulfillment_status)

    total = db.scalar(select(func.count()).select_from(Sale).where(*conditions)) or 0
    rows = db.scalars(
        select(Sale)
        .where(*conditions)
        .order_by(Sale.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [_order_response(db, sale) for sale in rows], total


def get_order(
    db: Session, principal: AuthPrincipal, sale_id: UUID
) -> OnlineOrderResponse:
    return _order_response(db, _online_order_model(db, principal, sale_id))


def _open_till_session(
    db: Session, *, till_session_id: UUID, branch_id: UUID
) -> TillSession:
    session = db.scalar(
        select(TillSession)
        .join(Till, Till.id == TillSession.till_id)
        .where(
            TillSession.id == till_session_id,
            TillSession.status == TillSessionStatus.OPEN,
            TillSession.is_deleted.is_(False),
            Till.branch_id == branch_id,
            Till.is_active.is_(True),
            Till.is_deleted.is_(False),
        )
    )
    if session is None:
        raise ConflictError("payment requires an open till session at this branch")
    return session


def record_payment(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    payload: OnlineOrderPaymentCreate,
) -> OnlineOrderResponse:
    sale = _online_order_model(db, principal, sale_id, lock=True)
    if sale.status in {SaleStatus.CANCELLED, SaleStatus.VOIDED, SaleStatus.REFUNDED}:
        raise ConflictError("this online order cannot receive payment")
    if sale.status == SaleStatus.COMPLETED:
        raise ConflictError("completed online orders cannot receive more payment")
    if sale.fulfillment_status == FulfillmentStatus.CANCELLED:
        raise ConflictError("cancelled online orders cannot receive payment")
    if payload.method == PaymentMethod.STORE_CREDIT:
        raise ValidationError("store credit is not available yet")
    if payload.method == PaymentMethod.CASH and payload.till_session_id is None:
        raise ValidationError("cash online order payments require an open till session")
    till_session = (
        _open_till_session(
            db, till_session_id=payload.till_session_id, branch_id=sale.branch_id
        )
        if payload.till_session_id is not None
        else None
    )

    existing = db.scalar(
        select(Payment).where(Payment.idempotency_key == payload.idempotency_key)
    )
    if existing is not None:
        if existing.sale_id != sale.id:
            raise ConflictError("payment idempotency key is already in use")
        return _order_response(db, sale)
    if payload.provider_reference and db.scalar(
        select(Payment.id).where(
            Payment.provider_reference == payload.provider_reference,
            Payment.is_deleted.is_(False),
        )
    ):
        raise ConflictError("payment provider reference is already in use")

    amount = money(payload.amount)
    outstanding = money(sale.total_amount - sale.paid_amount)
    if amount > outstanding:
        raise ValidationError("payment exceeds the outstanding order amount")

    now = datetime.now(timezone.utc)
    payment = Payment(
        branch_id=sale.branch_id,
        sale_id=sale.id,
        till_session_id=till_session.id if till_session else None,
        direction=PaymentDirection.INCOMING,
        method=payload.method,
        status=PaymentStatus.COMPLETED,
        amount=amount,
        currency="KES",
        provider_reference=payload.provider_reference,
        payer_phone=payload.payer_phone,
        payer_name=payload.payer_name,
        payer_account_reference=payload.payer_account_reference,
        idempotency_key=payload.idempotency_key,
        paid_at=now,
        notes=payload.notes,
    )
    db.add(payment)
    sale.paid_amount = money(sale.paid_amount + payment.amount)
    if sale.paid_amount == sale.total_amount:
        sale.status = SaleStatus.PAID
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=sale.branch_id,
        action="online_order.payment_recorded",
        resource_type="sale",
        resource_id=sale.id,
        after={
            "amount": str(payment.amount),
            "paid_amount": str(sale.paid_amount),
            "status": sale.status.value,
        },
    )
    return _order_response(db, sale)


def _available_serialized_unit(
    db: Session,
    *,
    branch_id: UUID,
    variant_id: UUID,
    selected_unit_ids: set[UUID],
) -> SerializedUnit:
    conditions = [
        SerializedUnit.branch_id == branch_id,
        SerializedUnit.variant_id == variant_id,
        SerializedUnit.status == SerializedUnitStatus.AVAILABLE,
        SerializedUnit.is_deleted.is_(False),
    ]
    if selected_unit_ids:
        conditions.append(SerializedUnit.id.not_in(selected_unit_ids))
    unit = db.scalar(
        select(SerializedUnit)
        .where(*conditions)
        .order_by(SerializedUnit.received_at, SerializedUnit.created_at)
        .with_for_update()
    )
    if unit is None:
        raise ConflictError("no available serialized unit found for this order item")
    return unit


def _ensure_allocated(
    db: Session,
    sale: Sale,
    *,
    payload: OnlineOrderAllocate | None,
) -> None:
    if sale.status != SaleStatus.PAID:
        raise ConflictError("online order must be fully paid before allocation")
    if sale.fulfillment_status not in {
        FulfillmentStatus.UNFULFILLED,
        FulfillmentStatus.ALLOCATED,
        FulfillmentStatus.READY,
    }:
        raise ConflictError("online order cannot be allocated in its current state")

    items = _order_items(db, sale.id, lock=True)
    if not items:
        raise ConflictError("online order has no items")
    variants = {
        variant.id: variant
        for variant in db.scalars(
            select(ProductVariant).where(
                ProductVariant.id.in_({item.variant_id for item in items})
            )
        ).all()
    }
    provided_units = {}
    auto_assign = True
    if payload is not None:
        auto_assign = payload.auto_assign_serialized_units
        item_ids = {item.id for item in items}
        for row in payload.items:
            if row.sale_item_id not in item_ids:
                raise NotFoundError("allocation item does not belong to this order")
            if row.sale_item_id in provided_units:
                raise ConflictError("duplicate allocation item")
            provided_units[row.sale_item_id] = row.serialized_unit_id

    selected_unit_ids = {
        item.serialized_unit_id for item in items if item.serialized_unit_id is not None
    }
    for item in items:
        variant = variants.get(item.variant_id)
        if variant is None:
            raise NotFoundError("order item variant no longer exists")
        if variant.tracking_type == TrackingType.BULK:
            if item.serialized_unit_id is not None:
                raise ValidationError("bulk order items cannot reference a unit")
            continue
        if item.quantity != 1:
            raise ValidationError("serialized order items must be split into quantity-1 lines")

        requested_unit_id = provided_units.get(item.id)
        if requested_unit_id is None and item.serialized_unit_id is not None:
            continue
        if requested_unit_id is None:
            if not auto_assign:
                raise ValidationError("serialized order item requires a selected unit")
            unit = _available_serialized_unit(
                db,
                branch_id=sale.branch_id,
                variant_id=item.variant_id,
                selected_unit_ids={value for value in selected_unit_ids if value},
            )
        else:
            if requested_unit_id == item.serialized_unit_id:
                continue
            if requested_unit_id in selected_unit_ids:
                raise ConflictError("serialized unit is already allocated on this order")
            unit = db.scalar(
                select(SerializedUnit)
                .where(
                    SerializedUnit.id == requested_unit_id,
                    SerializedUnit.branch_id == sale.branch_id,
                    SerializedUnit.variant_id == item.variant_id,
                    SerializedUnit.is_deleted.is_(False),
                )
                .with_for_update()
            )
            if unit is None:
                raise NotFoundError("serialized unit not found at this branch")
            if unit.status != SerializedUnitStatus.AVAILABLE:
                raise ConflictError("serialized unit is not available")

        if item.serialized_unit_id is not None and item.serialized_unit_id != unit.id:
            previous_unit = db.get(SerializedUnit, item.serialized_unit_id)
            if previous_unit and previous_unit.status == SerializedUnitStatus.RESERVED:
                previous_unit.status = SerializedUnitStatus.AVAILABLE
            selected_unit_ids.discard(item.serialized_unit_id)
        unit.status = SerializedUnitStatus.RESERVED
        item.serialized_unit_id = unit.id
        item.unit_cost = unit.unit_cost
        selected_unit_ids.add(unit.id)

    sale.fulfillment_status = FulfillmentStatus.ALLOCATED


def allocate_order(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    payload: OnlineOrderAllocate,
) -> OnlineOrderResponse:
    sale = _online_order_model(db, principal, sale_id, lock=True)
    _ensure_allocated(db, sale, payload=payload)
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=sale.branch_id,
        action="online_order.allocated",
        resource_type="sale",
        resource_id=sale.id,
        after={"fulfillment_status": sale.fulfillment_status.value, "note": payload.note},
    )
    return _order_response(db, sale)


def mark_ready(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    payload: OnlineOrderNote,
) -> OnlineOrderResponse:
    sale = _online_order_model(db, principal, sale_id, lock=True)
    if sale.fulfillment_status == FulfillmentStatus.READY:
        return _order_response(db, sale)
    _ensure_allocated(db, sale, payload=None)
    sale.fulfillment_status = FulfillmentStatus.READY
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=sale.branch_id,
        action="online_order.ready",
        resource_type="sale",
        resource_id=sale.id,
        after={"fulfillment_status": sale.fulfillment_status.value, "note": payload.note},
    )
    return _order_response(db, sale)


def _sale_item_quantities_by_variant(items: list[SaleItem]) -> dict[UUID, int]:
    quantities: dict[UUID, int] = {}
    for item in items:
        quantities[item.variant_id] = quantities.get(item.variant_id, 0) + item.quantity
    return quantities


def _reservation_quantities_by_variant(
    reservations: list[StockReservation],
) -> dict[UUID, int]:
    quantities: dict[UUID, int] = {}
    for reservation in reservations:
        quantities[reservation.variant_id] = (
            quantities.get(reservation.variant_id, 0) + reservation.quantity
        )
    return quantities


def fulfill_order(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    payload: OnlineOrderNote,
) -> OnlineOrderResponse:
    sale = _online_order_model(db, principal, sale_id, lock=True)
    if sale.status == SaleStatus.COMPLETED and sale.fulfillment_status == FulfillmentStatus.FULFILLED:
        return _order_response(db, sale)
    if sale.status != SaleStatus.PAID:
        raise ConflictError("online order must be fully paid before fulfillment")
    if sale.fulfillment_status == FulfillmentStatus.CANCELLED:
        raise ConflictError("cancelled online orders cannot be fulfilled")

    _ensure_allocated(db, sale, payload=None)
    items = _order_items(db, sale.id, lock=True)
    reservations = _active_reservations(db, sale.id, lock=True)
    if not reservations:
        raise ConflictError("online order has no active stock reservation")

    requested = _sale_item_quantities_by_variant(items)
    reserved = _reservation_quantities_by_variant(reservations)
    for variant_id, quantity in requested.items():
        if reserved.get(variant_id, 0) < quantity:
            raise ConflictError("online order stock reservation is incomplete")

    variants = {
        variant.id: variant
        for variant in db.scalars(
            select(ProductVariant).where(ProductVariant.id.in_(set(requested)))
        ).all()
    }
    now = datetime.now(timezone.utc)
    for item in items:
        variant = variants.get(item.variant_id)
        if variant is None:
            raise NotFoundError("order item variant no longer exists")
        if variant.tracking_type == TrackingType.BULK:
            if item.serialized_unit_id is not None:
                raise ValidationError("bulk order items cannot reference a unit")
        else:
            if item.serialized_unit_id is None or item.quantity != 1:
                raise ValidationError("serialized order items require one selected unit")
            unit = db.scalar(
                select(SerializedUnit)
                .where(SerializedUnit.id == item.serialized_unit_id)
                .with_for_update()
            )
            if unit is None:
                raise NotFoundError("serialized unit not found")
            if unit.status not in {
                SerializedUnitStatus.RESERVED,
                SerializedUnitStatus.AVAILABLE,
            }:
                raise ConflictError("serialized unit cannot be fulfilled")
            unit.status = SerializedUnitStatus.SOLD

        db.add(
            StockMovement(
                branch_id=sale.branch_id,
                variant_id=item.variant_id,
                serialized_unit_id=item.serialized_unit_id,
                movement_type=StockMovementType.SALE,
                quantity_delta=-item.quantity,
                unit_cost=item.unit_cost,
                reference_type="online_order",
                reference_id=sale.id,
                idempotency_key=f"online-order:{sale.id}:item:{item.id}",
                performed_by_id=principal.user_id,
                note=payload.note,
            )
        )

    for reservation in reservations:
        balance = db.scalar(
            select(StockBalance)
            .where(
                StockBalance.branch_id == sale.branch_id,
                StockBalance.variant_id == reservation.variant_id,
                StockBalance.is_deleted.is_(False),
            )
            .with_for_update()
        )
        if (
            balance is None
            or balance.reserved_quantity < reservation.quantity
            or balance.quantity_on_hand < reservation.quantity
        ):
            raise ConflictError("stock reservation no longer matches branch stock")
        balance.reserved_quantity -= reservation.quantity
        balance.quantity_on_hand -= reservation.quantity
        reservation.status = "fulfilled"

    create_warranties_for_sale(db, sale, items, now)
    sale.status = SaleStatus.COMPLETED
    sale.fulfillment_status = FulfillmentStatus.FULFILLED
    sale.completed_at = now
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=sale.branch_id,
        action="online_order.fulfilled",
        resource_type="sale",
        resource_id=sale.id,
        after={"order_number": sale.invoice_number, "note": payload.note},
    )
    return _order_response(db, sale)


def cancel_order(
    db: Session,
    principal: AuthPrincipal,
    sale_id: UUID,
    payload: OnlineOrderNote,
) -> OnlineOrderResponse:
    sale = _online_order_model(db, principal, sale_id, lock=True)
    if sale.status == SaleStatus.CANCELLED:
        return _order_response(db, sale)
    if sale.status == SaleStatus.COMPLETED or sale.fulfillment_status == FulfillmentStatus.FULFILLED:
        raise ConflictError("fulfilled online orders cannot be cancelled here")
    if sale.paid_amount != Decimal("0.00"):
        raise ConflictError("paid online orders need a refund workflow before cancellation")

    for item in _order_items(db, sale.id, lock=True):
        if item.serialized_unit_id is None:
            continue
        unit = db.scalar(
            select(SerializedUnit)
            .where(SerializedUnit.id == item.serialized_unit_id)
            .with_for_update()
        )
        if unit is not None and unit.status == SerializedUnitStatus.RESERVED:
            unit.status = SerializedUnitStatus.AVAILABLE
        item.serialized_unit_id = None

    for reservation in _active_reservations(db, sale.id, lock=True):
        balance = db.scalar(
            select(StockBalance)
            .where(
                StockBalance.branch_id == sale.branch_id,
                StockBalance.variant_id == reservation.variant_id,
                StockBalance.is_deleted.is_(False),
            )
            .with_for_update()
        )
        if balance is None or balance.reserved_quantity < reservation.quantity:
            raise ConflictError("stock reservation no longer matches branch stock")
        balance.reserved_quantity -= reservation.quantity
        reservation.status = "released"

    sale.status = SaleStatus.CANCELLED
    sale.fulfillment_status = FulfillmentStatus.CANCELLED
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=sale.branch_id,
        action="online_order.cancelled",
        resource_type="sale",
        resource_id=sale.id,
        after={"order_number": sale.invoice_number, "note": payload.note},
    )
    return _order_response(db, sale)
