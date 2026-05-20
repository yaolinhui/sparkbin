import uuid
import json
import httpx
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Project, Stage, ProjectStatus, StageKey, UserRole
from ..schemas import (
    GitHubRepoInfo,
    GitHubImportPreviewRequest,
    GitHubImportPreviewResponse,
    GitHubImportCreateRequest,
    ProjectDetail,
)
from ..auth import get_current_user
from ..encryption import get_encryption_manager
from ..services.github_import import get_github_import_service
from ..services.ai_proxy import AIProxyService
from ..models import OperationLog

router = APIRouter(prefix="/github", tags=["github"])


def _get_user_github_token(user: User) -> Optional[str]:
    """解密获取用户的 GitHub access token"""
    if not user.github_access_token_encrypted:
        return None
    try:
        return get_encryption_manager().decrypt(user.github_access_token_encrypted)
    except Exception:
        return None


@router.get("/repos", response_model=list[GitHubRepoInfo])
async def list_github_repos(
    per_page: int = 30,
    page: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 校验分页参数范围
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    """获取当前用户绑定的 GitHub 仓库列表"""
    token = _get_user_github_token(current_user)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected. Please connect your GitHub account first.",
        )

    service = get_github_import_service(token)
    try:
        repos = await service.list_repos(per_page=per_page, page=page)
        return [GitHubRepoInfo(**r) for r in repos]
    except ValueError as e:
        if "token invalid" in str(e).lower() or "expired" in str(e).lower():
            # Token 失效，清空数据库中的 token
            current_user.github_access_token_encrypted = None
            current_user.github_token_scope = None
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="GitHub token expired. Please reconnect your GitHub account.",
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.post("/preview", response_model=GitHubImportPreviewResponse)
async def preview_github_import(
    request: GitHubImportPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """预览从 GitHub 仓库导入的解析结果"""
    token = _get_user_github_token(current_user)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected.",
        )

    service = get_github_import_service(token)
    try:
        # 抓取仓库数据
        repo_data = await service.fetch_repo_data(request.owner, request.repo)
        # AI 解析
        analysis = await service.analyze_repo(repo_data)
        return GitHubImportPreviewResponse(**analysis)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))


@router.post("/import", response_model=ProjectDetail)
async def create_project_from_github(
    request: GitHubImportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从 GitHub 仓库导入创建项目"""
    token = _get_user_github_token(current_user)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub account not connected.",
        )

    # 验证阶段
    valid_stages = ["idea", "validate", "prototype", "ship", "grow", "monetize"]
    stage = request.stage.lower()
    if stage not in valid_stages:
        stage = "idea"

    # 创建项目
    project = Project(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=request.title,
        pain_point=request.pain_point,
        original_idea=request.original_idea,
        status=ProjectStatus.ACTIVE,
        current_stage=StageKey(stage),
    )
    db.add(project)
    db.flush()

    # 创建 6 个阶段
    stage_keys = ["idea", "validate", "prototype", "ship", "grow", "monetize"]
    for idx, sk in enumerate(stage_keys):
        stage_obj = Stage(
            id=uuid.uuid4(),
            project_id=project.id,
            stage_key=StageKey(sk),
            content="",
            completed_at=None,
            is_locked=sk != stage,  # 只有当前阶段解锁，前面阶段视为已完成
        )
        # 如果当前阶段在目标阶段之前，标记为已完成
        if idx < stage_keys.index(stage):
            stage_obj.is_locked = False
            stage_obj.completed_at = datetime.utcnow()
        db.add(stage_obj)

    # 将 README 内容写入 Idea 阶段
    if request.readme_content:
        idea_stage = db.query(Stage).filter(
            Stage.project_id == project.id,
            Stage.stage_key == StageKey.IDEA,
        ).first()
        if idea_stage:
            idea_stage.content = request.readme_content

    db.commit()
    db.refresh(project)

    # 记录操作日志
    op_log = OperationLog(
        user_id=current_user.id,
        action="create",
        entity_type="project",
        entity_id=project.id,
        new_values=json.dumps({"title": request.title, "source": "github_import", "repo": f"{request.owner}/{request.repo}"}, ensure_ascii=False, default=str),
    )
    db.add(op_log)
    db.commit()

    # 构建返回数据（和现有 POST /projects 一致）
    stages = db.query(Stage).filter(Stage.project_id == project.id).all()
    promote_tasks = []
    promote_suggestions = []

    return ProjectDetail(
        id=project.id,
        title=project.title,
        pain_point=project.pain_point,
        original_idea=project.original_idea,
        status=project.status,
        current_stage=project.current_stage,
        created_at=project.created_at,
        updated_at=project.updated_at,
        stages=[
            {
                "id": s.id,
                "stage_key": s.stage_key,
                "content": s.content,
                "completed_at": s.completed_at,
                "is_locked": s.is_locked,
            }
            for s in stages
        ],
        promote_tasks=promote_tasks,
        promote_suggestions=promote_suggestions,
    )
