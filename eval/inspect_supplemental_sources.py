import csv
from pathlib import Path


PATH = Path(__file__).with_name("supplemental_public_case_sources.csv")


def restore(text):
    try:
        return text.encode("gbk").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


with PATH.open(encoding="utf-8-sig", newline="") as source:
    rows = list(csv.DictReader(source))

for row in rows:
    decoded = {restore(key): restore(value) for key, value in row.items()}
    if decoded["target_stratum"] in {"性骚扰", "交叉或信息模糊"}:
        print(
            decoded["candidate_id"],
            decoded["target_stratum"],
            decoded["source_title"],
            sep="\t",
        )
