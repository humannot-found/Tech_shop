"""widen serialized_units.status for under_review/lost

Revision ID: a6d8e2f4c9b1
Revises: f2a9c15e6b3d
Create Date: 2026-09-22 09:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a6d8e2f4c9b1"
down_revision: Union[str, None] = "f2a9c15e6b3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The column was sized from the enum values present when the table was
    # created (max 11 chars, e.g. "quarantined"). "under_review" needs 12.
    op.alter_column(
        "serialized_units",
        "status",
        existing_type=sa.String(length=11),
        type_=sa.String(length=20),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "serialized_units",
        "status",
        existing_type=sa.String(length=20),
        type_=sa.String(length=11),
        existing_nullable=False,
    )
