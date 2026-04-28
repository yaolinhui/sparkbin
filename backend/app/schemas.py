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


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=8)
    honeypot: Optional[str] = Field(default=None)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ========== 用户 ==========
class PetConfig(BaseModel):
    """AI 宠物配置"""
    type: str = "cat"  # cat | dog | rabbit | dragon | trae_slime
    name: str = ""
    personality: str = "gentle"  # gentle | rational | zen | sharp
    verbosity: str = "moderate"  # quiet | moderate | chatty


class UserQuotaInfo(BaseModel):
    ai_calls_used_this_month: int
    ai_calls_limit: int
    projects_used: int
    projects_limit: Optional[int] = None


class UserInfo(BaseModel):
    id: UUID
    username: str
    preferred_model: Optional[AIProvider] = None
    subscription_status: str = "inactive"
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_tier_id: Optional[str] = None
    pet_config: Optional[PetConfig] = None
    theme_preference: Optional[str] = "dark"
    require_password_change: bool = False
    quota: UserQuotaInfo
    created_at: datetime

    class Config:
        from_attributes = True


class PreferredModelUpdate(BaseModel):
    provider: Optional[AIProvider] = None


class PetConfigUpdate(BaseModel):
    """更新 AI 宠物配置"""
    type: Optional[str] = None
    name: Optional[str] = None
    personality: Optional[str] = None
    verbosity: Optional[str] = None


class ThemePreferenceUpdate(BaseModel):
    """更新主题偏好"""
    theme: str = "dark"  # dark | light


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
    original_idea: str = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    pain_point: Optional[str] = None
    original_idea: Optional[str] = None
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


class AITestConfigRequest(BaseModel):
    base_url: str | None = None
    api_key: str | None = None
    default_model: str | None = None


class AIChatRequest(BaseModel):
    provider: AIProvider
    messages: List[dict]  # [{"role": "user", "content": "..."}, ...]
    stream: bool = True
    project_id: Optional[UUID] = None
    stage_key: Optional[StageKey] = None
    enable_stage_loop: bool = True


class AIPromoteSuggestRequest(BaseModel):
    provider: AIProvider
    project_title: str
    pain_point: str
    project_description: str
    project_id: Optional[UUID] = None  # 可选，用于保存建议


class NoteSuggestion(BaseModel):
    title: str
    content: str


class IdeaSuggestRequest(BaseModel):
    project_id: Optional[UUID] = None
    title: str
    pain_point: str
    original_idea: str = ""
    current_notes: List[NoteSuggestion]


class IdeaSuggestResponse(BaseModel):
    notes: List[NoteSuggestion]


# ========== 支付 ==========
class CheckoutItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    price: float = Field(..., ge=0)  # 美元，支持小数（如 9.99）
    period: str = Field(default="month", pattern="^(month|year|lifetime)$")
    tier_id: str = Field(..., min_length=1)


class CreateCheckoutRequest(BaseModel):
    items: List[CheckoutItem]
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    session_url: str
    session_id: str


class SubscriptionStatusResponse(BaseModel):
    status: str = "inactive"
    tier_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None


# ========== 数据导出 ==========
class ExportData(BaseModel):
    projects: List[ProjectDetail]
    exported_at: datetime


# ========== GitHub 导入 ==========
class GitHubRepoInfo(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    stars: int = 0
    forks: int = 0
    updated_at: str


class GitHubImportPreviewRequest(BaseModel):
    owner: str = Field(..., min_length=1)
    repo: str = Field(..., min_length=1)


class GitHubImportPreviewResponse(BaseModel):
    title: str
    pain_point: str
    original_idea: str
    suggested_stage: str
    confidence: int = Field(..., ge=1, le=10)
    readme_excerpt: str
    metadata: dict


class GitHubImportCreateRequest(BaseModel):
    owner: str = Field(..., min_length=1)
    repo: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=255)
    pain_point: str = ""
    original_idea: str = ""
    stage: str = "idea"
    readme_content: str = ""


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
