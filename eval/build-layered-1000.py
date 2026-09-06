import csv
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LEGACY = ROOT / "annotation_filled.csv"
OUTPUT = ROOT / "layered_benchmark_1000.csv"

TARGETS = {"性骚扰": 80, "性别歧视": 80, "无风险或无关劳动争议": 60, "交叉或信息模糊": 30}
VARIANTS = ["original", "paraphrase", "distractor", "boundary"]

ANNOTATION_COLUMNS = [
    "h1_言行与性有关", "h2_违背意愿", "h3_职场情境",
    "agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化",
    "e1_区别对待", "e2_就业环节", "discrim_institutional", "discrim_concrete_harm",
    "type", "final_level",
]


def read_legacy():
    for encoding in ("utf-8-sig", "gb18030"):
        try:
            with LEGACY.open("r", encoding=encoding, newline="") as stream:
                return list(csv.DictReader(stream))
        except UnicodeDecodeError:
            pass
    raise RuntimeError("cannot decode annotation_filled.csv")


def normalized(text):
    return re.sub(r"\s+", "", text)


def select_base(rows):
    base = [row for row in rows if not row.get("variant_of")]
    harassment = [row for row in base if row["category"] == "骚扰"]
    discrimination = [row for row in base if row["category"] == "歧视"]
    negatives = [row for row in base if row["category"] == "无关-无风险"]

    risk_order = {"无风险": 0, "低危": 1, "中危": 2, "高危": 3}
    ambiguity_key = lambda row: (risk_order.get(row["final_level"], 9), row["id"])
    harassment.sort(key=ambiguity_key)
    discrimination.sort(key=ambiguity_key)
    ambiguous = harassment[:15] + discrimination[:15]
    ambiguous_ids = {row["id"] for row in ambiguous}
    main_key = lambda row: (0 if "真实判例" in row.get("notes_current", "") else 1, row["id"])
    harassment_main = sorted(
        [row for row in harassment if row["id"] not in ambiguous_ids], key=main_key
    )[:80]
    discrimination_main = sorted(
        [row for row in discrimination if row["id"] not in ambiguous_ids], key=main_key
    )[:80]
    negative_main = negatives[:60]

    selected = []
    for stratum, group in [
        ("性骚扰", harassment_main),
        ("性别歧视", discrimination_main),
        ("无风险或无关劳动争议", negative_main),
        ("交叉或信息模糊", ambiguous),
    ]:
        if len(group) != TARGETS[stratum]:
            raise RuntimeError(f"insufficient rows for {stratum}: {len(group)}")
        selected.extend((stratum, row) for row in group)
    return selected


def paraphrase(text):
    replacements = [
        ("我们公司", "我所在的单位"), ("公司", "单位"), ("领导", "上级"),
        ("同事", "一起工作的同事"), ("拒绝", "明确表示不同意"),
        ("辞退", "解除劳动关系"), ("招聘", "招人"), ("工资", "薪酬"),
        ("多次", "不止一次"), ("一直", "持续"),
    ]
    changed = text
    for old, new in replacements:
        if old in changed:
            changed = changed.replace(old, new, 1)
            if changed != text:
                break
    return "事情大致是这样的：" + changed


def distract(text, index):
    extras = [
        "补充背景：部门最近更换了考勤系统，我的项目交付时间没有变化。",
        "另外，公司上个月搬过一次办公室，这与争议本身没有直接关系。",
        "当天还讨论了季度报表和团建安排，这些内容与我反映的问题无关。",
        "我入职后曾调整过工位，日常工作内容和劳动合同约定基本一致。",
    ]
    return text + " " + extras[index % len(extras)]


def boundary(text, stratum):
    if stratum == "性骚扰":
        return text + " 但我当时没有表达拒绝，对方也称其理解为普通玩笑；是否违背意愿仍需核实。"
    if stratum == "性别歧视":
        return text + " 单位随后说明处理依据是同期书面考核记录，而非性别或孕产情况，二者因果关系尚不明确。"
    if stratum == "无风险或无关劳动争议":
        return text + " 争议中有人顺带提到女员工，但现有信息没有显示处理决定以性别、婚育或性相关言行为依据。"
    return text + " 目前只有当事人单方转述，是否发生相关言行、是否明确拒绝以及是否属于工作场景均缺少信息。"


def provenance(row):
    if "真实判例" in row.get("notes_current", ""):
        return "legacy_claimed_real_unverified"
    if row["id"].startswith("E_"):
        return "legacy_script_combination"
    return "legacy_manual_scenario_unknown_source"


def main():
    selected = select_base(read_legacy())
    rows = []
    for base_index, (stratum, source) in enumerate(selected, 1):
        case_id = f"C{base_index:03d}"
        for variant_index, variant_type in enumerate(VARIANTS):
            if variant_type == "original":
                text = source["input"]
            elif variant_type == "paraphrase":
                text = paraphrase(source["input"])
            elif variant_type == "distractor":
                text = distract(source["input"], base_index)
            else:
                text = boundary(source["input"], stratum)
            row = {
                "id": case_id if variant_type == "original" else f"{case_id}_{variant_type}",
                "base_case_id": case_id,
                "legacy_id": source["id"],
                "stratum": stratum,
                "sample_group": variant_type,
                "variant_of": "" if variant_type == "original" else case_id,
                "variant_type": "" if variant_type == "original" else variant_type,
                "input": text,
                "provenance_status": provenance(source),
                "source_reference": "",
                "gold_status": "待独立双人复核",
                "main_accuracy_eligible": "F",
                "review_notes": "",
            }
            for column in ANNOTATION_COLUMNS:
                row[column] = source.get(column, "") if variant_type in {"original", "paraphrase", "distractor"} else ""
            rows.append(row)

    fields = [
        "id", "base_case_id", "legacy_id", "stratum", "sample_group", "variant_of", "variant_type",
        "input", "provenance_status", "source_reference", *ANNOTATION_COLUMNS,
        "gold_status", "main_accuracy_eligible", "review_notes",
    ]
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    assert len(rows) == 1000
    assert len({row["id"] for row in rows}) == 1000
    assert len({row["base_case_id"] for row in rows}) == 250
    assert len({normalized(row["input"]) for row in rows}) == 1000
    print("rows", len(rows))
    print("groups", dict(Counter(row["sample_group"] for row in rows)))
    print("original_strata", dict(Counter(row["stratum"] for row in rows if row["sample_group"] == "original")))
    print("main_accuracy_eligible", dict(Counter(row["main_accuracy_eligible"] for row in rows)))


if __name__ == "__main__":
    main()
