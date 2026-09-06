import csv
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent
DOC_ROOT = ROOT.parent.parent
SOURCE = ROOT / "initial_121_cleaned_facts.csv"
OUTPUT = ROOT / "initial_121_source_fact_candidates.csv"

START_MARKERS = (
    "基本案情", "案情回放", "案情：", "案情:", "一审法院认定事实", "经审理查明",
    "本院查明", "查明事实", "事实如下",
)
STOP_MARKERS = (
    "法院认为", "本院认为", "一审法院认为", "裁判结果", "裁判要旨", "典型意义",
    "专家点评", "以案说法", "检察机关履职情况", "判决如下", "裁定如下",
)


def norm(text):
    return re.sub(r"\s+", "", text or "").replace("*", "")


def looks_like_heading(text):
    compact = norm(text)
    return bool(
        8 <= len(compact) <= 80
        and (
            compact.endswith(("判决书", "裁定书", "案例", "案"))
            or re.match(r"^\d+[、.．]", compact)
        )
    )


docs = {}
for name in ("案例.docx", "案例2.docx", "职场性别歧视性骚扰相关案例.docx"):
    path = DOC_ROOT / name
    docs[name] = [p.text.strip() for p in Document(path).paragraphs]

with SOURCE.open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))

results = []
for row in rows:
    paragraphs = docs.get(row["source_file_or_url"], [])
    target = norm(row["source_title"])
    matches = []
    for i, text in enumerate(paragraphs):
        heading = re.sub(r"^\d+[、.．]", "", norm(text))
        if target and (heading == target or (heading.endswith(target) and len(heading) <= len(target) + 6)):
            matches.append(i)
    title_index = matches[0] if matches else -1
    candidate = ""
    method = "title_not_found"
    if title_index >= 0:
        raw_window = paragraphs[title_index + 1:title_index + 90]
        next_heading = next(
            (i for i, text in enumerate(raw_window) if i > 0 and looks_like_heading(text)),
            len(raw_window),
        )
        window = raw_window[:next_heading]
        start = next((i for i, text in enumerate(window) if any(m in text for m in START_MARKERS)), -1)
        if start >= 0:
            pieces = []
            for text in window[start:]:
                if pieces and (any(marker in text for marker in STOP_MARKERS) or looks_like_heading(text)):
                    break
                pieces.append(text)
            candidate = re.sub(r"\s+", " ", " ".join(pieces)).strip()
            method = "fact_section"
        else:
            method = "title_found_no_fact_marker"
    results.append({
        "id": row["id"],
        "source_title": row["source_title"],
        "source_file": row["source_file_or_url"],
        "title_paragraph_index": title_index,
        "candidate_method": method,
        "source_fact_candidate": candidate[:4000],
        "candidate_length": len(candidate[:4000]),
        "candidate_review_status": "待人工核对",
    })

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=results[0].keys())
    writer.writeheader()
    writer.writerows(results)

print("rows", len(results))
print("title_found", sum(row["title_paragraph_index"] >= 0 for row in results))
print("fact_candidates", sum(row["candidate_method"] == "fact_section" for row in results))
