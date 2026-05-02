"""add surveys and survey_responses tables

Revision ID: 7e27cd36faef
Revises: b299dc1b311c
Create Date: 2026-05-02 11:14:40.098206

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '7e27cd36faef'
down_revision: Union[str, None] = 'b299dc1b311c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    return bind.dialect.has_table(bind, table_name)


def upgrade() -> None:
    is_pg = op.get_bind().dialect.name == 'postgresql'
    uuid_type = postgresql.UUID(as_uuid=True) if is_pg else sa.String(36)

    if not _table_exists('surveys'):
        op.create_table(
            'surveys',
            sa.Column('id', uuid_type, nullable=False),
            sa.Column('project_id', uuid_type, nullable=False),
            sa.Column('user_id', uuid_type, nullable=False),
            sa.Column('public_id', sa.String(16), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=False),
            sa.Column('config', sa.JSON(), nullable=False),
            sa.Column('status', sa.String(20), nullable=False),
            sa.Column('response_count', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('public_id')
        )
        op.create_index('ix_surveys_project_id', 'surveys', ['project_id'], unique=False)
        op.create_index('ix_surveys_user_id', 'surveys', ['user_id'], unique=False)

    if not _table_exists('survey_responses'):
        op.create_table(
            'survey_responses',
            sa.Column('id', uuid_type, nullable=False),
            sa.Column('survey_id', uuid_type, nullable=False),
            sa.Column('project_id', uuid_type, nullable=False),
            sa.Column('answers', sa.JSON(), nullable=False),
            sa.Column('respondent_meta', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_survey_responses_survey_id', 'survey_responses', ['survey_id'], unique=False)
        op.create_index('ix_survey_responses_project_id', 'survey_responses', ['project_id'], unique=False)


def downgrade() -> None:
    if _table_exists('survey_responses'):
        op.drop_index('ix_survey_responses_project_id', table_name='survey_responses')
        op.drop_index('ix_survey_responses_survey_id', table_name='survey_responses')
        op.drop_table('survey_responses')
    if _table_exists('surveys'):
        op.drop_index('ix_surveys_user_id', table_name='surveys')
        op.drop_index('ix_surveys_project_id', table_name='surveys')
        op.drop_table('surveys')
