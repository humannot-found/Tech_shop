"""add category default warranty and tracking type

Revision ID: c8e5a3f1d704
Revises: b3f7d1a9e502
Create Date: 2026-09-22 10:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c8e5a3f1d704"
down_revision: Union[str, None] = "b3f7d1a9e502"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column(
            "default_warranty_months",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "categories",
        sa.Column(
            "default_tracking_type",
            sa.Enum(
                "bulk",
                "serial",
                "imei",
                name="tracking_type",
                native_enum=False,
            ),
            nullable=True,
        ),
    )
    op.alter_column("categories", "default_warranty_months", server_default=None)


def downgrade() -> None:
    op.drop_column("categories", "default_tracking_type")
    op.drop_column("categories", "default_warranty_months")
