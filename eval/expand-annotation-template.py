import csv
import io
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TARGET = ROOT / "annotation_template.csv"

COLUMNS = [
    "id", "category", "variant_of", "variant_type", "input",
    "h1_行为与性有关", "h2_违背意愿", "h3_职场情境", "agg_肢体接触",
    "agg_职权胁迫", "agg_持续重复", "agg_多人受害", "agg_书面化",
    "e1_区别对待", "e2_就业环节", "discrim_institutional",
    "discrim_concrete_harm", "type", "final_level", "annotator",
    "agent_result", "notes_current", "notes_annotator",
]

ROLES = ["部门经理", "项目总监", "分公司负责人", "业务主管", "招聘负责人", "车间主任"]
WORKERS = ["新入职员工", "项目专员", "实习生", "销售助理", "研发工程师", "行政专员"]
SETTINGS = ["项目饭局", "外地出差", "部门团建", "夜间加班", "客户接待", "内部培训"]
COMPANIES = ["科技公司", "制造企业", "咨询公司", "连锁门店", "互联网平台", "设计公司"]
DEPARTMENTS = ["研发部", "市场部", "运营部", "行政部", "销售部", "采购部", "客服部", "生产部"]
EVIDENCE = ["聊天截图", "邮件记录", "考勤记录", "群聊记录", "录音", "书面通知", "同事证言", "会议纪要", "招聘页面截图"]

SOURCE_NOTES = {
    "H": "来源：案例.docx、案例2.docx及职场性别歧视性骚扰相关案例.docx中的周某案、陈某案、黄某案等",
    "D": "来源：案例.docx、案例2.docx及职场性别歧视性骚扰相关案例.docx中的严女士案、韩坤案、孕期调岗降薪案等",
    "N": "来源：三份文档中的一般劳动争议及证据不足案件，用作无关或排除性别因素样本",
}


def row(case_id, category, text, case_type, notes, variant_of="", variant_type=""):
    values = {key: "" for key in COLUMNS}
    values.update({
        "id": case_id,
        "category": category,
        "variant_of": variant_of,
        "variant_type": variant_type,
        "input": text,
        "type": case_type,
        "notes_current": notes,
    })
    return values


def h_high(i):
    role, worker, setting = ROLES[i % 6], WORKERS[(i * 2) % 6], SETTINGS[(i * 5) % 6]
    patterns = [
        f"{setting}结束后，{role}把我堵在包间门口，强行搂腰亲吻。我推开他后，他说不配合就让我转岗降薪。",
        f"{role}连续一个月深夜给我发露骨图片。我明确要求停止后，他威胁把我的年度考核评为不合格。",
        f"我是{worker}。{role}说只要陪他去酒店就能转正，我拒绝后，他锁住车门并强行摸我的腿。",
        f"在{setting}期间，{role}多次摸我的腰和胸口。我反复躲开后，他仍借工作汇报把我单独叫进办公室。",
        f"{role}对多名女同事说陪他喝酒才给项目机会，还在酒后分别搂抱她们，已有两人因此离职。",
        f"{role}把我的照片合成色情图片发到工作群。我要求删除后，他说再投诉就让我在行业里找不到工作。",
        f"客户在{setting}上反复摸我，公司领导却命令我继续陪酒，并说得罪客户就扣掉本季度奖金。",
        f"出差住店时，{role}强行闯进我的房间抱住我。我呼救反抗后，他仍拍门威胁第二天开除我。",
    ]
    return patterns[i % len(patterns)]


def h_medium(i):
    role, setting = ROLES[(i + 1) % 6], SETTINGS[(i * 3 + 1) % 6]
    patterns = [
        f"{role}连续四周单独约我吃晚饭谈晋升，我每次都婉拒，他仍不断追问我为什么不给机会。",
        f"在{setting}上，{role}盯着我的身材评论了好几次，还问我的体重和感情状况，我很不舒服。",
        f"同事经常捏我的胳膊、拍腰说我皮肤好。我没有直接说停止，但每次都会躲开。",
        f"{role}在部门群连续发送涉性表情包，并多次艾特几名女员工问她们喜不喜欢。",
        f"{role}把我的生活照转到工作群，称我是部门女神。我私下请他删除，他口头答应但没有处理。",
        f"{setting}时，同事反复讲带有性暗示的笑话，看到我沉默后仍继续讲，现场没有肢体接触。",
        f"{role}三次提出下班后单独送我回家，我都说自己打车，他仍表示下次会在楼下等我。",
        f"开会时，{role}把我的方案称为美女方案，还说让我靠外貌说服客户，已经出现过两次。",
    ]
    return patterns[i % len(patterns)]


def h_low(i):
    role = ROLES[(i + 2) % 6]
    patterns = [
        f"{role}第一次见面时夸我今天穿得很好看，我觉得有点尴尬，但他没有继续说。",
        "同事在聚餐时讲了一个轻微的荤段子，说完就换了话题，我当时没有表示反对。",
        "茶水间几名同事谈论女明星的身材，看到我进来就停止了，谈话并未针对我。",
        f"{role}问我下班后是否愿意一起喝咖啡，我说有安排后，他没有再次邀请。",
        "同事递文件时碰到我的手，随即道歉，目前看不出是故意的。",
        "实习生在工作群发了一个擦边表情包，被提醒后马上撤回并道歉。",
    ]
    return patterns[i % len(patterns)]


def d_high(i):
    company = COMPANIES[i % 6]
    patterns = [
        f"{company}的招聘公告明确写着该岗位只录用男性，我符合全部条件仍因性别被拒绝面试。",
        f"{company}要求女性候选人提交HCG检查。得知我怀孕后，公司撤回录用通知，但岗位仍在招聘。",
        f"我怀孕五个月后，{company}把我从技术岗调到辅助岗，基本工资下调百分之四十。",
        f"{company}在我告知怀孕两天后以经营困难为由解除合同，却同时招聘人员接替我的岗位。",
        f"{company}的新员工手册要求女员工签署三年内不结婚、不生育承诺，否则不予录用。",
        f"产假结束返岗后，{company}取消我的主管职级和项目权限，工资减少一半，领导明确说母亲不适合管理岗。",
        f"{company}的薪酬制度把同资历女性统一定为低一级职级，导致同岗女员工工资普遍低于男性。",
        f"{company}以我入职时未披露婚姻状况为由辞退我，而该信息与岗位职责没有关系。",
    ]
    return patterns[i % len(patterns)]


def d_medium(i):
    role, company = ROLES[i % 6], COMPANIES[(i + 2) % 6]
    patterns = [
        f"面试时，{role}连续询问我是否结婚、什么时候生孩子，并说会据此考虑岗位稳定性。",
        f"我和男同事同时申请晋升，{company}把机会给了他，领导只解释说他没有照顾孩子的负担。",
        f"{company}把所有重要出差都分给男同事，说女员工在外跑业务不方便，但尚未调整我的工资职级。",
        f"{role}安排女员工负责迎宾和端茶，男员工负责客户谈判，理由是男女各有擅长。",
        f"我产假返岗后原项目被分给男同事，{role}说先让我做轻松工作观察一段时间。",
        f"招聘人员问我男朋友是否支持长期加班，并表示公司更倾向家庭负担少的候选人。",
        f"绩效相近的情况下，{role}把培训名额给男同事，说女性以后可能因生育中断工作。",
        f"{company}只让男员工参加设备操作认证，口头理由是女性体力可能跟不上。",
    ]
    return patterns[i % len(patterns)]


def d_low(i):
    role = ROLES[(i + 3) % 6]
    patterns = [
        f"面试结束时，{role}随口说女生做这个行业会比较辛苦，但没有因此拒绝我。",
        "团队里几名女员工的平均晋升时间比男员工慢半年，目前没有岗位和绩效对比资料。",
        f"聚餐时，{role}说女性照顾家庭更细心，这句话没有影响具体工作安排。",
        "面试官好奇地问了一次我爱人从事什么工作，之后没有继续询问婚育情况。",
        "团建费用AA时，领导提议女员工少交一点，但没有强制执行或影响劳动权益。",
        "同事说女程序员比较少见，我觉得不舒服，但他没有作出工作上的区别对待。",
    ]
    return patterns[i % len(patterns)]


def unrelated(i):
    patterns = [
        "公司拖欠我两个月工资，我想确认如何申请劳动仲裁，事情与性别无关。",
        "同事把我做的项目成果写成他的名字，但没有涉及性别、婚育或性相关言行。",
        "我的电脑突然死机，尚未保存的工作文件还能恢复吗？",
        "下周去客户现场培训，怎样安排高铁和地铁路线最节省时间？",
        "公司年假审批很慢，我想了解法定年休假的计算方式。",
        "老板要求全组周末加班但不给加班费，男女员工执行同一规则。",
        "我因连续迟到被扣绩效，考勤记录属实，也没有发现性别差别对待。",
        "客户临时取消订单，领导让我重做方案，我该怎样安排交付计划？",
    ]
    suffixes = ["", "目前只掌握这些情况。", "我想先梳理处理步骤。", "部门同事也遇到了同样问题。", "相关记录我已经保存。", "这件事发生在本周。"]
    return patterns[i % len(patterns)] + suffixes[(i // len(patterns)) % len(suffixes)]


def make_base_rows():
    specs = [
        ("E_HH", 72, "骚扰", "性骚扰", h_high, "H"),
        ("E_HM", 72, "骚扰", "性骚扰", h_medium, "H"),
        ("E_HL", 45, "骚扰", "性骚扰", h_low, "H"),
        ("E_DH", 72, "歧视", "性别歧视", d_high, "D"),
        ("E_DM", 72, "歧视", "性别歧视", d_medium, "D"),
        ("E_DL", 45, "歧视", "性别歧视", d_low, "D"),
        ("E_N", 72, "无关-无风险", "暂不明确", unrelated, "N"),
    ]
    groups = []
    for prefix, count, category, case_type, factory, source_key in specs:
        group = []
        for i in range(count):
            notes = f"{SOURCE_NOTES[source_key]}；同类事实组合扩展{(i % 9) + 1}"
            detail = f"事情发生在{DEPARTMENTS[(i // 9) % len(DEPARTMENTS)]}，我保留了{EVIDENCE[i % len(EVIDENCE)]}。"
            group.append(row(f"{prefix}_{i + 1:03d}", category, factory(i) + detail, case_type, notes))
        groups.append(group)
    return groups


def round_robin(groups):
    result = []
    max_len = max(map(len, groups))
    for i in range(max_len):
        for group in groups:
            if i < len(group):
                result.append(group[i])
    return result


def paraphrase(text, i):
    replacements = [
        ("公司", "单位"), ("领导", "负责人"), ("同事", "同部门员工"),
        ("面试", "招聘沟通"), ("拒绝", "明确表示不同意"), ("工资", "薪酬"),
        ("项目", "业务"), ("工作群", "部门群聊"), ("怀孕", "处于孕期"),
    ]
    old, new = replacements[i % len(replacements)]
    changed = text.replace(old, new)
    return ("换一种日常说法描述：" if changed == text else "") + changed


def perturb(text, i):
    replacements = [
        ("一个月", "六周"), ("四周", "五周"), ("两天", "三天"),
        ("百分之四十", "百分之三十五"), ("部门经理", "区域经理"),
        ("项目总监", "产品总监"), ("工作群", "企业微信群"),
        ("外地出差", "跨市出差"), ("男同事", "同级男性员工"),
    ]
    old, new = replacements[i % len(replacements)]
    changed = text.replace(old, new)
    if changed == text:
        changed = text + f"相关情况发生在入职后的第{(i % 8) + 1}个月。"
    return changed


def boundary_text(source, i):
    source_id = source["id"]
    role = ROLES[i % len(ROLES)]
    recorded = date(2024, 1, 1) + timedelta(days=i)
    suffix = f"相关沟通记录日期为{recorded.year}年{recorded.month}月{recorded.day}日。"
    if source_id.startswith("E_HH_"):
        return f"{role}下班后邀请我一起喝咖啡，我表示愿意参加；谈话只涉及项目，没有性暗示、肢体接触或威胁。{suffix}", "暂不明确", "无风险"
    if source_id.startswith("E_HM_"):
        return f"{role}明确说如果我不去酒店陪他，年底奖金和晋升都不会给我；我拒绝后他强行搂住我。{suffix}", "性骚扰", "高危"
    if source_id.startswith("E_HL_"):
        return f"{role}在我要求停止后仍连续发送露骨照片，并威胁投诉就让我考核不合格。{suffix}", "性骚扰", "高危"
    if source_id.startswith("E_DH_"):
        return "公司因岗位必须持有特定职业资格而录用证书等级更高的候选人，书面评分与性别和婚育无关。" + suffix, "暂不明确", "无风险"
    if source_id.startswith("E_DM_"):
        return "公司书面规定有未成年子女的女员工不得晋升，我因此被取消已通过的晋升并下调工资。" + suffix, "性别歧视", "高危"
    if source_id.startswith("E_DL_"):
        return "我和男同事竞争岗位时，他的业绩高出百分之三十并持有必需证书，公司按统一评分录用了他。" + suffix, "暂不明确", "无风险"
    return "招聘公告写明只招男性，我投递后招聘人员也明确说女性不会进入面试。" + suffix, "性别歧视", "高危"


def make_variant_rows(base_groups):
    sources = round_robin(base_groups)
    assert len(sources) == 450
    result = []
    cursor = 0

    for i, source in enumerate(sources[cursor:cursor + 135], 1):
        result.append(row(
            f"E_PP_{i:03d}", "变体-同义改写", paraphrase(source["input"], i),
            source["type"], f"{source['id']}同义改写；核心要件与预期等级不变",
            source["id"], "paraphrase",
        ))
    cursor += 135

    for i, source in enumerate(sources[cursor:cursor + 108], 1):
        result.append(row(
            f"E_PT_{i:03d}", "变体-细节扰动", perturb(source["input"], i),
            source["type"], f"{source['id']}细节扰动；角色、时间或数值变化但核心要件不变",
            source["id"], "perturb",
        ))
    cursor += 108

    distractors = [
        "当天会议室空调坏了。", "午餐是大家一起点的外卖。", "公司下周准备搬办公室。",
        "我回家路上还遇到了堵车。", "部门最近刚更换考勤系统。", "那天客户提前十分钟到场。",
    ]
    for i, source in enumerate(sources[cursor:cursor + 90], 1):
        result.append(row(
            f"E_DT_{i:03d}", "变体-干扰句", source["input"] + distractors[i % len(distractors)],
            source["type"], f"{source['id']}增加无关干扰句；核心要件与预期等级不变",
            source["id"], "distract",
        ))
    cursor += 90

    for i, source in enumerate(sources[cursor:cursor + 72], 1):
        text, case_type, expected = boundary_text(source, i)
        result.append(row(
            f"E_BD_{i:03d}", "变体-要件边界", text, case_type,
            f"{source['id']}要件边界变化；削弱或强化关键事实，预期调整为{expected}",
            source["id"], "boundary",
        ))
    cursor += 72

    for i, source in enumerate(sources[cursor:cursor + 45], 1):
        text = (
            f"我在现在的单位工作已经{(i % 5) + 1}年，平时绩效记录基本稳定。"
            f"事情发生前，部门正在进行人员和项目调整。{source['input']}"
            "当时我把相关聊天、通知或沟通时间都记了下来，也向同事确认过事情经过。"
            "我现在想判断其中是否包含与性别、婚育或性相关的风险。"
        )
        result.append(row(
            f"E_VB_{i:03d}", "变体-长文本", text, source["type"],
            f"{source['id']}长文本扩展；增加背景、时间线和证据描述，核心要件不变",
            source["id"], "verbose",
        ))
    cursor += 45
    assert cursor == 450
    return result


def serialize(rows, line_ending):
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=COLUMNS, lineterminator=line_ending)
    writer.writerows(rows)
    return stream.getvalue().encode("gbk")


def main():
    original = TARGET.read_bytes()
    text = original.decode("gbk")
    existing = list(csv.DictReader(io.StringIO(text)))
    if list(existing[0].keys()) != COLUMNS:
        raise SystemExit("annotation_template.csv columns do not match the expected working template")

    if len(existing) == 1000:
        expanded_ids = {item["id"] for item in existing[100:]}
        expected_ids = (
            {f"E_HH_{i:03d}" for i in range(1, 73)}
            | {f"E_HM_{i:03d}" for i in range(1, 73)}
            | {f"E_HL_{i:03d}" for i in range(1, 46)}
            | {f"E_DH_{i:03d}" for i in range(1, 73)}
            | {f"E_DM_{i:03d}" for i in range(1, 73)}
            | {f"E_DL_{i:03d}" for i in range(1, 46)}
            | {f"E_N_{i:03d}" for i in range(1, 73)}
            | {f"E_PP_{i:03d}" for i in range(1, 136)}
            | {f"E_PT_{i:03d}" for i in range(1, 109)}
            | {f"E_DT_{i:03d}" for i in range(1, 91)}
            | {f"E_BD_{i:03d}" for i in range(1, 73)}
            | {f"E_VB_{i:03d}" for i in range(1, 46)}
        )
        if expanded_ids != expected_ids:
            raise SystemExit("1000 rows found, but expanded ids do not match the generated dataset")
        print("already_expanded=true")
        print("total=1000")
        return
    if len(existing) != 100:
        raise SystemExit(f"expected 100 or 1000 rows, found {len(existing)}")

    base_groups = make_base_rows()
    bases = [item for group in base_groups for item in group]
    variants = make_variant_rows(base_groups)
    additions = bases + variants

    ids = [item["id"] for item in existing] + [item["id"] for item in additions]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate ids detected")
    if len(additions) != 900:
        raise SystemExit(f"expected 900 additions, found {len(additions)}")
    if len({item["input"] for item in additions}) != 900:
        raise SystemExit("duplicate generated inputs detected")

    line_ending = "\r\n" if b"\r\n" in original else "\n"
    separator = b"" if original.endswith((b"\n", b"\r")) else line_ending.encode("ascii")
    output = original + separator + serialize(additions, line_ending)
    if output[:len(original)] != original:
        raise SystemExit("existing file prefix changed")
    TARGET.write_bytes(output)

    print(f"preserved_existing={len(existing)}")
    print(f"added_base={len(bases)}")
    print(f"added_variants={len(variants)}")
    print(f"total={len(existing) + len(additions)}")


if __name__ == "__main__":
    main()
