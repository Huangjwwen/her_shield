#!/usr/bin/env node
/**
 * 第二批新增页(3 张):
 *   ① 章节扉页 "01 项目背景"(P2 目录 → P3 之间)
 *   ② 言行雷达工作流详解(图 + 文字说明,替换 P7)
 *   ③ 双层评测体系架构图(替换 P9 — 基于项目介绍 1.6 / 项目解决方案 2.1.4 / 项目说明书 3.4)
 *
 * 输出独立文件 docs/她盾_答辩_附加页2.pptx,手动复制粘贴到主稿即可。
 */

const path = require('path');
const pptxgen = require(path.join(
  'C:', 'Users', '黄婧雯', 'AppData', 'Roaming', 'npm', 'node_modules', 'pptxgenjs'
));

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = '她说了算队';
pres.title = '她盾 答辩 附加页 2';

// ── 配色(对齐主稿)──
const C = {
  primary: '9370DB', primaryDark: '7B5DC4', primaryLight: 'B8A9E0',
  accent: 'E8B4B8',
  bg: 'FDFBFB', bgSoft: 'F5F0FF', bgWhite: 'FFFFFF', cardBg: 'F8F6FC',
  text: '333333', textGray: '666666', textLight: '999999',
  high: 'E5484D', mid: 'F76808', low: 'F5A623', none: '30A46C',
  highBg: 'FDECEC', midBg: 'FFF1E7', noneBg: 'E9F7EF'
};
const F = { serif: '宋体', sans: '微软雅黑' };

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
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.55, w: 10, h: 0.075,
    fill: { color: C.primary, transparency: 60 }, line: { type: 'none' }
  });
}
function addPageBackground(slide) { slide.background = { color: C.bg }; }
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
// ①  章节扉页 "01 项目背景"
// ════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  // 用渐变主紫做整页底色
  s.background = { color: C.primaryDark };

  // 装饰圆环
  s.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: C.primary, transparency: 60 }, line: { type: 'none' }
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: 3.5, w: 5, h: 5,
    fill: { color: C.accent, transparency: 70 }, line: { type: 'none' }
  });
  s.addShape(pres.shapes.OVAL, {
    x: 3.5, y: 4.5, w: 3, h: 3,
    fill: { color: C.primaryLight, transparency: 75 }, line: { type: 'none' }
  });

  // 左上小标 "CHAPTER 01"
  s.addText('CHAPTER 01', {
    x: 0.8, y: 1.2, w: 4, h: 0.4,
    fontSize: 14, fontFace: F.sans, bold: true, color: C.primaryLight,
    charSpacing: 18, margin: 0
  });

  // 巨大数字 "01"
  s.addText('01', {
    x: 0.5, y: 1.5, w: 5, h: 3.0,
    fontSize: 220, fontFace: F.serif, bold: true, color: 'FFFFFF',
    valign: 'middle', margin: 0
  });

  // 一条竖装饰线
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.8, y: 2.1, w: 0.04, h: 2.0,
    fill: { color: C.bgWhite }, line: { type: 'none' }
  });

  // 章节名
  s.addText('项目背景', {
    x: 5.1, y: 2.0, w: 4.5, h: 0.8,
    fontSize: 54, fontFace: F.serif, bold: true, color: 'FFFFFF',
    valign: 'middle', margin: 0
  });

  // 副标
  s.addText('从沉默到回应 · 一个隐形又普遍的痛点', {
    x: 5.1, y: 2.95, w: 4.5, h: 0.4,
    fontSize: 15, fontFace: F.sans, color: C.primaryLight,
    valign: 'middle', margin: 0
  });

  // 本章涉及页码
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.1, y: 3.6, w: 1.5, h: 0.4,
    fill: { color: C.bgWhite, transparency: 75 },
    line: { color: 'FFFFFF', width: 1, transparency: 50 },
    rectRadius: 0.05
  });
  s.addText('P3 - P4', {
    x: 5.1, y: 3.6, w: 1.5, h: 0.4,
    fontSize: 12, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });

  // 本章看点(右侧 3 行小字)
  s.addText([
    { text: '· ', options: { color: C.accent } },
    { text: '5 层用户困境:认知 / 情绪 / 证据 / 行动 / 归属', options: { color: 'FFFFFF', breakLine: true } },
    { text: '· ', options: { color: C.accent } },
    { text: '12 亿 +「职场性骚扰」话题阅读量,90% 选择沉默', options: { color: 'FFFFFF', breakLine: true } },
    { text: '· ', options: { color: C.accent } },
    { text: '回应初赛专家批评:KEY 下沉 / 评测体系 / 后端架构', options: { color: 'FFFFFF' } }
  ], {
    x: 5.1, y: 4.2, w: 4.5, h: 1.0,
    fontSize: 11, fontFace: F.sans, paraSpaceAfter: 4, valign: 'top', margin: 0
  });

  // 页脚装饰
  s.addText('SHE · SHIELD · 2026', {
    x: 0, y: 5.15, w: 10, h: 0.3,
    fontSize: 10, fontFace: F.sans, color: C.primaryLight, charSpacing: 12,
    align: 'center', margin: 0
  });
}

// ════════════════════════════════════════════════════
// ②  言行雷达工作流详解(图 + 文字)
// ════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeader(s, 'P7 · 工作流');
  addSlideTitle(s, '言行雷达工作流详解', '三节点编排 · 召回优先 · LLM 标事实 / 代码做映射');

  // 左:工作流图(言行雷达工作流.png 比例约 2.36:1)
  // 放置在 0.4 - 5.5,h 自适应
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.55, w: 5.0, h: 3.85,
    fill: { color: C.bgWhite }, line: { color: C.primary, width: 1.5 }
  });
  s.addImage({
    path: path.join(__dirname, '..', '..', 'images', '言行雷达工作流.png'),
    x: 0.5, y: 1.65, w: 4.8, h: 2.05  // 图本身按比例
  });
  // 图下方:工作流框架说明
  s.addText('▸ 工作流框架(3 节点)', {
    x: 0.5, y: 3.8, w: 4.8, h: 0.3,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText([
    { text: '① 门控 ', options: { bold: true, color: C.primary } },
    { text: '判断是否涉及职场性别议题(召回优先)', options: { color: C.text, breakLine: true } },
    { text: '② 抽取 ', options: { bold: true, color: C.primary } },
    { text: '从描述中提取案情要素(结构化 JSON)', options: { color: C.text, breakLine: true } },
    { text: '③ 评估 ', options: { bold: true, color: C.primary } },
    { text: '要件式法律评估 + 法条 + 类案 + 话术', options: { color: C.text } }
  ], {
    x: 0.5, y: 4.15, w: 4.8, h: 1.3,
    fontSize: 10.5, fontFace: F.sans, paraSpaceAfter: 4, margin: 0
  });

  // 右:5 大亮点(每行一个小卡片)
  s.addText('✨ 5 大设计亮点', {
    x: 5.55, y: 1.55, w: 4.0, h: 0.3,
    fontSize: 13, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });

  const highlights = [
    {
      icon: '①',
      title: '召回优先门控',
      detail: '"拿不准就判涉及" — 100 条测试集无风险样本 100% 准',
      color: C.primary
    },
    {
      icon: '②',
      title: '事实+映射分离',
      detail: 'LLM 只标要件状态;代码节点做确定性等级映射,告别"同问同答"',
      color: C.primaryDark
    },
    {
      icon: '③',
      title: '法条+类案双 RAG',
      detail: '得理 API 实时检索;每条引用挂法院/案号/年份,可追溯',
      color: C.accent
    },
    {
      icon: '④',
      title: '强制深度分析',
      detail: '用户认为门控误判可一键跳过,带 force=true 重发',
      color: C.high
    },
    {
      icon: '⑤',
      title: '三级话术 + 温暖叙事',
      detail: '委婉/坚定/正式 三档可直接复制;暖心叙事先接情绪',
      color: C.mid
    }
  ];

  const hl_x = 5.55, hl_y = 1.9;
  const hl_w = 4.0, hl_h = 0.65;
  const hl_gap = 0.05;

  highlights.forEach((h, i) => {
    const y = hl_y + i * (hl_h + hl_gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x: hl_x, y, w: hl_w, h: hl_h,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.5 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: hl_x, y, w: 0.05, h: hl_h,
      fill: { color: h.color }, line: { type: 'none' }
    });
    // icon 数字
    s.addText(h.icon, {
      x: hl_x + 0.15, y: y + 0.1, w: 0.35, h: 0.45,
      fontSize: 18, fontFace: F.serif, bold: true, color: h.color,
      align: 'center', valign: 'top', margin: 0
    });
    // 标题
    s.addText(h.title, {
      x: hl_x + 0.55, y: y + 0.05, w: hl_w - 0.65, h: 0.28,
      fontSize: 11.5, fontFace: F.sans, bold: true, color: C.primaryDark,
      valign: 'top', margin: 0
    });
    // 详情
    s.addText(h.detail, {
      x: hl_x + 0.55, y: y + 0.32, w: hl_w - 0.65, h: 0.32,
      fontSize: 9.5, fontFace: F.sans, color: C.textGray,
      valign: 'top', margin: 0
    });
  });
}

// ════════════════════════════════════════════════════
// ③  双层评测体系架构图
//    源:项目介绍 1.6 + 项目解决方案 2.1.4 + 项目说明书 3.4
// ════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeader(s, 'P9 · 评测体系');
  addSlideTitle(s, '标准化双层评测体系',
    '人工标事实层 → 代码机械映射 → AI 同跑同代码 → 误差全归 AI');

  // 顶部测试集(信息盒,横跨整页)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.55, w: 9.2, h: 0.7,
    fill: { color: C.bgSoft }, line: { color: C.primary, width: 1 }
  });
  s.addText('📋 测试集 100 条 = 50 精标 + 50 变体', {
    x: 0.55, y: 1.6, w: 4.5, h: 0.3,
    fontSize: 13, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText([
    { text: '锚点:', options: { color: C.textGray } },
    { text: '17 判例 ', options: { color: C.high, bold: true } },
    { text: '+ ', options: { color: C.textGray } },
    { text: '6 法条 ', options: { color: C.primary, bold: true } },
    { text: '+ ', options: { color: C.textGray } },
    { text: '27 推导', options: { color: C.textGray, bold: true } }
  ], {
    x: 0.55, y: 1.9, w: 4.5, h: 0.3,
    fontSize: 11, fontFace: F.sans, margin: 0
  });
  s.addText([
    { text: '变体:', options: { color: C.textGray } },
    { text: '同义 15 · 扰动 12 · 干扰 10 · 边界 8 · 长文 5', options: { color: C.text } }
  ], {
    x: 5.2, y: 1.7, w: 4.3, h: 0.5,
    fontSize: 11, fontFace: F.sans, valign: 'middle', margin: 0
  });

  // ── 主流程图:双层并行(标注侧 + AI 侧)→ compute_risk_level → 对比 ──

  // 左列:人工标注侧(蓝)
  const L_X = 0.4, L_W = 3.0;
  // 右列:AI 输出侧(粉/暖)
  const R_X = 6.6, R_W = 3.0;
  // 中央:compute_risk_level + 对比(紫)
  const M_X = 3.7, M_W = 2.6;

  // —— 左:人工标注 ——
  s.addShape(pres.shapes.RECTANGLE, {
    x: L_X, y: 2.5, w: L_W, h: 0.4,
    fill: { color: C.high }, line: { type: 'none' }
  });
  s.addText('👩‍⚖️ 人工事实层标注', {
    x: L_X, y: 2.5, w: L_W, h: 0.4,
    fontSize: 12, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: L_X, y: 2.9, w: L_W, h: 2.0,
    fill: { color: C.highBg }, line: { color: C.high, width: 0.5 }
  });
  s.addText([
    { text: 'h1 ', options: { bold: true, color: C.high } },
    { text: '行为与性有关', options: { color: C.text, breakLine: true } },
    { text: 'h2 ', options: { bold: true, color: C.high } },
    { text: '违背意愿', options: { color: C.text, breakLine: true } },
    { text: 'h3 ', options: { bold: true, color: C.high } },
    { text: '职场情境', options: { color: C.text, breakLine: true } },
    { text: 'e1 ', options: { bold: true, color: C.high } },
    { text: '区别对待', options: { color: C.text, breakLine: true } },
    { text: 'e2 ', options: { bold: true, color: C.high } },
    { text: '就业环节', options: { color: C.text, breakLine: true } },
    { text: 'institutional / concrete_harm', options: { color: C.text, breakLine: true } },
    { text: '加重情节 5 类', options: { color: C.text } }
  ], {
    x: L_X + 0.15, y: 3.0, w: L_W - 0.3, h: 1.8,
    fontSize: 10, fontFace: F.sans, paraSpaceAfter: 3, valign: 'top', margin: 0
  });

  // 中央 ——
  // compute_risk_level 圆角矩形(突出)
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: M_X, y: 2.7, w: M_W, h: 0.9,
    fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.1
  });
  s.addText('compute_risk_level', {
    x: M_X, y: 2.75, w: M_W, h: 0.4,
    fontSize: 14, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });
  s.addText('30 行 Python if/else', {
    x: M_X, y: 3.15, w: M_W, h: 0.3,
    fontSize: 10, fontFace: F.sans, italic: true, color: C.bgWhite,
    align: 'center', valign: 'middle', margin: 0
  });

  // 期望 vs 实际 对比
  s.addShape(pres.shapes.RECTANGLE, {
    x: M_X, y: 3.85, w: M_W, h: 0.4,
    fill: { color: C.primaryDark }, line: { type: 'none' }
  });
  s.addText('🎯 期望 vs 实际', {
    x: M_X, y: 3.85, w: M_W, h: 0.4,
    fontSize: 12, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });

  // 对比产出
  s.addShape(pres.shapes.RECTANGLE, {
    x: M_X, y: 4.25, w: M_W, h: 0.65,
    fill: { color: C.bgSoft }, line: { color: C.primaryDark, width: 0.5 }
  });
  s.addText([
    { text: '准确率 · 混淆矩阵 · 召回', options: { color: C.text, bold: true } }
  ], {
    x: M_X + 0.1, y: 4.3, w: M_W - 0.2, h: 0.55,
    fontSize: 10, fontFace: F.sans, align: 'center', valign: 'middle', margin: 0
  });

  // —— 右:AI 输出侧 ——
  s.addShape(pres.shapes.RECTANGLE, {
    x: R_X, y: 2.5, w: R_W, h: 0.4,
    fill: { color: C.mid }, line: { type: 'none' }
  });
  s.addText('🤖 元器 radar 工作流', {
    x: R_X, y: 2.5, w: R_W, h: 0.4,
    fontSize: 12, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: R_X, y: 2.9, w: R_W, h: 2.0,
    fill: { color: C.midBg }, line: { color: C.mid, width: 0.5 }
  });
  s.addText([
    { text: 'LLM 输出 ', options: { bold: true, color: C.mid, breakLine: true } },
    { text: 'elements_check []', options: { color: C.text, breakLine: true } },
    { text: 'aggravating_factors []', options: { color: C.text, breakLine: true } },
    { text: 'discrimination_severity { }', options: { color: C.text, breakLine: true } },
    { text: '', options: { breakLine: true } },
    { text: '同一份 compute_risk_level', options: { color: C.primary, bold: true, italic: true, breakLine: true } },
    { text: '→ 实际 risk_level', options: { color: C.text, bold: true } }
  ], {
    x: R_X + 0.15, y: 3.0, w: R_W - 0.3, h: 1.8,
    fontSize: 10, fontFace: F.sans, paraSpaceAfter: 3, valign: 'top', margin: 0
  });

  // 箭头:左 → 中
  s.addText('→', {
    x: L_X + L_W + 0.02, y: 3.0, w: 0.25, h: 0.5,
    fontSize: 20, fontFace: F.sans, bold: true, color: C.primary,
    align: 'center', valign: 'middle', margin: 0
  });
  // 箭头:右 → 中
  s.addText('←', {
    x: M_X + M_W + 0.02, y: 3.0, w: 0.25, h: 0.5,
    fontSize: 20, fontFace: F.sans, bold: true, color: C.primary,
    align: 'center', valign: 'middle', margin: 0
  });

  // 底部:核心数据带
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 5.05, w: 9.2, h: 0.4,
    fill: { color: C.primaryDark }, line: { type: 'none' }
  });
  s.addText([
    { text: '实测  ', options: { color: 'FFFFFF', bold: true } },
    { text: '整体 79% ', options: { color: 'FFFFFF', bold: true } },
    { text: '| ', options: { color: C.primaryLight } },
    { text: '高危召回 90% ', options: { color: 'FFFFFF', bold: true } },
    { text: '| ', options: { color: C.primaryLight } },
    { text: '无风险 100% ', options: { color: 'FFFFFF', bold: true } },
    { text: '| ', options: { color: C.primaryLight } },
    { text: '±1 级容忍 96% ', options: { color: 'FFFFFF', bold: true } },
    { text: '| ', options: { color: C.primaryLight } },
    { text: '严重漏判仅 4 条 · 完全相反 0 条', options: { color: C.primaryLight } }
  ], {
    x: 0.4, y: 5.05, w: 9.2, h: 0.4,
    fontSize: 11, fontFace: F.sans, align: 'center', valign: 'middle', margin: 0
  });
}

// ────── 输出 ──────
const outPath = path.join(__dirname, '她盾_答辩_附加页2.pptx');
pres.writeFile({ fileName: outPath }).then(file => {
  console.log('Written:', file);
}).catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
