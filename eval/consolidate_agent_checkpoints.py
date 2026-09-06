import json
from datetime import datetime, timezone
from pathlib import Path


CHECKPOINT_DIR = Path(__file__).with_name("agent_eval_checkpoints")
MAIN_RANGES = ((1, 167), (168, 334), (335, 501), (502, 668), (669, 834), (835, 1000))


def main():
    successful = {}
    latest_errors = {}

    for path in CHECKPOINT_DIR.glob("agent-eval-*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for case_id, result in payload.get("results", {}).items():
            if result.get("level"):
                successful[case_id] = result
                latest_errors.pop(case_id, None)
            elif case_id not in successful:
                latest_errors[case_id] = result

    now = datetime.now(timezone.utc).isoformat()
    for start, end in MAIN_RANGES:
        path = CHECKPOINT_DIR / f"agent-eval-{start:04d}-{end:04d}.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        results = payload.setdefault("results", {})
        for case_id in list(results):
            if case_id in successful:
                results[case_id] = successful[case_id]
            elif case_id in latest_errors:
                results[case_id] = latest_errors[case_id]
        payload["updated_at"] = now
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"consolidated {len(successful)} successful results")


if __name__ == "__main__":
    main()
