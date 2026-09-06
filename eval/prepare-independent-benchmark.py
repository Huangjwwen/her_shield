import csv
import html
import re
import urllib.request
from difflib import SequenceMatcher
from html.parser import HTMLParser
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent
POOL = ROOT / "independent_case_source_pool.csv"
OUTPUT = ROOT / "independent_benchmark_draft.csv"
CACHE = ROOT / "official_source_cache"
DOC = ROOT.parent.parent / "职场性别歧视性骚扰相关案例.docx"


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.skip += 1
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "br"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.skip:
            self.skip -= 1
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def clean(text):
    text = html.unescape(text or "").replace("\u3000", " ").replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def sanitize_fact(text):
    text = clean(text)
    text = re.sub(r"^(?:原告诉称|上诉人[^，。]{0,30}(?:上诉请求|诉称)|申请人称|被上诉人称|一审法院认定事实)[:：，]?", "", text)
    sentences = re.split(r"(?<=[。！？；])", text)
    kept = []
    leak_terms = [
        "本院认为", "法院认为", "一审法院认为", "二审法院认为", "经审查认为",
        "判决如下", "裁定如下", "驳回上诉", "适用法律", "申请再审", "诉讼请求",
        "应当认定", "并无不当", "于法无据", "构成就业歧视", "构成性骚扰",
    ]
    for sentence in sentences:
        sentence = clean(sentence)
        if len(sentence) < 12 or any(term in sentence for term in leak_terms):
            continue
        sentence = re.sub(r"[，,]?(?:属于|系|已构成)违法解除劳动合同.*$", "。", sentence)
        sentence = re.sub(r"[，,]?依照《[^。]+$", "。", sentence)
        if sentence:
            kept.append(sentence)
        if sum(map(len, kept)) >= 700:
            break
    return clean(" ".join(kept))[:900]


def fetch_text(url):
    CACHE.mkdir(exist_ok=True)
    cache_file = CACHE / (re.sub(r"[^a-zA-Z0-9]+", "_", url)[-100:] + ".txt")
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
    markup = raw.decode(charset, errors="replace")
    parser = TextExtractor()
    parser.feed(markup)
    lines = [clean(line) for line in "".join(parser.parts).splitlines()]
    text = "\n".join(line for line in lines if line)
    cache_file.write_text(text, encoding="utf-8")
    return text


def find_title_position(text, title):
    candidates = [
        title, title.removesuffix("案"),
        title.replace("劳动关系认定案", ""),
        title.replace("行政公益诉讼案", ""),
        title[:12], title[:8],
    ]
    for candidate in candidates:
        candidate = clean(candidate)
        if len(candidate) >= 6:
            position = text.rfind(candidate)
            if position >= 0:
                return position
    return -1


def extract_official_fact(text, title, ordinal):
    fact_markers = list(re.finditer(r"(?:【|〖)?(?:基本案情|案情简介|简要案情)(?:】|〗)?[:：]?", text))
    if ordinal <= len(fact_markers):
        start = fact_markers[ordinal - 1].end()
        section = text[start:start + 7000]
        stop = re.search(r"(?:申请人请求|处理结果|裁判结果|法院审理|调查和督促履职|案例分析|典型意义|案件评析|仲裁委员会提示)[:：]?", section)
        return sanitize_fact(section[:stop.start()] if stop else section)
    position = find_title_position(text, title)
    if position < 0:
        markers = list(re.finditer(r"(?:案例|案\s*例)\s*[一二三四五六七八九十0-9]+[.、：]?", text))
        if ordinal <= len(markers):
            position = markers[ordinal - 1].start()
    if position < 0 and ordinal <= len(fact_markers):
        position = fact_markers[ordinal - 1].start()
    if position < 0:
        return ""
    section = text[position:position + 7000]
    start_match = re.search(r"(?:基本案情|案情简介|简要案情|案情回顾|事实与理由)[:：]?", section)
    if start_match:
        section = section[start_match.end():]
    stop = re.search(r"(?:申请人请求|处理结果|裁判结果|法院审理|调查和督促履职|案例分析|典型意义|案件评析|仲裁委员会提示)[:：]?", section)
    if stop:
        section = section[:stop.start()]
    section = clean(section)
    if len(section) > 900:
        sentences = re.split(r"(?<=[。！？；])", section)
        section = "".join(sentences[:8])
    result = sanitize_fact(section)
    if len(result) < 30 and ordinal <= len(fact_markers):
        section = text[fact_markers[ordinal - 1].end():fact_markers[ordinal - 1].end() + 7000]
        stop = re.search(r"(?:申请人请求|处理结果|裁判结果|法院审理|调查和督促履职|案例分析|典型意义|案件评析|仲裁委员会提示)[:：]?", section)
        result = sanitize_fact(section[:stop.start()] if stop else section)
    return result


def judgment_segments():
    paragraphs = [clean(p.text) for p in Document(DOC).paragraphs]
    title_indices = [i for i, text in enumerate(paragraphs) if re.search(r"(判决书|裁定书)$", text) and 5 < len(text) < 100]
    segments = {}
    for offset, start in enumerate(title_indices):
        title = paragraphs[start]
        end = title_indices[offset + 1] if offset + 1 < len(title_indices) else len(paragraphs)
        segments[title] = [text for text in paragraphs[start + 1:end] if text]
    return segments


def extract_judgment_fact(paragraphs):
    preferred_starts = ("原告诉称", "上诉人诉称", "申请人称", "被上诉人称", "经审理查明", "事实和理由")
    excluded_starts = ("法院认为", "本院认为", "本院经", "一审法院认为", "一审法院认定", "综上", "判决如下", "裁定如下", "如不服", "案件受理费", "委托诉讼代理人")
    candidates = []
    for index, paragraph in enumerate(paragraphs):
        if len(paragraph) < 45 or paragraph.startswith(excluded_starts):
            continue
        score = 0
        if paragraph.startswith(preferred_starts):
            score += 8
        score += sum(keyword in paragraph for keyword in ["入职", "工作", "公司", "劳动合同", "怀孕", "女性", "性骚扰", "解除", "工资", "招聘"])
        score -= sum(keyword in paragraph for keyword in ["法律规定", "请求判令", "一审判决", "驳回上诉"])
        candidates.append((score, index, paragraph))
    if not candidates:
        return ""
    candidates.sort(reverse=True)
    for _, best_index, best in candidates:
        follow = []
        for paragraph in paragraphs[best_index + 1:best_index + 4]:
            if len(paragraph) >= 35 and not paragraph.startswith(excluded_starts):
                follow.append(paragraph)
        fact = sanitize_fact(best + " " + " ".join(follow[:2]))
        if len(fact) >= 30:
            return fact
    return ""


def similarity_pairs(rows, threshold=0.88):
    pairs = []
    for i, left in enumerate(rows):
        for j in range(i + 1, len(rows)):
            right = rows[j]
            ratio = SequenceMatcher(None, left["input"], right["input"]).ratio()
            if ratio >= threshold:
                pairs.append((left["id"], right["id"], ratio))
    return pairs


def main():
    with POOL.open("r", encoding="utf-8-sig", newline="") as stream:
        pool = list(csv.DictReader(stream))
    segments = judgment_segments()
    url_text = {}
    url_ordinals = {}
    rows = []
    for source in pool:
        kind = source["source_kind"]
        if kind == "裁判文书":
            case_input = extract_judgment_fact(segments.get(source["source_title"], []))
        elif kind == "文档案例摘要":
            case_input = source["source_excerpt"]
        else:
            url = source["source_file_or_url"]
            if url not in url_text:
                url_text[url] = fetch_text(url)
                url_ordinals[url] = 0
            url_ordinals[url] += 1
            case_input = extract_official_fact(url_text[url], source["source_title"], url_ordinals[url])
        rows.append({
            "id": source["id"], "category": "", "variant_of": "", "variant_type": "",
            "input": clean(case_input), "source_kind": kind,
            "source_title": source["source_title"], "source_reference": source["source_reference"],
            "source_file_or_url": source["source_file_or_url"], "review_status": "待事实复核与F-Q盲标",
        })

    blanks = [row["id"] for row in rows if len(row["input"]) < 30]
    if blanks:
        raise SystemExit(f"missing usable facts for {len(blanks)} rows: {','.join(blanks)}")
    pairs = similarity_pairs(rows)
    if pairs:
        raise SystemExit(f"near-duplicate facts detected: {pairs[:10]}")

    fields = ["id", "category", "variant_of", "variant_type", "input", "source_kind", "source_title", "source_reference", "source_file_or_url", "review_status"]
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"draft_rows={len(rows)} blank_inputs={len(blanks)} near_duplicates={len(pairs)}")
    print(f"min_input={min(map(lambda row: len(row['input']), rows))} max_input={max(map(lambda row: len(row['input']), rows))}")


if __name__ == "__main__":
    main()
