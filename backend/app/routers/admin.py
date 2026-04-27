from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import json

from ..database import get_db
from ..auth import get_current_user, require_admin
from ..models import User, OperationLog

router = APIRouter(prefix="/admin", tags=["admin"])

# 敏感字段集合：日志返回时会将这些值替换为 ***
_SENSITIVE_KEYS = {
    "password", "password_hash", "api_key", "api_key_encrypted",
    "secret", "secret_key", "token", "refresh_token", "access_token",
    "authorization", "cookie", "session",
}


def _redact_sensitive(obj):
    """递归扫描并红码敏感字段"""
    if isinstance(obj, dict):
        return {
            k: "***" if k.lower() in _SENSITIVE_KEYS else _redact_sensitive(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, list):
        return [_redact_sensitive(v) for v in obj]
    return obj


def _sanitize_log_values(values: str) -> str:
    """清理日志中的敏感字段"""
    if not values:
        return values
    try:
        parsed = json.loads(values)
    except json.JSONDecodeError:
        return values
    redacted = _redact_sensitive(parsed)
    return json.dumps(redacted, ensure_ascii=False)


@router.get("/logs")
def list_operation_logs(
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """获取操作日志（敏感字段已脱敏）"""
    logs = db.query(OperationLog).order_by(
        OperationLog.created_at.desc()
    ).limit(limit).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": _sanitize_log_values(log.old_values),
            "new_values": _sanitize_log_values(log.new_values),
            "created_at": log.created_at
        }
        for log in logs
    ]
