import argparse
import csv
import json
import os
from collections import Counter
from pathlib import Path


LEVELS = {"高危", "中危", "低危", "无风险"}
NO_OUTPUT = "无有效输出"
MAIN_CHECKPOINTS = (
    "agent-eval-0001-0167.json",
    "agent-eval-0168-0334.json",
    "agent-eval-0335-0501.json",
    "agent-eval-0502-0668.json",
    "agent-eval-0669-0834.json",
    "agent-eval-0835-1000.json",
)


def arguments():
    parser = argparse.ArgumentParser(description="Merge Yuanqi shard checkpoints into the final benchmark CSV")
    parser.add_argument("--input", default="eval/final_layered_benchmark_1000_final.csv")
    parser.add_argument("--output", default="", help="Write another CSV instead of replacing --input")
    parser.add_argument("--checkpoint-dir", default="eval/agent_eval_checkpoints")
    parser.add_argument("--require-complete", action="store_true")
    return parser.parse_args()


def main():
    args = arguments()
    csv_path = Path(args.input)
    with csv_path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        rows = list(reader)
        fields = list(reader.fieldnames or [])
    if "agent_result" not in fields:
        position = fields.index("final_level") + 1
        fields.insert(position, "agent_result")
    merged = {}
    conflicts = []
    checkpoint_paths = [Path(args.checkpoint_dir) / name for name in MAIN_CHECKPOINTS]
    for checkpoint_path in checkpoint_paths:
        data = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        for row_id, result in data.get("results", {}).items():
            level = result.get("level")
            if level not in LEVELS:
                continue
            if row_id in merged and merged[row_id] != level:
                conflicts.append((row_id, merged[row_id], level, checkpoint_path.name))
            merged[row_id] = level
    if conflicts:
        raise RuntimeError(f"Conflicting checkpoint results: {conflicts[:10]}")
    known_ids = {row["id"] for row in rows}
    unknown = sorted(set(merged) - known_ids)
    if unknown:
        raise RuntimeError(f"Checkpoint contains unknown IDs: {unknown[:10]}")
    for row in rows:
        if row["id"] in merged:
            row["agent_result"] = merged[row["id"]]
        else:
            row["agent_result"] = NO_OUTPUT
    output_path = Path(args.output) if args.output else csv_path
    temp = output_path.with_suffix(output_path.suffix + ".writing")
    with temp.open("w", encoding="utf-8-sig", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(temp, output_path)
    filled = sum(row.get("agent_result") in LEVELS for row in rows)
    print("checkpoints", len(checkpoint_paths))
    print("merged_results", len(merged))
    print("filled", filled, "/", len(rows))
    print("output", output_path)
    print("levels", dict(Counter(row.get("agent_result") for row in rows if row.get("agent_result"))))
    covered = sum(bool(row.get("agent_result")) for row in rows)
    print("covered", covered, "/", len(rows))
    if args.require_complete and covered != len(rows):
        raise SystemExit(2)


if __name__ == "__main__":
    main()
