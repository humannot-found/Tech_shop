from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from backend.core.permissions import ADMIN, BRANCH_MANAGER
from backend.models.approvals import ApprovalRequest
from backend.models.enums import ApprovalStatus, SerializedUnitStatus, TrackingType
from backend.models.inventory import SerializedUnit, StockBalance
from backend.models.inventory_movement import StockMovement
from backend.models.products import Product, ProductVariant
from backend.schemas.approval_schemas import ApprovalDecision, ApprovalRequestResponse
from backend.schemas.inventory_schemas import (
    InventoryBalanceView,
    ReorderLevelUpdate,
    SerializedUnitView,
    StockAdjustmentCreate,
    StockMovementResponse,
)
from backend.schemas.stocktake_schemas import SerializedUnitReviewDecision
from backend.services import inventory
from backend.services.audit import record_audit
from backend.services.auth import AuthPrincipal
from backend.services.authorization import (
    AuthorizationError,
    enforce_branch_scope,
    enforce_permission,
)
from backend.services.exceptions import ConflictError, NotFoundError


def _balance_view(
    balance: StockBalance | None, variant: ProductVariant, product: Product, branch_id: UUID
) -> InventoryBalanceView:
    on_hand = balance.quantity_on_hand if balance else 0
    reserved = balance.reserved_quantity if balance else 0
    reorder_level = balance.reorder_level if balance else 0
    available = on_hand - reserved
    return InventoryBalanceView(
        stock_balance_id=balance.id if balance else None,
        branch_id=branch_id,
        product_id=product.id,
        product_name=product.name,
        variant_id=variant.id,
        variant_name=variant.name,
        sku=variant.sku,
        quantity_on_hand=on_hand,
        reserved_quantity=reserved,
        available_quantity=available,
        reorder_level=reorder_level,
        # An item this branch has never received is not "low", it is not stocked yet.
        is_low_stock=balance is not None and available <= reorder_level,
    )


def list_balances(
    db: Session,
    principal: AuthPrincipal,
    *,
    branch_id: UUID,
    page: int,
    page_size: int,
    query: str | None = None,
    low_stock_only: bool = False,
    include_unstocked: bool = False,
) -> tuple[list[InventoryBalanceView], int]:
    enforce_permission(principal, "inventory.view")
    enforce_branch_scope(principal, branch_id)
    conditions = [
        ProductVariant.is_deleted.is_(False),
        Product.is_deleted.is_(False),
    ]
    if query:
        search = f"%{query.strip()}%"
        conditions.append(
            or_(
                Product.name.ilike(search),
                ProductVariant.name.ilike(search),
                ProductVariant.sku.ilike(search),
            )
        )
    if low_stock_only:
        conditions.append(StockBalance.id.is_not(None))
        conditions.append(
            (StockBalance.quantity_on_hand - StockBalance.reserved_quantity)
            <= StockBalance.reorder_level
        )
    base = (
        select(StockBalance, ProductVariant, Product)
        .select_from(ProductVariant)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(
            StockBalance,
            and_(
                StockBalance.variant_id == ProductVariant.id,
                StockBalance.branch_id == branch_id,
                StockBalance.is_deleted.is_(False),
            ),
        )
        .where(*conditions)
    )
    if include_unstocked:
        base = base.where(
            or_(
                StockBalance.id.is_not(None),
                and_(ProductVariant.is_active.is_(True), Product.is_active.is_(True)),
            )
        )
    else:
        base = base.where(StockBalance.id.is_not(None))
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(Product.name, ProductVariant.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [
        _balance_view(balance, variant, product, branch_id)
        for balance, variant, product in rows
    ], total


def set_reorder_levels(
    db: Session, principal: AuthPrincipal, payload: ReorderLevelUpdate
) -> list[InventoryBalanceView]:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, payload.branch_id)
    variant_ids = [item.variant_id for item in payload.items]
    rows = db.execute(
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(
            ProductVariant.id.in_(variant_ids),
            ProductVariant.is_deleted.is_(False),
            Product.is_deleted.is_(False),
        )
    ).all()
    catalog = {variant.id: (variant, product) for variant, product in rows}
    if set(catalog) != set(variant_ids):
        raise NotFoundError("one or more product variants were not found")
    balances = {
        balance.variant_id: balance
        for balance in db.scalars(
            select(StockBalance)
            .where(
                StockBalance.branch_id == payload.branch_id,
                StockBalance.variant_id.in_(variant_ids),
                StockBalance.is_deleted.is_(False),
            )
            .with_for_update()
        ).all()
    }
    results = []
    for item in payload.items:
        variant, product = catalog[item.variant_id]
        balance = balances.get(item.variant_id)
        before = balance.reorder_level if balance else None
        if balance is None:
            balance = StockBalance(
                branch_id=payload.branch_id,
                variant_id=variant.id,
                quantity_on_hand=0,
                reserved_quantity=0,
                reorder_level=item.reorder_level,
                average_unit_cost=variant.cost_price,
            )
            db.add(balance)
        else:
            balance.reorder_level = item.reorder_level
        db.flush()
        if before != item.reorder_level:
            record_audit(
                db,
                actor_id=principal.user_id,
                branch_id=payload.branch_id,
                action="inventory.reorder_level_set",
                resource_type="stock_balance",
                resource_id=balance.id,
                before={"reorder_level": before},
                after={"reorder_level": item.reorder_level, "sku": variant.sku},
            )
        results.append(_balance_view(balance, variant, product, payload.branch_id))
    return results


def _serialized_unit_view(
    unit: SerializedUnit, variant: ProductVariant, product: Product
) -> SerializedUnitView:
    return SerializedUnitView(
        id=unit.id,
        branch_id=unit.branch_id,
        product_id=product.id,
        product_name=product.name,
        variant_id=variant.id,
        variant_name=variant.name,
        sku=variant.sku,
        serial_number=unit.serial_number,
        imei=unit.imei,
        status=unit.status,
        condition=unit.condition,
        received_at=unit.received_at,
    )


def list_serialized_units(
    db: Session,
    principal: AuthPrincipal,
    *,
    branch_id: UUID,
    page: int,
    page_size: int,
    query: str | None = None,
    status: SerializedUnitStatus | None = None,
) -> tuple[list[SerializedUnitView], int]:
    enforce_permission(principal, "inventory.view")
    enforce_branch_scope(principal, branch_id)
    conditions = [
        SerializedUnit.branch_id == branch_id,
        SerializedUnit.is_deleted.is_(False),
    ]
    if status is not None:
        conditions.append(SerializedUnit.status == status)
    if query:
        search = f"%{query.strip()}%"
        conditions.append(
            or_(
                SerializedUnit.serial_number.ilike(search),
                SerializedUnit.imei.ilike(search),
                ProductVariant.sku.ilike(search),
                Product.name.ilike(search),
            )
        )
    base = (
        select(SerializedUnit, ProductVariant, Product)
        .join(ProductVariant, ProductVariant.id == SerializedUnit.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(*conditions)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(Product.name, ProductVariant.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [
        _serialized_unit_view(unit, variant, product)
        for unit, variant, product in rows
    ], total


def list_movements(
    db: Session,
    principal: AuthPrincipal,
    *,
    branch_id: UUID,
    page: int,
    page_size: int,
    variant_id: UUID | None = None,
) -> tuple[list[StockMovementResponse], int]:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, branch_id)
    conditions = [
        StockMovement.branch_id == branch_id,
        StockMovement.is_deleted.is_(False),
    ]
    if variant_id is not None:
        conditions.append(StockMovement.variant_id == variant_id)
    total = (
        db.scalar(select(func.count()).select_from(StockMovement).where(*conditions))
        or 0
    )
    movements = db.scalars(
        select(StockMovement)
        .where(*conditions)
        .order_by(StockMovement.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return [StockMovementResponse.model_validate(item) for item in movements], total


def _get_variant(db: Session, variant_id: UUID) -> ProductVariant:
    variant = db.scalar(
        select(ProductVariant).where(
            ProductVariant.id == variant_id,
            ProductVariant.is_deleted.is_(False),
        )
    )
    if variant is None:
        raise NotFoundError("product variant not found")
    return variant


def request_adjustment(
    db: Session, principal: AuthPrincipal, payload: StockAdjustmentCreate
) -> ApprovalRequest:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, payload.branch_id)
    variant = _get_variant(db, payload.variant_id)
    if variant.tracking_type == TrackingType.BULK and payload.serialized_unit_id:
        raise ConflictError("bulk adjustments cannot reference serialized units")
    if variant.tracking_type != TrackingType.BULK and (
        payload.serialized_unit_id is None or abs(payload.quantity_delta) != 1
    ):
        raise ConflictError(
            "serialized adjustments require one unit and a quantity of 1 or -1"
        )
    request = ApprovalRequest(
        branch_id=payload.branch_id,
        action="inventory.adjust",
        resource_type="product_variant",
        resource_id=variant.id,
        requested_by_id=principal.user_id,
        status=ApprovalStatus.PENDING,
        reason=payload.reason,
        requested_changes={
            "variant_id": str(variant.id),
            "serialized_unit_id": (
                str(payload.serialized_unit_id) if payload.serialized_unit_id else None
            ),
            "quantity_delta": payload.quantity_delta,
        },
    )
    db.add(request)
    db.flush()
    return request


def list_adjustment_requests(
    db: Session, principal: AuthPrincipal, branch_id: UUID
) -> list[ApprovalRequestResponse]:
    enforce_permission(principal, "inventory.adjust")
    enforce_branch_scope(principal, branch_id)
    requests = db.scalars(
        select(ApprovalRequest)
        .where(
            ApprovalRequest.branch_id == branch_id,
            ApprovalRequest.action == "inventory.adjust",
            ApprovalRequest.is_deleted.is_(False),
        )
        .order_by(ApprovalRequest.created_at.desc())
    ).all()
    return [ApprovalRequestResponse.model_validate(item) for item in requests]


def decide_adjustment(
    db: Session,
    principal: AuthPrincipal,
    request_id: UUID,
    decision: ApprovalDecision,
) -> ApprovalRequestResponse:
    if principal.role_code not in {ADMIN, BRANCH_MANAGER}:
        raise AuthorizationError(
            "only an Admin or Branch Manager can review adjustments"
        )
    request = db.scalar(
        select(ApprovalRequest)
        .where(
            ApprovalRequest.id == request_id,
            ApprovalRequest.action == "inventory.adjust",
            ApprovalRequest.is_deleted.is_(False),
        )
        .with_for_update()
    )
    if request is None:
        raise NotFoundError("adjustment request not found")
    enforce_branch_scope(principal, request.branch_id)
    if request.status != ApprovalStatus.PENDING:
        raise ConflictError("adjustment request has already been reviewed")

    request.reviewed_by_id = principal.user_id
    request.decision_note = decision.decision_note
    if not decision.approved:
        request.status = ApprovalStatus.REJECTED
        db.flush()
        return ApprovalRequestResponse.model_validate(request)

    changes = request.requested_changes or {}
    variant = _get_variant(db, UUID(changes["variant_id"]))
    serialized_unit_id = (
        UUID(changes["serialized_unit_id"])
        if changes.get("serialized_unit_id")
        else None
    )
    inventory.apply_stock_adjustment(
        db,
        branch_id=request.branch_id,
        variant=variant,
        quantity_delta=int(changes["quantity_delta"]),
        performed_by_id=principal.user_id,
        reference_type="approval_request",
        reference_id=request.id,
        reason=request.reason,
        serialized_unit_id=serialized_unit_id,
    )
    request.status = ApprovalStatus.APPROVED
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=request.branch_id,
        action="inventory.adjustment_reviewed",
        resource_type="approval_request",
        resource_id=request.id,
        after={"status": request.status.value},
    )
    return ApprovalRequestResponse.model_validate(request)


def resolve_unit_review(
    db: Session,
    principal: AuthPrincipal,
    unit_id: UUID,
    payload: SerializedUnitReviewDecision,
) -> SerializedUnitView:
    """Resolves a unit a stock count could not find: back to available, or lost."""
    if principal.role_code not in {ADMIN, BRANCH_MANAGER}:
        raise AuthorizationError(
            "only an Admin or Branch Manager can resolve a flagged unit"
        )
    row = db.execute(
        select(SerializedUnit, ProductVariant, Product)
        .join(ProductVariant, ProductVariant.id == SerializedUnit.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(SerializedUnit.id == unit_id, SerializedUnit.is_deleted.is_(False))
        .with_for_update(of=SerializedUnit)
    ).first()
    if row is None:
        raise NotFoundError("serialized unit not found")
    unit, variant, product = row
    enforce_branch_scope(principal, unit.branch_id)
    inventory.resolve_unit_review(
        db,
        unit=unit,
        decision=payload.decision,
        performed_by_id=principal.user_id,
        reference_type="serialized_unit_review",
        reference_id=unit.id,
        reason=payload.notes or f"Marked {payload.decision} after stock count review",
    )
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=unit.branch_id,
        action=f"inventory.unit_review_{payload.decision}",
        resource_type="serialized_unit",
        resource_id=unit.id,
        after={"decision": payload.decision, "notes": payload.notes},
    )
    return _serialized_unit_view(unit, variant, product)
