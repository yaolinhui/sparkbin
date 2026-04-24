from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..auth import verify_password, create_access_token, get_current_user, hash_password
from ..models import User
from ..schemas import (
    LoginRequest, LoginResponse, ChangePasswordRequest, BaseResponse,
    PreferredModelUpdate, PetConfigUpdate, ThemePreferenceUpdate
)
from ..models import AIProvider

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == request.username).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})
    return LoginResponse(access_token=access_token)


@router.post("/logout", response_model=BaseResponse)
def logout():
    """用户登出（客户端删除 Token 即可）"""
    return BaseResponse(message="已登出")


@router.post("/change-password", response_model=BaseResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """修改密码"""
    if not verify_password(request.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )

    current_user.password_hash = hash_password(request.new_password)
    db.commit()

    return BaseResponse(message="密码修改成功")


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "preferred_model": current_user.preferred_model.value if current_user.preferred_model else None,
        "subscription_status": current_user.subscription_status or "inactive",
        "stripe_customer_id": current_user.stripe_customer_id,
        "stripe_subscription_id": current_user.stripe_subscription_id,
        "current_tier_id": current_user.current_tier_id,
        "pet_config": current_user.pet_config,
        "theme_preference": current_user.theme_preference or "dark",
        "created_at": current_user.created_at
    }


@router.get("/preferred-model")
def get_preferred_model(current_user: User = Depends(get_current_user)):
    """获取用户首选 AI 模型"""
    return {
        "provider": current_user.preferred_model.value if current_user.preferred_model else None
    }


@router.put("/preferred-model", response_model=BaseResponse)
def update_preferred_model(
    request: PreferredModelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新用户首选 AI 模型"""
    current_user.preferred_model = request.provider
    db.commit()

    provider_name = request.provider.value if request.provider else "None"
    return BaseResponse(message=f"首选模型已更新为: {provider_name}")


@router.put("/me/pet-config", response_model=BaseResponse)
def update_pet_config(
    request: PetConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新 AI 宠物配置"""
    new_config = dict(current_user.pet_config) if current_user.pet_config else {
        "type": "cat",
        "name": "",
        "personality": "gentle",
        "verbosity": "moderate"
    }

    if request.type is not None:
        new_config["type"] = request.type
    if request.name is not None:
        new_config["name"] = request.name
    if request.personality is not None:
        new_config["personality"] = request.personality
    if request.verbosity is not None:
        new_config["verbosity"] = request.verbosity

    current_user.pet_config = new_config
    db.commit()
    return BaseResponse(message="宠物配置已更新")


@router.get("/theme")
def get_theme_preference(current_user: User = Depends(get_current_user)):
    """获取用户主题偏好"""
    return {
        "theme": current_user.theme_preference or "dark"
    }


@router.put("/theme", response_model=BaseResponse)
def update_theme_preference(
    request: ThemePreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新主题偏好"""
    current_user.theme_preference = request.theme
    db.commit()
    return BaseResponse(message=f"主题偏好已更新为: {request.theme}")

