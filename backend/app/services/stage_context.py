import json
import re
from typing import Any, Dict, List, Tuple

from ..models import Project, Stage, StageKey


def _parse_json(content: str, fallback: Any) -> Any:
    if not content:
        return fallback
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return fallback


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _evaluate_idea(content: str) -> Dict[str, Any]:
    notes = _parse_json(content, [])
    if not isinstance(notes, list):
        notes = []

    required_dimensions: List[Tuple[str, List[str]]] = [
        ("核心痛点", ["核心痛点", "痛点"]),
        ("目标用户", ["目标用户", "用户"]),
        ("使用场景", ["使用场景", "场景"]),
        ("解决方案", ["解决方案", "方案"]),
        ("差异化价值", ["差异化价值", "差异化", "优势"]),
    ]

    filled = 0
    missing_items: List[str] = []
    evidence: List[Dict[str, Any]] = []

    for label, keywords in required_dimensions:
        matched = None
        for note in notes:
            title = _safe_text(note.get("title"))
            if any(keyword in title for keyword in keywords):
                matched = note
                break

        note_content = _safe_text(matched.get("content")) if matched else ""
        is_filled = len(note_content) >= 10
        if is_filled:
            filled += 1
        else:
            missing_items.append(label)

        evidence.append({
            "dimension": label,
            "filled": is_filled,
            "preview": note_content[:120],
        })

    score = int((filled / len(required_dimensions)) * 100)
    return {
        "score": score,
        "filled_count": filled,
        "total_count": len(required_dimensions),
        "missing_items": missing_items,
        "evidence": evidence,
    }


def _evaluate_validate(content: str) -> Dict[str, Any]:
    data = _parse_json(content, {})
    if not isinstance(data, dict):
        data = {}

    items = data.get("items") if isinstance(data.get("items"), list) else []
    validated_count = len([item for item in items if item.get("status") == "validated"])
    valid_items = [
        item for item in items
        if _safe_text(item.get("title")) and _safe_text(item.get("description"))
    ]

    missing_items: List[str] = []
    if len(items) < 3:
        missing_items.append("验证项数量不足（至少 3 条）")
    if len(valid_items) < len(items):
        missing_items.append("存在标题或描述为空的验证项")
    if validated_count == 0:
        missing_items.append("尚未形成任何已验证结论")

    denominator = max(3, len(items))
    score = int((min(len(valid_items), denominator) / denominator) * 100)
    return {
        "score": score,
        "items_count": len(items),
        "validated_count": validated_count,
        "missing_items": missing_items,
        "evidence": [
            {
                "title": _safe_text(item.get("title"))[:80],
                "status": _safe_text(item.get("status")) or "pending",
            }
            for item in items[:10]
        ],
    }


def _evaluate_prototype(content: str) -> Dict[str, Any]:
    data = _parse_json(content, {})
    if not isinstance(data, dict):
        data = {}

    features = data.get("features") if isinstance(data.get("features"), list) else []
    p0_features = [f for f in features if _safe_text(f.get("priority")) == "P0"]
    done_features = [f for f in features if _safe_text(f.get("status")) == "done"]
    selected_platform = _safe_text(data.get("selectedPlatform"))

    missing_items: List[str] = []
    if not selected_platform:
        missing_items.append("未选择平台")
    if len(features) < 3:
        missing_items.append("功能项不足（至少 3 个）")
    if len(p0_features) == 0:
        missing_items.append("缺少 P0 核心功能")
    if len(done_features) == 0:
        missing_items.append("尚无已完成功能")

    score_parts = 0
    if selected_platform:
        score_parts += 1
    if len(features) >= 3:
        score_parts += 1
    if len(p0_features) > 0:
        score_parts += 1
    if len(done_features) > 0:
        score_parts += 1
    score = int((score_parts / 4) * 100)

    return {
        "score": score,
        "features_count": len(features),
        "p0_count": len(p0_features),
        "done_count": len(done_features),
        "missing_items": missing_items,
        "evidence": [
            {
                "name": _safe_text(feature.get("name"))[:80],
                "priority": _safe_text(feature.get("priority")) or "P1",
                "status": _safe_text(feature.get("status")) or "todo",
            }
            for feature in features[:10]
        ],
    }


def _evaluate_ship(content: str) -> Dict[str, Any]:
    data = _parse_json(content, {})
    if not isinstance(data, dict):
        data = {}

    checklist = data.get("checklist") if isinstance(data.get("checklist"), dict) else {}
    checklist_keys = ["domain", "ssl", "payment", "analytics", "socialMedia"]
    def _is_checked(value: Any) -> bool:
        if isinstance(value, bool):
            return value
        return str(value).lower() in ("true", "1", "yes", "on")

    done_count = len([key for key in checklist_keys if _is_checked(checklist.get(key))])

    launch_url = _safe_text(data.get("launchUrl"))
    contents = data.get("contents") if isinstance(data.get("contents"), list) else []

    missing_items: List[str] = []
    if done_count < len(checklist_keys):
        missing_items.append("发布清单未完成")
    if not launch_url:
        missing_items.append("缺少上线链接")
    if len(contents) == 0:
        missing_items.append("缺少平台发布文案")

    score_parts = 0
    if done_count == len(checklist_keys):
        score_parts += 1
    if launch_url:
        score_parts += 1
    if len(contents) > 0:
        score_parts += 1
    score = int((score_parts / 3) * 100)

    return {
        "score": score,
        "checklist_done_count": done_count,
        "checklist_total_count": len(checklist_keys),
        "contents_count": len(contents),
        "has_launch_url": bool(launch_url),
        "missing_items": missing_items,
        "evidence": {
            "launch_url": launch_url[:120],
            "checklist": {key: bool(checklist.get(key)) for key in checklist_keys},
        },
    }


def _evaluate_grow(content: str) -> Dict[str, Any]:
    data = _parse_json(content, {})
    if not isinstance(data, dict):
        data = {}

    calendar = data.get("contentCalendar") if isinstance(data.get("contentCalendar"), list) else []
    published = [item for item in calendar if _safe_text(item.get("status")) == "published"]
    metrics = data.get("channelMetrics") if isinstance(data.get("channelMetrics"), list) else []

    missing_items: List[str] = []
    if len(calendar) < 3:
        missing_items.append("内容日历不足（至少 3 条）")
    if len(published) == 0:
        missing_items.append("尚无已发布内容")
    if len(metrics) == 0:
        missing_items.append("缺少渠道指标数据")

    score_parts = 0
    if len(calendar) >= 3:
        score_parts += 1
    if len(published) > 0:
        score_parts += 1
    if len(metrics) > 0:
        score_parts += 1
    score = int((score_parts / 3) * 100)

    return {
        "score": score,
        "calendar_count": len(calendar),
        "published_count": len(published),
        "metrics_count": len(metrics),
        "missing_items": missing_items,
        "evidence": [
            {
                "title": _safe_text(item.get("title"))[:80],
                "status": _safe_text(item.get("status")) or "draft",
            }
            for item in calendar[:10]
        ],
    }


def _evaluate_monetize(content: str) -> Dict[str, Any]:
    data = _parse_json(content, {})
    if not isinstance(data, dict):
        data = {}

    tiers = data.get("pricingTiers") if isinstance(data.get("pricingTiers"), list) else []
    def _safe_float(value: Any, default: float = 0.0) -> float:
        if value is None:
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    paid_tiers = [tier for tier in tiers if _safe_float(tier.get("price")) > 0]
    funnel = data.get("funnel") if isinstance(data.get("funnel"), dict) else {}
    paid_users = _safe_float(data.get("paidUsers"), 0)

    missing_items: List[str] = []
    if len(tiers) == 0:
        missing_items.append("缺少定价档位")
    if len(paid_tiers) == 0:
        missing_items.append("缺少付费档位")
    if _safe_float(funnel.get("visitors"), 0) == 0:
        missing_items.append("漏斗数据未记录访客数")
    if paid_users == 0:
        missing_items.append("尚无付费用户数据")

    score_parts = 0
    if len(tiers) > 0:
        score_parts += 1
    if len(paid_tiers) > 0:
        score_parts += 1
    if _safe_float(funnel.get("visitors"), 0) > 0:
        score_parts += 1
    if paid_users > 0:
        score_parts += 1
    score = int((score_parts / 4) * 100)

    return {
        "score": score,
        "tiers_count": len(tiers),
        "paid_tiers_count": len(paid_tiers),
        "paid_users": int(paid_users),
        "missing_items": missing_items,
        "evidence": [
            {
                "name": _safe_text(tier.get("name"))[:80],
                "price": _safe_float(tier.get("price")),
                "period": _safe_text(tier.get("period")) or "month",
            }
            for tier in tiers[:10]
        ],
    }


def evaluate_stage_content(stage_key: StageKey, content: str) -> Dict[str, Any]:
    if stage_key == StageKey.IDEA:
        return _evaluate_idea(content)
    if stage_key == StageKey.VALIDATE:
        return _evaluate_validate(content)
    if stage_key == StageKey.PROTOTYPE:
        return _evaluate_prototype(content)
    if stage_key == StageKey.SHIP:
        return _evaluate_ship(content)
    if stage_key == StageKey.GROW:
        return _evaluate_grow(content)
    if stage_key == StageKey.MONETIZE:
        return _evaluate_monetize(content)

    text = _safe_text(content)
    score = 100 if len(text) > 30 else 30 if len(text) > 0 else 0
    missing_items = [] if score >= 100 else ["当前阶段内容不足"]
    return {
        "score": score,
        "missing_items": missing_items,
        "evidence": {"content_length": len(text)},
    }


def build_stage_snapshot(project: Project, stage: Stage) -> Dict[str, Any]:
    evaluation = evaluate_stage_content(stage.stage_key, stage.content or "")
    return {
        "project_id": str(project.id),
        "project_title": project.title,
        "project_pain_point": project.pain_point,
        "current_stage": project.current_stage.value,
        "stage_key": stage.stage_key.value,
        "stage_locked": stage.is_locked,
        "completion": {
            "score": evaluation.get("score", 0),
            "missing_items": evaluation.get("missing_items", []),
        },
        "content": {
            "raw": stage.content or "",
            "normalized": evaluation.get("evidence"),
        },
    }


def build_stage_native_system_prompt(snapshot: Dict[str, Any], enable_stage_loop: bool) -> str:
    completion = snapshot.get("completion", {})
    score = completion.get("score", 0)
    missing_items = completion.get("missing_items", [])

    minimal_snapshot = {
        "project_title": snapshot.get("project_title", ""),
        "current_stage": snapshot.get("current_stage", ""),
        "stage_key": snapshot.get("stage_key", ""),
        "stage_locked": snapshot.get("stage_locked", False),
        "completion": {
            "score": score,
            "missing_items": missing_items,
        },
    }

    loop_instruction = (
        "你必须在结尾给出【下一轮问题】且只提 1 个问题，优先追问最关键缺口。"
        if enable_stage_loop
        else "你可以给出追问，但不是强制。"
    )

    return (
        "你是 SparkBin 的阶段原生 AI 助手。你必须严格基于当前阶段快照回答，禁止编造未出现的数据。\n"
        "回答格式必须固定为四段，缺一不可：\n"
        "1) 【阶段事实】先说明你已经读取了哪个阶段与当前完成度；\n"
        "2) 【关键缺口】列出当前最重要的 1-3 个缺口；\n"
        "3) 【下一步动作】给出最多 3 条可直接执行的动作；\n"
        "4) 【可同步JSON】必须输出严格 JSON 对象（不是 Markdown 列表，不要额外解释）。\n"
        "   JSON schema: "
        '{"summary": "string", "items": ["string"], "stage_key": "string", "sync_mode": "append"}\n'
        f"{loop_instruction}\n"
        f"当前完成度: {score}%\n"
        f"当前缺口: {json.dumps(missing_items, ensure_ascii=False)}\n"
        f"阶段快照(精简): {json.dumps(minimal_snapshot, ensure_ascii=False)}"
    )


def validate_stage_native_response(text: str, enable_stage_loop: bool) -> Dict[str, Any]:
    required_sections = ["【阶段事实】", "【关键缺口】", "【下一步动作】"]
    if enable_stage_loop:
        required_sections.append("【下一轮问题】")

    missing_sections = [section for section in required_sections if section not in text]
    has_sync_section = ("【可同步JSON】" in text) or ("【可同步文本】" in text)
    if not has_sync_section:
        missing_sections.append("【可同步JSON】")

    return {
        "valid": len(missing_sections) == 0,
        "missing_sections": missing_sections,
    }


def _extract_section_text(text: str, section_name: str) -> str:
    pattern = rf"{re.escape(section_name)}\s*(.*?)(?=\n\s*【[^】]+】|$)"
    match = re.search(pattern, text, flags=re.DOTALL)
    if not match:
        return ""
    return match.group(1).strip()


def _strip_json_fence(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    return stripped.strip()


def extract_sync_payload_structured(text: str) -> Dict[str, Any]:
    json_section = _extract_section_text(text, "【可同步JSON】")
    raw_json = _strip_json_fence(json_section) if json_section else ""
    parsed_payload: Dict[str, Any] = {}

    if raw_json:
        try:
            loaded = json.loads(raw_json)
            if isinstance(loaded, dict):
                parsed_payload = loaded
        except json.JSONDecodeError:
            json_match = re.search(r"\{[\s\S]*\}", raw_json)
            if json_match:
                try:
                    loaded = json.loads(json_match.group(0))
                    if isinstance(loaded, dict):
                        parsed_payload = loaded
                except json.JSONDecodeError:
                    parsed_payload = {}

    if parsed_payload:
        summary = _safe_text(parsed_payload.get("summary"))
        items = parsed_payload.get("items")
        safe_items = [str(item).strip() for item in items] if isinstance(items, list) else []
        stage_key = _safe_text(parsed_payload.get("stage_key"))
        sync_mode = _safe_text(parsed_payload.get("sync_mode")) or "append"
        return {
            "summary": summary,
            "items": [item for item in safe_items if item],
            "stage_key": stage_key,
            "sync_mode": sync_mode,
            "raw": parsed_payload,
        }

    fallback_text = _extract_section_text(text, "【可同步文本】")
    if fallback_text:
        return {
            "summary": fallback_text,
            "items": [],
            "stage_key": "",
            "sync_mode": "append",
            "raw": {},
        }

    return {
        "summary": "",
        "items": [],
        "stage_key": "",
        "sync_mode": "append",
        "raw": {},
    }


def extract_sync_payload(text: str) -> str:
    structured = extract_sync_payload_structured(text)
    summary = _safe_text(structured.get("summary"))
    items = structured.get("items")
    lines = [summary] if summary else []
    if isinstance(items, list):
        lines.extend([f"- {str(item).strip()}" for item in items if str(item).strip()])
    return "\n".join(lines).strip()


def extract_next_round_question(text: str) -> str:
    section_text = _extract_section_text(text, "【下一轮问题】")
    if not section_text:
        return ""

    cleaned = section_text.splitlines()[0].strip()
    cleaned = re.sub(r"^[\-*\d\.\s]+", "", cleaned).strip()
    if not cleaned:
        return ""
    return cleaned
