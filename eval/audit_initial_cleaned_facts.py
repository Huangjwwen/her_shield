import csv
import re
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "initial_121_cleaned_facts.csv"
OUTPUT = ROOT / "initial_121_fact_quality_audit.csv"
DUPLICATES = ROOT / "initial_121_fact_duplicate_review.csv"

PATTERNS = {
    "裁判主体或观点": re.compile(
        r"本院|法院(?:认为|判决|裁定|查明)|一审|二审|仲裁(?:委|庭|裁决)|审理认为|"
        r"应予支持|不予支持|予以采信|不予采信|维持原判|驳回(?:上诉|请求)|合法解除|违法解除"
    ),
    "法条或规范评价": re.compile(
        r"《[^》]*(?:法|条例|法律规定|公约|宪法|司法解释)[^》]*》|"
        r"依据法律|依法应当|于法有据|"
        r"构成性骚扰|侵犯.{0,10}(?:权利|权益)|违反公序良俗|承担法律责任"
    ),
    "诉讼请求": re.compile(
        r"诉讼请求|请求(?:法院|判令|支持)|诉请|赔偿金\d|补偿金\d|诉讼费用|依法判决"
    ),
    "裁判结果": re.compile(r"判决如下|裁定如下|判令.{0,20}(?:支付|赔偿|道歉)|驳回.{0,15}(?:诉讼|上诉)"),
}


def normalize(text):
    return re.sub(r"[\W_]+", "", text or "")


with SOURCE.open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))

audited = []
for row in rows:
    fact = row["clean_fact"].strip()
    hits = []
    for label, pattern in PATTERNS.items():
        matches = sorted(set(match.group(0) for match in pattern.finditer(fact)))
        if matches:
            hits.append(f"{label}:{'|'.join(matches[:8])}")
    if len(fact) < 80:
        hits.append("事实过短")
    if not re.search(r"(?:某|女士|职工|员工|公司|单位|学校|医院|同事|学生|企业|经营|申请人|劳动者)", fact):
        hits.append("缺少事件主体")
    audited.append({
        "id": row["id"],
        "cleaning_status": row["cleaning_status"],
        "fact_length": len(fact),
        "quality_status": "待处理" if hits else "文本审计通过",
        "issues": "；".join(hits),
        "clean_fact": fact,
    })

pairs = []
for i, left in enumerate(rows):
    a = normalize(left["clean_fact"])
    if len(a) < 60:
        continue
    for right in rows[i + 1:]:
        b = normalize(right["clean_fact"])
        if len(b) < 60:
            continue
        ratio = SequenceMatcher(None, a, b, autojunk=False).ratio()
        if ratio >= 0.72:
            pairs.append({
                "left_id": left["id"],
                "right_id": right["id"],
                "similarity": f"{ratio:.4f}",
                "review_status": "待人工核对是否同源事件",
            })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=audited[0].keys())
    writer.writeheader()
    writer.writerows(audited)

with DUPLICATES.open("w", encoding="utf-8-sig", newline="") as target:
    fields = ["left_id", "right_id", "similarity", "review_status"]
    writer = csv.DictWriter(target, fieldnames=fields)
    writer.writeheader()
    writer.writerows(pairs)

print("cases", len(rows))
print("quality_pass", sum(row["quality_status"] == "文本审计通过" for row in audited))
print("quality_pending", sum(row["quality_status"] != "文本审计通过" for row in audited))
print("duplicate_candidates", len(pairs))
