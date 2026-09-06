import csv
from collections import Counter
from pathlib import Path

from risk_level import compute_risk_level


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000.csv"
OUTPUT = ROOT / "final_layered_benchmark_1000_annotated.csv"
REVIEW = ROOT / "final_1000_annotation_review.csv"

H_FIELDS = ("h1_言行与性有关", "h2_违背意愿", "h3_职场情境")
AGG_FIELDS = ("agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化")
D_FIELDS = ("e1_区别对待", "e2_就业环节")
DS_FIELDS = ("discrim_institutional", "discrim_concrete_harm")
ELEMENT_VALUES = {"满足", "存疑", "不满足", "不适用"}


def has(text, terms):
    return any(term in text for term in terms)


def empty_annotation():
    result = {field: "不适用" for field in H_FIELDS + D_FIELDS + DS_FIELDS}
    result.update({field: "N" for field in AGG_FIELDS})
    return result


SEXUAL_TERMS = (
    "性骚扰", "猥亵", "强奸", "奸淫", "性关系", "性意味", "性暗示", "不雅", "裸照", "裸露",
    "亲吻", "搂抱", "拥抱", "摸", "触碰", "肢体接触", "陪睡", "开房", "酒店房间", "低俗",
    "污秽", "胸", "臀", "腿上", "女仆", "身体接触", "越界行为", "不当行为", "骚扰", "挑逗",
    "黄色", "暧昧", "老婆", "追求", "偷拍", "抚摸", "动手动脚", "陪玩", "性相关",
    "情人", "美女", "漂亮女孩", "发生性关系", "求爱", "纠缠",
)
UNWANTED_TERMS = (
    "拒绝", "不愿", "不同意", "反感", "不适", "挣扎", "躲避", "责骂", "制止", "举报", "投诉",
    "报警", "保证不再", "被迫", "强迫", "强行", "威胁", "恐吓", "骚扰", "侵害", "受害", "困扰",
    "焦虑", "抑郁", "自残", "否认", "争议",
)
WORK_TERMS = (
    "公司", "单位", "员工", "职工", "同事", "主管", "经理", "领导", "工作", "任职", "入职", "劳动",
    "招聘", "应聘", "求职", "实习", "项目负责人", "教师", "导师", "学校", "学院", "学生", "医院",
)
CONTACT_TERMS = (
    "肢体接触", "身体接触", "触碰", "搂抱", "拥抱", "亲吻", "摸", "猥亵", "强奸", "奸淫", "强行",
    "坐到自己腿上", "靠在", "撕扯", "拖拽", "殴打", "越界行为",
)
AUTHORITY_TERMS = (
    "主管", "经理", "领导", "负责人", "导师", "教师", "班主任", "上司", "下属", "利用职权", "管理权",
    "要求单独", "报复", "求职", "面试", "威胁不予录用", "以工作为条件", "利用招聘",
)
REPEAT_TERMS = (
    "多次", "反复", "频繁", "持续", "长期", "不断", "仍继续", "先后", "百余次", "数次", "不止一次",
)
MULTIPLE_TERMS = ("多名", "多人", "不同女", "五名", "六名", "九名", "另外三名", "女员工们")
WRITTEN_TERMS = ("短信", "微信", "聊天记录", "群聊", "邮件", "黄色照片", "不雅图片", "裸照", "网络平台", "书面保证")

DIFFERENTIAL_TERMS = (
    "仅限男性", "男性优先", "女性优先", "不招女性", "只招男性", "女性不宜", "因怀孕", "怀孕后", "孕期",
    "怀孕", "产假", "生育", "婚育", "未婚", "性别", "女性身份", "男女", "男性职工", "女职工", "哺乳",
    "年龄较大", "55岁", "60岁", "生育申请", "不再续签", "撤回录用", "调岗降薪", "扣除", "拒发",
)
EMPLOYMENT_TERMS = (
    "招聘", "应聘", "求职", "录用", "入职", "劳动合同", "工作", "岗位", "工资", "绩效", "晋升", "退休",
    "解除", "辞退", "续签", "社会保险", "产假", "年终奖", "调岗", "返岗", "就业",
)
POLICY_TERMS = (
    "制度规定", "公司制度", "内部要求", "统一规定", "招聘条件", "仅限", "一律", "标准", "员工手册",
    "规定女", "要求女性", "女性55岁", "男性60岁", "工作满一年后方可", "将产假计入",
)
HARM_TERMS = (
    "解除", "辞退", "不予录用", "撤回录用", "拒绝录用", "不再续签", "降薪", "工资下降", "扣除", "拒发",
    "损失", "未补足", "失业", "退休", "无法返岗", "不允许上班", "取消资格", "未获晋升", "调离",
)
DENIAL_TERMS = ("否认", "无法确认", "无法消除", "缺少", "没有披露", "未显示", "仅有单方", "存在争议")
CORROBORATION_TERMS = ("监控", "视频显示", "聊天记录", "录音", "承认", "确认", "多名", "多人", "五名", "证人", "保证书", "报警")
SPECIFIC_SEXUAL_TERMS = tuple(term for term in SEXUAL_TERMS if term not in {"性骚扰", "骚扰", "不当行为"})
COMPETING_REASON_TERMS = ("经营困难", "项目终止", "岗位取消", "考核", "业绩", "旷工", "不知道其怀孕", "不知情", "工作疏忽", "自愿离职", "合同到期")


def harassment_annotation(text, uncertain=False):
    result = empty_annotation()
    sexual = has(text, SEXUAL_TERMS)
    disputed = has(text, DENIAL_TERMS)
    concrete = has(text, SPECIFIC_SEXUAL_TERMS)
    corroborated = has(text, CORROBORATION_TERMS)
    if not sexual:
        result[H_FIELDS[0]] = "不满足"
    elif uncertain or (disputed and not concrete and not corroborated):
        result[H_FIELDS[0]] = "存疑"
    else:
        result[H_FIELDS[0]] = "满足"
    result[H_FIELDS[1]] = "满足" if has(text, UNWANTED_TERMS) else ("存疑" if sexual else "不适用")
    result[H_FIELDS[2]] = "存疑" if has(text, ("否认劳动关系", "否认.*公司工作人员")) else ("满足" if has(text, WORK_TERMS) else ("存疑" if sexual else "不适用"))
    for field, terms in zip(AGG_FIELDS, (CONTACT_TERMS, AUTHORITY_TERMS, REPEAT_TERMS, MULTIPLE_TERMS, WRITTEN_TERMS)):
        result[field] = "Y" if has(text, terms) else "N"
    return result


def discrimination_annotation(text, uncertain=False):
    result = empty_annotation()
    protected = has(text, ("怀孕", "怀有身孕", "孕期", "产假", "生育", "哺乳", "婚育", "性别", "女性", "男性", "女职工"))
    adverse = has(text, HARM_TERMS + ("不续签", "不再续签", "不再与", "终止劳动", "要求离职", "未发工资", "停发工资", "停缴", "安排夜班", "值夜班", "未批准", "区别对待", "限定男性"))
    explicit = has(text, ("仅限男性", "限定男性", "男性优先", "不招女性", "只招男性", "女性不宜", "因怀孕", "以怀孕", "以哺乳", "以产假", "女性55岁", "男性60岁"))
    differential = explicit or (protected and adverse) or has(text, DIFFERENTIAL_TERMS)
    competing = has(text, COMPETING_REASON_TERMS) and not explicit
    result[D_FIELDS[0]] = "存疑" if uncertain or (differential and competing) else ("满足" if differential else "不满足")
    result[D_FIELDS[1]] = "满足" if has(text, EMPLOYMENT_TERMS) else ("存疑" if differential else "不适用")
    result[DS_FIELDS[0]] = "是" if has(text, POLICY_TERMS) else "否"
    result[DS_FIELDS[1]] = "是" if has(text, HARM_TERMS) else "否"
    return result


def merge(left, right):
    result = dict(left)
    result.update({field: right[field] for field in D_FIELDS + DS_FIELDS})
    return result


def original_annotation(row):
    text = row["input"]
    stratum = row["stratum"]
    if stratum == "性骚扰":
        annotation = harassment_annotation(text)
        if annotation[H_FIELDS[0]] == "不满足" and has(text, ("侵害女性", "骚扰指控", "被指")):
            annotation[H_FIELDS[0]] = "存疑"
        return annotation, ["性骚扰"]
    if stratum == "性别歧视":
        return discrimination_annotation(text), ["性别歧视"]
    if stratum == "无风险或无关劳动争议":
        return empty_annotation(), []

    sexual = has(text, SEXUAL_TERMS)
    differential = has(text, DIFFERENTIAL_TERMS)
    uncertain = has(text, DENIAL_TERMS)
    if sexual and differential:
        return merge(harassment_annotation(text, uncertain), discrimination_annotation(text, uncertain)), ["性骚扰", "性别歧视"]
    if sexual:
        return harassment_annotation(text, uncertain), ["性骚扰"]
    if differential:
        return discrimination_annotation(text, uncertain), ["性别歧视"]
    annotation = merge(harassment_annotation(text, True), discrimination_annotation(text, True))
    return annotation, ["暂不明确"]


def boundary_annotation(row):
    result = empty_annotation()
    stratum = row["stratum"]
    if stratum == "性骚扰":
        result.update({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"})
        return result, ["性骚扰"]
    if stratum == "性别歧视":
        result.update({D_FIELDS[0]: "不满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "否"})
        return result, ["性别歧视"]
    if stratum == "无风险或无关劳动争议":
        result.update({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "存疑", D_FIELDS[0]: "存疑", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "否"})
        return result, ["暂不明确"]
    result.update({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "存疑", D_FIELDS[0]: "存疑", D_FIELDS[1]: "存疑", DS_FIELDS[0]: "否", DS_FIELDS[1]: "否"})
    return result, ["暂不明确"]


def payload(annotation, types):
    elements = [
        {"name": "言行与性有关", "status": annotation[H_FIELDS[0]]},
        {"name": "违背意愿", "status": annotation[H_FIELDS[1]]},
        {"name": "职场情境", "status": annotation[H_FIELDS[2]]},
        {"name": "区别对待", "status": annotation[D_FIELDS[0]]},
        {"name": "就业环节", "status": annotation[D_FIELDS[1]]},
    ]
    aggravating = [field.removeprefix("agg_") for field in AGG_FIELDS if annotation[field] == "Y"]
    return {
        "type": types,
        "elements_check": elements,
        "aggravating_factors": aggravating,
        "discrimination_severity": {"institutional": annotation[DS_FIELDS[0]], "concrete_harm": annotation[DS_FIELDS[1]]},
    }


def case_override(case_id, annotation, types):
    """Apply decisions from the independent case-by-case review of ambiguous cases."""
    decisions = {
        "S_H_003": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y"}, ["性骚扰"]),
        "S_H_006": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y"}, ["性骚扰"]),
        "S_H_019": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[1]: "Y", AGG_FIELDS[2]: "Y", AGG_FIELDS[3]: "Y"}, ["性骚扰"]),
        "S_H_027": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[2]: "Y", AGG_FIELDS[3]: "Y"}, ["性骚扰"]),
        "S_H_036": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y"}, ["性骚扰"]),
        "S_H_039": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[1]: "Y"}, ["性骚扰"]),
        "S_H_046": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_H_050": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y", AGG_FIELDS[3]: "Y"}, ["性骚扰"]),
        "S_H_062": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y", AGG_FIELDS[1]: "Y"}, ["性骚扰"]),
        "S_H_063": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足", AGG_FIELDS[0]: "Y", AGG_FIELDS[1]: "Y", AGG_FIELDS[2]: "Y", AGG_FIELDS[3]: "Y"}, ["性骚扰"]),
        "I_049": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "I_118": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "I_155": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "I_101": ({D_FIELDS[0]: "不满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "否"}, ["性别歧视"]),
        "S_D_006": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "S_D_014": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "S_D_029": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "否", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "I_147": ({}, []),
        "I_153": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "否"}, ["性别歧视"]),
        "I_005": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "I_011": ({}, []),
        "I_018": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "I_076": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "是"}, ["性别歧视"]),
        "I_148": ({}, []),
        "S_X_001": ({}, []),
        "S_X_002": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "否"}, ["性别歧视"]),
        "S_X_003": ({}, []),
        "S_X_004": ({}, []),
        "S_X_005": ({D_FIELDS[0]: "满足", D_FIELDS[1]: "满足", DS_FIELDS[0]: "是", DS_FIELDS[1]: "否"}, ["性别歧视"]),
        "S_X_006": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_007": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_008": ({H_FIELDS[0]: "不满足", H_FIELDS[1]: "不适用", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_009": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_010": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_011": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_012": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_013": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_014": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_015": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_016": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_017": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_018": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_019": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_020": ({H_FIELDS[0]: "满足", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_021": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_022": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "满足", H_FIELDS[2]: "满足"}, ["性骚扰"]),
        "S_X_023": ({H_FIELDS[0]: "存疑", H_FIELDS[1]: "存疑", H_FIELDS[2]: "满足"}, ["性骚扰"]),
    }
    if case_id not in decisions:
        return annotation, types
    changes, reviewed_types = decisions[case_id]
    reviewed = empty_annotation()
    reviewed.update(changes)
    # Preserve aggravating-factor observations only for retained harassment cases.
    if "性骚扰" in reviewed_types:
        reviewed.update({field: changes.get(field, annotation[field]) for field in AGG_FIELDS})
    return reviewed, reviewed_types


with SOURCE.open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))

originals = {}
for row in rows:
    if row["sample_group"] == "original":
        annotation, types = original_annotation(row)
        originals[row["base_case_id"]] = case_override(row["source_case_id"], annotation, types)

review_rows = []
for row in rows:
    if row["sample_group"] == "boundary":
        annotation, types = boundary_annotation(row)
        basis = "边界变体按变更后的关键事实独立标注"
    else:
        annotation, types = originals[row["base_case_id"]]
        basis = "独立原案事实标注" if row["sample_group"] == "original" else "事实语义未变，继承对应独立原案标注"
    row.update(annotation)
    row["type"] = "+".join(types) if types else "无关"
    row["final_level"] = compute_risk_level(payload(annotation, types))
    row["gold_status"] = "规则辅助初标-逐案复核中"
    row["main_accuracy_eligible"] = "F"
    row["review_notes"] = basis
    if row["sample_group"] in {"original", "boundary"}:
        review_rows.append({
            "id": row["id"], "source_case_id": row["source_case_id"], "stratum": row["stratum"],
            "sample_group": row["sample_group"], "type": row["type"], **annotation,
            "final_level": row["final_level"], "input": row["input"], "review_decision": "待复核",
        })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
with REVIEW.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=review_rows[0].keys())
    writer.writeheader()
    writer.writerows(review_rows)

for row in rows:
    assert all(row[field] in ELEMENT_VALUES for field in H_FIELDS + D_FIELDS)
    assert all(row[field] in {"Y", "N"} for field in AGG_FIELDS)
    assert all(row[field] in {"是", "否", "不适用"} for field in DS_FIELDS)
    assert row["final_level"] in {"高危", "中危", "低危", "无风险"}

print("rows", len(rows))
print("review_rows", len(review_rows))
print("levels", dict(Counter(row["final_level"] for row in rows)))
print("original_levels", dict(Counter(row["final_level"] for row in rows if row["sample_group"] == "original")))
print("groups", dict(Counter(row["sample_group"] for row in rows)))
