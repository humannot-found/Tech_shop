from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.core.permissions import ADMIN, BRANCH_MANAGER
from backend.models.enums import SerializedUnitStatus, StockCountStatus, TrackingType
from backend.models.inventory import SerializedUnit, StockBalance
from backend.models.products import ProductVariant
from backend.models.stocktake import StockCount, StockCountItem, StockCountUnitScan
from backend.schemas.stocktake_schemas import (
    StockCountCreate,
    StockCountItemResponse,
    StockCountItemUpdate,
    StockCountResponse,
    StockCountScanCreate,
    StockCountScanResponse,
)
from backend.services import inventory
from backend.services.audit import record_audit
from backend.services.auth import AuthPrincipal
from backend.services.authorization import (
    AuthorizationError,
    enforce_branch_scope,
    enforce_permission,
)
from backend.services.exceptions import ConflictError, NotFoundError, ValidationError


def _count_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"SC-{today}-{uuid4().hex[:8].upper()}"


def _get_count(
    db: Session, principal: AuthPrincipal, count_id: UUID, *, lock: bool = False
) -> StockCount:
    statement = select(StockCount).where(
        StockCount.id == count_id,
        StockCount.is_deleted.is_(False),
    )
    if lock:
        statement = statement.with_for_update()
    count = db.scalar(statement)
    if count is None:
        raise NotFoundError("stock count not found")
    enforce_branch_scope(principal, count.branch_id)
    return count


def _get_item(
    db: Session, count: StockCount, item_id: UUID, *, lock: bool = False
) -> StockCountItem:
    statement = select(StockCountItem).where(
        StockCountItem.id == item_id,
        StockCountItem.stock_count_id == count.id,
        StockCountItem.is_deleted.is_(False),
    )
    if lock:
        statement = statement.with_for_update()
    item = db.scalar(statement)
    if item is None:
        raise NotFoundError("stock count item not found")
    return item


def _require_serialized_variant(db: Session, item: StockCountItem) -> ProductVariant:
    variant = db.get(ProductVariant, item.variant_id)
    if variant is None:
        raise NotFoundError("product variant not found")
    if variant.tracking_type == TrackingType.BULK:
        raise ValidationError("bulk items are counted by quantity, not by scanning")
    return variant


def _recompute_serialized_item(db: Session, count: StockCount, item: StockCountItem) -> None:
    """Refreshes an IMEI/serial item's numbers against current system stock.

    Grounding this in the current state (not a snapshot taken when counting
    started) means a unit that legitimately sold or transferred out mid-count is
    simply no longer expected, rather than being treated as missing.
    """
    expected = (
        db.scalar(
            select(func.count())
            .select_from(SerializedUnit)
            .where(
                SerializedUnit.branch_id == count.branch_id,
                SerializedUnit.variant_id == item.variant_id,
                SerializedUnit.status.in_(
                    [SerializedUnitStatus.AVAILABLE, SerializedUnitStatus.RESERVED]
                ),
                SerializedUnit.is_deleted.is_(False),
            )
        )
        or 0
    )
    scanned = (
        db.scalar(
            select(func.count())
            .select_from(StockCountUnitScan)
            .where(
                StockCountUnitScan.stock_count_item_id == item.id,
                StockCountUnitScan.is_deleted.is_(False),
            )
        )
        or 0
    )
    item.expected_quantity = expected
    item.counted_quantity = scanned
    item.variance = scanned - expected


def _item_response(
    db: Session, item: StockCountItem, variant: ProductVariant | None
) -> StockCountItemResponse:
    scans = db.scalars(
        select(StockCountUnitScan)
        .where(
            StockCountUnitScan.stock_count_item_id == item.id,
            StockCountUnitScan.is_deleted.is_(False),
        )
        .order_by(StockCountUnitScan.created_at)
    ).all()
    scan_responses: list[StockCountScanResponse] = []
    unexpected = 0
    if scans:
        units = {
            unit.id: unit
            for unit in db.scalars(
                select(SerializedUnit).where(
                    SerializedUnit.id.in_([scan.serialized_unit_id for scan in scans])
                )
            ).all()
        }
        for scan in scans:
            unit = units.get(scan.serialized_unit_id)
            # A scanned unit the system no longer lists as available/reserved (it
            # shows sold, damaged, already under review, ...) is a mismatch worth a
            # manager's attention, but scanning it does not change its status.
            if unit is None or unit.status not in {
                SerializedUnitStatus.AVAILABLE,
                SerializedUnitStatus.RESERVED,
            }:
                unexpected += 1
            scan_responses.append(
                StockCountScanResponse.model_validate(scan).model_copy(
                    update={
                        "unit_identifier": (
                            (unit.imei or unit.serial_number) if unit else "unknown unit"
                        )
                    }
                )
            )
    return StockCountItemResponse.model_validate(item).model_copy(
        update={
            "tracking_type": variant.tracking_type if variant else TrackingType.BULK,
            "scans": scan_responses,
            "unexpected_scan_count": unexpected,
        }
    )


def _count_response(db: Session, count: StockCount) -> StockCountResponse:
    items = db.scalars(
        select(StockCountItem)
        .where(
            StockCountItem.stock_count_id == count.id,
            StockCountItem.is_deleted.is_(False),
        )
        .order_by(StockCountItem.created_at)
    ).all()
    variants = {
        variant.id: variant
        for variant in db.scalars(
            select(ProductVariant).where(
                ProductVariant.id.in_([item.variant_id for item in items])
            )
        ).all()
    }
    return StockCountResponse.model_validate(count).model_copy(
        update={
            "items": [
                _item_response(db, item, variants.get(item.variant_id))
                for item in items
            ]
        }
    )


def list_stock_counts(
    db: Session, principal: AuthPrincipal, branch_id: UUID
) -> list[StockCountResponse]:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, branch_id)
    counts = db.scalars(
        select(StockCount)
        .where(
            StockCount.branch_id == branch_id,
            StockCount.is_deleted.is_(False),
        )
        .order_by(StockCount.created_at.desc())
    ).all()
    return [_count_response(db, count) for count in counts]


def create_stock_count(
    db: Session, principal: AuthPrincipal, payload: StockCountCreate
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, payload.branch_id)
    open_count = db.scalar(
        select(StockCount.id).where(
            StockCount.branch_id == payload.branch_id,
            StockCount.status.in_([StockCountStatus.DRAFT, StockCountStatus.SUBMITTED]),
            StockCount.is_deleted.is_(False),
        )
    )
    if open_count is not None:
        raise ConflictError("this branch already has an open stock count")

    balance_rows = db.scalars(
        select(StockBalance).where(
            StockBalance.branch_id == payload.branch_id,
            StockBalance.is_deleted.is_(False),
        )
    ).all()
    expected_by_variant = {
        item.variant_id: item.quantity_on_hand for item in balance_rows
    }
    if payload.variant_ids is None:
        variant_ids = list(expected_by_variant)
    else:
        variant_ids = list(dict.fromkeys(payload.variant_ids))
        found_ids = set(
            db.scalars(
                select(ProductVariant.id).where(
                    ProductVariant.id.in_(variant_ids),
                    ProductVariant.is_deleted.is_(False),
                )
            ).all()
        )
        if found_ids != set(variant_ids):
            raise NotFoundError("one or more product variants were not found")
    if not variant_ids:
        raise ValidationError("stock count requires at least one product variant")

    count = StockCount(
        branch_id=payload.branch_id,
        count_number=_count_number(),
        status=StockCountStatus.DRAFT,
        created_by_id=principal.user_id,
        notes=payload.notes,
    )
    db.add(count)
    db.flush()
    for variant_id in variant_ids:
        db.add(
            StockCountItem(
                stock_count_id=count.id,
                variant_id=variant_id,
                expected_quantity=expected_by_variant.get(variant_id, 0),
            )
        )
    db.flush()
    return _count_response(db, count)


def update_count_item(
    db: Session,
    principal: AuthPrincipal,
    count_id: UUID,
    item_id: UUID,
    payload: StockCountItemUpdate,
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.DRAFT:
        raise ConflictError("only draft stock counts can be edited")
    item = _get_item(db, count, item_id)
    variant = db.get(ProductVariant, item.variant_id)
    if variant is not None and variant.tracking_type != TrackingType.BULK:
        raise ValidationError(
            "IMEI/serial items are counted by scanning units, not by quantity"
        )
    # Sales, transfers and receipts keep happening while a count is under way, so
    # compare the physical count with what the system holds right now rather than
    # with the quantity from when the count was created. Otherwise anything sold
    # after that moment would show up as missing stock and be deducted twice.
    on_hand = db.scalar(
        select(StockBalance.quantity_on_hand).where(
            StockBalance.branch_id == count.branch_id,
            StockBalance.variant_id == item.variant_id,
            StockBalance.is_deleted.is_(False),
        )
    )
    item.expected_quantity = on_hand or 0
    item.counted_quantity = payload.counted_quantity
    item.variance = payload.counted_quantity - item.expected_quantity
    item.notes = payload.notes
    db.flush()
    return _count_response(db, count)


def scan_stock_count_item(
    db: Session,
    principal: AuthPrincipal,
    count_id: UUID,
    item_id: UUID,
    payload: StockCountScanCreate,
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.DRAFT:
        raise ConflictError("only draft stock counts can be edited")
    item = _get_item(db, count, item_id)
    _require_serialized_variant(db, item)
    identifier = payload.identifier.strip()
    unit = db.scalar(
        select(SerializedUnit).where(
            SerializedUnit.branch_id == count.branch_id,
            SerializedUnit.variant_id == item.variant_id,
            SerializedUnit.is_deleted.is_(False),
            or_(
                SerializedUnit.imei == identifier,
                func.lower(SerializedUnit.serial_number) == identifier.lower(),
            ),
        )
    )
    if unit is None:
        raise NotFoundError(
            "no IMEI/serial for this item was found at this branch"
        )
    duplicate = db.scalar(
        select(StockCountUnitScan.id).where(
            StockCountUnitScan.stock_count_item_id == item.id,
            StockCountUnitScan.serialized_unit_id == unit.id,
            StockCountUnitScan.is_deleted.is_(False),
        )
    )
    if duplicate is not None:
        raise ConflictError("this unit has already been scanned for this item")
    db.add(
        StockCountUnitScan(
            stock_count_item_id=item.id,
            serialized_unit_id=unit.id,
            scanned_by_id=principal.user_id,
        )
    )
    db.flush()
    _recompute_serialized_item(db, count, item)
    db.flush()
    return _count_response(db, count)


def remove_stock_count_scan(
    db: Session,
    principal: AuthPrincipal,
    count_id: UUID,
    item_id: UUID,
    scan_id: UUID,
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.DRAFT:
        raise ConflictError("only draft stock counts can be edited")
    item = _get_item(db, count, item_id)
    scan = db.scalar(
        select(StockCountUnitScan).where(
            StockCountUnitScan.id == scan_id,
            StockCountUnitScan.stock_count_item_id == item.id,
            StockCountUnitScan.is_deleted.is_(False),
        )
    )
    if scan is None:
        raise NotFoundError("scan not found")
    # Hard-deleted, not soft-deleted: a scan is a working note during the count,
    # not an audit record, and the unique constraint would otherwise block
    # re-scanning the same unit after undoing a mis-scan.
    db.delete(scan)
    db.flush()
    _recompute_serialized_item(db, count, item)
    db.flush()
    return _count_response(db, count)


def confirm_serialized_count_item(
    db: Session,
    principal: AuthPrincipal,
    count_id: UUID,
    item_id: UUID,
) -> StockCountResponse:
    """Marks an IMEI/serial item as counted, including when nothing was scanned."""
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.DRAFT:
        raise ConflictError("only draft stock counts can be edited")
    item = _get_item(db, count, item_id)
    _require_serialized_variant(db, item)
    _recompute_serialized_item(db, count, item)
    db.flush()
    return _count_response(db, count)


def submit_stock_count(
    db: Session, principal: AuthPrincipal, count_id: UUID
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.DRAFT:
        raise ConflictError("only draft stock counts can be submitted")
    missing = db.scalar(
        select(StockCountItem.id)
        .where(
            StockCountItem.stock_count_id == count.id,
            StockCountItem.counted_quantity.is_(None),
            StockCountItem.is_deleted.is_(False),
        )
        .limit(1)
    )
    if missing is not None:
        raise ValidationError(
            "every stock count item must be counted before submission"
        )
    count.status = StockCountStatus.SUBMITTED
    count.submitted_at = datetime.now(timezone.utc)
    db.flush()
    return _count_response(db, count)


def approve_stock_count(
    db: Session, principal: AuthPrincipal, count_id: UUID
) -> StockCountResponse:
    if principal.role_code not in {ADMIN, BRANCH_MANAGER}:
        raise AuthorizationError(
            "only an Admin or Branch Manager can approve stock counts"
        )
    count = _get_count(db, principal, count_id, lock=True)
    if count.status != StockCountStatus.SUBMITTED:
        raise ConflictError("only submitted stock counts can be approved")
    items = db.scalars(
        select(StockCountItem)
        .where(
            StockCountItem.stock_count_id == count.id,
            StockCountItem.is_deleted.is_(False),
        )
        .with_for_update()
    ).all()
    variants = {
        variant.id: variant
        for variant in db.scalars(
            select(ProductVariant).where(
                ProductVariant.id.in_([item.variant_id for item in items])
            )
        ).all()
    }
    now = datetime.now(timezone.utc)
    for item in items:
        variant = variants[item.variant_id]
        if variant.tracking_type == TrackingType.BULK:
            variance = item.variance or 0
            if variance:
                inventory.apply_stock_adjustment(
                    db,
                    branch_id=count.branch_id,
                    variant=variant,
                    quantity_delta=variance,
                    performed_by_id=principal.user_id,
                    reference_type="stock_count",
                    reference_id=count.id,
                    reason=f"Stock count {count.count_number}",
                )
        else:
            scanned_ids = {
                scan.serialized_unit_id
                for scan in db.scalars(
                    select(StockCountUnitScan).where(
                        StockCountUnitScan.stock_count_item_id == item.id,
                        StockCountUnitScan.is_deleted.is_(False),
                    )
                ).all()
            }
            conditions = [
                SerializedUnit.branch_id == count.branch_id,
                SerializedUnit.variant_id == item.variant_id,
                SerializedUnit.status.in_(
                    [SerializedUnitStatus.AVAILABLE, SerializedUnitStatus.RESERVED]
                ),
                SerializedUnit.is_deleted.is_(False),
            ]
            if scanned_ids:
                conditions.append(SerializedUnit.id.notin_(scanned_ids))
            # Units still expected but never scanned: not lost outright, only
            # flagged for a manager to resolve as found or lost.
            for unit in db.scalars(
                select(SerializedUnit).where(*conditions).with_for_update()
            ).all():
                inventory.mark_unit_under_review(
                    db,
                    unit=unit,
                    performed_by_id=principal.user_id,
                    reference_type="stock_count",
                    reference_id=count.id,
                    reason=f"Not found during stock count {count.count_number}",
                )
            # item.expected_quantity/counted_quantity/variance are left as last
            # confirmed before approval, as the historical record of what the
            # count found — same as a bulk item keeps its recorded variance.
        balance = db.scalar(
            select(StockBalance).where(
                StockBalance.branch_id == count.branch_id,
                StockBalance.variant_id == item.variant_id,
            )
        )
        if balance is not None:
            balance.last_stock_take_at = now
    count.status = StockCountStatus.APPROVED
    count.approved_by_id = principal.user_id
    count.approved_at = now
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=count.branch_id,
        action="inventory.stock_count_approved",
        resource_type="stock_count",
        resource_id=count.id,
        after={"status": count.status.value},
    )
    return _count_response(db, count)


def cancel_stock_count(
    db: Session, principal: AuthPrincipal, count_id: UUID
) -> StockCountResponse:
    enforce_permission(principal, "inventory.adjust")
    count = _get_count(db, principal, count_id, lock=True)
    if count.status not in {StockCountStatus.DRAFT, StockCountStatus.SUBMITTED}:
        raise ConflictError("this stock count can no longer be cancelled")
    count.status = StockCountStatus.CANCELLED
    db.flush()
    return _count_response(db, count)
