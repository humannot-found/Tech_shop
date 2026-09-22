"""add stock count unit scans

Revision ID: f2a9c15e6b3d
Revises: e4c1a7b39d20
Create Date: 2026-09-22 09:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f2a9c15e6b3d"
down_revision: Union[str, None] = "e4c1a7b39d20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_count_unit_scans",
        sa.Column("stock_count_item_id", sa.UUID(), nullable=False),
        sa.Column("serialized_unit_id", sa.UUID(), nullable=False),
        sa.Column("scanned_by_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["scanned_by_id"],
            ["users.id"],
            name=op.f("fk_stock_count_unit_scans_scanned_by_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["serialized_unit_id"],
            ["serialized_units.id"],
            name=op.f("fk_stock_count_unit_scans_serialized_unit_id_serialized_units"),
        ),
        sa.ForeignKeyConstraint(
            ["stock_count_item_id"],
            ["stock_count_items.id"],
            name=op.f("fk_stock_count_unit_scans_stock_count_item_id_stock_count_items"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stock_count_unit_scans")),
        sa.UniqueConstraint(
            "stock_count_item_id",
            "serialized_unit_id",
            name="stock_count_unit_scan_unique",
        ),
    )
    op.create_index(
        op.f("ix_stock_count_unit_scans_stock_count_item_id"),
        "stock_count_unit_scans",
        ["stock_count_item_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_stock_count_unit_scans_stock_count_item_id"),
        table_name="stock_count_unit_scans",
    )
    op.drop_table("stock_count_unit_scans")
