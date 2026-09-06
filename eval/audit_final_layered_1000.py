import csv
import hashlib
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000.csv"
FROZEN = ROOT / "final_250_frozen_facts.csv"
OUTPUT = ROOT / "final_layered_1000_integrity_audit.csv"


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


rows = read(SOURCE)
frozen = {row["case_id"]: row for row in read(FROZEN)}
counts = Counter(row["sample_group"] for row in rows)
base_counts = Counter(row["base_case_id"] for row in rows)
issues = []

for row in rows:
    row_issues = []
    if not row["input"].strip():
        row_issues.append("input为空")
    if row["source_case_id"] not in frozen:
        row_issues.append("来源案不在冻结清单")
    if row["sample_group"] == "original" and row["source_case_id"] in frozen:
        expected = frozen[row["source_case_id"]]["clean_fact"]
        if row["input"] != expected:
            row_issues.append("原案正文与冻结事实不一致")
        digest = hashlib.sha256(row["input"].encode("utf-8")).hexdigest()
        if digest != frozen[row["source_case_id"]]["fact_sha256"]:
            row_issues.append("原案正文哈希不一致")
    if row["sample_group"] != "original" and row["variant_of"] != row["base_case_id"]:
        row_issues.append("variant_of错误")
    if row["sample_group"] == "original" and row["variant_of"]:
        row_issues.append("原案不应设置variant_of")
    if row_issues:
        issues.append({"id": row["id"], "issues": "；".join(row_issues)})

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=["id", "issues"])
    writer.writeheader()
    writer.writerows(issues)

assert len(rows) == 1000
assert counts == {"original": 250, "paraphrase": 250, "distractor": 250, "boundary": 250}
assert len(set(row["id"] for row in rows)) == 1000
assert len(set(row["input"].strip() for row in rows)) == 1000
assert len(base_counts) == 250 and set(base_counts.values()) == {4}
assert not issues
print("rows", len(rows))
print("groups", dict(counts))
print("unique_inputs", len(set(row["input"].strip() for row in rows)))
print("integrity_issues", len(issues))
