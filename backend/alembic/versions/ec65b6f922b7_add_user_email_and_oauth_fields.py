"""add_user_email_and_oauth_fields

Revision ID: ec65b6f922b7
Revises: add_user_subscription_fields
Create Date: 2026-04-27 18:16:32.832991

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec65b6f922b7'
down_revision: Union[str, None] = 'add_user_subscription_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 列已在之前部分执行中添加，此处只处理剩余变更：
    # 1. username / password 改为 nullable（支持 OAuth 用户）
    # 2. 创建索引

    # 先检查列是否存在（兼容部分执行过的环境）
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col['name'] for col in inspector.get_columns('users')}

    if 'email' not in columns:
        op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    if 'email_verified' not in columns:
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    if 'oauth_provider' not in columns:
        op.add_column('users', sa.Column('oauth_provider', sa.String(length=20), nullable=True))
    if 'oauth_id' not in columns:
        op.add_column('users', sa.Column('oauth_id', sa.String(length=255), nullable=True))
    if 'avatar_url' not in columns:
        op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))

    # SQLite 不支持 ALTER COLUMN，使用 batch_alter_table 重建表
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('username', existing_type=sa.VARCHAR(length=50), nullable=True)
        batch_op.alter_column('password_hash', existing_type=sa.VARCHAR(length=255), nullable=True)

    # 索引
    indexes = {idx['name'] for idx in inspector.get_indexes('users')}
    if 'ix_users_email' not in indexes:
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    if 'ix_users_oauth_id' not in indexes:
        op.create_index(op.f('ix_users_oauth_id'), 'users', ['oauth_id'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    indexes = {idx['name'] for idx in inspector.get_indexes('users')}

    if 'ix_users_oauth_id' in indexes:
        op.drop_index(op.f('ix_users_oauth_id'), table_name='users')
    if 'ix_users_email' in indexes:
        op.drop_index(op.f('ix_users_email'), table_name='users')

    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.VARCHAR(length=255), nullable=False)
        batch_op.alter_column('username', existing_type=sa.VARCHAR(length=50), nullable=False)

    columns = {col['name'] for col in inspector.get_columns('users')}
    for col in ['avatar_url', 'oauth_id', 'oauth_provider', 'email_verified', 'email']:
        if col in columns:
            op.drop_column('users', col)
