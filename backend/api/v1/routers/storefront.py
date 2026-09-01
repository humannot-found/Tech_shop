from uuid import UUID

from fastapi import APIRouter, Query, status

from backend.api.dependencies import DatabaseSession
from backend.schemas.base_schemas import Page
from backend.schemas.storefront_schemas import (
    StorefrontBrandResponse,
    StorefrontCategoryResponse,
    StorefrontOrderCreate,
    StorefrontOrderResponse,
    StorefrontProductResponse,
)
from backend.services import storefront as storefront_service

router = APIRouter(prefix="/storefront", tags=["storefront"])


@router.get("/categories", response_model=list[StorefrontCategoryResponse])
def list_categories(db: DatabaseSession) -> list[StorefrontCategoryResponse]:
    return storefront_service.list_categories(db)


@router.get("/brands", response_model=list[StorefrontBrandResponse])
def list_brands(db: DatabaseSession) -> list[StorefrontBrandResponse]:
    return storefront_service.list_brands(db)


@router.get("/products", response_model=Page[StorefrontProductResponse])
def list_products(
    db: DatabaseSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    category_slug: str | None = Query(
        default=None,
        alias="category",
        min_length=1,
        max_length=170,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    ),
    brand_id: UUID | None = None,
    branch_id: UUID | None = None,
    in_stock_only: bool = False,
) -> Page[StorefrontProductResponse]:
    items, total = storefront_service.list_products(
        db,
        page=page,
        page_size=page_size,
        query=q,
        category_slug=category_slug,
        brand_id=brand_id,
        branch_id=branch_id,
        in_stock_only=in_stock_only,
    )
    return Page[StorefrontProductResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/products/{slug}", response_model=StorefrontProductResponse)
def get_product(
    slug: str,
    db: DatabaseSession,
    branch_id: UUID | None = None,
) -> StorefrontProductResponse:
    return storefront_service.get_product_by_slug(db, slug, branch_id=branch_id)


@router.post(
    "/orders",
    response_model=StorefrontOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    payload: StorefrontOrderCreate,
    db: DatabaseSession,
) -> StorefrontOrderResponse:
    order = storefront_service.create_order(db, payload)
    db.commit()
    return order


@router.get("/orders/{order_number}", response_model=StorefrontOrderResponse)
def get_order(
    order_number: str,
    db: DatabaseSession,
    phone: str = Query(..., min_length=7, max_length=20),
) -> StorefrontOrderResponse:
    return storefront_service.get_order(db, order_number=order_number, phone=phone)
