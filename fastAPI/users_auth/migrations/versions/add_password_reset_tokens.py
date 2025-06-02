"""add password reset tokens

Revision ID: add_password_reset_tokens
Revises: 
Create Date: 2024-03-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_password_reset_tokens'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('token', sa.String, unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('is_used', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=datetime.utcnow),
    )

def downgrade():
    op.drop_table('password_reset_tokens') 