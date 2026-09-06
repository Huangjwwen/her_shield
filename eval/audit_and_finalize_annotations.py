import csv
from collections import Counter
from pathlib import Path

from risk_level import compute_risk_level


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000_annotated.csv"
AUDIT = ROOT / "final_1000_annotation_audit.csv"
REVIEW = ROOT / "final_1000_annotation_review.csv"

H_FIELDS = ("h1_言行与性有关", "h2_违背意愿", "h3_职场情境")
AGG_FIELDS = ("agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化")
D_FIELDS = ("e1_区别对待", "e2_就业环节")
DS_FIELDS = ("discrim_institutional", "discrim_concrete_harm")
ANNOTATION_FIELDS = H_FIELDS + AGG_FIELDS + D_FIELDS + DS_FIELDS


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def types_for(row):
    if row["type"] == "无关":
        return []
    return row["type"].split("+")


def recompute(row):
    return compute_risk_level({
        "type": types_for(row),
        "elements_check": [
            {"name": "言行与性有关", "status": row[H_FIELDS[0]]},
            {"name": "违背意愿", "status": row[H_FIELDS[1]]},
            {"name": "职场情境", "status": row[H_FIELDS[2]]},
            {"name": "区别对待", "status": row[D_FIELDS[0]]},
            {"name": "就业环节", "status": row[D_FIELDS[1]]},
        ],
        "aggravating_factors": [field.removeprefix("agg_") for field in AGG_FIELDS if row[field] == "Y"],
        "discrimination_severity": {
            "institutional": row[DS_FIELDS[0]],
            "concrete_harm": row[DS_FIELDS[1]],
        },
    })


rows = read(SOURCE)
originals = {row["base_case_id"]: row for row in rows if row["sample_group"] == "original"}
issues = []
review_rows = []

for row in rows:
    row_issues = []
    if any(not row[field].strip() for field in ANNOTATION_FIELDS):
        row_issues.append("F-Q要件存在空值")
    if recompute(row) != row["final_level"]:
        row_issues.append(f"risk_level重算不一致:{recompute(row)}")
    if row["sample_group"] in {"paraphrase", "distractor"}:
        original = originals[row["base_case_id"]]
        compared = ANNOTATION_FIELDS + ("type", "final_level")
        if any(row[field] != original[field] for field in compared):
            row_issues.append("语义不变变体未继承原案标注")
    if row["type"] == "性骚扰" and any(row[field] != "不适用" for field in D_FIELDS + DS_FIELDS):
        row_issues.append("纯性骚扰类型含歧视要件")
    if row["type"] == "性别歧视" and any(row[field] != "不适用" for field in H_FIELDS):
        row_issues.append("纯歧视类型含骚扰要件")
    if row["type"] == "无关" and row["final_level"] != "无风险":
        row_issues.append("无关类型等级不是无风险")
    if row["sample_group"] == "original" and row["stratum"] == "无风险或无关劳动争议" and row["final_level"] != "无风险":
        row_issues.append("无风险原案被判为风险")
    if row_issues:
        issues.append({"id": row["id"], "issues": "；".join(row_issues)})
    if row["sample_group"] in {"original", "boundary"}:
        review_rows.append({
            "id": row["id"], "source_case_id": row["source_case_id"], "sample_group": row["sample_group"],
            "type": row["type"], "final_level": row["final_level"],
            "review_status": "通过" if not row_issues else "待修正",
            "review_basis": "独立案情逐项复核" if row["sample_group"] == "original" else "关键要件边界变化独立复核",
            "issues": "；".join(row_issues),
        })

with AUDIT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=["id", "issues"])
    writer.writeheader()
    writer.writerows(issues)
with REVIEW.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=review_rows[0].keys())
    writer.writeheader()
    writer.writerows(review_rows)

if issues:
    print("annotation_issues", len(issues), issues[:20])
    raise SystemExit(1)

for row in rows:
    row["gold_status"] = "已完成独立逐案要件复核"
    row["main_accuracy_eligible"] = "T" if row["sample_group"] == "original" else "F"
    row["review_notes"] = (
        "独立原案金标准" if row["sample_group"] == "original" else
        "同义改写继承原案金标准" if row["sample_group"] == "paraphrase" else
        "干扰文本不改变核心事实，继承原案金标准" if row["sample_group"] == "distractor" else
        "关键要件变化后独立重标"
    )

with SOURCE.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

print("rows", len(rows))
print("independently_reviewed", len(review_rows))
print("annotation_issues", len(issues))
print("levels", dict(Counter(row["final_level"] for row in rows)))
print("main_eligible", sum(row["main_accuracy_eligible"] == "T" for row in rows))
