import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, ForeignKey, Enum, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from .database import Base


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"
    RESEARCH = "research"  # 兼容旧数据


class StageKey(str, enum.Enum):
    # Vibe/独立开发专用阶段流程
    IDEA = "idea"           # 想法
    VALIDATE = "validate"   # 验证（快速确认需求）
    PROTOTYPE = "prototype" # 原型（MVP，不完美但可用）
    SHIP = "ship"           # 发布（尽快上线）
    GROW = "grow"           # 增长（获取用户）
    MONETIZE = "monetize"   # 变现（独立开发要赚钱）
    # 兼容旧数据（已废弃）
    RESEARCH = "research"
    DEV = "dev"
    DESIGN = "design"
    TEST = "test"
    COMPLETE = "complete"
    LAUNCH = "launch"
    PROMOTE = "promote"
    MAINTAIN = "maintain"


class AIProvider(str, enum.Enum):
    DEEPSEEK = "deepseek"
    KIMI = "kimi"
    DOUBAO = "doubao"
    OPENAI = "openai"
    OLLAMA = "ollama"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


# 用户表
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    preferred_model = Column(Enum(AIProvider), nullable=True)  # 用户首选 AI 模型

    # 第三方登录
    oauth_provider = Column(String(20), nullable=True)  # google / github
    oauth_id = Column(String(255), nullable=True, index=True)
    avatar_url = Column(String(500), nullable=True)

    # 订阅/支付状态（Stripe Test Mode）
    subscription_status = Column(String(20), default="inactive", nullable=False)  # inactive / active / past_due / canceled
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_tier_id = Column(String(50), nullable=True)  # 当前订阅的 pricing tier id

    # AI 宠物配置（JSON 格式持久化）
    pet_config = Column(JSON, default=dict, nullable=True)

    # 主题偏好
    theme_preference = Column(String(20), default="dark", nullable=True)  # dark / light

    # AI 额度系统（替代订阅制）
    ai_credits = Column(Integer, default=20, nullable=False)  # 当前可用 AI 额度
    ai_credits_total_consumed = Column(Integer, default=0, nullable=False)  # 累计消耗统计

    # 安全字段
    require_password_change = Column(Boolean, default=False, nullable=False)
    token_version = Column(Integer, default=0, nullable=False)  # 用于使旧 token 失效

    # GitHub 仓库导入（分步授权 token 加密存储）
    github_access_token_encrypted = Column(Text, nullable=True)
    github_token_scope = Column(String(50), nullable=True)
    github_token_updated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    operation_logs = relationship("OperationLog", back_populates="user", cascade="all, delete-orphan")


# 项目表
class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    pain_point = Column(Text, default="")
    original_idea = Column(Text, default="", nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False)
    current_stage = Column(Enum(StageKey), default=StageKey.IDEA, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)  # 软删除

    user = relationship("User", back_populates="projects")
    stages = relationship("Stage", back_populates="project", cascade="all, delete-orphan")
    promote_tasks = relationship("PromoteTask", back_populates="project", cascade="all, delete-orphan")
    promote_suggestions = relationship("PromoteSuggestion", back_populates="project", cascade="all, delete-orphan")


# 阶段表
class Stage(Base):
    __tablename__ = "stages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    stage_key = Column(Enum(StageKey), nullable=False)
    content = Column(Text, default="")
    completed_at = Column(DateTime, nullable=True)
    is_locked = Column(Boolean, default=False)

    project = relationship("Project", back_populates="stages")


# 推广任务表
class PromoteTask(Base):
    __tablename__ = "promote_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    text = Column(Text, nullable=False)
    done = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)

    project = relationship("Project", back_populates="promote_tasks")


# AI 推广建议表
class PromoteSuggestion(Base):
    __tablename__ = "promote_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    channels = Column(JSON, default=list)
    templates = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="promote_suggestions")


# AI 配置表（API Key 加密存储）
class AIConfig(Base):
    __tablename__ = "ai_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(Enum(AIProvider), unique=True, nullable=False)
    base_url = Column(String(255), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)  # 加密的 API Key
    default_model = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


# AI 调用日志表
class AICallLog(Base):
    __tablename__ = "ai_call_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    provider = Column(Enum(AIProvider), nullable=False)
    model = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    status = Column(String(20), default="success")  # success / error
    error_msg = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


# 登录审计日志表
class LoginAuditLog(Base):
    __tablename__ = "login_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=False, default="unknown")
    user_agent = Column(String(500), nullable=False, default="")
    action = Column(String(30), nullable=False)  # login_success / login_failure / logout / password_change
    detail = Column(Text, default="")  # 失败原因等额外信息
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User")


# Agent 执行运行表（多 Agent 并行任务跟踪）
class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    status = Column(String(20), default="running", nullable=False)  # running / completed / failed / cancelled
    trigger = Column(String(50), default="manual", nullable=False)  # manual / auto / scheduled
    strategy = Column(String(50), default="parallel", nullable=False)  # parallel / sequential / router
    summary = Column(Text, default="")  # 运行总结
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User")
    project = relationship("Project")
    tasks = relationship("AgentTask", back_populates="run", cascade="all, delete-orphan")


# Agent 单任务表
class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("agent_runs.id"), nullable=False)
    agent_type = Column(String(50), nullable=False)  # router / idea / validate / prototype / ship / grow / monetize / analyst
    status = Column(String(20), default="pending", nullable=False)  # pending / running / completed / failed
    provider = Column(Enum(AIProvider), nullable=False)
    model = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    input_preview = Column(Text, default="")  # 输入摘要
    output_result = Column(Text, default="")  # 输出结果（JSON）
    error_msg = Column(Text, default="")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    run = relationship("AgentRun", back_populates="tasks")


# 额度流水表
class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # grant | purchase | consume | refund
    amount = Column(Integer, nullable=False)   # 正数=增加，负数=扣除
    balance_after = Column(Integer, nullable=False)  # 变动后的余额
    description = Column(String(255), nullable=True)
    reference_id = Column(String(255), nullable=True)  # Stripe session_id 或 AI call log id
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


# 操作日志表
class OperationLog(Base):
    __tablename__ = "operation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # create / update / delete
    entity_type = Column(String(50), nullable=False)  # project / stage / task
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    old_values = Column(Text, default="")  # JSON 字符串
    new_values = Column(Text, default="")  # JSON 字符串
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="operation_logs")
