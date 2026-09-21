from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.core.permissions import ADMIN, BRANCH_MANAGER
from backend.models.enums import (
    CashMovementKind,
    PaymentDirection,
    SaleStatus,
    PaymentMethod,
    PaymentStatus,
    TillSessionStatus,
)
from backend.models.payments import Payment
from backend.models.branch import Branch
from backend.models.sales import (
    Sale,
    SaleItem,
    SaleReturn,
    Till,
    TillCashMovement,
    TillSession,
)
from backend.models.users import User
from backend.schemas.sales_schemas import (
    TillCashMovementCreate,
    TillCashMovementResponse,
    TillCreate,
    ShiftMovementLine,
    ShiftPaymentLine,
    TillDrawerSummary,
    TillShiftReport,
    TillSessionClose,
    TillSessionOpen,
    TillUpdate,
)
from backend.services.audit import record_audit
from backend.services.auth import AuthPrincipal
from backend.services.authorization import (
    AuthorizationError,
    enforce_branch_scope,
    enforce_permission,
)
from backend.services.exceptions import ConflictError, NotFoundError, ValidationError


def _require_till_manager(principal: AuthPrincipal) -> None:
    enforce_permission(principal, "tills.manage")
    if principal.role_code not in {ADMIN, BRANCH_MANAGER}:
        raise AuthorizationError("only an Admin or Branch Manager can configure tills")


def list_tills(
    db: Session,
    principal: AuthPrincipal,
    branch_id: UUID,
    *,
    include_inactive: bool = False
) -> list[Till]:
    enforce_permission(principal, "sales.process")
    enforce_branch_scope(principal, branch_id)
    conditions = [Till.branch_id == branch_id, Till.is_deleted.is_(False)]
    if not include_inactive:
        conditions.append(Till.is_active.is_(True))
    return list(db.scalars(select(Till).where(*conditions).order_by(Till.name)).all())


def create_till(db: Session, principal: AuthPrincipal, payload: TillCreate) -> Till:
    _require_till_manager(principal)
    enforce_branch_scope(principal, payload.branch_id)
    code = payload.code.strip().upper()
    duplicate = db.scalar(
        select(Till.id).where(
            or_(
                func.lower(Till.code) == code.lower(),
                (
                    (Till.branch_id == payload.branch_id)
                    & (func.lower(Till.name) == payload.name.strip().lower())
                ),
            ),
            Till.is_deleted.is_(False),
        )
    )
    if duplicate is not None:
        raise ConflictError("till name or code is already in use")
    till = Till(
        branch_id=payload.branch_id,
        name=payload.name.strip(),
        code=code,
        is_active=True,
    )
    db.add(till)
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=till.branch_id,
        action="till.created",
        resource_type="till",
        resource_id=till.id,
        after={"name": till.name, "code": till.code},
    )
    return till


def update_till(
    db: Session,
    principal: AuthPrincipal,
    till_id: UUID,
    payload: TillUpdate,
) -> Till:
    _require_till_manager(principal)
    if not payload.model_fields_set:
        raise ValidationError("at least one field is required")
    till = db.scalar(select(Till).where(Till.id == till_id, Till.is_deleted.is_(False)))
    if till is None:
        raise NotFoundError("till not found")
    enforce_branch_scope(principal, till.branch_id)
    if payload.name is not None:
        duplicate = db.scalar(
            select(Till.id).where(
                Till.branch_id == till.branch_id,
                func.lower(Till.name) == payload.name.strip().lower(),
                Till.id != till.id,
                Till.is_deleted.is_(False),
            )
        )
        if duplicate is not None:
            raise ConflictError("till name is already in use at this branch")
        till.name = payload.name.strip()
    if payload.is_active is not None:
        if not payload.is_active:
            open_session = db.scalar(
                select(TillSession.id).where(
                    TillSession.till_id == till.id,
                    TillSession.status == TillSessionStatus.OPEN,
                    TillSession.is_deleted.is_(False),
                )
            )
            if open_session is not None:
                raise ConflictError("a till with an open session cannot be deactivated")
        till.is_active = payload.is_active
    db.flush()
    return till


def get_current_session(db: Session, principal: AuthPrincipal) -> TillSession:
    enforce_permission(principal, "tills.own.view")
    session = db.scalar(
        select(TillSession).where(
            TillSession.cashier_id == principal.user_id,
            TillSession.status == TillSessionStatus.OPEN,
            TillSession.is_deleted.is_(False),
        )
    )
    if session is None:
        raise NotFoundError("no open till session")
    return session


def open_session(
    db: Session, principal: AuthPrincipal, payload: TillSessionOpen
) -> TillSession:
    enforce_permission(principal, "sales.process")
    till = db.scalar(
        select(Till)
        .where(Till.id == payload.till_id, Till.is_deleted.is_(False))
        .with_for_update()
    )
    if till is None or not till.is_active:
        raise NotFoundError("active till not found")
    enforce_branch_scope(principal, till.branch_id)
    open_session_id = db.scalar(
        select(TillSession.id).where(
            or_(
                TillSession.till_id == till.id,
                TillSession.cashier_id == principal.user_id,
            ),
            TillSession.status == TillSessionStatus.OPEN,
            TillSession.is_deleted.is_(False),
        )
    )
    if open_session_id is not None:
        raise ConflictError("the cashier or till already has an open session")
    session = TillSession(
        till_id=till.id,
        cashier_id=principal.user_id,
        status=TillSessionStatus.OPEN,
        opened_at=datetime.now(timezone.utc),
        opening_float=payload.opening_float,
    )
    db.add(session)
    db.flush()
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=till.branch_id,
        action="till.session_opened",
        resource_type="till_session",
        resource_id=session.id,
        after={"opening_float": str(session.opening_float)},
    )
    return session


def _cash_totals(db: Session, session: TillSession) -> dict[str, Decimal]:
    zero = Decimal("0.00")
    cash_sales = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), zero)).where(
            Payment.till_session_id == session.id,
            Payment.method == PaymentMethod.CASH,
            Payment.direction == PaymentDirection.INCOMING,
            Payment.status == PaymentStatus.COMPLETED,
            Payment.is_deleted.is_(False),
        )
    ) or zero
    cash_refunds = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), zero)).where(
            Payment.till_session_id == session.id,
            Payment.method == PaymentMethod.CASH,
            Payment.direction == PaymentDirection.OUTGOING,
            Payment.status == PaymentStatus.COMPLETED,
            Payment.is_deleted.is_(False),
        )
    ) or zero
    movements = dict(
        db.execute(
            select(
                TillCashMovement.kind,
                func.coalesce(func.sum(TillCashMovement.amount), zero),
            )
            .where(
                TillCashMovement.till_session_id == session.id,
                TillCashMovement.is_deleted.is_(False),
            )
            .group_by(TillCashMovement.kind)
        ).all()
    )
    cash_in = movements.get(CashMovementKind.CASH_IN, zero)
    paid_out = movements.get(CashMovementKind.PAID_OUT, zero)
    cash_drop = movements.get(CashMovementKind.CASH_DROP, zero)
    return {
        "cash_sales": cash_sales,
        "cash_refunds": cash_refunds,
        "cash_in": cash_in,
        "paid_out": paid_out,
        "cash_drop": cash_drop,
        "expected_cash": session.opening_float
        + cash_sales
        - cash_refunds
        + cash_in
        - paid_out
        - cash_drop,
    }


def _get_session_for_view(
    db: Session, principal: AuthPrincipal, session_id: UUID
) -> TillSession:
    session = db.scalar(
        select(TillSession).where(
            TillSession.id == session_id, TillSession.is_deleted.is_(False)
        )
    )
    if session is None:
        raise NotFoundError("till session not found")
    if session.cashier_id == principal.user_id:
        enforce_permission(principal, "sales.process")
        return session
    enforce_permission(principal, "tills.manage")
    till = db.get(Till, session.till_id)
    if till is None:
        raise NotFoundError("till not found")
    enforce_branch_scope(principal, till.branch_id)
    return session


def drawer_summary(
    db: Session, principal: AuthPrincipal, session_id: UUID
) -> TillDrawerSummary:
    session = _get_session_for_view(db, principal, session_id)
    totals = _cash_totals(db, session)
    return TillDrawerSummary(
        till_session_id=session.id, opening_float=session.opening_float, **totals
    )


def shift_report(
    db: Session, principal: AuthPrincipal, session_id: UUID
) -> TillShiftReport:
    session = _get_session_for_view(db, principal, session_id)
    till = db.get(Till, session.till_id)
    branch = db.get(Branch, till.branch_id) if till else None
    cashier = db.get(User, session.cashier_id)
    zero = Decimal("0.00")

    sale_row = db.execute(
        select(
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.subtotal), zero),
            func.coalesce(func.sum(Sale.discount_amount), zero),
            func.coalesce(func.sum(Sale.total_amount), zero),
        ).where(
            Sale.till_session_id == session.id,
            Sale.status == SaleStatus.COMPLETED,
            Sale.is_deleted.is_(False),
        )
    ).one()
    voided_count = db.scalar(
        select(func.count(Sale.id)).where(
            Sale.till_session_id == session.id,
            Sale.status == SaleStatus.VOIDED,
            Sale.is_deleted.is_(False),
        )
    ) or 0
    items_sold = db.scalar(
        select(func.coalesce(func.sum(SaleItem.quantity), 0))
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(
            Sale.till_session_id == session.id,
            Sale.status == SaleStatus.COMPLETED,
            Sale.is_deleted.is_(False),
            SaleItem.is_deleted.is_(False),
        )
    ) or 0

    payment_rows = db.execute(
        select(Payment.method, Payment.direction, func.sum(Payment.amount))
        .where(
            Payment.till_session_id == session.id,
            Payment.status == PaymentStatus.COMPLETED,
            Payment.is_deleted.is_(False),
        )
        .group_by(Payment.method, Payment.direction)
    ).all()
    by_method: dict[str, dict[str, Decimal]] = {}
    for method, direction, total in payment_rows:
        line = by_method.setdefault(
            method.value, {"received": zero, "refunded": zero}
        )
        key = "received" if direction == PaymentDirection.INCOMING else "refunded"
        line[key] += total or zero
    payments = [
        ShiftPaymentLine(
            method=method,
            received=values["received"],
            refunded=values["refunded"],
            net=values["received"] - values["refunded"],
        )
        for method, values in sorted(by_method.items())
    ]
    refunds_total = sum((value["refunded"] for value in by_method.values()), zero)
    repair_payments = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), zero)).where(
            Payment.till_session_id == session.id,
            Payment.repair_ticket_id.is_not(None),
            Payment.direction == PaymentDirection.INCOMING,
            Payment.status == PaymentStatus.COMPLETED,
            Payment.is_deleted.is_(False),
        )
    ) or zero
    return_count = db.scalar(
        select(func.count(SaleReturn.id)).where(
            SaleReturn.till_session_id == session.id,
            SaleReturn.status == "approved",
            SaleReturn.is_deleted.is_(False),
        )
    ) or 0

    cash = _cash_totals(db, session)
    movements = db.scalars(
        select(TillCashMovement)
        .where(
            TillCashMovement.till_session_id == session.id,
            TillCashMovement.is_deleted.is_(False),
        )
        .order_by(TillCashMovement.created_at)
    ).all()

    closed = session.status == TillSessionStatus.CLOSED
    is_manager = principal.role_code == ADMIN or "tills.manage" in principal.permissions
    show_expected = closed or is_manager
    expected = (session.expected_cash if closed else cash["expected_cash"]) if show_expected else None
    variance = (
        session.closing_cash - session.expected_cash
        if closed and session.closing_cash is not None and session.expected_cash is not None
        else None
    )
    return TillShiftReport(
        till_session_id=session.id,
        till_name=till.name if till else "",
        till_code=till.code if till else "",
        branch_name=branch.name if branch else "",
        cashier_name=cashier.full_name if cashier else "",
        status=session.status,
        opened_at=session.opened_at,
        closed_at=session.closed_at,
        sale_count=sale_row[0],
        voided_count=voided_count,
        items_sold=int(items_sold),
        gross_sales=sale_row[1],
        discounts=sale_row[2],
        net_sales=sale_row[3],
        repair_payments=repair_payments,
        return_count=return_count,
        refunds_total=refunds_total,
        payments=payments,
        opening_float=session.opening_float,
        cash_sales=cash["cash_sales"],
        cash_refunds=cash["cash_refunds"],
        cash_in=cash["cash_in"],
        paid_out=cash["paid_out"],
        cash_drop=cash["cash_drop"],
        expected_cash=expected,
        closing_cash=session.closing_cash,
        variance=variance,
        movements=[
            ShiftMovementLine(
                kind=item.kind,
                amount=item.amount,
                reason=item.reason,
                created_at=item.created_at,
            )
            for item in movements
        ],
    )


def list_cash_movements(
    db: Session, principal: AuthPrincipal, session_id: UUID
) -> list[TillCashMovementResponse]:
    session = _get_session_for_view(db, principal, session_id)
    rows = db.scalars(
        select(TillCashMovement)
        .where(
            TillCashMovement.till_session_id == session.id,
            TillCashMovement.is_deleted.is_(False),
        )
        .order_by(TillCashMovement.created_at.desc())
    ).all()
    return [TillCashMovementResponse.model_validate(row) for row in rows]


def record_cash_movement(
    db: Session,
    principal: AuthPrincipal,
    session_id: UUID,
    payload: TillCashMovementCreate,
) -> TillCashMovementResponse:
    enforce_permission(principal, "sales.process")
    session = db.scalar(
        select(TillSession)
        .where(TillSession.id == session_id, TillSession.is_deleted.is_(False))
        .with_for_update()
    )
    if session is None:
        raise NotFoundError("till session not found")
    if session.cashier_id != principal.user_id:
        raise AuthorizationError("cashiers can only record cash for their own till")
    if session.status != TillSessionStatus.OPEN:
        raise ConflictError("till session is already closed")
    amount = payload.amount.quantize(Decimal("0.01"))
    if payload.kind != CashMovementKind.CASH_IN:
        in_drawer = _cash_totals(db, session)["expected_cash"]
        if amount > in_drawer:
            raise ValidationError(
                f"only {in_drawer} is in the till, so {amount} cannot be taken out"
            )
    movement = TillCashMovement(
        till_session_id=session.id,
        kind=payload.kind,
        amount=amount,
        reason=payload.reason.strip(),
        created_by_id=principal.user_id,
    )
    db.add(movement)
    db.flush()
    till = db.get(Till, session.till_id)
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=till.branch_id if till else principal.branch_id,
        action=f"till.{payload.kind.value}",
        resource_type="till_session",
        resource_id=session.id,
        after={"amount": str(amount), "reason": movement.reason},
    )
    return TillCashMovementResponse.model_validate(movement)


def close_session(
    db: Session,
    principal: AuthPrincipal,
    session_id: UUID,
    payload: TillSessionClose,
) -> TillSession:
    enforce_permission(principal, "sales.process")
    session = db.scalar(
        select(TillSession)
        .where(TillSession.id == session_id, TillSession.is_deleted.is_(False))
        .with_for_update()
    )
    if session is None:
        raise NotFoundError("till session not found")
    if session.cashier_id != principal.user_id:
        raise AuthorizationError("cashiers can only close their own till session")
    if session.status != TillSessionStatus.OPEN:
        raise ConflictError("till session is already closed")
    session.expected_cash = _cash_totals(db, session)["expected_cash"]
    session.closing_cash = payload.closing_cash
    session.status = TillSessionStatus.CLOSED
    session.closed_at = datetime.now(timezone.utc)
    db.flush()
    till = db.get(Till, session.till_id)
    record_audit(
        db,
        actor_id=principal.user_id,
        branch_id=till.branch_id if till else principal.branch_id,
        action="till.session_closed",
        resource_type="till_session",
        resource_id=session.id,
        after={
            "expected_cash": str(session.expected_cash),
            "closing_cash": str(session.closing_cash),
            "variance": str(session.closing_cash - session.expected_cash),
        },
    )
    return session
