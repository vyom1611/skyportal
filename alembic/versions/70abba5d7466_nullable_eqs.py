"""Nullable EQs migration

Revision ID: 70abba5d7466
Revises: c589cb7d70ec
Create Date: 2022-09-09 22:06:29.519271

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '70abba5d7466'
down_revision = 'c589cb7d70ec'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        'earthquakemeasureds',
        'rfamp',
        existing_type=postgresql.DOUBLE_PRECISION(),
        nullable=True,
        existing_comment='Earthquake amplitude measured [m/s]',
    )
    op.alter_column(
        'earthquakemeasureds',
        'lockloss',
        existing_type=sa.INTEGER(),
        nullable=True,
        existing_comment='Earthquake lockloss measured, should be 0 (no lockloss) or 1 (lockloss)',
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        'earthquakemeasureds',
        'lockloss',
        existing_type=sa.INTEGER(),
        nullable=False,
        existing_comment='Earthquake lockloss measured, should be 0 (no lockloss) or 1 (lockloss)',
    )
    op.alter_column(
        'earthquakemeasureds',
        'rfamp',
        existing_type=postgresql.DOUBLE_PRECISION(),
        nullable=False,
        existing_comment='Earthquake amplitude measured [m/s]',
    )
    # ### end Alembic commands ###
