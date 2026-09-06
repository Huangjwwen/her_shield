import csv
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parent
AUDIT = ROOT / "independent_source_quota_audit.csv"
SUPPLEMENTAL = ROOT / "supplemental_public_case_sources.csv"
OUTPUT = ROOT / "independent_250_source_manifest.csv"
DUPLICATES = ROOT / "independent_250_duplicate_review.csv"
TARGETS = {"性骚扰": 80, "性别歧视": 80, "无风险或无关劳动争议": 60, "交叉或信息模糊": 30}
EXCLUDED_INITIAL_IDS = {"I_021", "I_026", "I_041", "I_044"}


def normalize(text):
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]", "", (text or "").lower())


def source_record(row, origin):
    if origin == "initial":
        return {
            "case_id": row["id"],
            "stratum": row["proposed_stratum"],
            "source_origin": origin,
            "source_title": row["source_title"],
            "source_reference": row["source_reference"],
            "source_url_or_file": row["source_file_or_url"],
            "review_status": row["source_eligibility"],
        }
    return {
        "case_id": row["candidate_id"],
        "stratum": row["target_stratum"],
        "source_origin": origin,
        "source_title": row["source_title"],
        "source_reference": row["source_reference"],
        "source_url_or_file": row["source_url"],
        "review_status": row["selection_status"],
    }


with AUDIT.open(encoding="utf-8-sig", newline="") as source:
    initial = [
        source_record(row, "initial")
        for row in csv.DictReader(source)
        if row["id"] not in EXCLUDED_INITIAL_IDS
    ]
with SUPPLEMENTAL.open(encoding="utf-8-sig", newline="") as source:
    supplemental = [source_record(row, "supplemental") for row in csv.DictReader(source)]

selected = []
for stratum, target in TARGETS.items():
    candidates = [row for row in initial + supplemental if row["stratum"] == stratum]
    seen = set()
    unique = []
    for row in candidates:
        reference = normalize(row["source_reference"])
        title = normalize(row["source_title"])
        key = reference if reference and ("号" in row["source_reference"] or reference.startswith("http")) else title
        if key and key in seen:
            continue
        seen.add(key)
        unique.append(row)
    if len(unique) < target:
        raise RuntimeError(f"{stratum}: only {len(unique)} unique candidates for target {target}")
    selected.extend(unique[:target])

duplicate_rows = []
for index, left in enumerate(selected):
    for right in selected[index + 1:]:
        same_url = (
            left["source_url_or_file"].startswith("http")
            and left["source_url_or_file"] == right["source_url_or_file"]
        )
        left_dockets = set(re.findall(r"[（(]\d{4}[）)][^号,，；;]{2,30}号", left["source_reference"]))
        right_dockets = set(re.findall(r"[（(]\d{4}[）)][^号,，；;]{2,30}号", right["source_reference"]))
        same_reference = bool(left_dockets & right_dockets)
        similarity = SequenceMatcher(
            None, normalize(left["source_title"]), normalize(right["source_title"])
        ).ratio()
        exact_title = normalize(left["source_title"]) == normalize(right["source_title"])
        if same_reference or exact_title or (same_url and similarity >= 0.72) or similarity >= 0.92:
            duplicate_rows.append({
                "left_id": left["case_id"],
                "right_id": right["case_id"],
                "same_url": same_url,
                "same_reference": same_reference,
                "title_similarity": f"{similarity:.3f}",
                "left_title": left["source_title"],
                "right_title": right["source_title"],
                "review_decision": "非重复：同一合集或来源中的不同事件",
            })

fields = list(selected[0])
with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=fields)
    writer.writeheader()
    writer.writerows(selected)

duplicate_fields = [
    "left_id", "right_id", "same_url", "same_reference", "title_similarity",
    "left_title", "right_title", "review_decision",
]
with DUPLICATES.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=duplicate_fields)
    writer.writeheader()
    writer.writerows(duplicate_rows)

print("selected", len(selected), dict(Counter(row["stratum"] for row in selected)))
print("duplicate_review_pairs", len(duplicate_rows))
