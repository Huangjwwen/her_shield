import csv
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "annotation_filled.csv"
BACKUP = ROOT / "annotation_filled.before-independent-review.csv"

S, D, N, NA = "满足", "存疑", "不满足", "不适用"
Y, NO = "Y", "N"


def harassment(h1, h2, h3, body=NO, authority=NO, repeated=NO, multiple=NO, written=NO):
    return [h1, h2, h3, body, authority, repeated, multiple, written, NA, NA, NA, NA]


def discrimination(e1, e2, institutional="否", harm="否"):
    return [NA, NA, NA, NA, NA, NA, NA, NA, e1, e2, institutional, harm]


UNRELATED = [NA] * 12

# Each entry corresponds to the semantic pattern selected by index modulo the
# pattern count in expand-annotation-template.py. These judgments were made
# from the case text and annotation guide, without reading agent outputs.
HARASSMENT = {
    "E_HH": [
        harassment(S, S, S, Y, Y),
        harassment(S, S, S, authority=Y, repeated=Y, written=Y),
        harassment(S, S, S, Y, Y),
        harassment(S, S, S, body=Y, repeated=Y),
        harassment(S, S, S, Y, Y, Y, Y),
        harassment(S, S, S, authority=Y, written=Y),
        harassment(S, S, S, Y, Y, Y),
        harassment(S, S, S, Y, Y),
    ],
    "E_HM": [
        harassment(S, S, S, repeated=Y),
        harassment(S, D, S, repeated=Y),
        harassment(S, S, S, body=Y, repeated=Y),
        harassment(S, D, S, repeated=Y, multiple=Y, written=Y),
        harassment(S, S, S, written=Y),
        harassment(S, D, S, repeated=Y),
        harassment(S, S, S, repeated=Y),
        harassment(S, D, S, repeated=Y),
    ],
    "E_HL": [
        harassment(S, D, S),
        harassment(S, D, S),
        harassment(D, D, S),
        harassment(D, S, S),
        harassment(N, N, S),
        harassment(D, S, S, written=Y),
    ],
}

DISCRIMINATION = {
    "E_DH": [
        discrimination(S, S, "是", "是"),
        discrimination(S, S, "是", "是"),
        discrimination(S, S, "否", "是"),
        discrimination(S, S, "否", "是"),
        discrimination(S, S, "是", "否"),
        discrimination(S, S, "否", "是"),
        discrimination(S, S, "是", "是"),
        discrimination(S, S, "否", "是"),
    ],
    "E_DM": [
        discrimination(S, S),
        discrimination(S, S, "否", "是"),
        discrimination(S, S),
        discrimination(S, S, "否", "是"),
        discrimination(S, S, "否", "是"),
        discrimination(S, S),
        discrimination(S, S, "否", "是"),
        discrimination(S, S, "否", "是"),
    ],
    "E_DL": [
        discrimination(D, S),
        discrimination(D, S),
        discrimination(N, N),
        discrimination(D, S),
        discrimination(S, N),
        discrimination(N, N),
    ],
}


def base_annotation(case_id):
    prefix, number = case_id.rsplit("_", 1)
    index = int(number) - 1
    if prefix in HARASSMENT:
        patterns = HARASSMENT[prefix]
        return patterns[index % len(patterns)]
    if prefix in DISCRIMINATION:
        patterns = DISCRIMINATION[prefix]
        return patterns[index % len(patterns)]
    if prefix == "E_N":
        return UNRELATED
    raise ValueError(f"unsupported base case: {case_id}")


def boundary_annotation(source_id):
    prefix = source_id.rsplit("_", 1)[0]
    if prefix in {"E_HH", "E_DH", "E_DL"}:
        return UNRELATED
    if prefix == "E_HM":
        return harassment(S, S, S, body=Y, authority=Y)
    if prefix == "E_HL":
        return harassment(S, S, S, authority=Y, repeated=Y, written=Y)
    if prefix == "E_DM":
        return discrimination(S, S, "是", "是")
    if prefix == "E_N":
        return discrimination(S, S, "是", "是")
    raise ValueError(f"unsupported boundary source: {source_id}")


def annotation_for(row):
    case_id = row[0]
    if case_id.startswith(("E_HH_", "E_HM_", "E_HL_", "E_DH_", "E_DM_", "E_DL_", "E_N_")):
        return base_annotation(case_id)
    source_id = row[2]
    if case_id.startswith("E_BD_"):
        return boundary_annotation(source_id)
    if case_id.startswith(("E_PP_", "E_PT_", "E_DT_", "E_VB_")):
        return base_annotation(source_id)
    raise ValueError(f"unsupported expanded case: {case_id}")


def compute_level(values, case_type):
    h1, h2, h3, body, authority, repeated, multiple, written, e1, e2, institutional, harm = values
    levels = []
    ambiguous = case_type == "暂不明确"
    if case_type in {"性骚扰", "性骚扰+性别歧视"} or ambiguous:
        if h1 == S:
            has_agg = Y in [body, authority, repeated, multiple, written]
            severe = body == Y or authority == Y
            if (h2 == S and h3 == S and has_agg) or (h2 == S and severe):
                levels.append(3)
            elif h2 in {S, D} or h3 in {S, D}:
                levels.append(2)
            else:
                levels.append(1)
        elif h1 == D:
            levels.append(1)
        else:
            levels.append(0)
    if case_type in {"性别歧视", "性骚扰+性别歧视"} or ambiguous:
        if e1 == S:
            if e2 == S and (institutional == "是" or harm == "是"):
                levels.append(3)
            elif e2 in {S, D}:
                levels.append(2)
            else:
                levels.append(1)
        elif e1 == D:
            levels.append(1)
        else:
            levels.append(0)
    return {3: "高危", 2: "中危", 1: "低危", 0: "无风险"}[max(levels) if levels else 0]


def normalize_level(value):
    return "无风险" if value == "无关" else value


def main():
    if not BACKUP.exists():
        shutil.copy2(SOURCE, BACKUP)

    with SOURCE.open("r", encoding="gbk", newline="") as stream:
        rows = list(csv.reader(stream))
    if len(rows) != 1001:
        raise SystemExit(f"expected header + 1000 rows, found {len(rows)}")

    changed_fields = 0
    changed_levels = 0
    for row_number, row in enumerate(rows[101:], start=101):
        values = annotation_for(row)
        previous = row[5:17]
        changed_fields += sum(a != b for a, b in zip(previous, values))
        row[5:17] = values
        final_level = compute_level(values, row[17])
        changed_levels += row[18] != final_level
        row[18] = final_level
        row[20] = "T" if normalize_level(row[19]) == final_level else "F"
        row[22] = "独立复核：仅依据input与要件级人工标注指南；未使用智能体要件输出"

    with SOURCE.open("w", encoding="gbk", newline="") as stream:
        csv.writer(stream, lineterminator="\r\n").writerows(rows)

    matches = sum(row[20] == "T" for row in rows[1:])
    expanded_matches = sum(row[20] == "T" for row in rows[101:])
    print(f"reviewed=900 changed_fields={changed_fields} changed_levels={changed_levels}")
    print(f"all_matches={matches}/1000 ({matches / 1000:.1%})")
    print(f"expanded_matches={expanded_matches}/900 ({expanded_matches / 900:.1%})")
    print(f"backup={BACKUP.name}")


if __name__ == "__main__":
    main()
