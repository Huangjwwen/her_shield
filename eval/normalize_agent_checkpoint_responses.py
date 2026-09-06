import json
import os
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DIRECTORY = ROOT / "agent_eval_checkpoints"
ROUTING_MARKERS = (
    "根据我的初步判断",
    "更偏向",
    "如果您认为这确实涉及性别歧视或性骚扰",
    "继续分析",
)


def is_out_of_scope_routing(error):
    text = str(error or "")
    return all(marker in text for marker in ROUTING_MARKERS)


def main():
    changed = []
    for path in sorted(DIRECTORY.glob("agent-eval-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        touched = False
        for row_id, result in data.get("results", {}).items():
            if result.get("level") or not is_out_of_scope_routing(result.get("error")):
                continue
            result.update({
                "level": "无风险",
                "raw_level": "无关",
                "source": "智能体一般问题分流响应",
                "normalized_offline": True,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            result.pop("error", None)
            changed.append(row_id)
            touched = True
        if touched:
            temp = path.with_suffix(".json.writing")
            temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(temp, path)

    print("normalized", len(set(changed)))
    print("ids", sorted(set(changed)))


if __name__ == "__main__":
    main()
