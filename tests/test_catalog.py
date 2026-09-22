from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError as PydanticValidationError

from backend.api.dependencies import get_current_principal
from backend.core.permissions import ADMIN, BRANCH_MANAGER, CASHIER
from backend.main import app
from backend.models.database import get_db
from backend.models.enums import TrackingType
from backend.schemas.products_schemas import (
    CategoryCreate,
    CategoryUpdate,
    ProductVariantCreate,
    ProductVariantUpdate,
)
from backend.services import catalog as catalog_service
from backend.services.auth import AuthPrincipal
from backend.services.catalog_import import build_import_plan


def variant_payload(**overrides) -> dict:
    payload = {
        "name": "Base",
        "sku": "TEST-SKU-1",
        "tracking_type": TrackingType.BULK,
        "cost_price": Decimal("100.00"),
        "selling_price": Decimal("150.00"),
    }
    payload.update(overrides)
    return payload


VALID_CSV = b"""product_name,product_slug,variant_name,sku,cost_price,selling_price,tracking_type,attributes_json
ThinkPad T14,thinkpad-t14,16GB RAM,LEN-T14-16,100000,125000,serial,"{""ram"":""16GB""}"
ThinkPad T14,thinkpad-t14,32GB RAM,LEN-T14-32,115000,145000,serial,"{""ram"":""32GB""}"
"""


class EmptyScalars:
    def all(self):
        return []


class EmptyCatalogSession:
    def scalars(self, statement):
        return EmptyScalars()


def principal(role_code: str, permissions: set[str]) -> AuthPrincipal:
    return AuthPrincipal(
        user_id=uuid4(),
        full_name="Catalog User",
        username="catalog-user",
        email="catalog@example.com",
        branch_id=uuid4(),
        role_id=uuid4(),
        role_code=role_code,
        role_name=role_code.replace("_", " ").title(),
        permissions=frozenset(permissions),
        password_hash="test-hash",
        must_change_password=False,
    )


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def use_principal(value: AuthPrincipal, db=None) -> None:
    app.dependency_overrides[get_current_principal] = lambda: value
    app.dependency_overrides[get_db] = lambda: db or object()


def test_valid_csv_groups_variants_under_one_product() -> None:
    plan = build_import_plan(EmptyCatalogSession(), VALID_CSV)
    assert plan.errors == []
    assert plan.total_rows == 2
    assert plan.valid_rows == 2
    assert len(plan.products) == 1
    assert len(plan.products[0].variants) == 2
    assert plan.products[0].variants[0].attributes == {"ram": "16GB"}


def test_csv_validation_reports_duplicate_skus() -> None:
    duplicate = VALID_CSV.replace(b"LEN-T14-32", b"LEN-T14-16")
    plan = build_import_plan(EmptyCatalogSession(), duplicate)
    assert any(error.column == "sku" for error in plan.errors)


def test_csv_validation_reports_missing_columns() -> None:
    plan = build_import_plan(EmptyCatalogSession(), b"product_name,sku\nLaptop,LAP-1\n")
    assert plan.total_rows == 0
    assert "missing required columns" in plan.errors[0].message


def test_catalog_routes_are_exposed() -> None:
    openapi = app.openapi()
    paths = openapi["paths"]
    assert "/api/v1/staff/catalog/categories" in paths
    assert "/api/v1/staff/catalog/brands" in paths
    assert "/api/v1/staff/catalog/products" in paths
    assert "/api/v1/staff/catalog/products/import/validate" in paths
    assert "/api/v1/staff/catalog/products/{product_id}/publication" in paths
    variant_fields = openapi["components"]["schemas"]["CatalogVariantResponse"][
        "properties"
    ]
    assert "cost_price" not in variant_fields
    assert "minimum_selling_price" not in variant_fields


def test_catalog_viewer_can_read_but_cannot_write(monkeypatch) -> None:
    use_principal(principal(BRANCH_MANAGER, {"catalog.view"}))
    monkeypatch.setattr(catalog_service, "list_categories", lambda db: [])
    client = TestClient(app)
    assert client.get("/api/v1/staff/catalog/categories").status_code == 200
    response = client.post(
        "/api/v1/staff/catalog/categories",
        json={"name": "Laptops", "slug": "laptops"},
    )
    assert response.status_code == 403


def test_cashier_with_catalog_view_can_search_catalog(monkeypatch) -> None:
    use_principal(principal(CASHIER, {"catalog.view"}))
    monkeypatch.setattr(
        catalog_service, "list_products", lambda *args, **kwargs: ([], 0)
    )
    response = TestClient(app).get("/api/v1/staff/catalog/products?q=laptop")
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_variant_create_rejects_selling_price_below_cost() -> None:
    with pytest.raises(PydanticValidationError):
        ProductVariantCreate(
            **variant_payload(cost_price=Decimal("200.00"), selling_price=Decimal("150.00"))
        )


def test_variant_create_allows_selling_price_at_cost() -> None:
    variant = ProductVariantCreate(
        **variant_payload(cost_price=Decimal("150.00"), selling_price=Decimal("150.00"))
    )
    assert variant.selling_price == variant.cost_price


def test_default_minimum_selling_price_is_cost_plus_five_percent() -> None:
    assert catalog_service._default_minimum_selling_price(
        Decimal("100.00"), Decimal("200.00")
    ) == Decimal("105.00")


def test_default_minimum_selling_price_is_capped_at_selling_price() -> None:
    # Only a 2% margin over cost: the 5%-over-cost default would exceed the
    # selling price, so it is capped there instead.
    assert catalog_service._default_minimum_selling_price(
        Decimal("100.00"), Decimal("102.00")
    ) == Decimal("102.00")


def test_variant_update_cannot_remove_minimum_selling_price() -> None:
    with pytest.raises(PydanticValidationError):
        ProductVariantUpdate(minimum_selling_price=None)


def test_variant_update_rejects_selling_price_below_cost_when_both_given() -> None:
    with pytest.raises(PydanticValidationError):
        ProductVariantUpdate(
            cost_price=Decimal("200.00"), selling_price=Decimal("150.00")
        )


def test_variant_update_allows_partial_price_changes() -> None:
    update = ProductVariantUpdate(selling_price=Decimal("160.00"))
    assert update.cost_price is None
    assert "minimum_selling_price" not in update.model_fields_set


def test_category_create_defaults_warranty_to_zero_and_no_tracking_type() -> None:
    category = CategoryCreate(name="Cables", slug="cables")
    assert category.default_warranty_months == 0
    assert category.default_tracking_type is None


def test_category_create_accepts_explicit_defaults() -> None:
    category = CategoryCreate(
        name="Phones",
        slug="phones",
        default_warranty_months=6,
        default_tracking_type=TrackingType.IMEI,
    )
    assert category.default_warranty_months == 6
    assert category.default_tracking_type == TrackingType.IMEI


def test_category_update_cannot_null_warranty_but_can_clear_tracking_type() -> None:
    with pytest.raises(PydanticValidationError):
        CategoryUpdate(default_warranty_months=None)
    # Clearing the tracking-type suggestion back to "no suggestion" is allowed.
    update = CategoryUpdate(default_tracking_type=None)
    assert "default_tracking_type" in update.model_fields_set
    assert update.default_tracking_type is None


def test_admin_can_validate_csv_upload() -> None:
    use_principal(principal(ADMIN, set()), EmptyCatalogSession())
    response = TestClient(app).post(
        "/api/v1/staff/catalog/products/import/validate",
        files={"file": ("catalog.csv", VALID_CSV, "text/csv")},
    )
    assert response.status_code == 200
    assert response.json()["can_import"] is True
