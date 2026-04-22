import logging
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..auth import get_current_user
from ..models import User
from ..config import get_settings
from ..schemas import (
    CreateCheckoutRequest,
    CheckoutSessionResponse,
    SubscriptionStatusResponse,
    BaseResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    request: CreateCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建 Stripe Checkout Session（测试模式）"""
    if not settings.stripe_secret_key or not settings.stripe_secret_key.startswith("sk_test_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe 测试模式未配置，请联系管理员配置 STRIPE_SECRET_KEY",
        )

    if not request.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="至少选择一个定价档位",
        )

    # 取第一个 item 作为主要订阅项（当前 MVP 只支持单档位订阅）
    item = request.items[0]

    try:
        line_items = []
        price_data: Dict[str, Any] = {
            "currency": "usd",
            "product_data": {"name": item.name},
            "unit_amount": int(item.price * 100),  # Stripe 使用美分
        }

        if item.period in ("month", "year"):
            price_data["recurring"] = {"interval": item.period}

        line_items.append(
            {
                "price_data": price_data,
                "quantity": 1,
            }
        )

        # 确保用户有 stripe_customer_id
        customer_id = current_user.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=f"{current_user.username}@sparkbin.test",
                name=current_user.username,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id
            current_user.stripe_customer_id = customer_id
            db.commit()

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=line_items,
            mode="subscription" if item.period in ("month", "year") else "payment",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "tier_id": item.tier_id,
                "tier_name": item.name,
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


@router.get("/subscription-status", response_model=SubscriptionStatusResponse)
def get_subscription_status(current_user: User = Depends(get_current_user)):
    """获取当前用户的订阅状态"""
    return SubscriptionStatusResponse(
        status=current_user.subscription_status or "inactive",
        tier_id=current_user.current_tier_id,
        stripe_customer_id=current_user.stripe_customer_id,
        stripe_subscription_id=current_user.stripe_subscription_id,
    )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """接收 Stripe Webhook 事件"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.stripe_webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured, webhook rejected")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook endpoint unavailable: STRIPE_WEBHOOK_SECRET is not configured",
        )

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
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
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_object, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_object, db)
    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data_object, db)

    return {"received": True}


def _handle_checkout_session_completed(session: Dict[str, Any], db: Session):
    metadata = session.get("metadata", {})
    user_id = metadata.get("user_id")
    tier_id = metadata.get("tier_id")

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

    # 如果 session 中有 subscription，记录下来
    subscription_id = session.get("subscription")
    if subscription_id:
        user.stripe_subscription_id = subscription_id
        user.subscription_status = "active"
    else:
        # 一次性付款没有 subscription
        user.subscription_status = "active"

    if tier_id:
        user.current_tier_id = tier_id

    db.commit()
    logger.info(f"User {user_id} subscription activated via checkout session")


def _handle_subscription_updated(subscription: Dict[str, Any], db: Session):
    customer_id = subscription.get("customer")
    status = subscription.get("status")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    # Stripe subscription status: incomplete, active, past_due, canceled, unpaid
    if status in ("active", "trialing"):
        user.subscription_status = "active"
    elif status == "past_due":
        user.subscription_status = "past_due"
    elif status in ("canceled", "unpaid", "incomplete_expired"):
        user.subscription_status = "canceled"
    else:
        user.subscription_status = status or "inactive"

    user.stripe_subscription_id = subscription.get("id")
    db.commit()
    logger.info(f"User {user.id} subscription updated to {user.subscription_status}")


def _handle_subscription_deleted(subscription: Dict[str, Any], db: Session):
    customer_id = subscription.get("customer")
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if user:
        user.subscription_status = "canceled"
        db.commit()
        logger.info(f"User {user.id} subscription deleted")


def _handle_payment_failed(invoice: Dict[str, Any], db: Session):
    customer_id = invoice.get("customer")
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if user:
        user.subscription_status = "past_due"
        db.commit()
        logger.info(f"User {user.id} payment failed")
