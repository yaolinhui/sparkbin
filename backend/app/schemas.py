from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from .models import ProjectStatus, StageKey, AIProvider


# ========== 通用 ==========
class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None


# ========== 认证 ==========
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ========== 用户 ==========
class UserInfo(BaseModel):
    id: UUID
    username: str
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 阶段 ==========
class StageInfo(BaseModel):
    id: UUID
    stage_key: StageKey
    content: str
    completed_at: Optional[datetime]
    is_locked: bool

    class Config:
        from_attributes = True


class StageContentUpdate(BaseModel):
    content: str


# ========== 推广任务 ==========
class PromoteTaskInfo(BaseModel):
    id: UUID
    text: str
    done: bool
    sort_order: int

    class Config:
        from_attributes = True


class PromoteTaskCreate(BaseModel):
    text: str


class PromoteTaskUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None


# ========== AI 建议 ==========
class AISuggestionsInfo(BaseModel):
    channels: List[str]
    templates: List[str]

    class Config:
        from_attributes = True


class PromoteSuggestionInfo(BaseModel):
    id: UUID
    channels: List[str]
    templates: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ========== 项目 ==========
class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    pain_point: str = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    pain_point: Optional[str] = None
    status: Optional[ProjectStatus] = None
    current_stage: Optional[StageKey] = None


class ProjectInfo(ProjectBase):
    id: UUID
    status: ProjectStatus
    current_stage: StageKey
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetail(ProjectInfo):
    stages: List[StageInfo]
    promote_tasks: List[PromoteTaskInfo]
    promote_suggestions: List[PromoteSuggestionInfo]

    class Config:
        from_attributes = True


class ProjectStatusUpdate(BaseModel):
    status: ProjectStatus


class CompleteStageRequest(BaseModel):
    stage_key: StageKey


# ========== AI ==========
class AIProviderInfo(BaseModel):
    provider: AIProvider
    name: str
    is_active: bool


class AIConfigUpdate(BaseModel):
    base_url: str
    api_key: str
    default_model: str
    is_active: bool = True


class AIChatRequest(BaseModel):
    provider: AIProvider
    messages: List[dict]  # [{"role": "user", "content": "..."}, ...]
    stream: bool = True


class AIPromoteSuggestRequest(BaseModel):
    provider: AIProvider
    project_title: str
    pain_point: str
    project_description: str
    project_id: Optional[UUID] = None  # 可选，用于保存建议


# ========== 数据导出 ==========
class ExportData(BaseModel):
    projects: List[ProjectDetail]
    exported_at: datetime


# ========== AI 日志 ==========
class AICallLogInfo(BaseModel):
    id: UUID
    provider: AIProvider
    model: str
    prompt_tokens: int
    completion_tokens: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
