import csv
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "annotation_filled.csv"
ISSUES = ROOT / "annotation_audit_issues.csv"
REPORT = ROOT / "评测数据与标注复核报告.md"

LEVELS = ["高危", "中危", "低危", "无风险"]
LEVEL_VALUE = {name: 3 - index for index, name in enumerate(LEVELS)}
BASE_LEVEL = {
    "E_HH": "高危", "E_HM": "中危", "E_HL": "低危",
    "E_DH": "高危", "E_DM": "中危", "E_DL": "低危",
    "E_N": "无风险",
}


def normalize(value):
    value = (value or "").strip()
    return "无风险" if value == "无关" else value


def intended_level(row, by_id):
    case_id = row["id"]
    for prefix, level in BASE_LEVEL.items():
        if case_id.startswith(prefix + "_"):
            return level
    if case_id.startswith("E_BD_"):
        match = re.search(r"预期调整为(高危|中危|低危|无风险|无关)", row.get("notes_current", ""))
        return normalize(match.group(1)) if match else ""
    source = by_id.get(row.get("variant_of", ""), {})
    return intended_level(source, by_id) if source else ""


def schema_issues(row):
    issues = []
    case_type = row.get("type", "")
    if case_type == "性骚扰":
        for column in ["h1_言行与性有关", "h2_违背意愿", "h3_职场情境"]:
            if row.get(column) == "不适用":
                issues.append(f"{column}=不适用")
    if case_type == "性别歧视":
        for column in ["e1_区别对待", "e2_就业环节"]:
            if row.get(column) == "不适用":
                issues.append(f"{column}=不适用")
    return issues


def confusion(rows, expected_key, actual_key):
    matrix = {e: Counter() for e in LEVELS}
    for row in rows:
        expected = normalize(row[expected_key])
        actual = normalize(row[actual_key])
        if expected in LEVELS and actual in LEVELS:
            matrix[expected][actual] += 1
    return matrix


def markdown_matrix(matrix):
    lines = ["| 设计预期 \\ 智能体 | 高危 | 中危 | 低危 | 无风险 | 合计 |", "|---|---:|---:|---:|---:|---:|"]
    for expected in LEVELS:
        values = [matrix[expected][actual] for actual in LEVELS]
        lines.append(f"| {expected} | " + " | ".join(map(str, values)) + f" | {sum(values)} |")
    return "\n".join(lines)


def main():
    with SOURCE.open("r", encoding="gbk", newline="") as stream:
        rows = list(csv.DictReader(stream))
    by_id = {row["id"]: row for row in rows}
    expanded = rows[100:]

    audit_rows = []
    schema_count = 0
    for row in expanded:
        intended = intended_level(row, by_id)
        final = normalize(row.get("final_level"))
        agent = normalize(row.get("agent_result"))
        schema = schema_issues(row)
        schema_count += bool(schema)
        gap = abs(LEVEL_VALUE.get(intended, 0) - LEVEL_VALUE.get(agent, 0))
        issue_types = []
        if schema:
            issue_types.append("必填要件为不适用")
        if final != intended:
            issue_types.append("F-Q判级与设计预期不一致")
        if agent != intended:
            issue_types.append("智能体等级与设计预期不一致")
        if issue_types:
            priority = "P0" if gap >= 2 else ("P1" if schema or gap == 1 else "P2")
            audit_rows.append({
                "id": row["id"], "variant_of": row.get("variant_of", ""),
                "intended_level": intended, "final_level": final,
                "agent_result": agent, "priority": priority,
                "issue_types": "；".join(issue_types), "schema_details": "；".join(schema),
                "notes_current": row.get("notes_current", ""),
            })

    fields = ["id", "variant_of", "intended_level", "final_level", "agent_result", "priority", "issue_types", "schema_details", "notes_current"]
    with ISSUES.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(audit_rows)

    intended_ok = sum(normalize(r["agent_result"]) == intended_level(r, by_id) for r in expanded)
    fq_ok = sum(normalize(r["final_level"]) == intended_level(r, by_id) for r in expanded)
    internal_ok = sum(normalize(r["final_level"]) == normalize(r["agent_result"]) for r in rows)
    matrix_rows = []
    for row in expanded:
        copy = dict(row)
        copy["intended"] = intended_level(row, by_id)
        matrix_rows.append(copy)
    matrix = confusion(matrix_rows, "intended", "agent_result")
    direction = Counter()
    for row in matrix_rows:
        expected, actual = row["intended"], normalize(row["agent_result"])
        if expected != actual:
            direction[f"{expected}→{actual}"] += 1

    report = f"""# 评测数据与标注复核报告

## 审核结论

当前表中的 **96.5% 不能作为智能体准确率**。它是 `final_level` 与 `agent_result` 的内部一致率（{internal_ok}/1000），但第 101-1000 条的 F-Q 要件标注大量来自同一次智能体结构化输出，再由 `risk_level.py` 计算 `final_level`，存在明显的同源循环。

以数据生成脚本中明确写入的等级族及变体继承关系作为相对独立的“设计预期”复核第 101-1000 条：

| 指标 | 结果 | 含义 |
|---|---:|---|
| 智能体 vs 设计预期 | **{intended_ok / 900:.1%}**（{intended_ok}/900） | 可用于当前合成集的暂定测评口径 |
| F-Q 判级 vs 设计预期 | **{fq_ok / 900:.1%}**（{fq_ok}/900） | 反映标注/规则与数据设计的一致性 |
| `final_level` vs `agent_result` | **{internal_ok / 1000:.1%}**（{internal_ok}/1000） | 仅是同源内部一致率，不是独立准确率 |
| 必填要件出现“不适用” | **{schema_count} 条** | 违反当前标注字段的适用性约束，需人工复核 |

因此，现阶段对外更稳妥的表述是：**智能体在 900 条扩展合成样本上的设计预期一致率为 {intended_ok / 900:.1%}；完整 1000 条尚无统一的独立人工金标准，不能报告总体准确率。**

## 混淆矩阵

以下只统计第 101-1000 条，行是生成脚本的设计预期，列是智能体结果：

{markdown_matrix(matrix)}

## 主要偏差

"""
    for label, count in direction.most_common():
        report += f"- `{label}`：{count} 条\n"
    report += f"""

偏差集中在相邻等级，尤其是中危被判为高危、低危被判为中危。这与 `risk_level.py` 的机械规则有关：骚扰分支只要 H1、H2、H3 满足且存在任一加重因素就升为高危；歧视分支只要就业环节满足且存在制度性或具体损害就升为高危。部分由生成器命名为“中危”的文本本身包含持续重复、书面传播或现实损害，因此同时触发了更高等级规则。

这说明问题不只是 F-Q 标错，还包括 **数据生成等级定义与判级代码标准不完全一致**。不能直接把所有不一致行改成生成器等级，也不能用当前 F-Q 反证智能体正确。

## 标注质量问题

- 第 101-1000 条中有 {schema_count} 条存在核心要件被标为“不适用”的问题；详细 ID 与字段见 `annotation_audit_issues.csv`。
- 扩展样本由约 215 组核心事实改写而来，900 条并非 900 个相互独立案例；普通准确率会高估泛化能力。
- 原始 100 条的 `agent_result` 来自先前人工指定等级，并非同一接口盲测结果，不应与后 900 条合并计算模型准确率。
- “无关”与“无风险”可以在风险等级统计时归一，但建议保留原始语义列，避免把任务范围判断与零风险判断混为一谈。

## 建议的正式评测方案

1. 从每个核心事实组只保留一个基础样本，变体单独报告鲁棒性，不与基础样本混算总体准确率。
2. 由至少两名标注者在看不到智能体输出的情况下独立填写 F-Q，并对分歧进行仲裁。
3. 先统一“持续重复、书面传播、具体损害”等条件在高/中危中的边界，再冻结 `risk_level.py` 与标注指南。
4. 重新盲跑全部样本，分别报告基础案例准确率、变体一致率、各等级召回率和严重漏判率。
5. 在完成盲标前，将 {intended_ok / 900:.1%} 标注为“合成集设计预期一致率”，不要称为完整数据准确率。

## 复核产物

- `annotation_audit_issues.csv`：逐条列出设计预期、F-Q 判级、智能体等级、字段约束问题和复核优先级。
- 本报告由 `audit-evaluation.py` 从当前 CSV 重算，可在数据修改后重复执行。
"""
    REPORT.write_text(report, encoding="utf-8")
    print(f"rows={len(rows)} expanded={len(expanded)}")
    print(f"agent_vs_intended={intended_ok}/900 ({intended_ok / 900:.1%})")
    print(f"fq_vs_intended={fq_ok}/900 ({fq_ok / 900:.1%})")
    print(f"internal={internal_ok}/1000 ({internal_ok / 1000:.1%})")
    print(f"schema_rows={schema_count} issue_rows={len(audit_rows)}")


if __name__ == "__main__":
    main()
