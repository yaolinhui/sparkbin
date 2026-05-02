from datetime import datetime
from typing import Optional, List, Dict, Any
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
    captcha_answer: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None


# ========== 用户 ==========
class PetConfig(BaseModel):
    """AI 宠物配置"""
    type: str = "cat"  # cat | dog | rabbit | dragon | trae_slime
    name: str = ""
    personality: str = "gentle"  # gentle | rational | zen | sharp
    verbosity: str = "moderate"  # quiet | moderate | chatty


class UserInfo(BaseModel):
    id: UUID
    username: str
    preferred_model: Optional[AIProvider] = None
    pet_config: Optional[PetConfig] = None
    theme_preference: Optional[str] = "dark"
    require_password_change: bool = False
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


class ValidationItemSuggestion(BaseModel):
    title: str
    description: str
    method: str = "survey"  # interview | survey | community | competitor


class ValidationToolSuggestion(BaseModel):
    type: str  # survey | interview | community | competitor
    title: str
    content: str


class ValidateSuggestRequest(BaseModel):
    project_id: Optional[UUID] = None
    title: str
    pain_point: str
    original_idea: str = ""
    current_items: List[ValidationItemSuggestion] = []
    current_tools: List[ValidationToolSuggestion] = []


class ValidateSuggestResponse(BaseModel):
    items: List[ValidationItemSuggestion]
    tools: List[ValidationToolSuggestion]
    analysis: str = ""


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


# ========== Agent 驾驶舱 ==========
class AgentRunRequest(BaseModel):
    project_id: UUID
    strategy: str = "router"  # router | parallel_all | sequential
    provider: Optional[AIProvider] = None


class AgentTaskInfo(BaseModel):
    id: UUID
    agent_type: str
    status: str
    provider: Optional[str] = None
    model: str = ""
    error: str = ""

    class Config:
        from_attributes = True


class AgentRunStatus(BaseModel):
    run_id: UUID
    status: str
    strategy: str
    summary: str = ""
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Dict[str, Any] = Field(default_factory=dict)
    tasks: List[AgentTaskInfo] = Field(default_factory=list)


class AgentRunHistoryItem(BaseModel):
    run_id: UUID
    status: str
    strategy: str
    summary: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== 问卷 ==========
class SurveyQuestion(BaseModel):
    id: str
    type: str = Field(..., pattern="^(single_choice|multi_choice|rating|text)$")
    title: str
    required: bool = True
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    scale: Optional[int] = None  # rating 题型用


class SurveyConfig(BaseModel):
    title: str
    description: str = ""
    questions: List[SurveyQuestion]


class SurveyGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    target_users: str = ""
    question_count: int = Field(default=8, ge=3, le=15)


class SurveyCreate(BaseModel):
    title: str
    description: str = ""
    config: SurveyConfig


class SurveyInfo(BaseModel):
    id: UUID
    public_id: str
    title: str
    description: str
    status: str
    response_count: int
    config: SurveyConfig
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SurveyDetail(SurveyInfo):
    config: SurveyConfig


class SurveyPublishRequest(BaseModel):
    status: str = Field(..., pattern="^(active|closed|archived)$")


class SurveyResponseSubmit(BaseModel):
    answers: Dict[str, Any]


class SurveyResponseInfo(BaseModel):
    id: UUID
    answers: Dict[str, Any]
    respondent_meta: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class SurveyAnalysisRequest(BaseModel):
    pass  # 空请求体，AI 自动分析所有回答


class SurveyAnalysisResponse(BaseModel):
    summary: str
    key_findings: List[str]
    sentiment: Dict[str, int]
    recommendations: List[str]
    next_steps: str


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
