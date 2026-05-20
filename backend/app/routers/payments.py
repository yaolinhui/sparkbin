import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from urllib.parse import urlparse

from ..database import get_db
from ..auth import get_current_user
from ..models import User, CreditTransaction
from ..config import get_settings
from ..schemas import (
    PurchaseCreditsRequest,
    CheckoutSessionResponse,
    CreditsStatusResponse,
    CreditPack,
    CreditTransactionInfo,
    BaseResponse,
    CreateCheckoutRequest,
    SubscriptionStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def _is_allowed_redirect_url(url: str) -> bool:
    """校验 redirect URL 域名白名单"""
    allowed_domains = {
        urlparse(settings.frontend_url).netloc,
    }
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and parsed.netloc in allowed_domains


def _parse_credit_packs() -> List[CreditPack]:
    """解析配置的额度包列表"""
    packs: List[CreditPack] = []
    for pack_str in settings.credits_packs.split(","):
        pack_str = pack_str.strip()
        if not pack_str:
            continue
        price_str, credits_str = pack_str.split(":")
        price = float(price_str.strip())
        credits = int(credits_str.strip())
        label = f"${price} / {credits} Credits"
        packs.append(CreditPack(price_usd=price, credits=credits, label=label))
    return packs


@router.get("/credit-packs")
def list_credit_packs() -> List[CreditPack]:
    """获取可用的 AI 额度包列表"""
    if not settings.enable_payments:
        return []
    return _parse_credit_packs()


@router.post("/purchase-credits", response_model=CheckoutSessionResponse)
def purchase_credits(
    request: PurchaseCreditsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建 Stripe Checkout Session 购买 AI 额度（一次性付款）"""
    current_settings = get_settings()
    if not current_settings.enable_payments:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="支付功能未启用",
        )

    if not current_settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe 未配置，请联系管理员配置 STRIPE_SECRET_KEY",
        )

    packs = _parse_credit_packs()
    if request.pack_index < 0 or request.pack_index >= len(packs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的额度包索引",
        )

    pack = packs[request.pack_index]

    if not _is_allowed_redirect_url(request.success_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="success_url 域名不在白名单中"
        )
    if not _is_allowed_redirect_url(request.cancel_url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cancel_url 域名不在白名单中"
        )

    try:
        # 确保用户有 stripe_customer_id
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            safe_username = current_user.username or current_user.email or "user"
            customer = stripe.Customer.create(
                email=f"{safe_username}@sparkbin.test",
                name=safe_username,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"AI Credits - {pack.credits} Credits",
                        },
                        "unit_amount": int(pack.price_usd * 100),  # 美分
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "type": "credit_purchase",
                "credits": str(pack.credits),
                "amount_usd": str(pack.price_usd),
            },
        )

        return CheckoutSessionResponse(session_url=session.url, session_id=session.id)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e.user_message or str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe 错误: {e.user_message or str(e)}",
        )
    except Exception as e:
        logger.exception("Failed to create checkout session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建结算会话失败: {str(e)}",
        )


@router.get("/credits-status", response_model=CreditsStatusResponse)
def get_credits_status(current_user: User = Depends(get_current_user)):
    """获取当前用户的 AI 额度状态"""
    return CreditsStatusResponse(
        credits=current_user.ai_credits,
        total_consumed=current_user.ai_credits_total_consumed,
    )


@router.get("/credit-transactions", response_model=List[CreditTransactionInfo])
def list_credit_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的额度流水记录"""
    if limit < 1:
        limit = 1
    elif limit > 200:
        limit = 200

    txs = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == current_user.id
    ).order_by(
        CreditTransaction.created_at.desc()
    ).limit(limit).all()

    return [
        CreditTransactionInfo(
            id=t.id,
            type=t.type,
            amount=t.amount,
            balance_after=t.balance_after,
            description=t.description or "",
            reference_id=t.reference_id,
            created_at=t.created_at,
        )
        for t in txs
    ]


# ===== 兼容/演示接口 =====

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session_demo(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建 Stripe Checkout Session（演示/测试用途，用于 MonetizeStage 预览用户自己的定价）"""
    current_settings = get_settings()
    if not current_settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe 未配置",
        )

    item = request.items[0] if request.items else None
    if not item:
        raise HTTPException(status_code=400, detail="至少选择一个项目")

    try:
        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": item.name},
                    "unit_amount": int(item.price * 100),
                },
                "quantity": 1,
            }
        ]

        customer_id = current_user.stripe_customer_id
        if not customer_id:
            safe_username = current_user.username or current_user.email or "user"
            customer = stripe.Customer.create(
                email=f"{safe_username}@sparkbin.test",
                name=safe_username,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "type": "demo_checkout",
            },
        )

        return CheckoutSessionResponse(session_url=session.url, session_id=session.id)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e.user_message or str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Stripe 错误: {e.user_message or str(e)}",
        )


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
def get_subscription_status(current_user: User = Depends(get_current_user)):
    """获取当前用户的订阅状态（兼容旧接口，返回虚拟状态）"""
    return SubscriptionStatusResponse(
        status="active" if current_user.ai_credits > 0 else "inactive",
        tier_id="free",
        stripe_customer_id=current_user.stripe_customer_id,
        stripe_subscription_id=None,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """接收 Stripe Webhook 事件"""
    current_settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not current_settings.stripe_webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured, webhook rejected")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook endpoint unavailable: STRIPE_WEBHOOK_SECRET is not configured",
        )

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, current_settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})
    logger.info(f"Received Stripe webhook: {event_type}")

    if event_type == "checkout.session.completed":
        _handle_checkout_session_completed(data_object, db)

    return {"received": True}


def _handle_checkout_session_completed(session: Dict[str, Any], db: Session):
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id")
    session_type = metadata.get("type")
    session_id = session.get("id")

    if not user_id:
        logger.warning("Webhook missing user_id in metadata")
        return

    from uuid import UUID
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
    except Exception:
        logger.warning(f"Invalid user_id in webhook: {user_id}")
        return

    if not user:
        logger.warning(f"User not found: {user_id}")
        return

    # 幂等性保护：检查该 session 是否已处理过
    if session_id:
        existing_tx = db.query(CreditTransaction).filter(
            CreditTransaction.reference_id == session_id
        ).first()
        if existing_tx:
            logger.info(f"Webhook session {session_id} already processed, skipping")
            return

    # 只处理额度购买
    if session_type == "credit_purchase":
        credits_to_add = int(metadata.get("credits", 0))
        if credits_to_add <= 0:
            logger.warning(f"Invalid credits in webhook metadata: {metadata.get('credits')}")
            return

        old_balance = user.ai_credits
        user.ai_credits += credits_to_add

        tx = CreditTransaction(
            user_id=user.id,
            type="purchase",
            amount=credits_to_add,
            balance_after=user.ai_credits,
            description=f"购买 {credits_to_add} AI 额度",
            reference_id=session_id,
        )
        db.add(tx)
        db.commit()

        logger.info(
            f"User {user_id} purchased {credits_to_add} credits. "
            f"Balance: {old_balance} -> {user.ai_credits}"
        )
