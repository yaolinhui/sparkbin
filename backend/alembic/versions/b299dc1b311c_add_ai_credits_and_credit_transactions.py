"""add_ai_credits_and_credit_transactions

Revision ID: b299dc1b311c
Revises: ec65b6f922b7
Create Date: 2026-04-30 20:40:14.586756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid


# revision identifiers, used by Alembic.
revision: str = 'b299dc1b311c'
down_revision: Union[str, None] = 'ec65b6f922b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加 ai_credits 和 ai_credits_total_consumed 到 users 表
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ai_credits', sa.Integer(), nullable=False, server_default='20'))
        batch_op.add_column(sa.Column('ai_credits_total_consumed', sa.Integer(), nullable=False, server_default='0'))

    # 创建 credit_transactions 表
    op.create_table(
        'credit_transactions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('reference_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 为现有用户初始化 ai_credits（产品未上线，全部设为注册赠送额度）
    op.execute("UPDATE users SET ai_credits = 20, ai_credits_total_consumed = 0")


def downgrade() -> None:
    op.drop_table('credit_transactions')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('ai_credits_total_consumed')
        batch_op.drop_column('ai_credits')
