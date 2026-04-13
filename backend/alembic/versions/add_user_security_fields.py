"""add user security fields

Revision ID: add_user_security_fields
Revises: 88edf4721b21
Create Date: 2024-04-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_security_fields'
down_revision = '88edf4721b21'
branch_labels = None
depends_on = None


def upgrade():
    # 添加 require_password_change 字段
    op.add_column('users', sa.Column('require_password_change', sa.Boolean(), nullable=True, server_default='false'))

    # 添加 last_login_at 字段
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))

    # 为现有用户设置默认值
    op.execute("UPDATE users SET require_password_change = false")

    # 将 require_password_change 设为不可为空
    op.alter_column('users', 'require_password_change', nullable=False)


def downgrade():
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'require_password_change')
