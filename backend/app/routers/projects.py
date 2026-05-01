import os
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user
from ..models import User, Project, Stage, StageKey, ProjectStatus, PromoteTask
from ..schemas import (
    ProjectCreate, ProjectUpdate, ProjectInfo, ProjectDetail,
    PromoteTaskCreate, PromoteTaskUpdate, PromoteTaskInfo,
    CompleteStageRequest, ProjectStatusUpdate, BaseResponse, StageContentUpdate
)
from ..services.logger import OperationLogger
from ..config import get_settings
from sqlalchemy import func

router = APIRouter(prefix="/projects", tags=["projects"])


def _check_project_limit(user: User, db) -> None:
    """项目数量不再限制（免费无限）"""
    pass


def _project_to_detail(project: Project) -> ProjectDetail:
    """将 Project 模型转换为详情 Schema"""
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
                "is_locked": s.is_locked
            }
            for s in sorted(project.stages, key=lambda x: ([
                "idea", "validate", "prototype", "ship", "grow", "monetize",
                # 兼容旧数据
                "research", "dev", "design", "test", "complete", "launch", "promote", "maintain"
            ]).index(x.stage_key.value) if x.stage_key.value in [
                "idea", "validate", "prototype", "ship", "grow", "monetize",
                "research", "dev", "design", "test", "complete", "launch", "promote", "maintain"
            ] else 99)
        ],
        promote_tasks=[
            {
                "id": t.id,
                "text": t.text,
                "done": t.done,
                "sort_order": t.sort_order
            }
            for t in sorted(project.promote_tasks, key=lambda x: x.sort_order)
        ],
        promote_suggestions=[
            {
                "id": s.id,
                "channels": s.channels,
                "templates": s.templates,
                "created_at": s.created_at
            }
            for s in sorted(project.promote_suggestions, key=lambda x: x.created_at, reverse=True)
        ]
    )


@router.get("", response_model=List[ProjectInfo])
def list_projects(
    status: ProjectStatus = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取项目列表（不含软删除）"""
    query = db.query(Project).filter(
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    )

    if status:
        query = query.filter(Project.status == status)

    projects = query.order_by(Project.created_at.desc()).all()
    return projects


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    request: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建新项目"""
    _check_project_limit(current_user, db)

    # 创建项目
    project = Project(
        user_id=current_user.id,
        title=request.title,
        pain_point=request.pain_point,
        original_idea=request.original_idea
    )
    db.add(project)
    db.flush()  # 获取 project.id

    # 创建6个默认阶段 (Vibe/独立开发工作流)
    stage_keys = [StageKey.IDEA, StageKey.VALIDATE, StageKey.PROTOTYPE, StageKey.SHIP, StageKey.GROW, StageKey.MONETIZE]
    for key in stage_keys:
        stage = Stage(
            project_id=project.id,
            stage_key=key,
            content="",
            is_locked=(key != StageKey.IDEA)  # 只有第一个阶段解锁
        )
        db.add(stage)

    db.commit()
    db.refresh(project)

    # 记录日志
    logger = OperationLogger(db)
    logger.log_create(
        current_user.id,
        "project",
        project.id,
        {"title": project.title, "pain_point": project.pain_point}
    )

    return _project_to_detail(project)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取项目详情"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return _project_to_detail(project)


@router.put("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: UUID,
    request: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新项目"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 记录旧值
    old_values = {
        "title": project.title,
        "pain_point": project.pain_point,
        "original_idea": project.original_idea,
        "status": project.status.value,
        "current_stage": project.current_stage.value
    }

    # 更新字段
    if request.title is not None:
        project.title = request.title
    if request.pain_point is not None:
        project.pain_point = request.pain_point
    if request.original_idea is not None:
        project.original_idea = request.original_idea
    if request.status is not None:
        project.status = request.status
    if request.current_stage is not None:
        project.current_stage = request.current_stage

    db.commit()
    db.refresh(project)

    # 记录日志
    logger = OperationLogger(db)
    logger.log_update(
        current_user.id,
        "project",
        project.id,
        old_values,
        {
            "title": project.title,
            "pain_point": project.pain_point,
            "original_idea": project.original_idea,
            "status": project.status.value,
            "current_stage": project.current_stage.value
        }
    )

    return _project_to_detail(project)


@router.delete("/{project_id}", response_model=BaseResponse)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """软删除项目"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from datetime import datetime
    project.deleted_at = datetime.utcnow()
    db.commit()

    # 记录日志
    logger = OperationLogger(db)
    logger.log_delete(
        current_user.id,
        "project",
        project.id,
        {"title": project.title}
    )

    return BaseResponse(message="Project deleted")


@router.put("/{project_id}/status", response_model=ProjectDetail)
def update_project_status(
    project_id: UUID,
    request: ProjectStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新项目状态"""
    return update_project(project_id, ProjectUpdate(status=request.status), current_user, db)


@router.put("/{project_id}/stages/{stage_key}/content", response_model=ProjectDetail)
def update_stage_content(
    project_id: UUID,
    stage_key: StageKey,
    request: StageContentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新阶段内容"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(
        Stage.project_id == project_id,
        Stage.stage_key == stage_key
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    if stage.is_locked:
        raise HTTPException(status_code=400, detail="Stage is locked")

    old_content = stage.content
    stage.content = request.content
    db.commit()

    # 记录日志
    logger = OperationLogger(db)
    logger.log_update(
        current_user.id,
        "stage",
        stage.id,
        {"content": old_content},
        {"content": request.content}
    )

    return _project_to_detail(project)


@router.post("/{project_id}/stages/{stage_key}/reopen", response_model=ProjectDetail)
def reopen_stage(
    project_id: UUID,
    stage_key: StageKey,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """重新打开已完成的阶段，允许继续编辑"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(
        Stage.project_id == project_id,
        Stage.stage_key == stage_key
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    if not stage.is_locked:
        raise HTTPException(status_code=400, detail="Stage is not locked")

    stage.is_locked = False
    stage.completed_at = None
    db.commit()
    db.refresh(project)

    logger = OperationLogger(db)
    logger.log_update(
        current_user.id,
        "stage",
        stage.id,
        {"is_locked": True},
        {"is_locked": False}
    )

    return _project_to_detail(project)


@router.post("/{project_id}/stages/{stage_key}/complete", response_model=ProjectDetail)
def complete_stage(
    project_id: UUID,
    stage_key: StageKey,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """完成阶段"""
    from datetime import datetime

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(
        Stage.project_id == project_id,
        Stage.stage_key == stage_key
    ).first()

    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    if stage.is_locked:
        raise HTTPException(status_code=400, detail="Stage already completed")

    # 完成当前阶段
    stage.is_locked = True
    stage.completed_at = datetime.utcnow()

    # 解锁下一个阶段
    stage_order = ["idea", "validate", "prototype", "ship", "grow", "monetize"]
    # 旧阶段映射到新阶段
    legacy_to_new = {
        "research": "validate",
        "dev": "prototype",
        "design": "prototype",
        "test": "ship",
        "complete": "ship",
        "launch": "ship",
        "promote": "grow",
        "maintain": "monetize"
    }

    # 获取当前阶段对应的新流程阶段
    current_stage_in_order = legacy_to_new.get(stage_key.value, stage_key.value)

    try:
        current_index = stage_order.index(current_stage_in_order)
    except ValueError:
        # 如果阶段不在列表中，默认为第一个
        current_index = 0

    if current_index < len(stage_order) - 1:
        next_stage_key = StageKey(stage_order[current_index + 1])
        next_stage = db.query(Stage).filter(
            Stage.project_id == project_id,
            Stage.stage_key == next_stage_key
        ).first()
        if next_stage:
            next_stage.is_locked = False
            project.current_stage = next_stage_key
        else:
            # 如果下一阶段不存在，创建它
            new_stage = Stage(
                project_id=project_id,
                stage_key=next_stage_key,
                content='',
                is_locked=False
            )
            db.add(new_stage)
            project.current_stage = next_stage_key
    else:
        # 已经是最后一个阶段，保持在当前阶段
        pass

    db.commit()
    db.refresh(project)

    return _project_to_detail(project)


# ===== 推广任务 =====

@router.post("/{project_id}/tasks", response_model=ProjectDetail)
def add_promote_task(
    project_id: UUID,
    request: PromoteTaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """添加推广任务"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 获取当前最大排序
    max_order = db.query(PromoteTask).filter(
        PromoteTask.project_id == project_id
    ).count()

    task = PromoteTask(
        project_id=project_id,
        text=request.text,
        sort_order=max_order
    )
    db.add(task)
    db.commit()

    logger = OperationLogger(db)
    logger.log_create(current_user.id, "promote_task", task.id, {"text": request.text})

    return _project_to_detail(project)


@router.put("/{project_id}/tasks/{task_id}", response_model=ProjectDetail)
def update_promote_task(
    project_id: UUID,
    task_id: UUID,
    request: PromoteTaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新推广任务"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = db.query(PromoteTask).filter(
        PromoteTask.id == task_id,
        PromoteTask.project_id == project_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_values = {"text": task.text, "done": task.done}

    if request.text is not None:
        task.text = request.text
    if request.done is not None:
        task.done = request.done

    db.commit()

    logger = OperationLogger(db)
    logger.log_update(current_user.id, "promote_task", task.id, old_values, {
        "text": task.text, "done": task.done
    })

    return _project_to_detail(project)


@router.delete("/{project_id}/tasks/{task_id}", response_model=ProjectDetail)
def delete_promote_task(
    project_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除推广任务"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id,
        Project.deleted_at.is_(None)
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = db.query(PromoteTask).filter(
        PromoteTask.id == task_id,
        PromoteTask.project_id == project_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    logger = OperationLogger(db)
    logger.log_delete(current_user.id, "promote_task", task_id, {"text": task.text})

    return _project_to_detail(project)
