RISK_TEXT = {3: "高危", 2: "中危", 1: "低危", 0: "无风险"}


def _status(elements, *subs):
    """返回 name 含任一 sub 的要件状态，找不到则为“不适用”。"""
    for element in elements or []:
        name = (element or {}).get("name", "")
        if any(sub in name for sub in subs):
            return (element or {}).get("status", "不适用")
    return "不适用"


def compute_risk_level(data):
    type_list = data.get("type") or []
    elements = data.get("elements_check") or []
    agg = [str(item) for item in (data.get("aggravating_factors") or []) if str(item).strip()]
    agg_text = " ".join(agg)
    has_any_agg = len(agg) > 0
    harass_severe = any(key in agg_text for key in ["肢体接触", "职权胁迫", "胁迫"])
    severity = data.get("discrimination_severity") or {}
    discrim_severe = severity.get("institutional") == "是" or severity.get("concrete_harm") == "是"
    ambiguous = len(type_list) == 0 or "暂不明确" in type_list
    do_harass = "性骚扰" in type_list or ambiguous
    do_discrim = "性别歧视" in type_list or ambiguous
    satisfied = lambda value: value == "满足"
    doubtful = lambda value: value == "存疑"
    levels = []
    if do_harass:
        h1 = _status(elements, "性有关")
        h2 = _status(elements, "违背")
        h3 = _status(elements, "职场情境", "职场")
        if satisfied(h1):
            if (satisfied(h2) and satisfied(h3) and has_any_agg) or (satisfied(h2) and harass_severe):
                levels.append(3)
            elif satisfied(h2) or satisfied(h3) or doubtful(h2) or doubtful(h3):
                levels.append(2)
            else:
                levels.append(1)
        elif doubtful(h1):
            levels.append(1)
        else:
            levels.append(0)
    if do_discrim:
        e1 = _status(elements, "区别对待")
        e2 = _status(elements, "就业环节", "就业")
        if satisfied(e1):
            if satisfied(e2) and discrim_severe:
                levels.append(3)
            elif satisfied(e2) or doubtful(e2):
                levels.append(2)
            else:
                levels.append(1)
        elif doubtful(e1):
            levels.append(1)
        else:
            levels.append(0)
    return RISK_TEXT[max(levels) if levels else 0]
