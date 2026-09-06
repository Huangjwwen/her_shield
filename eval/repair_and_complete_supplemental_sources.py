import csv
from pathlib import Path


PATH = Path(__file__).with_name("supplemental_public_case_sources.csv")
FIELDS = [
    "candidate_id",
    "target_stratum",
    "source_title",
    "source_reference",
    "source_url",
    "selection_status",
]


def restore(text):
    try:
        return text.encode("gbk").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


NEW_ROWS = [
    ["S_H_076", "性骚扰", "王某以调岗为条件对女下属作性暗示案", "重庆一中院妇女权益保护典型案例公开报道", "https://www.chinanews.com.cn/sh/2024/03-14/10179920.shtml", "已核验：法院典型案例公开事实，录音、投诉和报警相互印证，独立事件"],
    ["S_H_074", "性骚扰", "吴某多次骚扰餐厅女员工被食品公司解除案", "最高人民法院第四批弘扬社会主义核心价值观典型民事案例", "https://www.court.gov.cn/zixun/xiangqing/484101.html", "已核验：最高人民法院发布，5名员工面谈记录、视频及本人陈述相互印证，独立事件"],
    ["S_H_073", "性骚扰", "吴春明利用师生关系性骚扰女研究生事件", "厦门大学调查处理通报", "https://www.edu.cn/edu/gao_deng/gao_jiao_news/201410/t20141015_1189566.shtml", "已核验：高校调查通报经教育部门网站转载，独立事件"],
    ["S_H_072", "性骚扰", "张某遭同事郑某触碰胸部并因单位拒绝调班离岗案", "北京二中院职场性骚扰处置劳动争议案例", "https://www.yxzf.gov.cn/yxssfj/yasf/1835066.shtml", "已核验：政府司法普法页面转引生效裁判事实，独立事件"],
    ["S_H_053", "性骚扰", "潘某以不雅言语和不良肢体行为骚扰三名女员工被解除案", "江门市中级人民法院职场行为典型案例", "https://m.thepaper.cn/newsDetail_forward_33076493", "已核验：法院官方发布，独立事件"],
    ["S_H_054", "性骚扰", "公益项目负责人林某某骚扰女下属人格权纠纷案", "宁波市海曙区人民法院一审判决公开报道", "https://m.thepaper.cn/newsDetail_forward_32920180", "已核验：判决事实与微信自认相互印证，独立事件"],
    ["S_H_055", "性骚扰", "梁某某阻止女同事关门换衣并作不雅动作被解除案", "重庆市第三中级人民法院核心价值观典型案例", "https://m.thepaper.cn/newsDetail_forward_29808567", "已核验：法院官方典型案例，独立事件"],
    ["S_H_056", "性骚扰", "王某持续向女领导发送轻佻暧昧信息并诋毁名誉被解除案", "南通市崇川区人民法院劳动争议案例", "https://www.jsfy.gov.cn/article/107451.html", "已核验：江苏法院网发布，独立事件"],
    ["S_H_057", "性骚扰", "张某在酒店工作中骚扰王某被判精神损害抚慰金案", "北京二中院高度盖然性认定性骚扰案例", "https://www.sdcourt.gov.cn/wfhtqfy/443068/443024/7359317/index.html", "已核验：二审裁判事实，独立事件"],
    ["S_H_058", "性骚扰", "林某对物流公司多名女员工实施言语和行为骚扰被解除案", "上海市青浦区人民法院职场性骚扰防治义务案例", "https://www.hshfy.sh.cn/css/2023/04/03/202304031450400661278.pdf", "已核验：法院案例材料，独立事件"],
    ["S_H_059", "性骚扰", "王某值夜班前往卫生间途中遭强奸未遂并申请工伤案", "长沙市人社局工伤认定行政诉讼案", "https://static.nfnews.com/content/202406/22/c9015297.html?enterColumnId=86", "已核验：生效裁判事实可追溯，独立事件"],
    ["S_H_060", "性骚扰", "张某教师性骚扰女学生受处分后请求删除网络词条案", "官方通报事实引发的网络侵权纠纷案", "https://m.thepaper.cn/newsDetail_forward_27381769", "已核验：法院核对官方通报，独立事件"],
    ["S_H_061", "性骚扰", "陆某某学校保安在保安室及工棚猥亵女学生案", "侵害未成年人案件强制报告典型案例", "https://www.spp.gov.cn/xwfbh/dxal/202005/t20200529_463532.shtml", "已核验：最高检典型案例，独立事件"],
    ["S_H_062", "性骚扰", "陈某启利用工作室招聘机会强制猥亵求职毕业生案", "检察机关与妇联司法救助协作典型案例", "https://www.spp.gov.cn/xwfbh/dxal/202303/t20230309_607118.shtml", "已核验：最高检典型案例，独立事件"],
    ["S_H_063", "性骚扰", "罗某教师利用夜自习多次猥亵多名女学生案", "信阳中院保护妇女儿童权益典型案例", "https://www.hncourt.gov.cn/public/detail.php?id=202282", "已核验：河南法院官方案例，独立事件"],
    ["S_H_064", "性骚扰", "郭某某利用教师身份长期性侵猥亵多名小学女生案", "最高人民法院依法严惩性侵未成年人典型案例", "https://www.court.gov.cn/zixun/xiangqing/447391.html", "已核验：最高法院官方案例，独立事件"],
    ["S_H_065", "性骚扰", "林某在工作场所以涉性玩笑骚扰女职工被解除案", "福州市人社局与永泰县劳动人事争议案例", "https://rst.fj.gov.cn/zw/zfxxgk/zfxxgkml/zyywgz/ldgx/202308/P020231116544800664513.pdf", "已核验：人社部门案例，独立事件"],
    ["S_H_066", "性骚扰", "医院男职工在工作场所多次性骚扰女职工被解除案", "河南法院劳动争议案例", "https://www.hncourt.gov.cn/public/detail.php?id=198426", "已核验：河南法院官方案例，独立事件"],
    ["S_X_022", "交叉或信息模糊", "李某纠缠跟踪女同事致其离职但性相关内容不明确案", "武汉江汉法院及武汉中院劳动争议案", "https://m.thepaper.cn/newsDetail_forward_15188496", "已核验：法院认定骚扰，但公开事实不足以确认性相关要件"],
    ["S_X_023", "交叉或信息模糊", "刘女士称遭上司性骚扰后因群发邮件被解除案", "北京市通州区人民法院劳动争议案例", "https://www.sdcourt.gov.cn/qdtlfy/368566/368545/3612879/index.html", "已核验：解除违法，但公开裁判未认定性骚扰事实"],
    ["S_H_067", "性骚扰", "陈小武利用师生关系性骚扰学生被撤销教师资格案", "北京航空航天大学调查处理及教育部处置事件", "https://www.edu.cn/rd/gao_xiao_cheng_guo/gao_xiao_zi_xun/201801/t20180115_1580476.shtml", "已核验：校方调查确认、教育部处理，独立事件"],
    ["S_D_041", "性别歧视", "桐庐县人力资源市场公众号长期发布限男性招聘信息公益诉讼案", "第六届依法维护妇女儿童权益十大案例", "https://www.court.gov.cn/zixun/xiangqing/483821.html", "已核验：最高法院发布，独立事件"],
    ["S_H_068", "性骚扰", "张某医院后勤维修人员多次骚扰女同事被解除案", "郑州市金水区人民法院劳动争议案例", "https://eqqfy.hncourt.gov.cn/public/detail.php?id=3700", "已核验：河南法院官方案例，独立事件"],
    ["S_H_069", "性骚扰", "宫某骚扰猥亵学生并被高校解除聘用案", "高校师德失范调查处理通报案例", "https://new.dlnu.edu.cn/jiwei/info/1197/1243.htm", "已核验：高校纪检网站发布处理结论，独立事件"],
    ["S_H_070", "性骚扰", "王某某利用导师地位性骚扰学生并打击报复被解除聘用案", "高校师德师风反面典型案例汇编", "https://jsjxy.hbuas.edu.cn/__local/8/FB/6F/EAE92BB9D7968064DAD91528762_AF0B43D0_30353.pdf", "已核验：高校官方教育材料，独立事件"],
    ["S_H_071", "性骚扰", "朱某在办公室拉女学生坐腿并猥亵其他学生案", "重庆市第三中级人民法院辖区涉未成年人保护典型案例", "https://m.thepaper.cn/newsDetail_forward_33255043", "已核验：重庆三中法院官方发布，独立事件"],
]


with PATH.open(encoding="utf-8-sig", newline="") as source:
    reader = csv.DictReader(source)
    rows = [
        {restore(key): restore(value) for key, value in row.items()}
        for row in reader
    ]

# This row duplicates initial case I_146 from the same Supreme People's
# Procuratorate typical-case collection.
EXCLUDED_IDS = {"S_H_005", "S_H_007", "S_H_011", "S_H_023", "S_H_025", "S_H_040", "S_H_041", "S_H_058", "S_H_065", "S_D_019"}
rows = [
    row for row in rows
    if row["candidate_id"] not in EXCLUDED_IDS
]

known_ids = {row["candidate_id"] for row in rows}
for values in NEW_ROWS:
    row = dict(zip(FIELDS, values))
    if row["candidate_id"] not in known_ids and row["candidate_id"] not in EXCLUDED_IDS:
        rows.append(row)

with PATH.open("w", encoding="utf-8-sig", newline="") as target:
    writer = csv.DictWriter(target, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerows(rows)

print(f"wrote {len(rows)} rows to {PATH}")
