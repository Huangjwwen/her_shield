import json
import re

RISK_TEXT = {3: "高危", 2: "中危", 1: "低危", 0: "无风险"}


def _status(elements, *subs):
    """返回 name 含任一 sub 的要件状态，找不到 → '不适用'。"""
    for e in elements or []:
        name = (e or {}).get("name", "")
        if any(s in name for s in subs):
            return (e or {}).get("status", "不适用")
    return "不适用"


def compute_risk_level(data):
    # —— 完全保持原状,不变 ——
    type_list = data.get("type") or []
    elements = data.get("elements_check") or []
    agg = [str(a) for a in (data.get("aggravating_factors") or []) if str(a).strip()]
    agg_text = " ".join(agg)
    has_any_agg = len(agg) > 0
    harass_severe = any(k in agg_text for k in ["肢体接触", "职权胁迫", "胁迫"])
    ds = data.get("discrimination_severity") or {}
    discrim_severe = (ds.get("institutional") == "是") or (ds.get("concrete_harm") == "是")
    ambiguous = (len(type_list) == 0) or ("暂不明确" in type_list)
    do_harass = ("性骚扰" in type_list) or ambiguous
    do_discrim = ("性别歧视" in type_list) or ambiguous
    s = lambda x: x == "满足"
    d = lambda x: x == "存疑"
    levels = []
    if do_harass:
        h1 = _status(elements, "性有关")
        h2 = _status(elements, "违背")
        h3 = _status(elements, "职场情境", "职场")
        if s(h1):
            if (s(h2) and s(h3) and has_any_agg) or (s(h2) and harass_severe):
                levels.append(3)
            elif s(h2) or s(h3) or d(h2) or d(h3):
                levels.append(2)
            else:
                levels.append(1)
        elif d(h1):
            levels.append(1)
        else:
            levels.append(0)
    if do_discrim:
        e1 = _status(elements, "区别对待")
        e2 = _status(elements, "就业环节", "就业")
        if s(e1):
            if s(e2) and discrim_severe:
                levels.append(3)
            elif s(e2) or d(e2):
                levels.append(2)
            else:
                levels.append(1)
        elif d(e1):
            levels.append(1)
        else:
            levels.append(0)
    return RISK_TEXT[max(levels) if levels else 0]
