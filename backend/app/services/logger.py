import json
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional

from ..models import OperationLog

# 复用 admin 模块的脱敏逻辑（避免循环导入，延迟导入）

def _get_redact_func():
    from ..routers.admin import _redact_sensitive
    return _redact_sensitive


class OperationLogger:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        user_id: UUID,
        action: str,  # create / update / delete
        entity_type: str,  # project / stage / task / ai_config
        entity_id: Optional[UUID] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None
    ):
        """记录操作日志（写入前对敏感字段脱敏）"""
        redact = _get_redact_func()
        safe_old = redact(old_values) if old_values else old_values
        safe_new = redact(new_values) if new_values else new_values
        log = OperationLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=json.dumps(safe_old, ensure_ascii=False, default=str) if safe_old else "",
            new_values=json.dumps(safe_new, ensure_ascii=False, default=str) if safe_new else ""
        )
        self.db.add(log)
        self.db.commit()

    def log_create(self, user_id: UUID, entity_type: str, entity_id: UUID, new_values: Dict[str, Any]):
        """记录创建操作"""
        self.log(user_id, "create", entity_type, entity_id, None, new_values)

    def log_update(self, user_id: UUID, entity_type: str, entity_id: UUID, old_values: Dict[str, Any], new_values: Dict[str, Any]):
        """记录更新操作"""
        self.log(user_id, "update", entity_type, entity_id, old_values, new_values)

    def log_delete(self, user_id: UUID, entity_type: str, entity_id: UUID, old_values: Dict[str, Any]):
        """记录删除操作"""
        self.log(user_id, "delete", entity_type, entity_id, old_values, None)
