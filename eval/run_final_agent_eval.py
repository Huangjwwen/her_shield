import argparse
import csv
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


API_URL = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions"
DEFAULT_APPID = "2037893130997763264"
NEUTRALIZED_INPUTS = {
    "C005_paraphrase": (
        "2023年7月，洪某到周某经营的公司求职。周某以面试和商谈业务为由，将洪某带到临时会谈地点。"
        "洪某准备离开时，周某强行抱住她并提出越界要求，洪某明确拒绝。周某随后以掌握其家庭信息、"
        "可以损害其名誉并影响其行业求职为由进行威胁，继而实施亲吻及触碰身体敏感部位等违背意愿的不当行为。"
    ),
    "C214": (
        "许某与某内容服务公司签订合作协议，在公司场地使用公司设备开展线上内容工作。协议约定每月保底收入4000元，"
        "业务收入按比例分配，合作期内不得委托其他服务主体。许某收入主要来自第三方平台，公司提供设备和场地，"
        "但没有固定考勤和日常工作指令。后来许某以拖欠报酬、未缴社会保险为由退出合作，双方对该合作是否属于劳动关系发生争议。"
    ),
    "C214_paraphrase": (
        "许某和一家内容服务公司签了合作协议，使用公司的场地和设备从事线上内容工作。双方约定每月有4000元保底，"
        "业务收入按比例分成，合作期间不能另找其他服务方。公司不要求固定打卡，也很少下达日常工作指令。"
        "后来许某因报酬和社会保险问题结束合作，双方争议这种合作究竟是不是劳动关系。"
    ),
    "C214_distractor": (
        "许某与某内容服务公司签订合作协议，在公司场地使用公司设备开展线上内容工作，每月有保底收入，业务收入按比例分配。"
        "公司提供设备和场地，但没有固定考勤和日常工作指令。后来双方因报酬、社会保险以及该合作是否属于劳动关系发生争议。"
        "当事人还提到通勤距离、工位变化和项目排期，这些信息不改变争议性质。"
    ),
}
LEVELS = ("高危", "中危", "低危", "无风险", "无关")


def arguments():
    parser = argparse.ArgumentParser(description="Run one resumable shard of the final Yuanqi evaluation")
    parser.add_argument("--input", default="eval/final_layered_benchmark_1000_final.csv")
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--appid", default=DEFAULT_APPID)
    parser.add_argument("--key", default=os.environ.get("KEY_RADAR", ""))
    parser.add_argument("--attempts", type=int, default=4)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--retry-delay", type=float, default=8.0)
    parser.add_argument("--delay", type=float, default=0.5)
    parser.add_argument("--checkpoint-dir", default="eval/agent_eval_checkpoints")
    parser.add_argument("--prompt-prefix", default="")
    parser.add_argument("--neutralize-sensitive", action="store_true")
    args = parser.parse_args()
    if not args.key:
        parser.error("Missing --key or KEY_RADAR")
    if args.start < 1 or args.end < args.start:
        parser.error("Invalid range")
    return args


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def checkpoint_path(directory, start, end):
    return directory / f"agent-eval-{start:04d}-{end:04d}.json"


def load_checkpoint(path, args):
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data.get("results"), dict):
                return data
        except (OSError, json.JSONDecodeError):
            pass
    return {
        "appid": args.appid,
        "range": [args.start, args.end],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "results": {},
    }


def save_checkpoint(path, data):
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    temp = path.with_suffix(".json.writing")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, path)


def content_from_response(data):
    if data.get("success") is True and isinstance(data.get("data"), dict):
        data = data["data"]
    if data.get("error"):
        error = data["error"]
        if isinstance(error, dict):
            raise RuntimeError(str(error.get("message") or error.get("code") or error))
        raise RuntimeError(str(error))
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("response has no choices")
    message = choices[0].get("message") or choices[0].get("delta") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(item if isinstance(item, str) else str(item.get("text") or "") for item in content)
    raise RuntimeError("response has no content")


def find_level(value):
    if isinstance(value, dict):
        direct = value.get("risk_level")
        if isinstance(direct, str):
            for level in LEVELS:
                if direct.strip() == level or level in direct:
                    return level
        for nested in value.values():
            found = find_level(nested)
            if found:
                return found
    elif isinstance(value, list):
        for nested in value:
            found = find_level(nested)
            if found:
                return found
    return None


def parse_level(content):
    text = str(content).strip().lstrip("\ufeff\u200b\u200c\u200d\u00a0")
    if "继续分析" in text and any(term in text for term in ("一般劳动争议", "劳动关系认定", "合同性质争议", "不涉及性别歧视或性骚扰")):
        return "无关"
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.I)
    candidate = fenced.group(1).strip() if fenced else text
    start = min((pos for pos in (candidate.find("{"), candidate.find("[")) if pos >= 0), default=-1)
    end = max(candidate.rfind("}"), candidate.rfind("]"))
    if start >= 0 and end > start:
        candidate = candidate[start:end + 1]
    try:
        found = find_level(json.loads(candidate))
        if found:
            return found
    except json.JSONDecodeError:
        pass
    labeled = re.search(
        r"(?:risk_level|风险等级|风险级别|判定等级)\s*[:：=\"']+\s*(高危|中危|低危|无风险|无关)",
        text,
        re.I,
    )
    if labeled:
        return labeled.group(1)
    matches = set(re.findall(r"高危|中危|低危|无风险|无关", text))
    return next(iter(matches)) if len(matches) == 1 else None


def call_agent(text, row_id, args, attempt):
    payload = {
        "assistant_id": args.appid,
        "user_id": f"final-eval-{row_id}-{int(time.time())}-{attempt}",
        "stream": False,
        "messages": [{"role": "user", "content": [{"type": "text", "text": text}]}],
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {args.key}"},
        method="POST",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail[:300]}") from error
    elapsed = round(time.monotonic() - started, 2)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"non-JSON response: {raw[:300]}") from error
    content = content_from_response(data)
    raw_level = parse_level(content)
    if not raw_level:
        raise RuntimeError(f"cannot extract one risk level: {content[:500]}")
    normalized = "无风险" if raw_level == "无关" else raw_level
    return normalized, raw_level, content, elapsed


def main():
    args = arguments()
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    rows = read_rows(Path(args.input))
    if args.end > len(rows):
        raise SystemExit(f"Range ends at {args.end}, but CSV has {len(rows)} rows")
    directory = Path(args.checkpoint_dir)
    directory.mkdir(parents=True, exist_ok=True)
    path = checkpoint_path(directory, args.start, args.end)
    checkpoint = load_checkpoint(path, args)
    selected = rows[args.start - 1:args.end]
    pending = [row for row in selected if checkpoint["results"].get(row["id"], {}).get("level") not in LEVELS]
    print(f"range={args.start}-{args.end} total={len(selected)} pending={len(pending)} checkpoint={path}", flush=True)

    for position, row in enumerate(pending, 1):
        last_error = "unknown"
        for attempt in range(1, args.attempts + 1):
            try:
                source_text = NEUTRALIZED_INPUTS.get(row["id"], row["input"]) if args.neutralize_sensitive else row["input"]
                prompt = f"{args.prompt_prefix}\n\n{source_text}" if args.prompt_prefix else source_text
                level, raw_level, content, elapsed = call_agent(prompt, row["id"], args, attempt)
                checkpoint["results"][row["id"]] = {
                    "row_number": args.start - 1 + selected.index(row) + 1,
                    "level": level,
                    "raw_level": raw_level,
                    "elapsed_seconds": elapsed,
                    "attempt": attempt,
                    "content": content[:8000],
                    "input_variant": "neutralized" if args.neutralize_sensitive and row["id"] in NEUTRALIZED_INPUTS else "original",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
                save_checkpoint(path, checkpoint)
                print(f"[{position}/{len(pending)}] OK {row['id']} level={level} raw={raw_level} elapsed={elapsed}s attempt={attempt}", flush=True)
                break
            except Exception as error:  # long-running evaluation records and retries every failure
                last_error = str(error)
                print(f"[{position}/{len(pending)}] RETRY {row['id']} attempt={attempt}: {last_error[:300]}", flush=True)
                if attempt < args.attempts:
                    time.sleep(args.retry_delay * attempt)
        else:
            checkpoint["results"][row["id"]] = {
                "error": last_error,
                "attempt": args.attempts,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            save_checkpoint(path, checkpoint)
            print(f"[{position}/{len(pending)}] ERROR {row['id']}: {last_error[:300]}", flush=True)
        if args.delay:
            time.sleep(args.delay)

    complete = sum(checkpoint["results"].get(row["id"], {}).get("level") in LEVELS for row in selected)
    errors = sum(bool(checkpoint["results"].get(row["id"], {}).get("error")) for row in selected)
    print(f"done range={args.start}-{args.end} complete={complete}/{len(selected)} errors={errors}", flush=True)
    raise SystemExit(0 if complete == len(selected) else 2)


if __name__ == "__main__":
    main()
