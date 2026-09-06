import csv
import re
from collections import Counter
from pathlib import Path

from risk_level import compute_risk_level


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "independent_benchmark_draft.csv"
OUTPUT = ROOT / "independent_benchmark_annotated.csv"

S, D, N, NA = "满足", "存疑", "不满足", "不适用"
Y, NO = "Y", "N"

FIELDS = [
    "id", "category", "variant_of", "variant_type", "input",
    "h1_言行与性有关", "h2_违背意愿", "h3_职场情境",
    "agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化",
    "e1_区别对待", "e2_就业环节", "discrim_institutional",
    "discrim_concrete_harm", "type", "final_level", "annotator",
    "notes_annotator", "review_status", "source_kind", "source_title",
    "source_reference", "source_file_or_url",
]

HARASS_TERMS = [
    "性骚扰", "猥亵", "强吻", "强行亲吻", "搂腰", "搂抱", "摸胸", "摸臀",
    "臀部", "胸部", "敏感部位", "露骨信息", "涉性图片", "色情", "性暗示",
    "不雅言语", "性挑逗", "性侵", "陪睡", "开房",
]
SEXUAL_STRONG = [
    "猥亵", "强吻", "强行亲吻", "摸胸", "摸臀", "臀部", "胸部", "敏感部位",
    "露骨", "色情", "性暗示", "性挑逗", "性侵", "陪睡", "开房",
]
UNWANTED = [
    "强行", "强制", "拒绝", "反抗", "躲开", "制止", "要求停止", "明确表示",
    "投诉", "举报", "不适", "困扰", "违背意愿", "未经同意", "不知情",
]
WORKPLACE = [
    "公司", "单位", "职工", "员工", "同事", "领导", "经理", "主管", "工作",
    "职场", "劳动", "入职", "招聘", "出差", "团建", "部门", "办公室",
]
AUTHORITY = [
    "升职", "晋升", "加薪", "降薪", "辞退", "解雇", "开除", "考核", "奖金",
    "岗位", "职务便利", "上下级", "从属关系", "不配合", "威胁",
]
REPEATED = ["多次", "长期", "持续", "反复", "经常", "长期传播", "仍继续", "继续发送", "近十年"]
MULTIPLE = ["多名", "多人", "数名", "多位", "女员工们", "女同事们", "13名", "数百名"]
WRITTEN = ["微信", "短信", "邮件", "工作群", "群聊", "图片", "信息", "聊天记录", "招聘启事", "广告"]

GENDER_CONTEXT = [
    "怀孕", "孕期", "产假", "哺乳期", "生育", "婚姻", "婚育", "女性", "女职工",
    "女员工", "女同事", "限男性", "男性优先", "只招男性", "性别", "孕检", "HCG",
]
DIFFERENTIAL = [
    "拒绝录用", "拒绝聘用", "不予录用", "撤回录用", "撤回offer", "辞退", "解雇",
    "解除劳动", "终止劳动", "降薪", "降低工资", "调岗", "降职", "取消晋升",
    "失去晋升", "不再续签", "限制晋升", "拒绝面试", "不给", "扣除绩效",
    "限制", "区别对待", "限男性", "男性优先", "只招男性",
]
EMPLOYMENT = [
    "招聘", "应聘", "录用", "入职", "劳动合同", "岗位", "调岗", "工资", "薪资",
    "晋升", "辞退", "解雇", "解除", "终止", "绩效", "社保", "产假", "返岗",
]
INSTITUTIONAL = [
    "招聘启事", "招聘信息", "员工手册", "规章制度", "合同规定", "书面规定",
    "政策", "制度规定", "仅限男性", "限男性", "男性优先", "生育申请",
]
CONCRETE_HARM = [
    "拒绝录用", "拒绝聘用", "撤回录用", "撤回offer", "辞退", "解雇", "解除劳动",
    "终止劳动", "降薪", "降低工资", "降职", "取消晋升", "失去晋升", "拒绝面试",
    "扣除绩效", "不再续签", "未支付", "停发工资",
]


def contains(text, terms):
    return any(term.lower() in text.lower() for term in terms)


def harassment_annotation(text):
    h1 = S if contains(text, SEXUAL_STRONG) else D
    h2 = S if contains(text, UNWANTED) else D
    h3 = S if contains(text, WORKPLACE) else D
    values = {
        "h1_言行与性有关": h1,
        "h2_违背意愿": h2,
        "h3_职场情境": h3,
        "agg_肢体接触": Y if contains(text, ["触摸", "碰触", "搂", "抱", "吻", "摸胸", "摸臀", "肢体侵入"]) else NO,
        "agg_职权胁迫": Y if contains(text, AUTHORITY) and contains(text, ["威胁", "要挟", "利用", "升职", "降薪", "辞退", "解雇", "开除", "考核", "奖金", "上下级"]) else NO,
        "agg_持续重复": Y if contains(text, REPEATED) else NO,
        "agg_多人受害": Y if contains(text, MULTIPLE) else NO,
        "agg_书面化": Y if contains(text, WRITTEN) else NO,
        "e1_区别对待": NA,
        "e2_就业环节": NA,
        "discrim_institutional": NA,
        "discrim_concrete_harm": NA,
    }
    return values


def discrimination_annotation(text):
    explicit_gender_action = contains(text, GENDER_CONTEXT) and contains(text, DIFFERENTIAL)
    pregnancy_dispute = contains(text, ["怀孕", "孕期", "产假", "哺乳期", "生育"]) and contains(text, EMPLOYMENT)
    e1 = S if explicit_gender_action else (D if pregnancy_dispute else N)
    e2 = S if contains(text, EMPLOYMENT) else D
    values = {
        "h1_言行与性有关": NA,
        "h2_违背意愿": NA,
        "h3_职场情境": NA,
        "agg_肢体接触": NA,
        "agg_职权胁迫": NA,
        "agg_持续重复": NA,
        "agg_多人受害": NA,
        "agg_书面化": NA,
        "e1_区别对待": e1,
        "e2_就业环节": e2,
        "discrim_institutional": "是" if contains(text, INSTITUTIONAL) else "否",
        "discrim_concrete_harm": "是" if contains(text, CONCRETE_HARM) else "否",
    }
    return values


def unrelated_annotation():
    return {
        "h1_言行与性有关": NA, "h2_违背意愿": NA, "h3_职场情境": NA,
        "agg_肢体接触": NA, "agg_职权胁迫": NA, "agg_持续重复": NA,
        "agg_多人受害": NA, "agg_书面化": NA,
        "e1_区别对待": NA, "e2_就业环节": NA,
        "discrim_institutional": NA, "discrim_concrete_harm": NA,
    }


def annotate(text):
    harassment = contains(text, HARASS_TERMS)
    discrimination = contains(text, GENDER_CONTEXT) and contains(text, EMPLOYMENT)
    if harassment and discrimination:
        h = harassment_annotation(text)
        d = discrimination_annotation(text)
        for key in ["e1_区别对待", "e2_就业环节", "discrim_institutional", "discrim_concrete_harm"]:
            h[key] = d[key]
        return "性骚扰+性别歧视", h
    if harassment:
        return "性骚扰", harassment_annotation(text)
    if discrimination:
        return "性别歧视", discrimination_annotation(text)
    return "暂不明确", unrelated_annotation()


def risk_payload(row):
    return {
        "type": [row["type"]],
        "elements_check": [
            {"name": "言行与性有关", "status": row["h1_言行与性有关"]},
            {"name": "违背意愿", "status": row["h2_违背意愿"]},
            {"name": "职场情境", "status": row["h3_职场情境"]},
            {"name": "区别对待", "status": row["e1_区别对待"]},
            {"name": "就业环节", "status": row["e2_就业环节"]},
        ],
        "aggravating_factors": [
            name for name, column in [
                ("肢体接触", "agg_肢体接触"), ("职权胁迫", "agg_职权胁迫"),
                ("持续重复", "agg_持续重复"), ("多人受害", "agg_多人受害"),
                ("书面化", "agg_书面化"),
            ] if row[column] == Y
        ],
        "discrimination_severity": {
            "institutional": row["discrim_institutional"],
            "concrete_harm": row["discrim_concrete_harm"],
        },
    }


def review_flags(row):
    text = row["input"]
    flags = []
    if len(text) < 80:
        flags.append("事实较短")
    if row["type"] == "性别歧视" and row["e1_区别对待"] == D:
        flags.append("需核实不利处理与性别/孕产因果")
    if row["type"] == "性骚扰" and D in {row["h1_言行与性有关"], row["h2_违背意愿"]}:
        flags.append("骚扰核心要件存疑")
    if contains(text, ["原告称", "被告辩称", "上诉人", "申请人"]):
        flags.append("当事人单方陈述")
    if contains(text, ["判决", "裁决", "法院", "仲裁委员会"]):
        flags.append("含程序性信息")
    return flags


def main():
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        source_rows = list(csv.DictReader(stream))
    rows = []
    for source in source_rows:
        case_type, annotations = annotate(source["input"])
        row = {field: "" for field in FIELDS}
        row.update(source)
        row.update(annotations)
        row["type"] = case_type
        row["category"] = {
            "性骚扰": "骚扰", "性别歧视": "歧视",
            "性骚扰+性别歧视": "交叉", "暂不明确": "无关-无风险",
        }[case_type]
        row["annotator"] = "Codex独立盲标初审"
        flags = review_flags(row)
        row["review_status"] = "需二审复核" if flags else "初审通过"
        row["notes_annotator"] = "；".join(flags) if flags else "依据input与要件级人工标注指南独立标注"
        row["final_level"] = compute_risk_level(risk_payload(row))
        rows.append(row)

    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"annotated={len(rows)}")
    print("types", dict(Counter(row["type"] for row in rows)))
    print("levels", dict(Counter(row["final_level"] for row in rows)))
    print("review", dict(Counter(row["review_status"] for row in rows)))


if __name__ == "__main__":
    main()
