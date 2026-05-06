"""Production-safe database startup script.

Handles two scenarios:
1. Fresh database: Base.metadata.create_all() creates all tables, then we stamp
   alembic as at HEAD (since the current models already include all migration changes).
2. Existing database: We run alembic upgrade head normally.
"""
import sys

from app.database import engine
from app.models import Base
from alembic.config import Config
from alembic import command
from alembic.script import ScriptDirectory
from alembic.runtime import migration


def main() -> int:
    print("[startup] Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)
    print("[startup] Tables ready.")

    alembic_cfg = Config("alembic.ini")
    script = ScriptDirectory.from_config(alembic_cfg)

    with engine.begin() as connection:
        context = migration.MigrationContext.configure(connection)
        current_rev = context.get_current_revision()

        if current_rev is None:
            # Fresh database — models already contain all migrated columns,
            # so we stamp alembic at head instead of running migrations
            # (which would fail with "column already exists").
            print("[startup] Fresh database detected. Stamping alembic head...")
            command.stamp(alembic_cfg, "head")
        else:
            print(f"[startup] Database at revision {current_rev}. Running migrations...")
            command.upgrade(alembic_cfg, "head")

    print("[startup] Database setup complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
