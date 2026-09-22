"""backfill missing minimum_selling_price

Revision ID: b3f7d1a9e502
Revises: a6d8e2f4c9b1
Create Date: 2026-09-22 10:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b3f7d1a9e502"
down_revision: Union[str, None] = "a6d8e2f4c9b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A variant with no minimum_selling_price could be discounted at the POS all
    # the way to zero. Backfills existing variants only; new ones get the same
    # default (cost + 5%, capped at the selling price) from the API.
    op.execute(
        """
        UPDATE product_variants
        SET minimum_selling_price = LEAST(selling_price, ROUND(cost_price * 1.05, 2))
        WHERE minimum_selling_price IS NULL
        """
    )


def downgrade() -> None:
    # Data-only fix; not reversible without knowing which rows were null before.
    pass
