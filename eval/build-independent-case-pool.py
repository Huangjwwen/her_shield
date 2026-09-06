import csv
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parent
DOC_ROOT = ROOT.parent.parent
OUTPUT = ROOT / "independent_case_source_pool.csv"

JUDGMENT_DOC = DOC_ROOT / "职场性别歧视性骚扰相关案例.docx"


OFFICIAL_COLLECTIONS = [
    ("最高人民法院指导案例181号", "https://www.court.gov.cn/fabu/xiangqing/364651.html", [
        "郑某诉霍尼韦尔公司劳动合同纠纷案",
    ]),
    ("最高法/人社部劳动人事争议典型案例第二批", "https://www.court.gov.cn/zixun/xiangqing/319151.html", [
        "劳动者拒绝违法超时加班安排，用人单位能否解除劳动合同",
        "劳动者与用人单位订立放弃加班费协议，能否主张加班费",
        "用人单位未按规章制度履行加班审批手续，能否认定劳动者加班事实",
        "用人单位与劳动者约定实行包薪制，是否需要依法支付加班费",
        "用人单位未与劳动者协商一致增加工作任务，劳动者是否有权拒绝",
        "处理加班费争议，如何分配举证责任",
        "劳动者超时加班发生工伤，用工单位、劳务派遣单位是否承担连带赔偿责任",
        "用人单位以规章制度形式否认劳动者加班事实是否有效",
        "劳动者在离职文件上签字确认加班费已结清，是否有权请求支付欠付的加班费",
        "加班费的仲裁时效应当如何认定",
    ]),
    ("最高法/人社部劳动人事争议典型案例第三批", "https://www.court.gov.cn/zixun/xiangqing/401172.html", [
        "网约货车司机与平台企业劳动关系认定案",
        "网约配送员与平台企业劳动关系认定案",
        "外卖平台合作企业通过劳务公司招用配送员劳动关系认定案",
        "劳动者注册个体工商户并订立合作协议的劳动关系认定案",
        "网络主播与文化传播公司劳动关系认定案",
        "网约家政服务人员与家政公司劳动关系认定案",
    ]),
    ("最高法/人社部劳动人事争议典型案例第四批", "https://www.court.gov.cn/zixun/xiangqing/462311.html", [
        "工伤职工根据诊断证明主张延长停工留薪期案",
        "用人单位因女职工怀孕调岗降薪案",
        "病亡职工遗属请求补足抚恤金差额案",
        "劳动者自行承担单位应缴社会保险费的赔偿案",
        "主体不适格的竞业限制条款效力案",
    ]),
    ("最高检/全国妇联妇女权益保障公益诉讼典型案例", "https://www.spp.gov.cn/xwfbh/dxal/202211/t20221125_593721.shtml", [
        "咸阳市渭城区检察院督促保护妇女劳动权益行政公益诉讼案",
        "纳雍县检察院督促保护妇女劳动和社会保障权益行政公益诉讼案",
        "北京铁路运输检察院督促整治妇女就业歧视行政公益诉讼案",
        "松江区检察院督促保护残疾妇女平等就业权行政公益诉讼案",
        "滨海县检察院诉王某红侵犯孕产妇生育信息公益诉讼案",
        "樟树市检察院督促整治低俗广告贬损妇女人格行政公益诉讼案",
        "博州检察院督促保护农村妇女土地承包经营权行政公益诉讼案",
        "宝应县检察院督促落实涉家暴妇女强制报告行政公益诉讼案",
        "清远市清城区检察院督促加强反家暴联动履职行政公益诉讼案",
        "嘉善县检察院督促保护妇女隐私权益行政公益诉讼案",
    ]),
    ("北京工会维护女职工权益十大案例", "https://chinajob.mohrss.gov.cn/c/2021-03-16/295761.shtml", [
        "单位仅以不能胜任工作为由解除女职工劳动合同案",
        "女职工工伤期间单位仅支付病假工资案",
        "疫情期间单位要求女职工放弃社保及工资案",
        "用人单位未缴生育保险支付生育津贴案",
        "孕期劳动合同届满单位终止劳动关系案",
        "女职工产检请假与工资待遇争议案",
        "哺乳期女职工休假与岗位安排争议案",
        "女职工产假工资差额争议案",
        "女职工未签劳动合同及违法解除争议案",
        "女职工特殊保护条款缺失争议案",
    ]),
    ("淮安法院女职工劳动权益保障典型案例", "https://fy.huaian.gov.cn/col/11899_458884/art/w/17722944/17745997506024JsQdCt2.html", [
        "女职工拒绝不合理异地调岗被以旷工解除案",
        "女职工病假返岗后的岗位安排案",
        "女职工孕期请假被辞退继续履行劳动合同案",
        "用人单位未缴生育保险给付产假工资案",
        "女职工群体讨薪联动处理案",
    ]),
]

GENERIC_COLLECTIONS = [
    ("天津人社局2021年度劳动人事争议典型案例", "https://chinajob.mohrss.gov.cn/h5/c/2022-01-30/340845.shtml", 5),
    ("重庆高院第八批劳动争议典型案例", "https://chinajob.mohrss.gov.cn/h5/c/2022-04-24/348571.shtml", 10),
    ("江苏法院2021年度劳动人事争议典型案例", "https://chinajob.mohrss.gov.cn/h5/c/2022-04-29/349423.shtml", 10),
    ("北京2023年劳动人事争议仲裁典型案例", "https://rsj.beijing.gov.cn/bm/ztzl/dxal/202312/t20231229_3518105.html", 10),
    ("贵州高院人社厅劳动争议典型案例", "https://rst.guizhou.gov.cn/zwgk/zdlyxx/qsldrszyzcjg/202504/t20250430_87609446.html", 10),
    ("最高检保障妇女儿童权益典型案例", "https://www.spp.gov.cn/spp/xwfbh/dxal/202404/t20240415_651674.shtml", 10),
    ("甘肃法院维护妇女儿童权益典型案例", "https://chinagscourt.gov.cn/Show/96952", 10),
    ("最高法涉农民工工资案件执行典型案例", "https://www.court.gov.cn/zixun/xiangqing/398582.html", 10),
    ("最高法践行社会主义核心价值观典型案例", "https://www.court.gov.cn/zixun/xiangqing/408162.html", 10),
    ("最高法助力中小微企业发展典型案例", "https://www.court.gov.cn/zixun/xiangqing/355361.html", 10),
    ("最高法交叉执行典型案例", "https://www.court.gov.cn/zixun/xiangqing/436891.html", 10),
]

SUMMARY_CASES = [
    ("严女士入职孕检后被撤回录用案", "案例.docx", "严女士收到财务主管录用通知并依要求进行HCG检查，告知怀孕后公司以岗位取消为由撤回录用，但仍继续招聘同一岗位。"),
    ("小丽应聘法务岗位因公司想招男性被拒案", "案例.docx", "小丽应聘法务专员岗位，招聘条件未限制性别，公司查看简历后明确回复想招男性并拒绝其申请。"),
    ("成都科技公司总监出差猥亵案", "案例.docx", "公司总监利用出差和上下级关系对女职工实施违背意愿的肢体侵入行为。"),
    ("江西部门经理发送露骨信息骚扰案", "案例.docx", "部门经理持续向女职工发送露骨性信息，女职工拒绝后仍继续发送。"),
    ("互联网公司工作群环境骚扰案", "案例.docx", "公司工作群长期传播涉性图片和言论，女职工提出不适后相关人员仍未停止。"),
]


def clean(text):
    return re.sub(r"\s+", " ", text or "").strip()


def judgment_records():
    paragraphs = [clean(p.text) for p in Document(JUDGMENT_DOC).paragraphs]
    title_pattern = re.compile(r"(判决书|裁定书)$")
    docket_pattern = re.compile(r"[（(]\d{4}[）)][^，。；\n]{1,22}?号")
    records = []
    for index, title in enumerate(paragraphs):
        if not (5 < len(title) < 100 and title_pattern.search(title)):
            continue
        if title.startswith(("如不服", "一、", "二、", "六、", "民事判决书")):
            continue
        window = paragraphs[index:index + 15]
        dockets = [docket for text in window for docket in docket_pattern.findall(text)]
        if not dockets:
            continue
        fact_candidates = [
            text for text in paragraphs[index + 1:index + 18]
            if len(text) >= 45 and not text.startswith(("案", "发布日期", "浏览次数", "民 事", "本院认为"))
        ]
        records.append({
            "source_title": title,
            "source_reference": re.sub(r"\s+", "", dockets[0]),
            "source_excerpt": fact_candidates[0][:500] if fact_candidates else "",
        })

    # First-instance and appeal documents describe the same underlying event.
    duplicate_titles = {
        "梁某某与重庆市某某劳务派遣有限公司劳动合同纠纷一审民事判决书",
        "厦门空分特气实业有限公司与杨庆列劳动争议一审民事判决书",
        "关欣与北京减脂时代科技有限公司一般人格权纠纷一审民事判决书",
        "杜某与广东粤海丽江房地产发展有限公司劳动争议一审民事判决书",
        "邓亚娟与北京市邮政速递物流有限公司等一般人格权纠纷一审民事判决书",
        "江苏某公司、钟某劳动争议民事申请再审审查民事裁定书",
    }
    return [record for record in records if record["source_title"] not in duplicate_titles]


def main():
    rows = []
    for record in judgment_records():
        rows.append({
            "source_kind": "裁判文书",
            "source_title": record["source_title"],
            "source_reference": record["source_reference"],
            "source_excerpt": record["source_excerpt"],
            "source_file_or_url": JUDGMENT_DOC.name,
        })
    for title, filename, excerpt in SUMMARY_CASES:
        rows.append({
            "source_kind": "文档案例摘要", "source_title": title,
            "source_reference": title, "source_excerpt": excerpt,
            "source_file_or_url": filename,
        })
    for collection, url, titles in OFFICIAL_COLLECTIONS:
        for title in titles:
            rows.append({
                "source_kind": "官方典型案例", "source_title": title,
                "source_reference": f"{collection}｜{title}",
                "source_excerpt": "待从官方案例正文提取用户叙述；不得仅以标题代替input",
                "source_file_or_url": url,
            })

    for collection, url, count in GENERIC_COLLECTIONS:
        for ordinal in range(1, count + 1):
            title = f"{collection}案例{ordinal}"
            rows.append({
                "source_kind": "官方典型案例", "source_title": title,
                "source_reference": f"{collection}｜案例{ordinal}",
                "source_excerpt": "待从官方案例正文提取用户叙述；不得仅以标题代替input",
                "source_file_or_url": url,
            })

    if len(rows) != 205:
        raise SystemExit(f"expected 205 independent sources, found {len(rows)}")
    references = [row["source_reference"] for row in rows]
    if len(references) != len(set(references)):
        raise SystemExit("duplicate source references detected")

    fields = ["id", "source_kind", "source_title", "source_reference", "source_excerpt", "source_file_or_url", "variant_of", "variant_type", "selection_status"]
    with OUTPUT.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for index, row in enumerate(rows, 1):
            row.update({
                "id": f"I_{index:03d}", "variant_of": "", "variant_type": "",
                "selection_status": "已选入；待提取事实并盲标F-Q",
            })
            writer.writerow(row)
    print(f"selected={len(rows)}")
    print(f"judgments={sum(r['source_kind'] == '裁判文书' for r in rows)}")
    print(f"document_summaries={sum(r['source_kind'] == '文档案例摘要' for r in rows)}")
    print(f"official_typical_cases={sum(r['source_kind'] == '官方典型案例' for r in rows)}")
    print("variants=0")


if __name__ == "__main__":
    main()
