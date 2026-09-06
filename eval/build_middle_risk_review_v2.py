import csv
from collections import Counter
from pathlib import Path

from risk_level import compute_risk_level


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000_final.with-agent-results.csv"
OUTPUT = ROOT / "final_layered_benchmark_1000_v2.csv"
AUDIT = ROOT / "middle_risk_29_case_review.csv"

S, D, N = "满足", "存疑", "不满足"

# Decisions are made at the independent-case level. Only original/paraphrase/distractor
# rows inherit them; boundary variants retain their deliberately altered facts.
DECISIONS = {
    "C037": ({"h1_言行与性有关": D, "h2_违背意愿": D}, "低危", "仅有性骚扰概括，具体言行和违背意愿事实未披露，核心要件改为存疑"),
    "C038": ({"agg_多人受害": "Y"}, "高危", "两名女同事分别举报，符合多人受害加重因素"),
    "C082": ({"e1_区别对待": D}, "低危", "请假、未到岗及续签争议并存，婚育歧视因果关系不足"),
    "C090": ({"discrim_concrete_harm": "是"}, "高危", "移出工作群、停用邮箱、欠薪及生育津贴延迟属于已发生不利后果"),
    "C093": ({"e1_区别对待": D, "discrim_concrete_harm": "是"}, "低危", "存在社保和工资损失，但与怀孕之间的差别对待因果关系不明确"),
    "C098": ({"discrim_concrete_harm": "是"}, "高危", "生育请假后停缴社保、停工停薪，存在可识别权益损失"),
    "C103": ({"discrim_concrete_harm": "是"}, "高危", "明确因女性身份未获面试，已经丧失就业机会"),
    "C104": ({"e1_区别对待": D}, "低危", "性别限制由当事人主张且责任主体、具体措辞和决定过程未完整披露"),
    "C107": ({"discrim_institutional": "是", "discrim_concrete_harm": "是"}, "高危", "多家超市统一排班和社保工资管理影响多名女职工，兼具制度性和现实损失"),
    "C108": ({"discrim_institutional": "是"}, "高危", "招聘平台公开发布男士优先、限男性等书面招聘条件"),
    "C109": ({"discrim_institutional": "是"}, "高危", "企业招聘规则直接限定男性，属于制度化就业限制"),
    "C110": ({"e1_区别对待": N}, "无风险", "公司同意居家办公并正常发薪，争议是未签书面合同而非性别差别对待"),
    "C111": ({"e1_区别对待": D, "discrim_concrete_harm": "是"}, "低危", "存在欠薪，但经营风险、事假和工资组成争议使婚育歧视因果关系不明确"),
    "C115": ({"discrim_concrete_harm": "是"}, "高危", "未缴生育保险并少发产假工资，已形成待遇损失"),
    "C122": ({"discrim_institutional": "是"}, "高危", "五家单位在招聘信息中书面限定男性"),
    "C123": ({"discrim_institutional": "是"}, "高危", "多家单位和招聘机构设置性别、婚姻录用条件"),
    "C124": ({"discrim_institutional": "是"}, "高危", "岗位条件公开写明需要男士、男士优先"),
    "C137": ({"discrim_concrete_harm": "是"}, "高危", "告知怀孕后被退出项目并大幅降薪"),
    "C143": ({"discrim_concrete_harm": "是"}, "高危", "产假待遇按较低基数支付且未补足差额"),
    "C146": ({"discrim_concrete_harm": "是"}, "高危", "产假返岗后未经协商调岗并降薪"),
    "C147": ({"discrim_concrete_harm": "是"}, "高危", "产假工资及生育津贴差额未及时支付"),
    "C149": ({"discrim_concrete_harm": "是"}, "高危", "因哺乳时间被实际降低工资"),
    "C152": ({"discrim_concrete_harm": "是"}, "高危", "产检扣薪且产假工资明显减少"),
    "C154": ({"discrim_institutional": "是", "discrim_concrete_harm": "是"}, "高危", "格式化产假协议限制待遇并已按协议减少收入福利"),
    "C156": ({"discrim_concrete_harm": "是"}, "高危", "生育津贴未计入补偿基数，导致经济补偿减少"),
    "C157": ({"discrim_concrete_harm": "是"}, "高危", "产假工资未发、返岗降职并被安排远距离岗位"),
    "C160": ({"discrim_institutional": "是"}, "高危", "95家企业长期通过招聘信息限定男性，属于重复和群体性实施"),
    "C240": ({}, "中危", "性相关书面信息存在，但完整上下文和违背意愿证据不足，维持中危"),
    "C245": ({}, "中危", "暧昧信息存在，双方关系和主动联系事实使违背意愿存疑，维持中危"),
}


def risk_payload(row):
    elements = [
        {"name": "行为与性有关", "status": row["h1_言行与性有关"]},
        {"name": "违背对方意愿", "status": row["h2_违背意愿"]},
        {"name": "职场情境", "status": row["h3_职场情境"]},
        {"name": "基于性别或婚育状况的区别对待", "status": row["e1_区别对待"]},
        {"name": "发生在就业环节", "status": row["e2_就业环节"]},
    ]
    aggravating = []
    for field, label in (
        ("agg_肢体接触", "肢体接触"), ("agg_职权胁迫", "职权胁迫"),
        ("agg_持续重复", "持续重复"), ("agg_多人受害", "多人受害"),
        ("agg_书面化", "书面化"),
    ):
        if row[field] == "Y":
            aggravating.append(label)
    return {
        "type": [part for part in row["type"].split("+") if part],
        "elements_check": elements,
        "aggravating_factors": aggravating,
        "discrimination_severity": {
            "institutional": row["discrim_institutional"],
            "concrete_harm": row["discrim_concrete_harm"],
        },
    }


def main():
    with SOURCE.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        rows = list(reader)
        fields = list(reader.fieldnames or [])

    original_by_base = {
        row["base_case_id"]: row for row in rows
        if row["sample_group"] == "original" and row["base_case_id"] in DECISIONS
    }
    audit_rows = []
    for base_id, (overrides, expected_level, rationale) in DECISIONS.items():
        original = original_by_base[base_id]
        before = original["final_level"]
        preview = dict(original)
        preview.update(overrides)
        after = compute_risk_level(risk_payload(preview))
        if after != expected_level:
            raise RuntimeError(f"{base_id}: expected {expected_level}, computed {after}")
        audit_rows.append({
            "base_case_id": base_id,
            "source_title": original["source_title"],
            "old_level": before,
            "new_level": after,
            "changed_fields": "; ".join(f"{key}:{original[key]}->{value}" for key, value in overrides.items()) or "无",
            "review_rationale": rationale,
            "review_status": "专项复核建议完成，待双人确认",
            "reviewer_1_decision": "",
            "reviewer_1_notes": "",
            "reviewer_2_decision": "",
            "reviewer_2_notes": "",
            "adjudicator_decision": "",
            "adjudicator_notes": "",
            "final_approved": "",
        })

    changed_rows = 0
    for row in rows:
        decision = DECISIONS.get(row["base_case_id"])
        if not decision or row["sample_group"] not in {"original", "paraphrase", "distractor"}:
            continue
        overrides, _, rationale = decision
        old_level = row["final_level"]
        row.update(overrides)
        row["final_level"] = compute_risk_level(risk_payload(row))
        row["gold_status"] = "v2中危专项复核建议，待双人确认"
        note = f"v2中危专项复核：{rationale}；等级{old_level}->{row['final_level']}"
        row["review_notes"] = f"{row['review_notes']}；{note}" if row["review_notes"] else note
        changed_rows += int(old_level != row["final_level"] or bool(overrides))

    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    with AUDIT.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=audit_rows[0].keys())
        writer.writeheader()
        writer.writerows(audit_rows)

    print("reviewed_independent_cases", len(audit_rows))
    print("touched_rows", changed_rows)
    print("levels", dict(Counter(row["final_level"] for row in rows)))
    print("middle_base_cases", sorted({row["base_case_id"] for row in rows if row["final_level"] == "中危"}))


if __name__ == "__main__":
    main()
