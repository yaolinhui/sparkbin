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


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


# 用户表
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    preferred_model = Column(Enum(AIProvider), nullable=True)  # 用户首选 AI 模型

    # 订阅/支付状态（Stripe Test Mode）
    subscription_status = Column(String(20), default="inactive", nullable=False)  # inactive / active / past_due / canceled
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_tier_id = Column(String(50), nullable=True)  # 当前订阅的 pricing tier id

    # AI 宠物配置（JSON 格式持久化）
    pet_config = Column(JSON, default=dict, nullable=True)

    # 主题偏好
    theme_preference = Column(String(20), default="dark", nullable=True)  # dark / light

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
    provider = Column(Enum(AIProvider), nullable=False)
    model = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    status = Column(String(20), default="success")  # success / error
    error_msg = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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
