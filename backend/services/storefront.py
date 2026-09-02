from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from backend.models.branch import Branch
from backend.models.brand import Brand
from backend.models.customer import Customer
from backend.models.enums import (
    BranchStatus,
    FulfillmentStatus,
    SaleChannel,
    SaleStatus,
    TrackingType,
)
from backend.models.inventory import StockBalance, StockReservation
from backend.models.products import Category, Product, ProductImage, ProductVariant
from backend.models.sales import Sale, SaleItem
from backend.schemas.storefront_schemas import (
    StorefrontBrandResponse,
    StorefrontCategoryResponse,
    StorefrontCustomerSummary,
    StorefrontOrderCreate,
    StorefrontOrderItemResponse,
    StorefrontOrderResponse,
    StorefrontProductImageResponse,
    StorefrontProductResponse,
    StorefrontVariantResponse,
)
from backend.services.audit import record_audit
from backend.services.exceptions import ConflictError, NotFoundError, ValidationError
from backend.services.sales import money

ORDER_RESERVATION_HOURS = 24


def _order_number() -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"ORD-{today}-{uuid4().hex[:8].upper()}"


def _active_variant_product_ids():
    return select(ProductVariant.product_id).where(
        ProductVariant.is_deleted.is_(False),
        ProductVariant.is_active.is_(True),
    )


def _published_product_conditions() -> list:
    return [
        Product.is_deleted.is_(False),
        Product.is_active.is_(True),
        Product.is_published.is_(True),
        Product.id.in_(_active_variant_product_ids()),
    ]


def _available_product_ids(branch_id: UUID | None = None):
    conditions = [
        StockBalance.is_deleted.is_(False),
        Branch.is_deleted.is_(False),
        Branch.status == BranchStatus.ACTIVE,
        ProductVariant.is_deleted.is_(False),
        ProductVariant.is_active.is_(True),
    ]
    if branch_id is not None:
        conditions.append(StockBalance.branch_id == branch_id)

    available_quantity = func.sum(
        StockBalance.quantity_on_hand - StockBalance.reserved_quantity
    )
    return (
        select(ProductVariant.product_id)
        .join(StockBalance, StockBalance.variant_id == ProductVariant.id)
        .join(Branch, Branch.id == StockBalance.branch_id)
        .where(*conditions)
        .group_by(ProductVariant.product_id)
        .having(available_quantity > 0)
    )


def _ensure_public_branch(db: Session, branch_id: UUID | None) -> None:
    if branch_id is None:
        return
    branch = db.scalar(
        select(Branch.id).where(
            Branch.id == branch_id,
            Branch.is_deleted.is_(False),
            Branch.status == BranchStatus.ACTIVE,
        )
    )
    if branch is None:
        raise NotFoundError("branch not found")


def _product_count_by_field(db: Session, field) -> dict[UUID, int]:
    rows = db.execute(
        select(field, func.count(Product.id))
        .where(*_published_product_conditions(), field.is_not(None))
        .group_by(field)
    ).all()
    return {item_id: count for item_id, count in rows}


def list_categories(db: Session) -> list[StorefrontCategoryResponse]:
    product_counts = _product_count_by_field(db, Product.category_id)
    categories = db.scalars(
        select(Category)
        .where(
            Category.is_deleted.is_(False),
            Category.is_active.is_(True),
        )
        .order_by(Category.name)
    ).all()
    return [
        StorefrontCategoryResponse(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            product_count=product_counts.get(category.id, 0),
        )
        for category in categories
    ]


def list_brands(db: Session) -> list[StorefrontBrandResponse]:
    product_counts = _product_count_by_field(db, Product.brand_id)
    brands = db.scalars(
        select(Brand)
        .where(
            Brand.is_deleted.is_(False),
            Brand.is_active.is_(True),
        )
        .order_by(Brand.name)
    ).all()
    return [
        StorefrontBrandResponse(
            id=brand.id,
            name=brand.name,
            description=brand.description,
            product_count=product_counts.get(brand.id, 0),
        )
        for brand in brands
    ]


def _availability_by_variant(
    db: Session, variant_ids: list[UUID], branch_id: UUID | None
) -> dict[UUID, int]:
    if not variant_ids:
        return {}
    conditions = [
        StockBalance.variant_id.in_(variant_ids),
        StockBalance.is_deleted.is_(False),
        Branch.is_deleted.is_(False),
        Branch.status == BranchStatus.ACTIVE,
    ]
    if branch_id is not None:
        conditions.append(StockBalance.branch_id == branch_id)

    rows = db.execute(
        select(
            StockBalance.variant_id,
            func.coalesce(
                func.sum(
                    StockBalance.quantity_on_hand - StockBalance.reserved_quantity
                ),
                0,
            ),
        )
        .join(Branch, Branch.id == StockBalance.branch_id)
        .where(*conditions)
        .group_by(StockBalance.variant_id)
    ).all()
    return {variant_id: max(int(quantity or 0), 0) for variant_id, quantity in rows}


def _product_responses(
    db: Session,
    rows: list[tuple[Product, Category | None, Brand | None]],
    branch_id: UUID | None,
) -> list[StorefrontProductResponse]:
    if not rows:
        return []

    products = [product for product, _, _ in rows]
    product_ids = [product.id for product in products]
    variants = db.scalars(
        select(ProductVariant)
        .where(
            ProductVariant.product_id.in_(product_ids),
            ProductVariant.is_deleted.is_(False),
            ProductVariant.is_active.is_(True),
        )
        .order_by(ProductVariant.name)
    ).all()
    images = db.scalars(
        select(ProductImage)
        .where(
            ProductImage.product_id.in_(product_ids),
            ProductImage.is_deleted.is_(False),
        )
        .order_by(ProductImage.position)
    ).all()

    availability = _availability_by_variant(
        db, [variant.id for variant in variants], branch_id
    )
    variants_by_product: dict[UUID, list[StorefrontVariantResponse]] = {
        product.id: [] for product in products
    }
    images_by_product: dict[UUID, list[StorefrontProductImageResponse]] = {
        product.id: [] for product in products
    }

    for variant in variants:
        available_quantity = availability.get(variant.id, 0)
        variants_by_product.setdefault(variant.product_id, []).append(
            StorefrontVariantResponse(
                id=variant.id,
                name=variant.name,
                sku=variant.sku,
                tracking_type=variant.tracking_type,
                attributes=variant.attributes,
                selling_price=variant.selling_price,
                available_quantity=available_quantity,
                is_available=available_quantity > 0,
            )
        )
    for image in images:
        images_by_product.setdefault(image.product_id, []).append(
            StorefrontProductImageResponse(
                url=image.url,
                alt_text=image.alt_text,
                position=image.position,
            )
        )

    responses: list[StorefrontProductResponse] = []
    for product, category, brand in rows:
        product_variants = variants_by_product.get(product.id, [])
        prices = [variant.selling_price for variant in product_variants]
        available_quantity = sum(
            variant.available_quantity for variant in product_variants
        )
        responses.append(
            StorefrontProductResponse(
                id=product.id,
                name=product.name,
                slug=product.slug,
                description=product.description,
                category_id=product.category_id,
                category_name=category.name if category else None,
                category_slug=category.slug if category else None,
                brand_id=product.brand_id,
                brand_name=brand.name if brand else None,
                warranty_months=product.warranty_months,
                starting_price=min(prices) if prices else None,
                available_quantity=available_quantity,
                is_available=available_quantity > 0,
                images=images_by_product.get(product.id, []),
                variants=product_variants,
            )
        )
    return responses


def _product_list_base(
    *,
    query: str | None = None,
    category_slug: str | None = None,
    brand_id: UUID | None = None,
    branch_id: UUID | None = None,
    in_stock_only: bool = False,
):
    conditions = [
        *_published_product_conditions(),
        or_(
            Product.category_id.is_(None),
            and_(Category.is_deleted.is_(False), Category.is_active.is_(True)),
        ),
        or_(
            Product.brand_id.is_(None),
            and_(Brand.is_deleted.is_(False), Brand.is_active.is_(True)),
        ),
    ]
    if query:
        search = f"%{query.strip()}%"
        sku_products = select(ProductVariant.product_id).where(
            ProductVariant.sku.ilike(search),
            ProductVariant.is_deleted.is_(False),
            ProductVariant.is_active.is_(True),
        )
        conditions.append(
            or_(
                Product.name.ilike(search),
                Product.slug.ilike(search),
                Product.description.ilike(search),
                Product.id.in_(sku_products),
            )
        )
    if category_slug:
        conditions.append(Category.slug == category_slug.strip().lower())
    if brand_id is not None:
        conditions.append(Product.brand_id == brand_id)
    if in_stock_only:
        conditions.append(Product.id.in_(_available_product_ids(branch_id)))

    return (
        select(Product, Category, Brand)
        .outerjoin(Category, Category.id == Product.category_id)
        .outerjoin(Brand, Brand.id == Product.brand_id)
        .where(*conditions)
    )


def list_products(
    db: Session,
    *,
    page: int,
    page_size: int,
    query: str | None = None,
    category_slug: str | None = None,
    brand_id: UUID | None = None,
    branch_id: UUID | None = None,
    in_stock_only: bool = False,
) -> tuple[list[StorefrontProductResponse], int]:
    _ensure_public_branch(db, branch_id)
    base = _product_list_base(
        query=query,
        category_slug=category_slug,
        brand_id=brand_id,
        branch_id=branch_id,
        in_stock_only=in_stock_only,
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.execute(
        base.order_by(Product.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return _product_responses(db, rows, branch_id), total


def get_product_by_slug(
    db: Session, slug: str, *, branch_id: UUID | None = None
) -> StorefrontProductResponse:
    _ensure_public_branch(db, branch_id)
    rows = db.execute(
        _product_list_base(branch_id=branch_id).where(
            func.lower(Product.slug) == slug.strip().lower()
        )
    ).all()
    if not rows:
        raise NotFoundError("product not found")
    return _product_responses(db, [rows[0]], branch_id)[0]


def _normalise_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith(("7", "1")) and len(digits) == 9:
        return f"254{digits}"
    if digits.startswith("254") and len(digits) in {12, 13}:
        return digits
    return phone.strip().replace(" ", "")


def _normalise_email(email: object | None) -> str | None:
    return str(email).strip().lower() if email else None


def _requested_quantities(payload: StorefrontOrderCreate) -> dict[UUID, int]:
    quantities: dict[UUID, int] = {}
    for item in payload.items:
        quantities[item.variant_id] = quantities.get(item.variant_id, 0) + item.quantity
    return quantities


def _public_variant_rows(
    db: Session, variant_ids: set[UUID]
) -> dict[UUID, tuple[ProductVariant, Product]]:
    rows = db.execute(
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .outerjoin(Category, Category.id == Product.category_id)
        .outerjoin(Brand, Brand.id == Product.brand_id)
        .where(
            ProductVariant.id.in_(variant_ids),
            ProductVariant.is_deleted.is_(False),
            ProductVariant.is_active.is_(True),
            Product.is_deleted.is_(False),
            Product.is_active.is_(True),
            Product.is_published.is_(True),
            or_(
                Product.category_id.is_(None),
                and_(Category.is_deleted.is_(False), Category.is_active.is_(True)),
            ),
            or_(
                Product.brand_id.is_(None),
                and_(Brand.is_deleted.is_(False), Brand.is_active.is_(True)),
            ),
        )
    ).all()
    return {variant.id: (variant, product) for variant, product in rows}


def _active_branches(db: Session) -> list[Branch]:
    return list(
        db.scalars(
            select(Branch)
            .where(
                Branch.is_deleted.is_(False),
                Branch.status == BranchStatus.ACTIVE,
            )
            .order_by(Branch.is_headquarters.desc(), Branch.name)
        ).all()
    )


def _balances_for_branch(
    db: Session,
    *,
    branch_id: UUID,
    variant_ids: set[UUID],
    lock: bool = False,
) -> dict[UUID, StockBalance]:
    statement = select(StockBalance).where(
        StockBalance.branch_id == branch_id,
        StockBalance.variant_id.in_(variant_ids),
        StockBalance.is_deleted.is_(False),
    )
    if lock:
        statement = statement.with_for_update()
    return {balance.variant_id: balance for balance in db.scalars(statement).all()}


def _branch_can_fill(
    db: Session, *, branch_id: UUID, requested_quantities: dict[UUID, int]
) -> bool:
    balances = _balances_for_branch(
        db, branch_id=branch_id, variant_ids=set(requested_quantities)
    )
    return all(
        balances.get(variant_id) is not None
        and quantity
        <= balances[variant_id].quantity_on_hand - balances[variant_id].reserved_quantity
        for variant_id, quantity in requested_quantities.items()
    )


def _choose_order_branch(
    db: Session,
    *,
    branch_id: UUID | None,
    requested_quantities: dict[UUID, int],
) -> UUID:
    if branch_id is not None:
        _ensure_public_branch(db, branch_id)
        if not _branch_can_fill(
            db, branch_id=branch_id, requested_quantities=requested_quantities
        ):
            raise ConflictError("one or more items do not have enough stock in this branch")
        return branch_id

    branches = _active_branches(db)
    if not branches:
        raise NotFoundError("active branch not found")
    for branch in branches:
        if _branch_can_fill(
            db, branch_id=branch.id, requested_quantities=requested_quantities
        ):
            return branch.id
    raise ConflictError("no branch has enough stock to fulfill this order")


def _get_or_create_customer(
    db: Session, payload: StorefrontOrderCreate, *, home_branch_id: UUID
) -> Customer:
    customer_payload = payload.customer
    phone = _normalise_phone(customer_payload.phone)
    raw_phone = customer_payload.phone.strip().replace(" ", "")
    phone_matches = {phone.lower(), raw_phone.lower()}
    customer = db.scalar(
        select(Customer).where(
            func.lower(Customer.phone).in_(phone_matches),
            Customer.is_deleted.is_(False),
        )
    )
    if customer is not None:
        if not customer.is_active:
            raise ConflictError("customer account is inactive; contact the shop")
        updated = False
        if customer_payload.full_name.strip() and (
            customer.full_name.strip().lower()
            != customer_payload.full_name.strip().lower()
        ):
            customer.full_name = customer_payload.full_name.strip()
            updated = True
        email = _normalise_email(customer_payload.email)
        if email and customer.email != email:
            customer.email = email
            updated = True
        address = customer_payload.address.strip() if customer_payload.address else None
        if address and customer.address != address:
            customer.address = address
            updated = True
        if customer.home_branch_id is None:
            customer.home_branch_id = home_branch_id
            updated = True
        if updated:
            db.flush()
        return customer

    customer = Customer(
        full_name=customer_payload.full_name.strip(),
        phone=phone,
        email=_normalise_email(customer_payload.email),
        address=customer_payload.address.strip() if customer_payload.address else None,
        home_branch_id=home_branch_id,
        is_active=True,
    )
    db.add(customer)
    db.flush()
    record_audit(
        db,
        actor_id=None,
        branch_id=home_branch_id,
        action="storefront.customer_created",
        resource_type="customer",
        resource_id=customer.id,
        after={"full_name": customer.full_name, "phone": customer.phone},
    )
    return customer


def _order_note(payload: StorefrontOrderCreate) -> str:
    lines = [
        "Website order",
        f"Delivery method: {payload.delivery_method}",
    ]
    if payload.delivery_address:
        lines.append(f"Delivery address: {payload.delivery_address.strip()}")
    if payload.notes:
        lines.append(f"Customer note: {payload.notes.strip()}")
    return "\n".join(lines)


def _delivery_field(notes: str | None, key: str) -> str | None:
    if not notes:
        return None
    prefix = f"{key}:"
    for line in notes.splitlines():
        if line.startswith(prefix):
            value = line.removeprefix(prefix).strip()
            return value or None
    return None


def _order_response(db: Session, sale: Sale) -> StorefrontOrderResponse:
    customer = db.get(Customer, sale.customer_id) if sale.customer_id else None
    items = db.execute(
        select(SaleItem, ProductVariant, Product)
        .join(ProductVariant, ProductVariant.id == SaleItem.variant_id)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(SaleItem.sale_id == sale.id, SaleItem.is_deleted.is_(False))
        .order_by(SaleItem.created_at)
    ).all()
    delivery_method = _delivery_field(sale.notes, "Delivery method") or "pickup"
    return StorefrontOrderResponse(
        id=sale.id,
        order_number=sale.invoice_number,
        branch_id=sale.branch_id,
        created_at=sale.created_at,
        status=sale.status,
        fulfillment_status=sale.fulfillment_status,
        customer=StorefrontCustomerSummary(
            full_name=customer.full_name if customer else "",
            phone=customer.phone if customer else "",
            email=customer.email if customer else None,
        ),
        delivery_method=delivery_method,
        delivery_address=_delivery_field(sale.notes, "Delivery address"),
        subtotal=sale.subtotal,
        tax_amount=sale.tax_amount,
        discount_amount=sale.discount_amount,
        total_amount=sale.total_amount,
        paid_amount=sale.paid_amount,
        balance_due=money(sale.total_amount - sale.paid_amount),
        notes=_delivery_field(sale.notes, "Customer note"),
        items=[
            StorefrontOrderItemResponse(
                variant_id=variant.id,
                sku=variant.sku,
                product_name=product.name,
                variant_name=variant.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item, variant, product in items
        ],
    )


def create_order(db: Session, payload: StorefrontOrderCreate) -> StorefrontOrderResponse:
    requested_quantities = _requested_quantities(payload)
    if not requested_quantities:
        raise ValidationError("order must contain at least one item")

    products = _public_variant_rows(db, set(requested_quantities))
    if set(products) != set(requested_quantities):
        raise NotFoundError("one or more order items are unavailable")

    branch_id = _choose_order_branch(
        db,
        branch_id=payload.branch_id,
        requested_quantities=requested_quantities,
    )
    balances = _balances_for_branch(
        db,
        branch_id=branch_id,
        variant_ids=set(requested_quantities),
        lock=True,
    )
    for variant_id, quantity in requested_quantities.items():
        balance = balances.get(variant_id)
        available = (
            balance.quantity_on_hand - balance.reserved_quantity if balance else 0
        )
        if quantity > available:
            raise ConflictError("one or more items do not have enough stock available")

    customer = _get_or_create_customer(db, payload, home_branch_id=branch_id)
    subtotal = Decimal("0.00")
    prepared_items: list[dict] = []
    for variant_id, quantity in requested_quantities.items():
        variant, product = products[variant_id]
        balance = balances[variant_id]
        line_quantity = quantity if variant.tracking_type == TrackingType.BULK else 1
        line_count = 1 if variant.tracking_type == TrackingType.BULK else quantity
        for _ in range(line_count):
            line_total = money(variant.selling_price * line_quantity)
            subtotal += line_total
            prepared_items.append(
                {
                    "variant_id": variant.id,
                    "serialized_unit_id": None,
                    "description": f"{product.name} - {variant.name}",
                    "quantity": line_quantity,
                    "unit_price": variant.selling_price,
                    "unit_cost": balance.average_unit_cost,
                    "discount_amount": Decimal("0.00"),
                    "tax_amount": Decimal("0.00"),
                    "line_total": line_total,
                }
            )

    if subtotal <= 0:
        raise ValidationError("order total must be greater than zero")

    sale = Sale(
        branch_id=branch_id,
        customer_id=customer.id,
        cashier_id=None,
        till_session_id=None,
        invoice_number=_order_number(),
        channel=SaleChannel.ONLINE,
        status=SaleStatus.PENDING_PAYMENT,
        fulfillment_status=FulfillmentStatus.UNFULFILLED,
        subtotal=money(subtotal),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total_amount=money(subtotal),
        paid_amount=Decimal("0.00"),
        notes=_order_note(payload),
    )
    db.add(sale)
    db.flush()

    for values in prepared_items:
        db.add(SaleItem(sale_id=sale.id, **values))
        balance = balances[values["variant_id"]]
        balance.reserved_quantity += values["quantity"]
        db.add(
            StockReservation(
                branch_id=branch_id,
                variant_id=values["variant_id"],
                serialized_unit_id=None,
                quantity=values["quantity"],
                reference_type="online_order",
                reference_id=sale.id,
                status="active",
                expires_at=datetime.now(timezone.utc)
                + timedelta(hours=ORDER_RESERVATION_HOURS),
            )
        )
    db.flush()
    record_audit(
        db,
        actor_id=None,
        branch_id=branch_id,
        action="storefront.order_created",
        resource_type="sale",
        resource_id=sale.id,
        after={
            "order_number": sale.invoice_number,
            "customer_id": str(customer.id),
            "total": str(sale.total_amount),
            "reserved_for_hours": ORDER_RESERVATION_HOURS,
        },
    )
    return _order_response(db, sale)


def get_order(
    db: Session, *, order_number: str, phone: str
) -> StorefrontOrderResponse:
    sale = db.scalar(
        select(Sale).where(
            func.upper(Sale.invoice_number) == order_number.strip().upper(),
            Sale.channel == SaleChannel.ONLINE,
            Sale.is_deleted.is_(False),
        )
    )
    if sale is None or sale.customer_id is None:
        raise NotFoundError("order not found")
    customer = db.get(Customer, sale.customer_id)
    if customer is None or _normalise_phone(customer.phone) != _normalise_phone(phone):
        raise NotFoundError("order not found")
    return _order_response(db, sale)


def get_order_model_for_customer(
    db: Session, *, order_number: str, phone: str, lock: bool = False
) -> tuple[Sale, Customer]:
    statement = select(Sale).where(
        func.upper(Sale.invoice_number) == order_number.strip().upper(),
        Sale.channel == SaleChannel.ONLINE,
        Sale.is_deleted.is_(False),
    )
    if lock:
        statement = statement.with_for_update()
    sale = db.scalar(statement)
    if sale is None or sale.customer_id is None:
        raise NotFoundError("order not found")
    customer = db.get(Customer, sale.customer_id)
    if customer is None or _normalise_phone(customer.phone) != _normalise_phone(phone):
        raise NotFoundError("order not found")
    return sale, customer


def order_response_for_sale(db: Session, sale: Sale) -> StorefrontOrderResponse:
    return _order_response(db, sale)
