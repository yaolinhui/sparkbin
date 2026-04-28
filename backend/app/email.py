"""
邮件发送服务（基于 Resend）
用于：注册验证、密码重置
"""
import html
import os
from typing import Optional

from .config import get_settings

_settings = get_settings()


def _has_resend() -> bool:
    return bool(_settings.resend_api_key and _settings.resend_api_key != "")


def _send_email(to: str, subject: str, html_body: str, text_body: str) -> tuple[bool, Optional[str]]:
    """发送邮件，返回 (success, error_message)"""
    if not _has_resend():
        # 开发环境：打印到控制台，不实际发送
        print(f"\n[EMAIL MOCK] To: {to}\nSubject: {subject}\n{text_body}\n")
        return True, None

    try:
        # 延迟导入，避免未安装 resend 时崩溃
        import resend
        resend.api_key = _settings.resend_api_key

        params: resend.Emails.SendParams = {
            "from": _settings.resend_from_email,
            "to": [to],
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }
        resend.Emails.send(params)
        return True, None
    except Exception as e:
        return False, str(e)


def send_verification_email(to_email: str, username: str, verify_url: str) -> tuple[bool, Optional[str]]:
    """发送邮箱验证邮件"""
    safe_username = html.escape(username)
    safe_verify_url = html.escape(verify_url)
    subject = "验证您的 SparkBin 账号"
    text_body = f"""Hi {safe_username},

感谢您注册 SparkBin！请点击以下链接验证您的邮箱：

{verify_url}

该链接 24 小时内有效。

如果这不是您本人的操作，请忽略此邮件。

— SparkBin Team
"""
    html_body = f"""
<div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;border:2px solid #000;">
  <h2 style="margin-top:0;">验证您的 SparkBin 账号</h2>
  <p>Hi {safe_username}, 感谢您注册 SparkBin！</p>
  <p>请点击下方按钮验证邮箱：</p>
  <a href="{safe_verify_url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;font-weight:bold;">验证邮箱</a>
  <p style="color:#666;font-size:12px;">或复制链接到浏览器：{safe_verify_url}</p>
  <p style="color:#666;font-size:12px;">该链接 24 小时内有效。</p>
  <hr style="border:none;border-top:2px solid #000;"/>
  <p style="font-size:12px;color:#666;">如果这不是您本人的操作，请忽略此邮件。</p>
</div>
"""
    return _send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(to_email: str, username: str, reset_url: str) -> tuple[bool, Optional[str]]:
    """发送密码重置邮件"""
    safe_username = html.escape(username)
    safe_reset_url = html.escape(reset_url)
    subject = "重置您的 SparkBin 密码"
    text_body = f"""Hi {safe_username},

您请求重置 SparkBin 密码。请点击以下链接：

{reset_url}

该链接 24 小时内有效。

如果这不是您本人的操作，请忽略此邮件。

— SparkBin Team
"""
    html_body = f"""
<div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;border:2px solid #000;">
  <h2 style="margin-top:0;">重置您的 SparkBin 密码</h2>
  <p>Hi {safe_username}, 您请求重置密码。</p>
  <p>请点击下方按钮重置密码：</p>
  <a href="{safe_reset_url}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;font-weight:bold;">重置密码</a>
  <p style="color:#666;font-size:12px;">或复制链接到浏览器：{safe_reset_url}</p>
  <p style="color:#666;font-size:12px;">该链接 24 小时内有效。</p>
  <hr style="border:none;border-top:2px solid #000;"/>
  <p style="font-size:12px;color:#666;">如果这不是您本人的操作，请忽略此邮件。</p>
</div>
"""
    return _send_email(to_email, subject, html_body, text_body)
