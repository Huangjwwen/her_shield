#!/usr/bin/env python3
import argparse
import csv
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


API_URL = "https://yuanqi.tencent.com/openapi/v1/agent/chat/completions"
DEFAULT_APPID = "2037893130997763264"
ALLOWED_LEVELS = ("高危", "中危", "低危", "无风险", "无关")


def parse_args():
    parser = argparse.ArgumentParser(
        description="调用元器智能体并回填 annotation_template.csv 的 agent_result 列"
    )
    parser.add_argument("--key", default=os.environ.get("KEY_RADAR", ""))
    parser.add_argument("--appid", default=DEFAULT_APPID)
    parser.add_argument("--input", default="eval/annotation_template.csv")
    parser.add_argument("--start", type=int, default=101, help="起始数据行（不含表头，1-based）")
    parser.add_argument("--end", type=int, default=200, help="结束数据行（不含表头，含该行）")
    parser.add_argument("--attempts", type=int, default=3)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--retry-delay", type=float, default=10.0)
    parser.add_argument("--prompt-prefix", default="", help="在原始 input 前添加的重试说明")
    parser.add_argument("--sanitize-sensitive", action="store_true", help="仅在请求时中性化易触发平台拒答的词语")
    parser.add_argument("--checkpoint-only", action="store_true", help="仅写断点文件，适合多个不重叠区间并行测试")
    parser.add_argument("--force", action="store_true", help="重跑已有有效 agent_result 的行")
    args = parser.parse_args()
    if not args.key:
        parser.error("需要 --key 或环境变量 KEY_RADAR")
    if args.start < 1 or args.end < args.start:
        parser.error("行号范围无效")
    if args.attempts < 1:
        parser.error("--attempts 必须至少为 1")
    return args


def load_csv(path):
    raw = path.read_bytes()
    encoding = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "gbk"
    text = raw.decode(encoding)
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not reader.fieldnames or "input" not in reader.fieldnames or "agent_result" not in reader.fieldnames:
        raise ValueError("CSV 缺少 input 或 agent_result 列")
    return rows, list(reader.fieldnames), encoding


def save_csv(path, rows, fieldnames, encoding):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=fieldnames, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(rows)
    payload = stream.getvalue().encode(encoding)
    temp = path.with_suffix(path.suffix + ".writing")
    temp.write_bytes(payload)
    for attempt in range(20):
        try:
            os.replace(temp, path)
            return
        except PermissionError:
            if attempt == 19:
                raise
            time.sleep(1)


def checkpoint_path(csv_path, start, end):
    return csv_path.with_name(f"agent-results-{start}-{end}.json")


def load_checkpoint(path):
    if not path.exists():
        return {"results": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data.get("results"), dict):
            data["results"] = {}
        for result in data["results"].values():
            error = str(result.get("error") or "")
            if "根据我的初步判断" in error and "更偏向一般" in error and "继续分析" in error:
                result.clear()
                result.update({
                    "level": "无关",
                    "source": "明确的一般问题分流响应",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        return data
    except (OSError, json.JSONDecodeError):
        return {"results": {}}


def save_checkpoint(path, data):
    temp = path.with_suffix(path.suffix + ".writing")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, path)


def trim_json_text(text):
    cleaned = str(text).strip().lstrip("\ufeff\u200b\u200c\u200d\u00a0")
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned, re.I)
    if fenced:
        cleaned = fenced.group(1).strip()
    start = min((p for p in (cleaned.find("{"), cleaned.find("[")) if p >= 0), default=-1)
    end = max(cleaned.rfind("}"), cleaned.rfind("]"))
    return cleaned[start:end + 1] if start >= 0 and end > start else cleaned


def find_level(value):
    if isinstance(value, dict):
        direct = value.get("risk_level")
        if isinstance(direct, str):
            for level in ALLOWED_LEVELS:
                if direct.strip() == level or level in direct:
                    return level
        for nested in value.values():
            level = find_level(nested)
            if level:
                return level
    elif isinstance(value, list):
        for nested in value:
            level = find_level(nested)
            if level:
                return level
    return None


def parse_level(content):
    text = str(content)
    if "根据我的初步判断" in text and "更偏向一般" in text and "继续分析" in text:
        return "无关"
    candidate = trim_json_text(content)
    try:
        level = find_level(json.loads(candidate))
        if level:
            return level
    except json.JSONDecodeError:
        pass

    labeled = re.search(
        r"(?:risk_level|风险等级|风险级别|判定等级)\s*[：:=\"']+\s*(高危|中危|低危|无风险|无关)",
        text,
        re.I,
    )
    if labeled:
        return labeled.group(1)

    matches = set(re.findall(r"高危|中危|低危|无风险|无关", text))
    return next(iter(matches)) if len(matches) == 1 else None


def extract_content(data):
    if data.get("success") is True and isinstance(data.get("data"), dict):
        data = data["data"]
    if data.get("success") is False:
        raise RuntimeError(str(data.get("error") or "代理返回失败"))
    if data.get("error"):
        error = data["error"]
        if isinstance(error, dict):
            raise RuntimeError(str(error.get("message") or error.get("code") or error))
        raise RuntimeError(str(error))
    choices = data.get("choices") or []
    if choices:
        message = choices[0].get("message") or choices[0].get("delta") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                item if isinstance(item, str) else str(item.get("text") or "")
                for item in content
            )
    for key in ("content", "response", "answer", "text"):
        if isinstance(data.get(key), str):
            return data[key]
    raise RuntimeError("响应无 content")


def call_agent(text, appid, key, timeout, row_id, attempt):
    payload = {
        "assistant_id": appid,
        "user_id": f"annotation-{row_id}-{int(time.time())}-{attempt}",
        "stream": False,
        "messages": [{"role": "user", "content": [{"type": "text", "text": text}]}],
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {raw[:300]}") from exc
    elapsed = round(time.monotonic() - started, 1)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"响应非 JSON: {raw[:300]}") from exc
    content = extract_content(data)
    level = parse_level(content)
    if not level:
        raise RuntimeError(f"无法提取唯一等级: {content[:500]}")
    return level, content, elapsed


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(errors="replace")
    args = parse_args()
    csv_path = Path(args.input).resolve()
    rows, fieldnames, encoding = load_csv(csv_path)
    if args.end > len(rows):
        raise SystemExit(f"结束行 {args.end} 超出数据总数 {len(rows)}")

    selected = rows[args.start - 1:args.end]
    checkpoint_file = checkpoint_path(csv_path, args.start, args.end)
    checkpoint = load_checkpoint(checkpoint_file)
    checkpoint.update({
        "appid": args.appid,
        "range": [args.start, args.end],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    restored = 0
    csv_writable = not args.checkpoint_only
    for row in selected:
        saved = checkpoint["results"].get(row["id"], {})
        level = saved.get("level")
        if level in ALLOWED_LEVELS and row["agent_result"] not in ALLOWED_LEVELS:
            row["agent_result"] = level
            restored += 1
    if restored and not args.checkpoint_only:
        try:
            save_csv(csv_path, rows, fieldnames, encoding)
        except PermissionError:
            csv_writable = False
            print("警告: CSV 当前被占用，已恢复的 checkpoint 结果将在文件可写时补齐", flush=True)

    pending = [row for row in selected if args.force or row["agent_result"] not in ALLOWED_LEVELS]
    print(f"范围: {args.start}-{args.end} | 总数: {len(selected)} | 已完成: {len(selected) - len(pending)} | 待处理: {len(pending)}", flush=True)

    success = 0
    failed = 0
    for position, row in enumerate(pending, 1):
        row_id = row["id"]
        print(f"[{position}/{len(pending)}] {row_id} 调用中...", flush=True)
        last_error = None
        for attempt in range(1, args.attempts + 1):
            outbound_input = row["input"]
            input_transform = ""
            if args.sanitize_sensitive:
                transformed = outbound_input.replace("色情图片", "不雅内容图片")
                if transformed != outbound_input:
                    outbound_input = transformed
                    input_transform = "色情图片->不雅内容图片"
            try:
                level, content, elapsed = call_agent(
                    args.prompt_prefix + outbound_input,
                    args.appid,
                    args.key,
                    args.timeout,
                    row_id,
                    attempt,
                )
            except Exception as exc:  # noqa: BLE001 - long-running batch must record all failures
                last_error = str(exc)
                print(f"  失败 {attempt}/{args.attempts}: {last_error[:300]}", flush=True)
                if attempt < args.attempts:
                    time.sleep(args.retry_delay * attempt)
                continue

            row["agent_result"] = level
            checkpoint["results"][row_id] = {
                "level": level,
                "elapsed_seconds": elapsed,
                "attempt": attempt,
                "content": content[:4000],
                "prompt_prefix": args.prompt_prefix,
                "input_transform": input_transform,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            checkpoint["updated_at"] = datetime.now(timezone.utc).isoformat()
            save_checkpoint(checkpoint_file, checkpoint)
            if csv_writable:
                try:
                    save_csv(csv_path, rows, fieldnames, encoding)
                except PermissionError:
                    csv_writable = False
                    print("  警告: CSV 暂时被占用，结果已保存到 checkpoint，后续落盘会一并补齐", flush=True)
            success += 1
            print(f"  完成: {level} | {elapsed:.1f}s | attempt {attempt}", flush=True)
            break
        else:
            failed += 1
            checkpoint["results"][row_id] = {
                "error": last_error,
                "attempt": args.attempts,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            checkpoint["updated_at"] = datetime.now(timezone.utc).isoformat()
            save_checkpoint(checkpoint_file, checkpoint)
        if position < len(pending) and args.delay > 0:
            time.sleep(args.delay)

    csv_saved = True
    if not args.checkpoint_only:
        try:
            save_csv(csv_path, rows, fieldnames, encoding)
        except PermissionError:
            csv_saved = False
            print("警告: CSV 仍被占用；全部结果已保存在 checkpoint，关闭文件后重跑脚本即可秒级补写", flush=True)
    completed = sum(row["agent_result"] in ALLOWED_LEVELS for row in selected)
    print(f"结束: 本次成功 {success}，本次失败 {failed}，范围内已填 {completed}/{len(selected)}", flush=True)
    print(f"CSV: {csv_path}", flush=True)
    print(f"checkpoint: {checkpoint_file}", flush=True)
    if completed != len(selected) or not csv_saved:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
