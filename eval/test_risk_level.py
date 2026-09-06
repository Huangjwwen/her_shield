from risk_level import compute_risk_level


def case(types, h=("不适用",) * 3, d=("不适用",) * 2, agg=(), institutional="不适用", harm="不适用"):
    return {
        "type": types,
        "elements_check": [
            {"name": "言行与性有关", "status": h[0]},
            {"name": "违背意愿", "status": h[1]},
            {"name": "职场情境", "status": h[2]},
            {"name": "区别对待", "status": d[0]},
            {"name": "就业环节", "status": d[1]},
        ],
        "aggravating_factors": list(agg),
        "discrimination_severity": {"institutional": institutional, "concrete_harm": harm},
    }


assert compute_risk_level(case([], h=("不适用",) * 3, d=("不适用",) * 2)) == "无风险"
assert compute_risk_level(case(["性骚扰"], h=("存疑", "满足", "满足"))) == "低危"
assert compute_risk_level(case(["性骚扰"], h=("满足", "满足", "满足"))) == "中危"
assert compute_risk_level(case(["性骚扰"], h=("满足", "满足", "满足"), agg=("持续重复",))) == "高危"
assert compute_risk_level(case(["性别歧视"], d=("满足", "满足"))) == "中危"
assert compute_risk_level(case(["性别歧视"], d=("满足", "满足"), harm="是")) == "高危"
assert compute_risk_level(case(["性别歧视"], d=("存疑", "满足"), harm="是")) == "低危"
print("risk_level branch tests passed")
