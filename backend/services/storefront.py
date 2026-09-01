from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from backend.models.branch import Branch
from backend.models.brand import Brand
from backend.models.enums import BranchStatus
from backend.models.inventory import StockBalance
from backend.models.products import Category, Product, ProductImage, ProductVariant
from backend.schemas.storefront_schemas import (
    StorefrontBrandResponse,
    StorefrontCategoryResponse,
    StorefrontProductImageResponse,
    StorefrontProductResponse,
    StorefrontVariantResponse,
)
from backend.services.exceptions import NotFoundError


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
