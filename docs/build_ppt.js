#!/usr/bin/env node
/**
 * 她盾答辩 PPT 模板预览生成器
 * - 配色对齐网页 (暖紫 #9370DB)
 * - 15 页:封面 + 13 内容 + Q&A
 * - 文字框架占位,后续可在 PowerPoint 里编辑
 */

const path = require('path');
const pptxgen = require(path.join(
  'C:', 'Users', '黄婧雯', 'AppData', 'Roaming', 'npm', 'node_modules', 'pptxgenjs'
));

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10" × 5.625"
pres.author = '她说了算队';
pres.title = '她盾 答辩 PPT';
pres.subject = '职场女性权益守护智能体';

// ==================== 配色(对齐 css/style.css) ====================
const C = {
  primary: '9370DB',
  primaryDark: '7B5DC4',
  primaryLight: 'B8A9E0',
  primaryHover: '8B5CF6',
  accent: 'E8B4B8',           // 暖粉
  bg: 'FDFBFB',               // 页面背景(近白)
  bgSoft: 'F5F0FF',           // 暖紫淡底
  bgWhite: 'FFFFFF',
  cardBg: 'F8F6FC',
  text: '333333',
  textGray: '666666',
  textLight: '999999',
  // 风险等级
  high: 'E5484D', highBg: 'FDECEC',
  mid:  'F76808', midBg:  'FFF1E7',
  low:  'F5A623', lowBg:  'FFF8E6',
  none: '30A46C', noneBg: 'E9F7EF'
};
const F = {
  serif: '宋体',        // 标题(可在 PPT 里改成思源宋体)
  sans:  '微软雅黑',     // 正文
};

// 页眉、页脚帮助函数
function addHeaderFooter(slide, pageNum) {
  // 顶部横栏极淡紫(可选,先不加大色块以免抢戏)
  // 项目标记 左上
  slide.addText('她盾 · 第十七届中国大学生服务外包大赛 D06', {
    x: 0.4, y: 0.18, w: 6.5, h: 0.3,
    fontSize: 9, fontFace: F.sans, color: C.primary, charSpacing: 1, margin: 0
  });
  // 页码 右上
  slide.addText(`${pageNum} / 15`, {
    x: 8.9, y: 0.18, w: 0.7, h: 0.3,
    fontSize: 9, fontFace: F.sans, color: C.primaryLight, align: 'right', margin: 0
  });
  // 团队名 右下
  slide.addText('她说了算队', {
    x: 8.4, y: 5.30, w: 1.4, h: 0.22,
    fontSize: 9, fontFace: F.sans, color: C.textLight, align: 'right', margin: 0
  });
  // 顶部细分隔线
  slide.addShape(pres.shapes.LINE, {
    x: 0.4, y: 0.5, w: 9.2, h: 0,
    line: { color: C.primaryLight, width: 0.5, transparency: 50 }
  });
}

// 标题行(content slides 通用)
function addSlideTitle(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.4, y: 0.62, w: 9.2, h: 0.5,
    fontSize: 28, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 1.06, w: 9.2, h: 0.3,
      fontSize: 12, fontFace: F.sans, color: C.textGray, italic: true, margin: 0
    });
  }
}

// 卡片(左 4px 紫边线 + 白底 + 阴影);content/title 可选
// 注意:不复用 shadow 对象;不要 ROUNDED_RECT 当带 accent line
function addCard(slide, x, y, w, h, opts = {}) {
  const fill = opts.fill || C.bgWhite;
  // 白卡
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: 'EAE3F5', width: 0.75 },
    shadow: { type: 'outer', color: '9370DB', opacity: 0.08, blur: 8, offset: 2, angle: 135 }
  });
  // 左 4px 紫色装饰线
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.05, h,
    fill: { color: opts.borderColor || C.primaryLight },
    line: { type: 'none' }
  });
}

// 底色淡紫块(整页背景)
function addPageBackground(slide) {
  slide.background = { color: C.bg };
  // 右下角装饰圆(透明度)
  slide.addShape(pres.shapes.OVAL, {
    x: 8.5, y: 4.0, w: 1.8, h: 1.8,
    fill: { color: C.bgSoft, transparency: 30 },
    line: { type: 'none' }
  });
}

// ==================== Slide 1:封面(精美版 · 含 logo) ====================
{
  const s = pres.addSlide();
  s.background = { color: C.bgSoft };

  // 左上暖粉柔和装饰
  s.addShape(pres.shapes.OVAL, {
    x: -1.8, y: -2, w: 4.8, h: 4.8,
    fill: { color: C.accent, transparency: 75 }, line: { type: 'none' }
  });
  // 右下主紫色大圆
  s.addShape(pres.shapes.OVAL, {
    x: 6.8, y: 3.2, w: 5.5, h: 5.5,
    fill: { color: C.primaryLight, transparency: 65 }, line: { type: 'none' }
  });
  // 中部细线轮廓(增加层次)
  s.addShape(pres.shapes.OVAL, {
    x: 3.6, y: 3.8, w: 5.0, h: 5.0,
    fill: { color: 'FFFFFF', transparency: 100 },
    line: { color: C.primary, width: 0.6, transparency: 70 }
  });

  // === 左侧 logo ===
  // logo 底光圈(让 logo 浮起来)
  s.addShape(pres.shapes.OVAL, {
    x: 0.5, y: 0.95, w: 3.85, h: 3.85,
    fill: { color: 'FFFFFF', transparency: 30 }, line: { type: 'none' }
  });
  // logo 图片本体
  s.addImage({
    path: path.join(__dirname, '..', 'logo.png'),
    x: 0.65, y: 1.1, w: 3.55, h: 3.55
  });

  // === 右侧文字区 ===
  // 英文小标(空格分隔,charSpacing 加宽)
  s.addText('SHE · SHIELD', {
    x: 4.55, y: 1.05, w: 5, h: 0.35,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primary, charSpacing: 10, margin: 0
  });

  // 主标题"她盾"
  s.addText('她盾', {
    x: 4.55, y: 1.45, w: 5, h: 1.5,
    fontSize: 110, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
  });

  // 副标题
  s.addText('职场女性权益守护智能体', {
    x: 4.55, y: 3.05, w: 5, h: 0.5,
    fontSize: 22, fontFace: F.sans, color: C.text, charSpacing: 3, margin: 0
  });

  // 装饰短横线(暖粉)
  s.addShape(pres.shapes.LINE, {
    x: 4.55, y: 3.7, w: 0.7, h: 0,
    line: { color: C.accent, width: 3.5 }
  });

  // tagline 斜体引语
  s.addText('"你的身后,站着一个懂法更懂你的「她」"', {
    x: 4.55, y: 3.85, w: 5.0, h: 0.5,
    fontSize: 14, fontFace: F.sans, italic: true, color: C.primaryDark, margin: 0
  });

  // === 底部信息行 ===
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 4.78, w: 9, h: 0,
    line: { color: C.primaryLight, width: 0.5, transparency: 40 }
  });
  s.addText('团队 · 她说了算队', {
    x: 0.5, y: 4.9, w: 4.5, h: 0.3,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText('第十七届中国大学生服务外包大赛 · 腾讯开悟全球 AI 公开赛 D06', {
    x: 4.8, y: 4.9, w: 4.9, h: 0.3,
    fontSize: 10, fontFace: F.sans, color: C.textGray, align: 'right', margin: 0
  });
  s.addText('2026', {
    x: 4.8, y: 5.18, w: 4.9, h: 0.2,
    fontSize: 9, fontFace: F.sans, color: C.textLight, align: 'right', charSpacing: 3, margin: 0
  });
}

// ==================== Slide 2:痛点 + 五层断裂链 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 2);
  addSlideTitle(s, '一条断裂的链', '在每一个被沉默的瞬间,究竟卡在哪一环');

  // 三个大数字
  const stats = [
    { num: '60.9%', label: '求职女性被询问婚育', src: '智联招聘 2026' },
    { num: '< 30%', label: '职场性别歧视案胜诉率', src: '中国裁判文书网' },
    { num: '7%',    label: '性骚扰受害者选择报警', src: '全国妇联统计' },
  ];
  stats.forEach((it, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.9, h: 1.4,
      fill: { color: C.bgWhite },
      line: { color: 'EAE3F5', width: 0.75 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 0.05, h: 1.4,
      fill: { color: C.primary }, line: { type: 'none' }
    });
    s.addText(it.num, {
      x: x + 0.15, y: 1.65, w: 2.7, h: 0.7,
      fontSize: 40, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
    });
    s.addText(it.label, {
      x: x + 0.15, y: 2.35, w: 2.7, h: 0.3,
      fontSize: 11, fontFace: F.sans, color: C.text, margin: 0
    });
    s.addText(it.src, {
      x: x + 0.15, y: 2.65, w: 2.7, h: 0.25,
      fontSize: 9, fontFace: F.sans, color: C.textLight, margin: 0
    });
  });

  // 五层断裂链(水平五个圆 + 文字)
  s.addText('五层用户困境', {
    x: 0.4, y: 3.35, w: 6, h: 0.3,
    fontSize: 14, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const chain = [
    { name: '认知层', desc: '不知违法' },
    { name: '情绪层', desc: '不知找谁' },
    { name: '证据层', desc: '不会取证' },
    { name: '行动层', desc: '不敢维权' },
    { name: '归属层', desc: '孤立无援' },
  ];
  chain.forEach((c, i) => {
    const x = 0.4 + i * 1.85;
    s.addShape(pres.shapes.OVAL, {
      x, y: 3.85, w: 0.7, h: 0.7,
      fill: { color: C.primary }, line: { type: 'none' }
    });
    s.addText(String(i + 1), {
      x, y: 3.85, w: 0.7, h: 0.7,
      fontSize: 18, fontFace: F.serif, bold: true, color: 'FFFFFF',
      align: 'center', valign: 'middle', margin: 0
    });
    s.addText(c.name, {
      x: x + 0.75, y: 3.85, w: 1.1, h: 0.3,
      fontSize: 12, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
    });
    s.addText(c.desc, {
      x: x + 0.75, y: 4.13, w: 1.1, h: 0.3,
      fontSize: 10, fontFace: F.sans, color: C.textGray, margin: 0
    });
  });

  // 底部金句
  s.addText('我们要做的,是把这条断裂链重新接上。', {
    x: 0.4, y: 4.85, w: 9.2, h: 0.35,
    fontSize: 14, fontFace: F.serif, italic: true, color: C.primaryDark,
    align: 'center', margin: 0
  });
}

// ==================== Slide 3:差异化对比表 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 3);
  addSlideTitle(s, '差异化定位', '为什么不是另一个法律咨询 / 女性社区');

  const header = ['方案', '即时响应', '法条精准', '取证指导', '场景垂直', '低门槛', '情感支持'];
  const rows = [
    ['通用法律咨询(律图等)', '✗', '✓', '✗', '✗', '✗', '✗'],
    ['女性社区(小红书等)',   '✓', '✗', '✗', '部分', '✓', '✓'],
    ['传统法律援助(妇联)',   '✗', '✓', '部分', '✓', '✗', '部分'],
    ['她盾(本作品)',         '✓', '✓', '✓', '✓', '✓', '✓'],
  ];
  const headerRow = header.map((t, i) => ({
    text: t,
    options: {
      bold: true, color: 'FFFFFF', fill: { color: C.primaryDark }, align: 'center',
      fontFace: F.sans, fontSize: 11
    }
  }));
  const tableBody = [
    headerRow,
    ...rows.map((row, ri) => row.map((cell, ci) => {
      const isMine = ri === rows.length - 1;
      const isTagCol = ci === 0;
      return {
        text: cell,
        options: {
          color: isMine ? 'FFFFFF' : C.text,
          fill: { color: isMine ? C.primary : (ri % 2 === 0 ? 'FFFFFF' : 'F8F6FC') },
          bold: isMine || isTagCol,
          align: isTagCol ? 'left' : 'center',
          fontFace: F.sans,
          fontSize: 11
        }
      };
    }))
  ];
  s.addTable(tableBody, {
    x: 0.4, y: 1.6, w: 9.2, colW: [2.7, 1.05, 1.05, 1.15, 1.15, 1.05, 1.05],
    rowH: [0.45, 0.5, 0.5, 0.5, 0.55],
    border: { type: 'solid', pt: 0.5, color: 'EAE3F5' }
  });

  s.addText('我们既能判断,也能陪伴;既给答案,也给支撑。', {
    x: 0.4, y: 4.85, w: 9.2, h: 0.35,
    fontSize: 14, fontFace: F.serif, italic: true, color: C.primaryDark,
    align: 'center', margin: 0
  });
}

// ==================== Slide 4:6 模块总览 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 4);
  addSlideTitle(s, '六大智能体矩阵', '从识别到陪伴,各司其职');

  const mods = [
    { name: '她眼·言行雷达', tag: '判断', desc: '要件式判定 + 风险分级 + 法条/类案锚定' },
    { name: '她权·权益指南', tag: '确权', desc: '场景化权利清单 + 法条号 + 白话解释' },
    { name: '她证·证据保全', tag: '留痕', desc: 'SHA-256 证据指纹 + 6 大典型场景取证' },
    { name: '她行·维权导航', tag: '行动', desc: '6 步阶梯路径 + 时效提醒 + 分支决策' },
    { name: '她心·情绪树洞', tag: '陪伴', desc: 'CBT 轻支持 + 语音引导 + 危机干预' },
    { name: '她声·共鸣回响', tag: '社群', desc: '匿名经历分享 + 标签筛选 + 真实案例' },
  ];
  const startX = 0.4, startY = 1.55;
  const cardW = 2.95, cardH = 1.55, gapX = 0.15, gapY = 0.2;
  mods.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);
    addCard(s, x, y, cardW, cardH, { borderColor: C.primary });
    // 标签徽
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + cardW - 0.85, y: y + 0.15, w: 0.7, h: 0.32,
      fill: { color: C.accent, transparency: 30 }, line: { type: 'none' },
      rectRadius: 0.16
    });
    s.addText(m.tag, {
      x: x + cardW - 0.85, y: y + 0.15, w: 0.7, h: 0.32,
      fontSize: 10, fontFace: F.sans, bold: true, color: C.primaryDark,
      align: 'center', valign: 'middle', margin: 0
    });
    // 名称
    s.addText(m.name, {
      x: x + 0.2, y: y + 0.15, w: cardW - 1.05, h: 0.4,
      fontSize: 16, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
    });
    // 描述
    s.addText(m.desc, {
      x: x + 0.2, y: y + 0.6, w: cardW - 0.3, h: 0.85,
      fontSize: 11, fontFace: F.sans, color: C.textGray, margin: 0
    });
  });
}

// ==================== Slide 5:端到端架构(让得理可见)⭐ ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 5);
  addSlideTitle(s, '端到端技术架构', '从前端到 AI 到法律知识源,得理 API 在哪');

  // 5 个层级横向排列 + 箭头
  const layers = [
    { title: '前端', sub: 'GitHub Pages\nHTML5 + Vanilla JS', color: C.primaryLight },
    { title: 'CloudBase\n代理 + 缓存', sub: '密钥下沉\n同问同答', color: C.primary },
    { title: '腾讯元器\n5 大智能体', sub: '工作流编排\n要件式判定', color: C.primaryDark },
    { title: '得理开放平台', sub: '法规检索\n+ 类案匹配', color: C.accent },
  ];
  const startX = 0.5;
  const boxW = 2.1, boxH = 1.4;
  const gap = 0.15;
  layers.forEach((l, i) => {
    const x = startX + i * (boxW + gap + 0.15);
    const isDeli = i === 3;
    // 卡
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.1, w: boxW, h: boxH,
      fill: { color: isDeli ? C.bgSoft : C.bgWhite },
      line: { color: l.color, width: isDeli ? 2.5 : 1 },
    });
    // 顶部色条
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.1, w: boxW, h: 0.08,
      fill: { color: l.color }, line: { type: 'none' }
    });
    // 标题
    s.addText(l.title, {
      x: x + 0.1, y: 2.3, w: boxW - 0.2, h: 0.6,
      fontSize: 13, fontFace: F.serif, bold: true, color: C.primaryDark,
      align: 'center', valign: 'top', margin: 0
    });
    // 副文
    s.addText(l.sub, {
      x: x + 0.1, y: 2.9, w: boxW - 0.2, h: 0.55,
      fontSize: 10, fontFace: F.sans, color: C.textGray,
      align: 'center', valign: 'top', margin: 0
    });
    // 箭头(除最后一个)
    if (i < layers.length - 1) {
      const ax = x + boxW + 0.02;
      s.addText('→', {
        x: ax, y: 2.55, w: 0.4, h: 0.5,
        fontSize: 20, fontFace: F.sans, color: C.primary,
        align: 'center', valign: 'middle', bold: true, margin: 0
      });
    }
  });

  // 高亮"得理"
  s.addShape(pres.shapes.OVAL, {
    x: 7.4, y: 1.85, w: 0.35, h: 0.35,
    fill: { color: C.accent }, line: { type: 'none' }
  });
  s.addText('⭐', {
    x: 7.4, y: 1.85, w: 0.35, h: 0.35,
    fontSize: 13, align: 'center', valign: 'middle', margin: 0
  });

  // 核心说明
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.0, w: 9.0, h: 1.0,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.75 }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.0, w: 0.05, h: 1.0,
    fill: { color: C.primary }, line: { type: 'none' }
  });
  s.addText([
    { text: '得理 API 承担两个关键角色:', options: { bold: true, color: C.primaryDark, breakLine: true } },
    { text: '① 法规检索 — 在判定前实时检索相关法条作为评估依据', options: { color: C.text, breakLine: true } },
    { text: '② 类案匹配 — 真实判例锚定,法条引用可追溯至案号、法院、年份', options: { color: C.text } },
  ], {
    x: 0.7, y: 4.05, w: 8.7, h: 0.9,
    fontSize: 12, fontFace: F.sans, margin: 0
  });
}

// ==================== Slide 6:言行雷达工作流深度 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 6);
  addSlideTitle(s, '言行雷达 — 工作流深度', '为什么"同问同答":等级由规则裁定');

  // 5 个节点
  const nodes = [
    { n: '①', title: '门控判断', sub: '召回优先\n沾边即放行' },
    { n: '②', title: '案情要素抽取', sub: '结构化 JSON\n类型/要件/严重度' },
    { n: '③', title: '法规 + 类案\n并行检索', sub: '得理 API\n两路并发' },
    { n: '④', title: '要件式判定', sub: 'LLM 输出\n结构化字段' },
    { n: '⑤', title: '代码节点\n确定性映射', sub: '规则引擎\n出风险等级' },
  ];
  const startX = 0.35;
  const nodeW = 1.78, nodeH = 1.6;
  const gap = 0.08;
  nodes.forEach((nd, i) => {
    const x = startX + i * (nodeW + gap);
    const isLast = i === nodes.length - 1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.85, w: nodeW, h: nodeH,
      fill: { color: isLast ? C.bgSoft : C.bgWhite },
      line: { color: isLast ? C.primary : 'EAE3F5', width: isLast ? 2 : 0.75 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.85, w: 0.05, h: nodeH,
      fill: { color: isLast ? C.primary : C.primaryLight }, line: { type: 'none' }
    });
    // 序号
    s.addText(nd.n, {
      x: x + 0.15, y: 1.95, w: 0.5, h: 0.4,
      fontSize: 22, fontFace: F.serif, bold: true, color: C.primary, margin: 0
    });
    // 标题
    s.addText(nd.title, {
      x: x + 0.15, y: 2.35, w: nodeW - 0.3, h: 0.6,
      fontSize: 12, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
    });
    // 副
    s.addText(nd.sub, {
      x: x + 0.15, y: 2.95, w: nodeW - 0.3, h: 0.6,
      fontSize: 10, fontFace: F.sans, color: C.textGray, margin: 0
    });
  });

  // 中间连线 -> 用透明箭头
  for (let i = 0; i < nodes.length - 1; i++) {
    const x = startX + (i + 1) * nodeW + i * gap;
    s.addText('→', {
      x: x - 0.02, y: 2.5, w: 0.12, h: 0.4,
      fontSize: 14, fontFace: F.sans, color: C.primary,
      align: 'center', valign: 'middle', bold: true, margin: 0
    });
  }

  // 底部金句
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 3.85, w: 9.2, h: 1.1,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.75 }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 3.85, w: 0.05, h: 1.1,
    fill: { color: C.primary }, line: { type: 'none' }
  });
  s.addText('关键创新:', {
    x: 0.6, y: 3.95, w: 9.0, h: 0.3,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText('风险等级不是 AI 主观打分,而是由代码节点按法律要件 + 加重情节按规则确定性映射。同一输入永远同一等级。', {
    x: 0.6, y: 4.25, w: 9.0, h: 0.7,
    fontSize: 12, fontFace: F.sans, color: C.text, margin: 0
  });
}

// ==================== Slide 7:风险分级准则 + 反误判 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 7);
  addSlideTitle(s, '可解释的风险分级 + 反误判机制', '规则透明 · 用户最终发言权');

  // 左:4 级表
  const levels = [
    { icon: '🔴', name: '高危', color: C.high, bg: C.highBg, rule: '关键要件 + 实质后果/制度性' },
    { icon: '🟠', name: '中危', color: C.mid,  bg: C.midBg,  rule: '关键要件满足或存在存疑项' },
    { icon: '🟡', name: '低危', color: C.low,  bg: C.lowBg,  rule: '关键要件满足但其余多缺失' },
    { icon: '🟢', name: '无风险', color: C.none, bg: C.noneBg, rule: '关键要件均不满足' },
  ];
  const lx = 0.4, ly = 1.55;
  levels.forEach((lv, i) => {
    const y = ly + i * 0.6;
    s.addShape(pres.shapes.RECTANGLE, {
      x: lx, y, w: 4.8, h: 0.55,
      fill: { color: lv.bg }, line: { type: 'none' }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: lx, y, w: 0.07, h: 0.55,
      fill: { color: lv.color }, line: { type: 'none' }
    });
    s.addText(lv.icon, {
      x: lx + 0.15, y, w: 0.45, h: 0.55,
      fontSize: 14, valign: 'middle', margin: 0
    });
    s.addText(lv.name, {
      x: lx + 0.62, y, w: 0.65, h: 0.55,
      fontSize: 14, fontFace: F.serif, bold: true, color: lv.color,
      valign: 'middle', margin: 0
    });
    s.addText(lv.rule, {
      x: lx + 1.35, y, w: 3.4, h: 0.55,
      fontSize: 11, fontFace: F.sans, color: C.text, valign: 'middle', margin: 0
    });
  });

  // 右:反误判
  const rx = 5.5, ry = 1.55;
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: ry, w: 4.1, h: 2.95,
    fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: ry, w: 0.05, h: 2.95,
    fill: { color: C.accent }, line: { type: 'none' }
  });
  s.addText('🔄 反误判机制', {
    x: rx + 0.15, y: ry + 0.1, w: 3.9, h: 0.4,
    fontSize: 16, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText('被门控判"不涉及"时,用户可一键触发深度分析,跳过门控直接进入要件式评估。', {
    x: rx + 0.15, y: ry + 0.5, w: 3.85, h: 0.7,
    fontSize: 11, fontFace: F.sans, color: C.text, margin: 0
  });
  // mock 按钮
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: rx + 0.3, y: ry + 1.4, w: 3.6, h: 0.6,
    fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.08
  });
  s.addText('🔍 强制深度分析', {
    x: rx + 0.3, y: ry + 1.4, w: 3.6, h: 0.6,
    fontSize: 14, fontFace: F.sans, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', margin: 0
  });
  s.addText('— 即使算法犯错,用户也有发言权', {
    x: rx + 0.3, y: ry + 2.1, w: 3.6, h: 0.4,
    fontSize: 11, fontFace: F.sans, italic: true, color: C.textGray,
    align: 'center', margin: 0
  });

  // 底部铁律
  s.addText('召回优先 · 存疑往上判 · 用户可推翻', {
    x: 0.4, y: 4.85, w: 9.2, h: 0.35,
    fontSize: 13, fontFace: F.serif, italic: true, color: C.primaryDark,
    align: 'center', margin: 0
  });
}

// ==================== Slide 8:100 条测试集方法学 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 8);
  addSlideTitle(s, '100 条测试集 · 方法学', '50 精标 + 50 变体 · 17 条挂真实判例');

  // 左:精标分布
  s.addText('50 条精标分类', {
    x: 0.4, y: 1.55, w: 4.5, h: 0.3,
    fontSize: 13, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const cats = [
    ['骚扰-高危', '8'],
    ['骚扰-中危', '8'],
    ['骚扰-低危', '5'],
    ['歧视-高危', '8'],
    ['歧视-中危', '8'],
    ['歧视-低危', '5'],
    ['无关-无风险', '8'],
  ];
  cats.forEach((c, i) => {
    const y = 1.95 + i * 0.32;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y, w: 4.5, h: 0.28,
      fill: { color: i % 2 === 0 ? C.bgWhite : C.bgSoft }, line: { type: 'none' }
    });
    s.addText(c[0], {
      x: 0.55, y, w: 3.5, h: 0.28,
      fontSize: 11, fontFace: F.sans, color: C.text, valign: 'middle', margin: 0
    });
    s.addText(c[1], {
      x: 3.8, y, w: 0.9, h: 0.28,
      fontSize: 11, fontFace: F.sans, bold: true, color: C.primary,
      align: 'right', valign: 'middle', margin: 0
    });
  });

  // 右:变体策略
  s.addText('50 条变体策略', {
    x: 5.1, y: 1.55, w: 4.5, h: 0.3,
    fontSize: 13, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const variants = [
    ['同义改写 paraphrase', '15', '测语言鲁棒性'],
    ['细节扰动 perturb',     '12', '测是否过拟合表面词'],
    ['干扰句 distract',      '10', '测聚焦能力'],
    ['要件边界 boundary',    '8',  '改 risk_level,测规则贴合度'],
    ['长文本扩展 verbose',   '5',  '测自然篇幅稳定性'],
  ];
  variants.forEach((v, i) => {
    const y = 1.95 + i * 0.45;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.1, y, w: 4.5, h: 0.4,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.5 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.1, y, w: 0.05, h: 0.4,
      fill: { color: C.primaryLight }, line: { type: 'none' }
    });
    s.addText(v[0], {
      x: 5.25, y, w: 2.6, h: 0.4,
      fontSize: 11, fontFace: F.sans, bold: true, color: C.primaryDark,
      valign: 'middle', margin: 0
    });
    s.addText(v[1], {
      x: 7.9, y, w: 0.5, h: 0.4,
      fontSize: 12, fontFace: F.sans, bold: true, color: C.primary,
      align: 'right', valign: 'middle', margin: 0
    });
    s.addText(v[2], {
      x: 8.45, y, w: 1.1, h: 0.4,
      fontSize: 9, fontFace: F.sans, color: C.textGray, valign: 'middle', margin: 0
    });
  });

  // 底部锚点统计
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 4.55, w: 9.2, h: 0.6,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.5 }
  });
  s.addText([
    { text: '锚点分布:  ', options: { bold: true, color: C.primaryDark } },
    { text: '17 条真实判例', options: { color: C.high, bold: true } },
    { text: ' (含案号/法院/年份)  · ', options: { color: C.text } },
    { text: '6 条法条明文', options: { color: C.primary, bold: true } },
    { text: '  · ', options: { color: C.text } },
    { text: '27 条规则派生', options: { color: C.textGray, bold: true } },
    { text: '(低危/无关)', options: { color: C.text } },
  ], {
    x: 0.5, y: 4.6, w: 9.0, h: 0.5,
    fontSize: 12, fontFace: F.sans, align: 'center', valign: 'middle', margin: 0
  });
}

// ==================== Slide 9:准确率 + 混淆矩阵 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 9);
  addSlideTitle(s, '准确率数据', '在 100 条锚定测试集上的实测表现');

  // 左:大数字
  s.addText('整体准确率', {
    x: 0.4, y: 1.7, w: 4.5, h: 0.3,
    fontSize: 14, fontFace: F.sans, color: C.textGray, margin: 0
  });
  s.addText('XX%', {
    x: 0.4, y: 2.0, w: 4.5, h: 1.4,
    fontSize: 96, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
  });
  s.addText('95% 置信区间 ±7%', {
    x: 0.4, y: 3.4, w: 4.5, h: 0.3,
    fontSize: 12, fontFace: F.sans, italic: true, color: C.textGray, margin: 0
  });

  // 各等级召回
  const recalls = [
    ['🔴 高危', 'XX%', C.high],
    ['🟠 中危', 'XX%', C.mid],
    ['🟡 低危', 'XX%', C.low],
    ['🟢 无风险', 'XX%', C.none],
  ];
  recalls.forEach((r, i) => {
    const y = 3.85 + i * 0.27;
    s.addText(r[0], {
      x: 0.4, y, w: 1.8, h: 0.27,
      fontSize: 11, fontFace: F.sans, color: C.text, valign: 'middle', margin: 0
    });
    s.addText(r[1], {
      x: 2.2, y, w: 1.5, h: 0.27,
      fontSize: 12, fontFace: F.sans, bold: true, color: r[2],
      align: 'right', valign: 'middle', margin: 0
    });
  });

  // 右:混淆矩阵
  s.addText('混淆矩阵 (行=期望 / 列=实际)', {
    x: 5.0, y: 1.55, w: 4.6, h: 0.3,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const matrix = [
    ['', '高危', '中危', '低危', '无风险'],
    ['高危', 'XX', '·', '·', '·'],
    ['中危', '·', 'XX', '·', '·'],
    ['低危', '·', '·', 'XX', '·'],
    ['无风险', '·', '·', '·', 'XX'],
  ];
  const cellW = 0.88, cellH = 0.5;
  const mx = 5.0, my = 1.95;
  matrix.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = mx + ci * cellW;
      const y = my + ri * cellH;
      const isHeader = ri === 0 || ci === 0;
      const isDiag = ri > 0 && ri === ci; // 对角线
      let fill = isHeader ? C.bgSoft : C.bgWhite;
      let txtColor = C.text, bold = false;
      if (isDiag) {
        fill = ri === 1 ? C.highBg : ri === 2 ? C.midBg : ri === 3 ? C.lowBg : C.noneBg;
        txtColor = ri === 1 ? C.high : ri === 2 ? C.mid : ri === 3 ? C.low : C.none;
        bold = true;
      }
      s.addShape(pres.shapes.RECTANGLE, {
        x, y, w: cellW, h: cellH,
        fill: { color: fill }, line: { color: 'EAE3F5', width: 0.5 }
      });
      s.addText(cell, {
        x, y, w: cellW, h: cellH,
        fontSize: isHeader ? 10 : 13,
        fontFace: F.sans, bold: isHeader || bold,
        color: isHeader ? C.primaryDark : txtColor,
        align: 'center', valign: 'middle', margin: 0
      });
    });
  });

  s.addText('XX = 数据将在评测完成后填入', {
    x: 5.0, y: my + 5 * cellH + 0.05, w: 4.6, h: 0.25,
    fontSize: 9, fontFace: F.sans, italic: true, color: C.textLight, margin: 0
  });
}

// ==================== Slide 10:真实判例锚定 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 10);
  addSlideTitle(s, '真实判例锚定', '可以拿案号去裁判文书网核对');

  const cases = [
    {
      tag: '🟠 中危',
      title: '严女士 vs 某公司平等就业权纠纷案',
      meta: '上海市浦东新区人民法院 · 2023',
      points: ['入职孕检 + 怀孕后撤回 offer', '法院:就业歧视,缔约过失责任,赔 3 万余元', '锚定测试集 D_real_1'],
      color: C.mid
    },
    {
      tag: '🔴 高危',
      title: '韩坤诉厦门翔鹭化纤股份有限公司',
      meta: '(2009)厦民终字第 2188 号',
      points: ['哺乳期内单位违法解除劳动合同', '法院:判赔 39310 元(经济补偿 2 倍)', '锚定测试集 D_real_2'],
      color: C.high
    },
    {
      tag: '🔴 高危',
      title: '周某强制猥亵案',
      meta: '芜湖镜湖区检察院 · 2023',
      points: ['利用求职职权 + 言语威胁', '检察:强制猥亵罪,有期徒刑 6 个月', '锚定测试集 H_real_1'],
      color: C.high
    },
  ];
  cases.forEach((c, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.9, h: 3.2,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 0.05, h: 3.2,
      fill: { color: c.color }, line: { type: 'none' }
    });
    s.addText(c.tag, {
      x: x + 0.15, y: 1.7, w: 1.5, h: 0.3,
      fontSize: 11, fontFace: F.sans, bold: true, color: c.color, margin: 0
    });
    s.addText(c.title, {
      x: x + 0.15, y: 2.0, w: 2.7, h: 0.7,
      fontSize: 12, fontFace: F.serif, bold: true, color: C.primaryDark, margin: 0
    });
    s.addText(c.meta, {
      x: x + 0.15, y: 2.7, w: 2.7, h: 0.3,
      fontSize: 9, fontFace: F.sans, color: C.textGray, italic: true, margin: 0
    });
    s.addText(c.points.map((p, idx) => ({
      text: p,
      options: { bullet: true, color: C.text, breakLine: idx < c.points.length - 1 }
    })), {
      x: x + 0.15, y: 3.05, w: 2.7, h: 1.7,
      fontSize: 10, fontFace: F.sans, paraSpaceAfter: 6, margin: 0
    });
  });

  s.addText('每条测试用例的 anchor 字段都公开在 eval/test_set.json,欢迎逐条核查。', {
    x: 0.4, y: 4.9, w: 9.2, h: 0.3,
    fontSize: 11, fontFace: F.sans, italic: true, color: C.textGray,
    align: 'center', margin: 0
  });
}

// ==================== Slide 11:现场演示截图 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 11);
  addSlideTitle(s, '现场演示 · 婚育询问案例', '从输入到 5 秒内拿到红橙绿等级报告');

  // 左:输入框 + 右:报告卡(占位)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 1.55, w: 4.0, h: 3.5,
    fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
  });
  s.addText('输入', {
    x: 0.6, y: 1.65, w: 3.7, h: 0.3,
    fontSize: 11, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 2.0, w: 3.6, h: 1.0,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.5 }
  });
  s.addText('"面试时 HR 问我打算什么时候结婚生孩子"', {
    x: 0.7, y: 2.05, w: 3.4, h: 0.9,
    fontSize: 12, fontFace: F.sans, color: C.text, italic: true,
    valign: 'middle', margin: 0
  });
  s.addText('↓ 实测 5 秒内返回', {
    x: 0.6, y: 3.1, w: 3.7, h: 0.3,
    fontSize: 11, fontFace: F.sans, color: C.textGray, italic: true, align: 'center', margin: 0
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 1.0, y: 3.55, w: 2.8, h: 0.7,
    fill: { color: C.midBg }, line: { color: C.mid, width: 1 }, rectRadius: 0.1
  });
  s.addText('🟠 中危', {
    x: 1.0, y: 3.55, w: 2.8, h: 0.7,
    fontSize: 22, fontFace: F.serif, bold: true, color: C.mid,
    align: 'center', valign: 'middle', margin: 0
  });
  s.addText('涉嫌面试环节询问婚育状况的就业歧视', {
    x: 0.6, y: 4.35, w: 3.7, h: 0.4,
    fontSize: 10, fontFace: F.sans, color: C.text, align: 'center', margin: 0
  });

  // 右:亮点标注
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.7, y: 1.55, w: 5.0, h: 3.5,
    fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.7, y: 1.55, w: 0.05, h: 3.5,
    fill: { color: C.primary }, line: { type: 'none' }
  });
  s.addText('报告卡同屏呈现 6 块内容', {
    x: 4.85, y: 1.65, w: 4.8, h: 0.3,
    fontSize: 12, fontFace: F.sans, bold: true, color: C.primaryDark, margin: 0
  });
  const highlights = [
    '🎯 风险标(红/橙/黄/绿)+ 一句话总结',
    '💬 温暖叙事 narrative(共情 + 法律解释)',
    '📋 三档话术(委婉/坚定/正式)+ 一键复制',
    '⚖️ 法条引用(妇权法第43条) + 得理徽标',
    '📁 相似判例卡(法院/案号/裁判要点)',
    '🔍 可折叠"判定依据"(要件状态)',
  ];
  s.addText(highlights.map((h, i) => ({
    text: h,
    options: { color: C.text, breakLine: i < highlights.length - 1, paraSpaceAfter: 6 }
  })), {
    x: 4.85, y: 2.05, w: 4.85, h: 2.95,
    fontSize: 12, fontFace: F.sans, margin: 0
  });

  s.addText('TODO:这一页插入真实演示页面截图(替换左右两个占位卡)', {
    x: 0.4, y: 4.95, w: 9.2, h: 0.25,
    fontSize: 9, fontFace: F.sans, italic: true, color: C.textLight, align: 'center', margin: 0
  });
}

// ==================== Slide 12:评委质疑预案 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 12);
  addSlideTitle(s, '评委预期质疑 · 提前回应', '主动把球接住');

  const qa = [
    {
      q: '"得理 API 空声明"',
      a: '架构图(P5)展示节点位置;工作流(P6)可见两路并行检索;法条卡片右上有"得理"徽标。',
      icon: '🔍'
    },
    {
      q: '"技术深度不足"',
      a: '要件式判定 + 代码节点确定性映射 + 100 条锚定测试集 + 95% 置信区间。',
      icon: '🛡️'
    },
    {
      q: '"测试集准确性凭什么?"',
      a: '17 条直接挂真实判例(含案号),公开在仓库 eval/test_set.json,评委可逐条核查。',
      icon: '📑'
    },
    {
      q: '"AI 误判怎么办?"',
      a: '召回优先门控 + 用户一键强制深度分析,即使算法犯错,用户仍有发言权。',
      icon: '🔄'
    },
  ];
  qa.forEach((it, i) => {
    const y = 1.55 + i * 0.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y, w: 9.2, h: 0.75,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.5 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y, w: 0.05, h: 0.75,
      fill: { color: C.primary }, line: { type: 'none' }
    });
    s.addText(it.icon, {
      x: 0.55, y, w: 0.6, h: 0.75,
      fontSize: 24, valign: 'middle', align: 'center', margin: 0
    });
    s.addText(it.q, {
      x: 1.2, y: y + 0.06, w: 2.8, h: 0.6,
      fontSize: 13, fontFace: F.serif, bold: true, color: C.primaryDark, valign: 'middle', margin: 0
    });
    s.addText('→', {
      x: 4.0, y, w: 0.3, h: 0.75,
      fontSize: 18, fontFace: F.sans, bold: true, color: C.primaryLight,
      align: 'center', valign: 'middle', margin: 0
    });
    s.addText(it.a, {
      x: 4.35, y: y + 0.06, w: 5.15, h: 0.6,
      fontSize: 11, fontFace: F.sans, color: C.text, valign: 'middle', margin: 0
    });
  });

  s.addText('"我们想过了。"', {
    x: 0.4, y: 4.98, w: 9.2, h: 0.3,
    fontSize: 13, fontFace: F.serif, italic: true, color: C.primaryDark,
    align: 'center', margin: 0
  });
}

// ==================== Slide 13:社会价值 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 13);
  addSlideTitle(s, '社会价值 · 降低三道门槛', '让每一个"本该沉默的瞬间",都有回应的能力');

  const thresholds = [
    { icon: '🧠', title: '心理门槛', desc: '情绪承接 + 共鸣社区\n让用户不再孤单', color: C.primary },
    { icon: '📚', title: '信息门槛', desc: '法条白话 + 权利清单\n让用户看清规则', color: C.primaryDark },
    { icon: '🔧', title: '技术门槛', desc: '操作级取证指导\n让用户会取证', color: C.accent },
  ];
  thresholds.forEach((t, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.9, h: 2.2,
      fill: { color: C.bgWhite }, line: { color: 'EAE3F5', width: 0.75 }
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 0.05, h: 2.2,
      fill: { color: t.color }, line: { type: 'none' }
    });
    s.addText(t.icon, {
      x, y: 1.75, w: 2.9, h: 0.6,
      fontSize: 38, align: 'center', margin: 0
    });
    s.addText(t.title, {
      x, y: 2.4, w: 2.9, h: 0.4,
      fontSize: 18, fontFace: F.serif, bold: true, color: C.primaryDark,
      align: 'center', margin: 0
    });
    s.addText(t.desc, {
      x: x + 0.15, y: 2.85, w: 2.6, h: 0.85,
      fontSize: 11, fontFace: F.sans, color: C.text, align: 'center', margin: 0
    });
  });

  // 大金句
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 4.05, w: 9.2, h: 1.05,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.5 }
  });
  s.addText([
    { text: '让更多女性 ', options: { color: C.text } },
    { text: '从', options: { color: C.text } },
    { text: '"算了吧"', options: { color: C.textLight, italic: true } },
    { text: '  →  ', options: { color: C.primary, bold: true } },
    { text: '"我知道该怎么做了"', options: { color: C.primaryDark, bold: true } },
  ], {
    x: 0.4, y: 4.15, w: 9.2, h: 0.5,
    fontSize: 20, fontFace: F.serif, align: 'center', valign: 'middle', margin: 0
  });
  s.addText('— 技术是理性的,但使用技术的人是有温度的。', {
    x: 0.4, y: 4.65, w: 9.2, h: 0.4,
    fontSize: 12, fontFace: F.serif, italic: true, color: C.textGray,
    align: 'center', margin: 0
  });
}

// ==================== Slide 14:致谢 ====================
{
  const s = pres.addSlide();
  addPageBackground(s);
  addHeaderFooter(s, 14);
  addSlideTitle(s, '致谢', '感谢一路给力的人、平台与判例');

  // 工具致谢
  s.addText('🛠 工具与平台', {
    x: 0.4, y: 1.65, w: 4.5, h: 0.35,
    fontSize: 14, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const tools = ['腾讯元器 — 5 大智能体编排', '得理开放平台 — 法规与类案 API', 'CloudBase — 后端代理与社区存储', 'CodeBuddy — 辅助开发'];
  s.addText(tools.map((t, i) => ({
    text: t, options: { bullet: true, color: C.text, breakLine: i < tools.length - 1 }
  })), {
    x: 0.4, y: 2.05, w: 4.5, h: 1.8,
    fontSize: 12, fontFace: F.sans, paraSpaceAfter: 5, margin: 0
  });

  // 判例致谢
  s.addText('⚖️ 判例与机构', {
    x: 5.0, y: 1.65, w: 4.5, h: 0.35,
    fontSize: 14, fontFace: F.sans, bold: true, color: C.primary, margin: 0
  });
  const refs = ['最高人民法院典型案例', '各级人民法院判决书', '检察机关发布典型案件', '全国妇联 / 人社部相关数据'];
  s.addText(refs.map((t, i) => ({
    text: t, options: { bullet: true, color: C.text, breakLine: i < refs.length - 1 }
  })), {
    x: 5.0, y: 2.05, w: 4.5, h: 1.8,
    fontSize: 12, fontFace: F.sans, paraSpaceAfter: 5, margin: 0
  });

  // 团队信息
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 4.0, w: 9.2, h: 1.1,
    fill: { color: C.bgSoft }, line: { color: C.primaryLight, width: 0.5 }
  });
  s.addText('她说了算队', {
    x: 0.4, y: 4.1, w: 9.2, h: 0.4,
    fontSize: 18, fontFace: F.serif, bold: true, color: C.primaryDark,
    align: 'center', margin: 0
  });
  s.addText('TODO:成员姓名 / 分工 / 联系方式 / 项目仓库地址', {
    x: 0.4, y: 4.55, w: 9.2, h: 0.4,
    fontSize: 12, fontFace: F.sans, color: C.textGray, italic: true,
    align: 'center', margin: 0
  });
}

// ==================== Slide 15:Q&A ====================
{
  const s = pres.addSlide();
  s.background = { color: C.primaryDark };
  // 大装饰圆
  s.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: C.primary, transparency: 70 }, line: { type: 'none' }
  });
  s.addShape(pres.shapes.OVAL, {
    x: 7, y: 4, w: 5, h: 5,
    fill: { color: C.accent, transparency: 70 }, line: { type: 'none' }
  });

  s.addText('Q & A', {
    x: 0, y: 1.6, w: 10, h: 2.2,
    fontSize: 120, fontFace: F.serif, bold: true, color: 'FFFFFF',
    align: 'center', valign: 'middle', charSpacing: 24, margin: 0
  });
  s.addText('期待您的提问', {
    x: 0, y: 3.7, w: 10, h: 0.5,
    fontSize: 18, fontFace: F.sans, color: 'FFFFFF',
    align: 'center', charSpacing: 6, margin: 0
  });

  s.addText('她说了算队 · 她盾 · 2026', {
    x: 0, y: 5.0, w: 10, h: 0.3,
    fontSize: 11, fontFace: F.sans, color: C.primaryLight,
    align: 'center', charSpacing: 3, margin: 0
  });
}

// ==================== 写出 ====================
const outPath = path.join(__dirname, '她盾_答辩_v0.1.pptx');
pres.writeFile({ fileName: outPath }).then(file => {
  console.log('Written:', file);
}).catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
