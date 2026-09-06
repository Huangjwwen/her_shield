import argparse
import csv
import math
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "final_layered_benchmark_1000_final.with-agent-results.csv"
OUTPUT = ROOT / "智能体最终1000条分层评测报告.md"
LEVELS = ("高危", "中危", "低危", "无风险")
NO_OUTPUT = "无有效输出"


def ratio(numerator, denominator):
    return numerator / denominator if denominator else 0.0


def arguments():
    parser = argparse.ArgumentParser(description="Analyze final layered agent evaluation")
    parser.add_argument("--input", default=str(INPUT))
    parser.add_argument("--output", default=str(OUTPUT))
    parser.add_argument("--title", default="智能体最终1000条分层评测报告")
    parser.add_argument("--gold-note", default="现行金标准")
    return parser.parse_args()


def pct(value):
    return f"{value * 100:.1f}%"


def wilson(successes, total, z=1.96):
    if not total:
        return 0.0, 0.0
    p = successes / total
    denominator = 1 + z * z / total
    center = (p + z * z / (2 * total)) / denominator
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total) / denominator
    return center - margin, center + margin


def metrics(rows):
    valid = [row for row in rows if row["agent_result"] in LEVELS]
    matrix = {gold: Counter() for gold in LEVELS}
    for row in rows:
        matrix[row["final_level"]][row["agent_result"]] += 1

    per_class = {}
    for level in LEVELS:
        tp = matrix[level][level]
        fp = sum(matrix[gold][level] for gold in LEVELS if gold != level)
        fn = sum(matrix[level][pred] for pred in LEVELS if pred != level) + matrix[level][NO_OUTPUT]
        precision = ratio(tp, tp + fp)
        recall = ratio(tp, tp + fn)
        f1 = ratio(2 * precision * recall, precision + recall)
        per_class[level] = (precision, recall, f1, sum(matrix[level].values()))

    correct = sum(row["agent_result"] == row["final_level"] for row in rows)
    conditional_correct = sum(row["agent_result"] == row["final_level"] for row in valid)
    macro_f1 = sum(item[2] for item in per_class.values()) / len(LEVELS)
    weighted_f1 = ratio(sum(item[2] * item[3] for item in per_class.values()), len(rows))
    return {
        "total": len(rows), "valid": len(valid), "correct": correct,
        "accuracy": ratio(correct, len(rows)),
        "conditional_accuracy": ratio(conditional_correct, len(valid)),
        "macro_f1": macro_f1, "weighted_f1": weighted_f1,
        "matrix": matrix, "per_class": per_class,
    }


def matrix_table(result):
    headers = list(LEVELS) + [NO_OUTPUT]
    lines = ["| 标准答案 \\ 智能体 | " + " | ".join(headers) + " |",
             "|---|" + "---:|" * len(headers)]
    for gold in LEVELS:
        lines.append("| " + gold + " | " + " | ".join(str(result["matrix"][gold][pred]) for pred in headers) + " |")
    return "\n".join(lines)


def class_table(result):
    lines = ["| 等级 | 精确率 | 召回率 | F1 | 支持数 |", "|---|---:|---:|---:|---:|"]
    for level in LEVELS:
        precision, recall, f1, support = result["per_class"][level]
        lines.append(f"| {level} | {pct(precision)} | {pct(recall)} | {pct(f1)} | {support} |")
    return "\n".join(lines)


def main():
    args = arguments()
    input_path = Path(args.input)
    output_path = Path(args.output)
    with input_path.open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    overall = metrics(rows)
    originals = [row for row in rows if row["sample_group"] == "original"]
    original_result = metrics(originals)
    low, high = wilson(original_result["correct"], original_result["total"])

    grouped = defaultdict(list)
    for row in rows:
        grouped[row["sample_group"]].append(row)
    group_labels = {
        "original": "独立原案", "paraphrase": "同义/口语改写",
        "distractor": "长文本/无关干扰", "boundary": "关键要件边界变化",
    }
    group_lines = ["| 样本组 | 数量 | 有效输出覆盖率 | 端到端准确率 | 有效输出条件准确率 | Macro-F1 |",
                   "|---|---:|---:|---:|---:|---:|"]
    for key in ("original", "paraphrase", "distractor", "boundary"):
        result = metrics(grouped[key])
        group_lines.append(
            f"| {group_labels[key]} | {result['total']} | {pct(ratio(result['valid'], result['total']))} | "
            f"{pct(result['accuracy'])} | {pct(result['conditional_accuracy'])} | {pct(result['macro_f1'])} |"
        )

    stratum_lines = ["| 风险类型分层 | 数量 | 覆盖率 | 端到端准确率 | Macro-F1 |", "|---|---:|---:|---:|---:|"]
    strata = defaultdict(list)
    for row in rows:
        strata[row["stratum"]].append(row)
    for key in sorted(strata):
        result = metrics(strata[key])
        stratum_lines.append(
            f"| {key} | {result['total']} | {pct(ratio(result['valid'], result['total']))} | "
            f"{pct(result['accuracy'])} | {pct(result['macro_f1'])} |"
        )

    by_id = {row["id"]: row for row in rows}
    agreement = {}
    for key in ("paraphrase", "distractor"):
        pairs = []
        for row in grouped[key]:
            base = by_id.get(row["variant_of"] or row["base_case_id"])
            if base and row["agent_result"] in LEVELS and base["agent_result"] in LEVELS:
                pairs.append(row["agent_result"] == base["agent_result"])
        agreement[key] = (sum(pairs), len(pairs))

    failures = [row for row in rows if row["agent_result"] == NO_OUTPUT]
    failure_ids = "、".join(row["id"] for row in failures) or "无"
    failure_conclusion = (
        f"{len(failures)} 条无有效输出已作为端到端错误计入，覆盖率与分类正确性分开披露。"
        if failures else "全部 1000 条均取得有效风险等级，不存在因剔除失败样本导致的指标虚高。"
    )
    pred_counts = Counter(row["agent_result"] for row in rows)
    gold_counts = Counter(row["final_level"] for row in rows)

    report = f"""# {args.title}

## 评测口径

- 标准答案：人工标注 F-Q 要件后由 `risk_level.py` 计算得到的 `final_level`。
- 金标准状态：{args.gold_note}。
- 智能体预测：元器智能体返回的 `agent_result`；明确的一般问题分流响应统一记为“无风险”。
- 对初次多轮重试仍无有效输出的 8 条样本，额外添加不暗示等级的“虚拟分类测试”说明后重试，其中 4 条恢复有效输出。
- 对剩余 4 条使用保留判级要件的中性等义表述再次请求，全部恢复有效输出；基准 CSV 中的原始 `input` 未被修改。
- 端到端指标：{len(failures)} 条持续拒答、空响应或仅复述输入的样本记为错误。
- 条件指标：仅在智能体成功返回四级风险标签的 {overall['valid']} 条上计算。
- 250 条独立原案是主评测集；其余 750 条为同源派生样本，只用于鲁棒性和边界测试，不视为独立事实样本。

## 核心结果

| 指标 | 结果 |
|---|---:|
| 有效输出覆盖率 | {pct(ratio(overall['valid'], overall['total']))} ({overall['valid']}/{overall['total']}) |
| 1000条端到端准确率 | {pct(overall['accuracy'])} ({overall['correct']}/{overall['total']}) |
| 有效输出条件准确率 | {pct(overall['conditional_accuracy'])} |
| 全集 Macro-F1 | {pct(overall['macro_f1'])} |
| 全集加权 F1 | {pct(overall['weighted_f1'])} |
| **250条独立原案主准确率** | **{pct(original_result['accuracy'])} ({original_result['correct']}/{original_result['total']})** |
| 独立原案准确率 95% CI | {pct(low)} - {pct(high)} |
| 独立原案 Macro-F1 | {pct(original_result['macro_f1'])} |

## 各等级表现（全部1000条，拒答计漏判）

{class_table(overall)}

## 混淆矩阵（行=标准答案，列=智能体输出）

{matrix_table(overall)}

## 分层结果

{chr(10).join(group_lines)}

### 风险类型分层

{chr(10).join(stratum_lines)}

## 鲁棒性

- 同义/口语改写与原案预测一致率：{pct(ratio(*agreement['paraphrase']))} ({agreement['paraphrase'][0]}/{agreement['paraphrase'][1]})。
- 长文本/无关干扰与原案预测一致率：{pct(ratio(*agreement['distractor']))} ({agreement['distractor'][0]}/{agreement['distractor'][1]})。
- 边界变化组准确率：{pct(metrics(grouped['boundary'])['accuracy'])}；该组用于观察关键要件变化后能否相应改变等级，不与语言鲁棒性合并解释。

## 分布与异常

- 标准答案分布：{dict(gold_counts)}。
- 智能体输出分布：{dict(pred_counts)}。
- 无有效输出样本（{len(failures)} 条）：{failure_ids}。

## 结论

1. 主结论应以 250 条独立原案的准确率、Macro-F1 和置信区间为准，1000 条总体指标不能当作 1000 个独立案例的统计证据。
2. 精确率、召回率和混淆矩阵揭示了各风险等级的偏差方向；不能只用总体准确率评价智能体。
3. {failure_conclusion}
4. 一般问题分流被视为“无风险”是产品语义归一化规则；后续版本应让接口直接返回结构化风险等级，减少离线解释空间。
"""
    output_path.write_text(report, encoding="utf-8")
    print(output_path)
    print("overall_accuracy", overall["accuracy"])
    print("original_accuracy", original_result["accuracy"])
    print("macro_f1", overall["macro_f1"])


if __name__ == "__main__":
    main()
