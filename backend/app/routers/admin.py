from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth import get_current_user, require_admin
from ..models import User, OperationLog

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/logs")
def list_operation_logs(
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """获取操作日志"""
    logs = db.query(OperationLog).order_by(
        OperationLog.created_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "created_at": log.created_at
        }
        for log in logs
    ]
