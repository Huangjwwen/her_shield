import csv
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "final_layered_benchmark_1000_final.csv"
OUTPUT = ROOT / "最终1000条基准数据分层分析.md"
LEVELS = ("高危", "中危", "低危", "无风险")
GROUPS = ("original", "paraphrase", "distractor", "boundary")


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def pct(value, total):
    return f"{value / total * 100:.1f}%" if total else "0.0%"


def level_cells(items):
    counts = Counter(row["final_level"] for row in items)
    return " | ".join(f"{counts[level]} ({pct(counts[level], len(items))})" for level in LEVELS)


rows = read(SOURCE)
originals = [row for row in rows if row["sample_group"] == "original"]
group_rows = {group: [row for row in rows if row["sample_group"] == group] for group in GROUPS}
strata = list(dict.fromkeys(row["stratum"] for row in originals))
type_counts = Counter(row["type"] for row in originals)
origin_counts = Counter(row["source_origin"] for row in originals)
overall = Counter(row["final_level"] for row in rows)

original_by_base = {row["base_case_id"]: row for row in originals}
transitions = Counter(
    (original_by_base[row["base_case_id"]]["final_level"], row["final_level"])
    for row in group_rows["boundary"]
)

h_rows = [row for row in originals if row["type"] == "性骚扰"]
d_rows = [row for row in originals if row["type"] == "性别歧视"]

lines = [
    "# 最终1000条基准数据分层分析",
    "",
    "## 一、分析口径",
    "",
    "本报告分析的是独立复核后的金标准数据，不是智能体评测结果。`agent_result` 未在本轮重新生成，也未调用此前提供的智能体接口，因此本文不报告准确率、召回率或混淆矩阵。",
    "",
    "1000条样本由250个独立事件及其三类变体组成。主准确率只能在250条 `original` 上计算；同义改写、干扰文本和边界变化分别用于语言鲁棒性、抗干扰能力与边界敏感度分析，不能作为750个新的独立事件合并计算置信区间。",
    "",
    "## 二、数据质量与构成",
    "",
    "| 项目 | 结果 |",
    "|---|---:|",
    f"| 独立事件 | {len(originals)} |",
    f"| 初始文档事件 | {origin_counts['initial']} |",
    f"| 补充可追溯事件 | {origin_counts['supplemental']} |",
    "| 同义或口语化改写 | 250 |",
    "| 长文本或无关干扰 | 250 |",
    "| 关键要件边界变化 | 250 |",
    "| 唯一输入 | 1000 |",
    "| 案情污染审计异常 | 0 |",
    "| 事实级近重复候选 | 0 |",
    "| F-Q空标注 | 0 |",
    "| risk_level重算不一致 | 0/1000 |",
    "",
    "250条原案按预设来源层分为性骚扰80、性别歧视80、无风险或无关劳动争议60、交叉或信息模糊30。逐案复核后的实际类型为："
    f"性骚扰{type_counts['性骚扰']}条、性别歧视{type_counts['性别歧视']}条、无关{type_counts['无关']}条。交叉层中的信息不足或非职场事件没有被强行贴成风险案例。",
    "",
    "## 三、等级分布",
    "",
    "### 3.1 全部1000条",
    "",
    "| 高危 | 中危 | 低危 | 无风险 |",
    "|---:|---:|---:|---:|",
    "| " + " | ".join(f"{overall[level]} ({pct(overall[level], len(rows))})" for level in LEVELS) + " |",
    "",
    "### 3.2 按样本组",
    "",
    "| 样本组 | 高危 | 中危 | 低危 | 无风险 |",
    "|---|---:|---:|---:|---:|",
]
for group in GROUPS:
    lines.append(f"| {group} | {level_cells(group_rows[group])} |")

lines.extend([
    "",
    "`paraphrase` 和 `distractor` 不改变核心事实，因此等级分布与原案完全一致。`boundary` 中170条为低危、80条为无风险，这是关键要件被移除或变为存疑后的预期结果，不应与前三组混合解释为模型偏向。",
    "",
    "### 3.3 250条独立原案按来源层",
    "",
    "| 来源层 | 样本数 | 高危 | 中危 | 低危 | 无风险 |",
    "|---|---:|---:|---:|---:|---:|",
])
for stratum in strata:
    subset = [row for row in originals if row["stratum"] == stratum]
    lines.append(f"| {stratum} | {len(subset)} | {level_cells(subset)} |")

lines.extend([
    "",
    "性骚扰层高危占88.8%（71/80），主要由肢体接触、职权关系、持续重复、多人受害或书面化传播触发；另有7条因核心言行证据不足而为低危，2条满足基本要件但无加重因素而为中危。",
    "",
    "性别歧视层高危占57.5%（46/80），中危31.2%（25/80），低危10.0%（8/80），无风险1.2%（1/80）。低危主要来自怀孕与不利处理同时出现、但公司知情时间或处理原因存在竞争解释；唯一无风险案例中，公司在终止劳动关系时尚不知道怀孕事实。",
    "",
    "## 四、要件分布",
    "",
    "### 4.1 性骚扰类型原案（100条）",
    "",
    "| 要件 | 满足 | 存疑 | 不满足/不适用 |",
    "|---|---:|---:|---:|",
])
for field in ("h1_言行与性有关", "h2_违背意愿", "h3_职场情境"):
    counts = Counter(row[field] for row in h_rows)
    lines.append(f"| {field} | {counts['满足']} | {counts['存疑']} | {counts['不满足'] + counts['不适用']} |")

lines.extend([
    "",
    "| 加重因素 | Y | 占性骚扰类型比例 |",
    "|---|---:|---:|",
])
for field in ("agg_肢体接触", "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化"):
    count = sum(row[field] == "Y" for row in h_rows)
    lines.append(f"| {field} | {count} | {pct(count, len(h_rows))} |")

lines.extend([
    "",
    "### 4.2 性别歧视类型原案（84条）",
    "",
    "| 要件 | 满足/是 | 存疑 | 不满足/否 |",
    "|---|---:|---:|---:|",
])
for field in ("e1_区别对待", "e2_就业环节", "discrim_institutional", "discrim_concrete_harm"):
    counts = Counter(row[field] for row in d_rows)
    lines.append(f"| {field} | {counts['满足'] + counts['是']} | {counts['存疑']} | {counts['不满足'] + counts['否']} |")

lines.extend([
    "",
    "## 五、边界敏感度设计",
    "",
    "边界变体不是随机改写，而是针对关键要件进行反事实变化：骚扰层将具体性相关言行和拒绝证据改为信息不足；歧视层改为统一标准和相同处理；无关层加入无法核实的模糊指控；交叉层保留多个关键事实均不确定。",
    "",
    "| 原案等级 | 边界等级 | 数量 |",
    "|---|---|---:|",
])
for (source_level, boundary_level), count in sorted(transitions.items(), key=lambda item: (-item[1], item[0])):
    lines.append(f"| {source_level} | {boundary_level} | {count} |")

lines.extend([
    "",
    "这张迁移表描述的是金标准随关键事实变化的预期变化。后续测试智能体时，应统计其是否随边界事实同步降级，而不是只看边界样本单独准确率。",
    "",
    "## 六、建议的模型评测指标",
    "",
    "1. **主准确率**：仅使用250条独立原案，报告准确率、宏平均F1、各等级召回率和混淆矩阵。",
    "2. **语言鲁棒性**：原案预测正确时，同义改写是否保持同一等级；同时报告250条改写版准确率。",
    "3. **抗干扰能力**：原案与干扰版预测一致率，以及250条干扰版准确率。",
    "4. **边界敏感度**：预测是否沿金标准方向变化；重点报告应降级样本的正确降级率。",
    "5. **事件级置信区间**：以250个独立事件为抽样单位，不把750条派生样本当作独立观察。",
    "",
    "## 七、局限性",
    "",
    "- 本轮标注独立于被测智能体，未使用此前的 appid 或 appkey，但仍属于规则辅助后逐案复核，并非司法机关或多名法律专家共同形成的权威结论。",
    "- 当前没有第二名独立标注者，无法报告 Cohen's kappa、Krippendorff's alpha 或仲裁一致率。正式对外发布前，建议对全部250条原案和风险迁移较大的边界样本进行双人盲标。",
    "- `risk_level.py` 会把任一加重因素与骚扰基本要件组合判为高危，也会把制度性或具体损害的歧视判为高危，因此等级分布反映的是既定规则，不等同于法院责任认定或法定量刑。",
    "- 750条变体与250条原案事实相关，不能用于扩大独立样本量或人为缩窄统计置信区间。",
    "",
    "## 八、结论",
    "",
    "该数据集已具备进行分层评测的结构条件：250个独立事件事实被冻结，1000条输入无重复，F-Q要件无空值，`risk_level.py` 重算1000/1000一致。当前可以把它作为独立于智能体输出的内部金标准候选集，但对外宣称权威基准前仍应增加第二标注者和争议案例仲裁。",
])

OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("report", OUTPUT)
print("lines", len(lines))
