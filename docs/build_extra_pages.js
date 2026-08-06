#!/usr/bin/env node
/**
 * 单独生成 2 张新增页:
 *   ① 目录页(导航大纲,18 页主稿的章节分组)
 *   ② 推广价值落地计划(短中长 3 阶段 + 4 类渠道)
 *
 * 不覆盖主 PPT,输出到 docs/她盾_答辩_附加页.pptx,
 * 手动复制粘贴到主 PPT 的合适位置即可。
 */

const path = require('path');
const pptxgen = require(path.join(
  'C:', 'Users', '黄婧雯', 'AppData', 'Roaming', 'npm', 'node_modules', 'pptxgenjs'
));

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = '她说了算队';
pres.title = '她盾 答辩 附加页';

// ── 配色(对齐主稿)──
const C = {
  primary: '9370DB',
  primaryDark: '7B5DC4',
  primaryLight: 'B8A9E0',
  accent: 'E8B4B8',
  bg: 'FDFBFB',
  bgSoft: 'F5F0FF',
  bgWhite: 'FFFFFF',
  text: '333333',
  textGray: '666666',
  textLight: '999999',
  high: 'E5484D',
  mid:  'F76808',
  low:  'F5A623',
  none: '30A46C'
};
const F = { serif: '宋体', sans: '微软雅黑' };

// ── 公用:页眉页脚 ──
function addHeader(slide, label) {
  slide.addText('她盾 · 第十七届中国大学生服务外包大赛 D06', {
    x: 0.4, y: 0.18, w: 6.5, h: 0.3,
    fontSize: 10, fontFace: F.sans, color: C.textLight, margin: 0
  });
  slide.addText(label, {
    x: 7.5, y: 0.18, w: 2.1, h: 0.3,
    fontSize: 10, fontFace: F.sans, italic: true, color: C.primary,
    align: 'right', margin: 0
  });
  // 底部装饰条
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.55, w: 10, h: 0.075,
    fill: { color: C.primary, transparency: 60 }, line: { type: 'none' }
  });
}
function addPageBackground(slide) {
  slide.background = { color: C.bg };
}
function addSlideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.4, y: 0.55, w: 9.2, h: 0.55,
    fontSize: 28, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 1.1, w: 9.2, h: 0.32,
      fontSize: 13, fontFace: F.sans, italic: true, color: C.textGray, margin: 0
    });
  }
}

// ════════════════════════════════════════════════════
// ①  目 录 页
// ════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeader(s, '目录 · Outline');
  addSlideTitle(s, '目录', '从痛点到价值落地 · 18 页 / 10 分钟主线');

  // 6 大章节,3×2 网格布局(每章 ~4.5" 宽 × 1.4" 高)
  const sections = [
    {
      no: '01',
      name: '项目背景',
      pages: 'P1 - P2',
      items: ['封面 · 项目宣言', '5 层用户困境 / 12 亿话题阅读量'],
      color: C.primaryLight
    },
    {
      no: '02',
      name: '产品方案',
      pages: 'P3 - P4',
      items: ['6 模块全景图(判断 / 证据 / 行动 / 支持)', '回应初赛专家批评:KEY 下沉 / 评测 / 后端'],
      color: C.primary
    },
    {
      no: '03',
      name: '技术架构',
      pages: 'P5 - P7',
      items: ['五层全栈架构图', '言行雷达工作流深度', '强制深度分析 + JSON 透明输出'],
      color: C.primaryDark
    },
    {
      no: '04',
      name: '评测体系',
      pages: 'P8 - P9',
      items: ['100 条测试集 · 双层方法学', '准确率仪表盘 79% / 高危召回 90%'],
      color: C.high
    },
    {
      no: '05',
      name: '现场演示',
      pages: 'P10 - P15',
      items: ['言行雷达网页运行实录(P10)', '其他 5 模块亮点(P11-P15)'],
      color: C.mid
    },
    {
      no: '06',
      name: '价值与展望',
      pages: 'P16 - P18',
      items: ['社会价值 · 3 道门槛 + 推广落地计划', '团队致谢 + Q&A'],
      color: C.accent
    }
  ];

  const COLS = 2;
  const startX = 0.4, startY = 1.6;
  const cardW = 4.55, cardH = 1.65;
  const gapX = 0.1, gapY = 0.18;

  sections.forEach((sec, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    // 卡片
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: cardH,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
    });
    // 左侧色条
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: cardH,
      fill: { color: sec.color }, line: { type: 'none' }
    });
    // 编号(大字)
    s.addText(sec.no, {
      x: x + 0.2, y: y + 0.15, w: 0.8, h: 0.7,
      fontSize: 32, fontFace: F.serif, bold: true, color: sec.color,
      align: 'left', valign: 'top', margin: 0
    });
    // 章节名
    s.addText(sec.name, {
      x: x + 1.05, y: y + 0.18, w: cardW - 1.65, h: 0.35,
      fontSize: 16, fontFace: F.serif, bold: true, color: C.primaryDark,
      align: 'left', valign: 'top', margin: 0
    });
    // 页码范围(右上角)
    s.addText(sec.pages, {
      x: x + cardW - 0.95, y: y + 0.2, w: 0.85, h: 0.28,
      fontSize: 10, fontFace: F.sans, italic: true, color: C.textGray,
      align: 'right', valign: 'top', margin: 0
    });
    // 条目列表
    s.addText(sec.items.map((it, k) => ({
      text: '· ' + it,
      options: { color: C.text, breakLine: k < sec.items.length - 1, paraSpaceAfter: 4 }
    })), {
      x: x + 1.05, y: y + 0.6, w: cardW - 1.2, h: cardH - 0.7,
      fontSize: 10.5, fontFace: F.sans, valign: 'top', margin: 0
    });
  });
}

// ════════════════════════════════════════════════════
// ②  推广价值落地计划
// ════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeader(s, '推广 · Adoption Roadmap');
  addSlideTitle(s, '推广价值与落地计划', '4 类渠道 · 3 阶段里程碑 · C 端永久免费,B 端 SaaS 反哺');

  // —— 上半部分:4 类渠道(2×2 网格)——
  const channels = [
    {
      icon: '🏫',
      title: '高校就业指导',
      detail: '与全国高校就业指导中心 / 女性教育研究所合作\n大四求职季前进行专题培训 + 工具发放',
      color: C.primary
    },
    {
      icon: '🏛️',
      title: '妇联 / 法律援助',
      detail: '与 12338 妇联 / 12348 法律援助热线对接\n作为非紧急前置筛查工具,降低人工咨询量',
      color: C.primaryDark
    },
    {
      icon: '📱',
      title: '社交媒体内容',
      detail: '微信公众号 / 小红书 / B 站 / 豆瓣职场组\n每周 1 真实判例改编故事 + 工具引导',
      color: C.accent
    },
    {
      icon: '💼',
      title: 'B 端企业 / 律所',
      detail: 'HR / 合规部 / 律所内训提供 SaaS 接入\n企业内部投诉合规筛查,降低法务成本',
      color: C.mid
    }
  ];

  const ch_x = 0.4, ch_y = 1.55;
  const ch_w = 4.55, ch_h = 1.4;
  const ch_gap = 0.1;

  channels.forEach((ch, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ch_x + col * (ch_w + ch_gap);
    const y = ch_y + row * (ch_h + 0.12);

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: ch_w, h: ch_h,
      fill: { color: C.bgWhite }, line: { color: ch.color, width: 1 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: ch_w, h: 0.08,
      fill: { color: ch.color }, line: { type: 'none' }
    });
    // icon
    s.addText(ch.icon, {
      x: x + 0.15, y: y + 0.2, w: 0.6, h: 0.55,
      fontSize: 28, fontFace: F.sans, align: 'center', valign: 'middle', margin: 0
    });
    // 标题
    s.addText(ch.title, {
      x: x + 0.85, y: y + 0.18, w: ch_w - 1, h: 0.35,
      fontSize: 14, fontFace: F.serif, bold: true, color: C.primaryDark,
      valign: 'top', margin: 0
    });
    // 详情
    s.addText(ch.detail, {
      x: x + 0.85, y: y + 0.55, w: ch_w - 1, h: ch_h - 0.65,
      fontSize: 10, fontFace: F.sans, color: C.textGray, valign: 'top', margin: 0
    });
  });

  // —— 下半部分:3 阶段里程碑(时间轴)——
  const milestones = [
    {
      phase: '0-3 月',
      title: '上线 · 优化',
      goals: [
        '测试集扩 100 → 500',
        '联系 3 所高校试点',
        '微信公众号上线'
      ],
      color: C.primaryLight
    },
    {
      phase: '3-6 月',
      title: '扩展 · 验证',
      goals: [
        '1000+ 注册用户',
        '10 所高校 + 1 妇联合作',
        '准确率提升到 85%'
      ],
      color: C.primary
    },
    {
      phase: '6-12 月',
      title: '商业 · 反哺',
      goals: [
        'B 端 5 家企业 SaaS 试点',
        '公益基金合作落地',
        'C 端 10000 月活'
      ],
      color: C.primaryDark
    }
  ];

  const ms_x = 0.4, ms_y = 4.45;
  const ms_w = 3.05, ms_h = 1.0;
  const ms_gap = 0.15;

  // 顶部"路线图"小标题
  s.addText('🛣️  路线图(C 端永久免费,B 端反哺养 C 端)', {
    x: 0.4, y: 4.2, w: 9.2, h: 0.25,
    fontSize: 11, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });

  milestones.forEach((ms, i) => {
    const x = ms_x + i * (ms_w + ms_gap);
    // 卡片
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: ms_y, w: ms_w, h: ms_h,
      fill: { color: C.bgSoft }, line: { color: ms.color, width: 1 }
    });
    // 阶段标(顶部胶囊)
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.15, y: ms_y + 0.08, w: 1.1, h: 0.3,
      fill: { color: ms.color }, line: { type: 'none' }, rectRadius: 0.05
    });
    s.addText(ms.phase, {
      x: x + 0.15, y: ms_y + 0.08, w: 1.1, h: 0.3,
      fontSize: 11, fontFace: F.sans, bold: true, color: C.bgWhite,
      align: 'center', valign: 'middle', margin: 0
    });
    // 标题
    s.addText(ms.title, {
      x: x + 1.35, y: ms_y + 0.08, w: ms_w - 1.5, h: 0.3,
      fontSize: 13, fontFace: F.serif, bold: true, color: ms.color,
      valign: 'middle', margin: 0
    });
    // 3 个目标
    s.addText(ms.goals.map((g, k) => ({
      text: '✓ ' + g,
      options: { color: C.text, breakLine: k < ms.goals.length - 1, paraSpaceAfter: 2 }
    })), {
      x: x + 0.2, y: ms_y + 0.45, w: ms_w - 0.3, h: ms_h - 0.5,
      fontSize: 9.5, fontFace: F.sans, valign: 'top', margin: 0
    });

    // 阶段之间的箭头
    if (i < milestones.length - 1) {
      s.addText('→', {
        x: x + ms_w + 0.01, y: ms_y + ms_h / 2 - 0.15, w: 0.14, h: 0.3,
        fontSize: 14, fontFace: F.sans, bold: true, color: C.primary,
        align: 'center', valign: 'middle', margin: 0
      });
    }
  });
}

// ────── 输出 ──────
const outPath = path.join(__dirname, '她盾_答辩_附加页.pptx');
pres.writeFile({ fileName: outPath }).then(file => {
  console.log('Written:', file);
}).catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
