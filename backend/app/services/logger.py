import json
from uuid import UUID
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional

from ..models import OperationLog


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
        """记录操作日志"""
        log = OperationLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=json.dumps(old_values, ensure_ascii=False, default=str) if old_values else "",
            new_values=json.dumps(new_values, ensure_ascii=False, default=str) if new_values else ""
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
