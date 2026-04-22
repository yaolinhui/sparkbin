"""add user subscription fields

Revision ID: add_user_subscription_fields
Revises: add_user_security_fields
Create Date: 2026-04-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_user_subscription_fields'
down_revision = 'add_user_security_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('subscription_status', sa.String(length=20), nullable=False, server_default='inactive'))
    op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('current_tier_id', sa.String(length=50), nullable=True))


def downgrade():
    op.drop_column('users', 'current_tier_id')
    op.drop_column('users', 'stripe_subscription_id')
    op.drop_column('users', 'stripe_customer_id')
    op.drop_column('users', 'subscription_status')
