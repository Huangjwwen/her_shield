import json
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[2]
FILES = ["案例.docx", "案例2.docx", "职场性别歧视性骚扰相关案例.docx"]
PATTERNS = [
    re.compile(r"^\d+[、.]\s*.{2,80}(?:案|案例)$"),
    re.compile(r"^案例[一二三四五六七八九十0-9]+[：、.\s].{2,80}$"),
    re.compile(r"^.{2,80}(?:判决书|裁定书)$"),
    re.compile(r"^.{2,50}(?:胜诉案|辞退案|歧视案|骚扰案)$"),
]


def main():
    result = {}
    for filename in FILES:
        paragraphs = [p.text.strip() for p in Document(ROOT / filename).paragraphs if p.text.strip()]
        headings = []
        for index, text in enumerate(paragraphs):
            if any(pattern.match(text) for pattern in PATTERNS):
                headings.append({"paragraph": index, "heading": text})
        result[filename] = headings
    output = Path(__file__).with_name("document_case_heading_candidates.json")
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    for filename, headings in result.items():
        print(filename, len(headings))


if __name__ == "__main__":
    main()
