"""
Migrate local SQLite data (admin's 34 projects) to production PostgreSQL.
Smart merge: keep production data, append local projects.
"""
import os
import sys
import uuid
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# SQLite (local data source)
sqlite_url = "sqlite:////tmp/sparkbin_v2.db"

# PostgreSQL (production target)
pg_url = os.environ.get("DATABASE_URL", "postgresql://sparkbin:sparkbin_pass_2024@postgres:5432/sparkbin")

sqlite_engine = create_engine(sqlite_url)
pg_engine = create_engine(pg_url)

SQLiteSession = sessionmaker(bind=sqlite_engine)
PGSession = sessionmaker(bind=pg_engine)

sqlite_db = SQLiteSession()
pg_db = PGSession()


def get_local_admin_user():
    """Get local admin user from SQLite"""
    result = sqlite_db.execute(text("SELECT * FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1"))
    row = result.mappings().first()
    return dict(row) if row else None


def get_production_admin_user():
    """Get production admin user from PostgreSQL"""
    result = pg_db.execute(text("SELECT * FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1"))
    row = result.mappings().first()
    return dict(row) if row else None


def uuid_exists_in_pg(table: str, uid: str) -> bool:
    """Check if a UUID already exists in PostgreSQL table"""
    result = pg_db.execute(text(f"SELECT 1 FROM {table} WHERE id = :uid"), {"uid": uid})
    return result.scalar() is not None


def generate_new_uuid() -> str:
    """Generate a new UUID string"""
    return str(uuid.uuid4()).replace("-", "")


def migrate_projects(local_admin_id: str, prod_admin_id: str):
    """Migrate projects from local admin to production admin"""
    result = sqlite_db.execute(
        text("SELECT * FROM projects WHERE user_id = :uid"),
        {"uid": local_admin_id}
    )
    projects = result.mappings().all()

    migrated = 0
    skipped = 0
    uuid_map = {}  # old_uuid -> new_uuid

    for proj in projects:
        proj = dict(proj)
        old_id = proj["id"]

        # Check for UUID collision in production
        if uuid_exists_in_pg("projects", old_id):
            new_id = generate_new_uuid()
            print(f"  UUID collision for project '{proj['title']}', reassigning {old_id} -> {new_id}")
            uuid_map[old_id] = new_id
            proj["id"] = new_id
        else:
            uuid_map[old_id] = old_id

        # Map user_id to production admin
        proj["user_id"] = prod_admin_id

        # Handle JSON fields
        for key in ["content", "settings", "metadata"]:
            if key in proj and proj[key] is not None:
                if isinstance(proj[key], dict):
                    proj[key] = json.dumps(proj[key])

        # Insert into PostgreSQL
        columns = list(proj.keys())
        placeholders = ", ".join([f":{c}" for c in columns])
        cols = ", ".join(columns)

        try:
            pg_db.execute(
                text(f"INSERT INTO projects ({cols}) VALUES ({placeholders})"),
                proj
            )
            pg_db.commit()
            migrated += 1
            print(f"  Migrated project: {proj['title']}")
        except Exception as e:
            pg_db.rollback()
            print(f"  FAILED to migrate project '{proj['title']}': {e}")
            skipped += 1

    print(f"\nProjects: {migrated} migrated, {skipped} skipped, {len(projects)} total")
    return uuid_map


def migrate_stages(uuid_map: dict):
    """Migrate stages for the migrated projects"""
    # Get all stages whose project_id is in our uuid_map
    old_ids = list(uuid_map.keys())
    if not old_ids:
        print("\nNo stages to migrate.")
        return

    # SQLite IN clause
    placeholders = ", ".join([f"'{oid}'" for oid in old_ids])
    result = sqlite_db.execute(text(f"SELECT * FROM stages WHERE project_id IN ({placeholders})"))
    stages = result.mappings().all()

    migrated = 0
    skipped = 0

    for stage in stages:
        stage = dict(stage)
        old_id = stage["id"]
        old_proj_id = stage["project_id"]

        # Map project_id
        stage["project_id"] = uuid_map.get(old_proj_id, old_proj_id)

        # Check for UUID collision
        if uuid_exists_in_pg("stages", old_id):
            stage["id"] = generate_new_uuid()

        # Handle JSON fields
        for key in ["content", "settings", "metadata"]:
            if key in stage and stage[key] is not None:
                if isinstance(stage[key], dict):
                    stage[key] = json.dumps(stage[key])

        columns = list(stage.keys())
        col_names = ", ".join(columns)
        vals = ", ".join([f":{c}" for c in columns])

        try:
            pg_db.execute(
                text(f"INSERT INTO stages ({col_names}) VALUES ({vals})"),
                stage
            )
            pg_db.commit()
            migrated += 1
        except Exception as e:
            pg_db.rollback()
            skipped += 1
            print(f"  Stage migration error: {e}")

    print(f"Stages: {migrated} migrated, {skipped} skipped, {len(stages)} total")


def migrate_ai_call_logs(local_admin_id: str, prod_admin_id: str):
    """Migrate AI call logs"""
    result = sqlite_db.execute(
        text("SELECT * FROM ai_call_logs WHERE user_id = :uid"),
        {"uid": local_admin_id}
    )
    logs = result.mappings().all()

    migrated = 0
    skipped = 0

    for log in logs:
        log = dict(log)
        old_id = log["id"]

        # Map user_id
        log["user_id"] = prod_admin_id

        # Check UUID collision
        if uuid_exists_in_pg("ai_call_logs", old_id):
            log["id"] = generate_new_uuid()

        columns = list(log.keys())
        col_names = ", ".join(columns)
        vals = ", ".join([f":{c}" for c in columns])

        try:
            pg_db.execute(
                text(f"INSERT INTO ai_call_logs ({col_names}) VALUES ({vals})"),
                log
            )
            pg_db.commit()
            migrated += 1
        except Exception as e:
            pg_db.rollback()
            skipped += 1

    print(f"AI Call Logs: {migrated} migrated, {skipped} skipped, {len(logs)} total")


def main():
    print("=" * 60)
    print("Smart Migration: SQLite (local) -> PostgreSQL (production)")
    print("=" * 60)

    local_admin = get_local_admin_user()
    if not local_admin:
        print("ERROR: No admin user found in local SQLite!")
        sys.exit(1)
    print(f"\nLocal admin: {local_admin['username']} (id={local_admin['id']})")

    prod_admin = get_production_admin_user()
    if not prod_admin:
        print("ERROR: No admin user found in production PostgreSQL!")
        sys.exit(1)
    print(f"Production admin: {prod_admin['username']} (id={prod_admin['id']})")

    print("\n" + "=" * 60)
    print("Step 1: Migrating projects")
    print("=" * 60)
    uuid_map = migrate_projects(local_admin["id"], prod_admin["id"])

    print("\n" + "=" * 60)
    print("Step 2: Migrating stages")
    print("=" * 60)
    migrate_stages(uuid_map)

    print("\n" + "=" * 60)
    print("Step 3: Migrating AI call logs")
    print("=" * 60)
    migrate_ai_call_logs(local_admin["id"], prod_admin["id"])

    print("\n" + "=" * 60)
    print("Migration completed!")
    print("=" * 60)

    sqlite_db.close()
    pg_db.close()


if __name__ == "__main__":
    main()
