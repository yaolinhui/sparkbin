from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import json
import re

from ..database import get_db
from ..auth import get_current_user, require_admin
from ..models import User, OperationLog

router = APIRouter(prefix="/admin", tags=["admin"])

# 敏感字段集合：精确匹配 + 正则模式
_SENSITIVE_KEYS = {
    "password", "password_hash", "api_key", "api_key_encrypted",
    "secret", "secret_key", "token", "refresh_token", "access_token",
    "authorization", "cookie", "session",
}
_SENSITIVE_PATTERNS = [
    re.compile(r".*password.*", re.I),
    re.compile(r".*secret.*", re.I),
    re.compile(r".*token.*", re.I),
    re.compile(r".*api[_-]?key.*", re.I),
]


def _is_sensitive_key(key: str) -> bool:
    k = key.lower()
    if k in _SENSITIVE_KEYS:
        return True
    for pattern in _SENSITIVE_PATTERNS:
        if pattern.match(k):
            return True
    return False


def _redact_sensitive(obj):
    """递归扫描并红码敏感字段"""
    if isinstance(obj, dict):
        return {
            k: "***" if _is_sensitive_key(k) else _redact_sensitive(v)
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
    max_limit = 1000
    if limit < 1:
        limit = 1
    elif limit > max_limit:
        limit = max_limit

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
