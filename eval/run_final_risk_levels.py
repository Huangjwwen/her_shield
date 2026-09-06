import csv
from collections import Counter
from pathlib import Path

from risk_level import compute_risk_level


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000_annotated.csv"
OUTPUT = ROOT / "final_layered_benchmark_1000_final.csv"
AUDIT = ROOT / "final_risk_level_recompute_audit.csv"
H = ("h1_言行与性有关", "h2_违背意愿", "h3_职场情境")
A = ("agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化")
D = ("e1_区别对待", "e2_就业环节")


def payload(row):
    types = [] if row["type"] == "无关" else row["type"].split("+")
    return {
        "type": types,
        "elements_check": [
            {"name": "言行与性有关", "status": row[H[0]]},
            {"name": "违背意愿", "status": row[H[1]]},
            {"name": "职场情境", "status": row[H[2]]},
            {"name": "区别对待", "status": row[D[0]]},
            {"name": "就业环节", "status": row[D[1]]},
        ],
        "aggravating_factors": [field.removeprefix("agg_") for field in A if row[field] == "Y"],
        "discrimination_severity": {
            "institutional": row["discrim_institutional"],
            "concrete_harm": row["discrim_concrete_harm"],
        },
    }


with SOURCE.open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))

audit = []
for row in rows:
    previous = row["final_level"]
    recomputed = compute_risk_level(payload(row))
    row["final_level"] = recomputed
    audit.append({
        "id": row["id"], "previous_level": previous, "recomputed_level": recomputed,
        "match": "T" if previous == recomputed else "F",
    })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
with AUDIT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=audit[0].keys())
    writer.writeheader()
    writer.writerows(audit)

assert len(rows) == 1000
assert all(row["match"] == "T" for row in audit)
print("rows", len(rows))
print("recompute_matches", sum(row["match"] == "T" for row in audit))
print("levels", dict(Counter(row["final_level"] for row in rows)))
