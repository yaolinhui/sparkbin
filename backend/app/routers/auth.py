from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..auth import verify_password, create_access_token, get_current_user, hash_password
from ..models import User
from ..schemas import LoginRequest, LoginResponse, ChangePasswordRequest, BaseResponse

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
        "created_at": current_user.created_at
    }

