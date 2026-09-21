"""add till cash movements

Revision ID: e4c1a7b39d20
Revises: 7de05cf6ac41
Create Date: 2026-09-21 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e4c1a7b39d20"
down_revision: Union[str, None] = "7de05cf6ac41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "till_cash_movements",
        sa.Column("till_session_id", sa.UUID(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "cash_in",
                "paid_out",
                "cash_drop",
                name="cash_movement_kind",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("reason", sa.String(length=200), nullable=False),
        sa.Column("created_by_id", sa.UUID(), nullable=False),
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
            ["created_by_id"],
            ["users.id"],
            name=op.f("fk_till_cash_movements_created_by_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["till_session_id"],
            ["till_sessions.id"],
            name=op.f("fk_till_cash_movements_till_session_id_till_sessions"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_till_cash_movements")),
    )
    op.create_index(
        op.f("ix_till_cash_movements_till_session_id"),
        "till_cash_movements",
        ["till_session_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_till_cash_movements_till_session_id"), table_name="till_cash_movements"
    )
    op.drop_table("till_cash_movements")
