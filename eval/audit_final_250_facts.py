import csv
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "independent_250_source_manifest.csv"
INITIAL = ROOT / "initial_121_cleaned_facts.csv"
SUPPLEMENTAL = ROOT / "supplemental_case_facts.csv"
OUTPUT = ROOT / "final_250_fact_quality_audit.csv"
DUPLICATES = ROOT / "final_250_fact_duplicate_review.csv"

CONTAMINATION = {
    "裁判观点": re.compile(r"本院认为|法院认为|一审认为|二审认为|裁判认为|裁判要旨|法院指出|法院判定"),
    "裁判结果": re.compile(r"判决如下|裁判结果|驳回诉讼请求|维持原判|撤销原判|判令|最终判决|法院支持|法院不予支持"),
    "法律结论": re.compile(r"构成性骚扰|不构成性骚扰|构成性别歧视|不构成性别歧视|属于性骚扰|不属于性骚扰|系违法解除|合法解除"),
    "法律条文": re.compile(r"《[^》]{2,30}(?:法|典|条例|规定|解释)》|第[一二三四五六七八九十百千万0-9]+条"),
    "诉讼请求": re.compile(r"诉讼请求|请求法院|请求判令|原告诉称|上诉请求|申请仲裁|仲裁请求"),
    "诉讼化叙述": re.compile(r"经审理查明|申请人|被申请人|原告|被告|本案中|本案争议|庭审中|提起诉讼|诉至法院|劳动仲裁|仲裁裁决"),
    "评价性结论": re.compile(r"具有合法性|不属于.*歧视|不存在.*歧视|符合劳动合同|严重违纪|综上|依法应当|合法权益|侵犯.*权益|证据不足|不予支持|不足采信|举证证明|应予支付|可以认定|由此可见|合法有效|解除.*合法|解除.*违法"),
    "裁判式规范": re.compile(r"用人单位不得|劳动者应当|公司有权|法院有权|法律法规规定|依照.*规定|根据.*规定|适用.*法律"),
    "程序痕迹": re.compile(r"一审|二审|再审|判决|裁定|法院审理|审理结果|争议焦点|典型意义|法官说法|检察建议|公开听证|立案调查|履职情况|本案例由"),
}


def read_csv(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def compact(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def normalize(text):
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]", "", (text or "").lower())


manifest = read_csv(MANIFEST)
initial = {row["id"]: row for row in read_csv(INITIAL)}
supplemental = {row["candidate_id"]: row for row in read_csv(SUPPLEMENTAL)}
facts = []

for case in manifest:
    if case["source_origin"] == "initial":
        source = initial.get(case["case_id"], {})
        fact = compact(source.get("clean_fact"))
    else:
        source = supplemental.get(case["case_id"], {})
        fact = compact(source.get("fact_summary"))
    issues = []
    if not fact:
        issues.append("缺少案情")
    if len(fact) < 80:
        issues.append("案情不足80字")
    if case["stratum"] != "无风险或无关劳动争议" and not re.search(
        r"公司|单位|员工|职工|劳动|招聘|工作|领导|同事|求职|应聘|主管|经理|学校|学院|教师|学生|导师|医院|企业|项目|实习|店内", fact
    ):
        issues.append("缺少职场或就业事实主体")
    for label, pattern in CONTAMINATION.items():
        matches = sorted(set(pattern.findall(fact)))
        if matches:
            issues.append(f"{label}:{'|'.join(matches[:5])}")
    facts.append({
        **case,
        "fact_length": len(fact),
        "fact_quality": "通过" if not issues else "待复核",
        "fact_issues": "；".join(issues),
        "clean_fact": fact,
    })

pairs = []
for index, left in enumerate(facts):
    a = normalize(left["clean_fact"])
    if len(a) < 60:
        continue
    for right in facts[index + 1:]:
        b = normalize(right["clean_fact"])
        if len(b) < 60:
            continue
        ratio = SequenceMatcher(None, a, b, autojunk=False).ratio()
        containment = min(len(a), len(b)) / max(len(a), len(b)) if a in b or b in a else 0
        if ratio >= 0.72 or containment >= 0.80:
            pairs.append({
                "left_id": left["case_id"],
                "right_id": right["case_id"],
                "left_origin": left["source_origin"],
                "right_origin": right["source_origin"],
                "similarity": f"{ratio:.4f}",
                "containment": f"{containment:.4f}",
                "left_fact": left["clean_fact"],
                "right_fact": right["clean_fact"],
                "review_decision": "待人工复核",
            })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=facts[0].keys())
    writer.writeheader()
    writer.writerows(facts)

pair_fields = ["left_id", "right_id", "left_origin", "right_origin", "similarity", "containment", "left_fact", "right_fact", "review_decision"]
with DUPLICATES.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=pair_fields)
    writer.writeheader()
    writer.writerows(pairs)

counts = Counter(row["stratum"] for row in facts)
pending = [row for row in facts if row["fact_quality"] != "通过"]
print("cases", len(facts))
print("strata", dict(counts))
print("quality_pass", len(facts) - len(pending))
print("quality_pending", len(pending))
print("pending_ids", [(row["case_id"], row["fact_issues"]) for row in pending])
print("duplicate_candidates", len(pairs))

assert len(facts) == 250
assert sorted(counts.values()) == [30, 60, 80, 80]
