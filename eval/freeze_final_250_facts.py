import csv
import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parent
AUDIT = ROOT / "final_250_fact_quality_audit.csv"
DUPLICATES = ROOT / "final_250_fact_duplicate_review.csv"
INITIAL = ROOT / "initial_121_cleaned_facts.csv"
SUPPLEMENTAL = ROOT / "supplemental_case_facts.csv"
OUTPUT = ROOT / "final_250_frozen_facts.csv"


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


audited = read(AUDIT)
duplicates = read(DUPLICATES)
assert len(audited) == 250
assert all(row["fact_quality"] == "通过" for row in audited)
assert not duplicates

frozen = []
for row in audited:
    fact = row["clean_fact"].strip()
    frozen.append({
        "case_id": row["case_id"],
        "stratum": row["stratum"],
        "source_origin": row["source_origin"],
        "source_title": row["source_title"],
        "source_reference": row["source_reference"],
        "source_url_or_file": row["source_url_or_file"],
        "clean_fact": fact,
        "fact_length": len(fact),
        "fact_sha256": hashlib.sha256(fact.encode("utf-8")).hexdigest(),
        "fact_review_status": "已逐案事实复核",
        "contamination_audit": "通过",
        "duplicate_audit": "通过",
    })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=frozen[0].keys())
    writer.writeheader()
    writer.writerows(frozen)

initial_rows = read(INITIAL)
selected_initial = {row["case_id"] for row in frozen if row["source_origin"] == "initial"}
for row in initial_rows:
    if row["id"] in selected_initial:
        row["cleaning_status"] = "已逐案事实复核"
with INITIAL.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=initial_rows[0].keys())
    writer.writeheader()
    writer.writerows(initial_rows)

supplemental_rows = read(SUPPLEMENTAL)
selected_supplemental = {row["case_id"] for row in frozen if row["source_origin"] == "supplemental"}
for row in supplemental_rows:
    if row["candidate_id"] in selected_supplemental:
        row["fact_review_status"] = "已逐案事实复核"
with SUPPLEMENTAL.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=supplemental_rows[0].keys())
    writer.writeheader()
    writer.writerows(supplemental_rows)

print("frozen", len(frozen))
print("initial_reviewed", len(selected_initial))
print("supplemental_reviewed", len(selected_supplemental))
