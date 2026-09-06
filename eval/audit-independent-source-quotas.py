import csv
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "independent_benchmark_review.csv"
OUTPUT = ROOT / "independent_source_quota_audit.csv"
SUPPLEMENTAL = ROOT / "supplemental_public_case_sources.csv"

TARGETS = {"性骚扰": 80, "性别歧视": 80, "无风险或无关劳动争议": 60, "交叉或信息模糊": 30}

# These are candidate assignments for source planning, not gold labels.
HARASSMENT_CANDIDATES = {
    "I_004", "I_007", "I_009", "I_010", "I_012", "I_013", "I_015", "I_016",
    "I_017", "I_051", "I_052", "I_053", "I_054", "I_146",
}
OUT_OF_SCOPE = {"I_147", "I_148", "I_153"}


def proposed_stratum(row):
    case_id = row["id"]
    queue = row["review_queue"]
    if case_id in HARASSMENT_CANDIDATES:
        return "性骚扰", "候选；须复核事实提取和要件"
    if case_id in OUT_OF_SCOPE:
        return "交叉或信息模糊", "非典型职场事件或仅制度性提及；须确认任务范围"
    if queue.startswith("B-"):
        return "性别歧视", "候选；须确认性别/孕产与不利处理的因果"
    if queue.startswith("C-"):
        return "性别歧视", "弱候选；孕产劳动争议须逐案确认因果"
    if queue.startswith("D-"):
        return "交叉或信息模糊", "仅提及、证据不足或场景不清"
    return "无风险或无关劳动争议", "候选负例；仍需漏检抽查"


def main():
    with SOURCE.open("r", encoding="utf-8-sig", newline="") as stream:
        source_rows = list(csv.DictReader(stream))

    rows = []
    for source in source_rows:
        row = dict(source)
        stratum, reason = proposed_stratum(row)
        row.update({
            "proposed_stratum": stratum,
            "quota_review_reason": reason,
            "source_eligibility": "待二审",
            "final_stratum": "",
        })
        rows.append(row)

    fields = list(source_rows[0]) + [
        "proposed_stratum", "quota_review_reason", "source_eligibility", "final_stratum"
    ]
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["proposed_stratum"] for row in rows)
    with SUPPLEMENTAL.open("r", encoding="utf-8-sig", newline="") as stream:
        supplemental = list(csv.DictReader(stream))
    supplemental_counts = Counter(row["target_stratum"] for row in supplemental)
    combined = counts + supplemental_counts
    print("source_rows", len(rows))
    print("candidate_counts", dict(counts))
    print("supplemental_counts", dict(supplemental_counts))
    print("combined_candidates", dict(combined))
    print("target_gaps", {key: max(0, value - combined[key]) for key, value in TARGETS.items()})
    print("surplus", {key: max(0, counts[key] - value) for key, value in TARGETS.items()})


if __name__ == "__main__":
    main()
