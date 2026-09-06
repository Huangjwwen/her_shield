import csv
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "independent_benchmark_draft.csv"
OUTPUT = ROOT / "independent_benchmark_review.csv"

ELEMENT_COLUMNS = [
    "h1_言行与性有关", "h2_违背意愿", "h3_职场情境",
    "agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化",
    "e1_区别对待", "e2_就业环节", "discrim_institutional", "discrim_concrete_harm",
]

SEXUAL_CONDUCT = [
    "猥亵", "强吻", "强行亲吻", "搂抱", "摸胸", "摸臀", "敏感部位", "裸露",
    "色情", "性暗示", "性挑逗", "性侵", "陪睡", "开房",
]
HARASSMENT_DISCUSSION = [
    "预防和制止性骚扰", "性骚扰防范", "未制定或落实预防", "防治性骚扰",
]
GENDER_TRAITS = [
    "怀孕", "孕期", "产假", "哺乳期", "生育", "婚育", "性别", "限男性",
    "只招男性", "男性优先", "仅限男性",
]
ADVERSE_ACTIONS = [
    "拒绝录用", "不予录用", "撤回录用", "辞退", "解雇", "解除劳动", "终止劳动",
    "降薪", "降低工资", "调岗", "降职", "取消晋升", "拒绝面试", "不再续签",
]
EMPLOYMENT = [
    "招聘", "应聘", "录用", "入职", "劳动合同", "岗位", "调岗", "工资", "薪资",
    "晋升", "辞退", "解雇", "解除", "终止", "绩效", "产假", "返岗",
]
WORKPLACE = [
    "公司", "单位", "职工", "员工", "同事", "领导", "经理", "主管", "工作",
    "职场", "劳动", "入职", "招聘", "出差", "团建", "部门", "办公室",
]


def hits(text, terms):
    return [term for term in terms if term in text]


def same_sentence_causal(text):
    sentences = re.split(r"[。！？；\n]", text)
    evidence = []
    for sentence in sentences:
        traits = hits(sentence, GENDER_TRAITS)
        actions = hits(sentence, ADVERSE_ACTIONS)
        if traits and actions:
            evidence.append(sentence.strip()[:240])
    return evidence


def triage(row):
    text = row["input"]
    sexual = hits(text, SEXUAL_CONDUCT)
    discussion = hits(text, HARASSMENT_DISCUSSION)
    workplace = hits(text, WORKPLACE)
    traits = hits(text, GENDER_TRAITS)
    actions = hits(text, ADVERSE_ACTIONS)
    employment = hits(text, EMPLOYMENT)
    causal = same_sentence_causal(text)

    if sexual and workplace:
        queue = "A-疑似职场性骚扰"
    elif causal and employment:
        queue = "B-疑似性别歧视"
    elif traits and employment:
        queue = "C-孕产/性别劳动争议待核因果"
    elif "性骚扰" in text or sexual or discussion:
        queue = "D-仅提及/场景待核"
    else:
        queue = "E-候选无关或无风险"

    reasons = []
    if sexual:
        reasons.append("性相关行为=" + "、".join(sexual))
    if discussion and not sexual:
        reasons.append("可能仅为制度/法律表述=" + "、".join(discussion))
    if traits:
        reasons.append("性别或孕产特征=" + "、".join(traits))
    if actions:
        reasons.append("不利就业行为=" + "、".join(actions))
    if causal:
        reasons.append("同句共现，仍需人工确认因果")
    if not reasons:
        reasons.append("未检出本任务核心事实")
    return queue, "；".join(reasons), " | ".join(causal[:2])


def main():
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        source_rows = list(csv.DictReader(stream))

    fields = list(source_rows[0]) + [
        "review_queue", "triage_reason", "causal_evidence",
        "gold_type", *ELEMENT_COLUMNS, "gold_final_level",
        "reviewer_1", "reviewer_2", "adjudicator", "review_notes", "gold_status",
    ]
    rows = []
    for source in source_rows:
        row = dict(source)
        queue, reason, evidence = triage(row)
        row.update({
            "review_queue": queue,
            "triage_reason": reason,
            "causal_evidence": evidence,
            "gold_type": "",
            **{column: "" for column in ELEMENT_COLUMNS},
            "gold_final_level": "",
            "reviewer_1": "",
            "reviewer_2": "",
            "adjudicator": "",
            "review_notes": "",
            "gold_status": "待独立双人复核",
        })
        rows.append(row)

    rows.sort(key=lambda row: (row["review_queue"], row["id"]))
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    print(f"review_rows={len(rows)}")
    print(dict(Counter(row["review_queue"] for row in rows)))
    print(f"gold_cells_blank={all(not row['gold_type'] and not row['gold_final_level'] for row in rows)}")


if __name__ == "__main__":
    main()
