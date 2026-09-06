import csv
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "final_250_frozen_facts.csv"
OUTPUT = ROOT / "final_layered_benchmark_1000.csv"
VARIANTS = ("original", "paraphrase", "distractor", "boundary")
ANNOTATION_COLUMNS = [
    "h1_言行与性有关", "h2_违背意愿", "h3_职场情境",
    "agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化",
    "e1_区别对待", "e2_就业环节", "discrim_institutional", "discrim_concrete_harm",
    "type", "final_level", "agent_result",
]


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def compact(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def base_text(case):
    if case.get("fact_review_status") != "已逐案事实复核":
        raise ValueError(f"Case has not passed final fact review: {case['case_id']}")
    text = compact(case.get("clean_fact"))
    if not text:
        raise ValueError(f"Case has no frozen fact: {case['case_id']}")
    return text


def paraphrase(text):
    replacements = (
        ("用人单位", "单位"), ("劳动关系", "工作关系"), ("女职工", "女性员工"),
        ("女员工", "女性同事"), ("性骚扰", "带有性意味的越界言行"),
        ("解除劳动合同", "辞退"), ("多次", "不止一次"), ("拒绝", "明确说不同意"),
        ("招聘", "招人"), ("主张", "表示"), ("法院", "审理机关"),
    )
    changed = text
    replacement_count = 0
    for old, new in replacements:
        if old in changed:
            changed = changed.replace(old, new)
            replacement_count += 1
        if replacement_count == 3:
            break
    return "换一种日常说法：" + changed


def distractor(text, index):
    noise = (
        "补充背景：单位同期更换了考勤系统，还调整过办公区域，这些事项与争议行为没有直接关系。",
        "材料还记载了部门季度会议、报销流程和团建安排，但均未被作为本案处理理由。",
        "当事人同时提到通勤距离、工位变化和项目排期，这些信息不改变争议行为本身。",
        "同期单位正在进行组织架构调整，并更新了门禁卡和工资发放日期，双方对此没有争议。",
    )
    return f"{text} {noise[index % len(noise)]}"


def neutral_topic(title):
    topic = title
    for pattern in (
        "性骚扰", "强制猥亵", "猥亵", "性侵", "强吻", "亲吻", "摸胸", "搂抱",
        "陪睡", "不雅", "低俗", "暧昧", "动手动脚", "臀部", "骚扰",
    ):
        topic = topic.replace(pattern, "争议")
    topic = re.sub(
        r"(?:一审|二审|再审|审判监督)?(?:民事)?(?:判决书|裁定书|决定书)$|"
        r"(?:劳动争议|人格权|平等就业权|确认劳动关系)?(?:纠纷)?案$|案例\d+$",
        "",
        topic,
    )
    return topic.removesuffix("案").strip(" 、，；：") or "该事件"


def boundary(title, stratum, case_index):
    topic = neutral_topic(title)
    lead = f"边界改写材料{case_index}（来源主题：{topic}）："
    if stratum == "性骚扰":
        return (
            f"{lead}双方确有工作联系，但现有材料只记载一次普通工作交流，"
            "没有披露具体言语或动作，也没有拒绝、投诉或其他能够表明违背意愿的反应。"
        )
    if stratum == "性别歧视":
        return (
            f"{lead}单位在作出处理前已经形成统一书面考核标准，"
            "相同条件的不同性别员工均受到同样处理，现有材料未显示决定与性别或婚育因素有关。"
        )
    if stratum == "无风险或无关劳动争议":
        return (
            f"{lead}一方首次称处理决定可能涉及性别、婚育或性相关言行，"
            "但没有说明具体内容，也没有聊天记录、制度文本或其他材料印证。"
        )
    return (
        f"{lead}补充材料仍只有当事人单方转述，无法确认具体言行、拒绝过程、"
        "就业处理原因或是否发生在工作场景，关键事实保持不确定。"
    )


manifest = read_csv(MANIFEST)
rows = []

for base_index, case in enumerate(manifest, 1):
    base_case_id = f"C{base_index:03d}"
    original = base_text(case)
    texts = {
        "original": original,
        "paraphrase": paraphrase(original),
        "distractor": distractor(original, base_index),
        "boundary": boundary(case["source_title"], case["stratum"], base_index),
    }
    for variant in VARIANTS:
        row = {
            "id": base_case_id if variant == "original" else f"{base_case_id}_{variant}",
            "base_case_id": base_case_id,
            "source_case_id": case["case_id"],
            "stratum": case["stratum"],
            "sample_group": variant,
            "variant_of": "" if variant == "original" else base_case_id,
            "variant_type": "" if variant == "original" else variant,
            "input": texts[variant],
            "source_title": case["source_title"],
            "source_reference": case["source_reference"],
            "source_url_or_file": case["source_url_or_file"],
            "source_origin": case["source_origin"],
            "gold_status": "待独立双人标注",
            "main_accuracy_eligible": "F",
            "review_notes": "边界变体须独立重标" if variant == "boundary" else "",
        }
        row.update({column: "" for column in ANNOTATION_COLUMNS})
        rows.append(row)

fields = [
    "id", "base_case_id", "source_case_id", "stratum", "sample_group", "variant_of",
    "variant_type", "input", "source_title", "source_reference", "source_url_or_file",
    "source_origin", *ANNOTATION_COLUMNS, "gold_status", "main_accuracy_eligible", "review_notes",
]
with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

assert len(rows) == 1000
assert len({row["id"] for row in rows}) == 1000
assert len({row["base_case_id"] for row in rows}) == 250
assert len({compact(row["input"]) for row in rows}) == 1000
assert all(sum(row["base_case_id"] == case_id for row in rows) == 4 for case_id in {row["base_case_id"] for row in rows})
print("rows", len(rows))
print("groups", dict(Counter(row["sample_group"] for row in rows)))
print("original_strata", dict(Counter(row["stratum"] for row in rows if row["sample_group"] == "original")))
print("source_origins", dict(Counter(row["source_origin"] for row in rows if row["sample_group"] == "original")))
