import csv
import re
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "supplemental_case_facts.csv"
OUTPUT = ROOT / "supplemental_fact_duplicate_review.csv"


def normalize(text):
    text = re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]", "", text or "")
    return text[:1200]


with SOURCE.open(encoding="utf-8-sig", newline="") as source:
    rows = [row for row in csv.DictReader(source) if len(row["fact_summary"]) >= 80]

pairs = []
for index, left in enumerate(rows):
    left_fact = normalize(left["fact_summary"])
    for right in rows[index + 1:]:
        right_fact = normalize(right["fact_summary"])
        ratio = SequenceMatcher(None, left_fact, right_fact).ratio()
        if ratio >= 0.68 or left_fact[:80] == right_fact[:80]:
            pairs.append({
                "left_id": left["candidate_id"],
                "right_id": right["candidate_id"],
                "similarity": f"{ratio:.3f}",
                "left_title": left["source_title"],
                "right_title": right["source_title"],
                "review_decision": "待人工复核",
            })

fields = ["left_id", "right_id", "similarity", "left_title", "right_title", "review_decision"]
with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=fields)
    writer.writeheader()
    writer.writerows(pairs)

print("facts_audited", len(rows))
print("candidate_pairs", len(pairs))
