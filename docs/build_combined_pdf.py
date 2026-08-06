"""
build_combined_pdf.py
=====================
将 docs/submission/ 下的 3 份 MD 按顺序合成一份紫色主题 PDF:
  - 项目介绍.md
  - 项目解决方案.md
  - 项目说明书.md

风格参考:
  T2613955-她说了算队-【D06】法律AI应用创新与实践【腾讯开悟】-项目文件包/
    T2613955-她说了算队-【D06】法律AI应用创新与实践【腾讯开悟】-项目介绍.pdf

输出:
  docs/submission/她盾_完整项目文档.pdf

依赖: markdown, pymdown-extensions; 系统 Chrome 用于 HTML → PDF。
"""
from __future__ import annotations
import os
import re
import sys
import base64
import subprocess
from pathlib import Path

import markdown

# ---------------------------------------------------------------------------
# 路径
# ---------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent              # docs/
PROJECT_ROOT = HERE.parent                          # her_shield/
SUBMISSION_DIR = HERE / "submission"
IMAGES_DIR = PROJECT_ROOT.parent / "images"         # D:/tad-sheild/images
LOGO_PATH = PROJECT_ROOT / "logo.png"

OUTPUT_HTML = SUBMISSION_DIR / "她盾_完整项目文档.html"
OUTPUT_PDF = SUBMISSION_DIR / "她盾_完整项目文档.pdf"

# 若主输出被 PDF 阅读器锁住,会自动写到这个备选名,然后再尝试覆盖主名
def _resolve_pdf_path(p):
    try:
        # 检测是否能写
        with open(p, "ab"):
            pass
        return p
    except OSError:
        return p.with_name(p.stem + "_new.pdf")

SECTIONS = [
    # (TOC 序号, 章节扉页大数字, 名称, 文件名)
    ("一", "01", "项目介绍",     "项目介绍.md"),
    ("二", "02", "项目解决方案", "项目解决方案.md"),
    ("三", "03", "项目说明书",   "项目说明书.md"),
]

# ---------------------------------------------------------------------------
# 紫色主题 CSS  (参考 T2613955 项目介绍.pdf — 紫主色 + 暖橙强调 + 圆角卡片)
# ---------------------------------------------------------------------------
CSS = r"""
:root {
  --purple-900: #3a2a6e;
  --purple-700: #4a3380;
  --purple-600: #5a3fa0;
  --purple-500: #6b4fb8;
  --purple-400: #8a6fd1;
  --purple-300: #b59dde;
  --purple-200: #d7c8ee;
  --purple-100: #ece4f7;
  --purple-50:  #f6f1fc;
  --accent-pink: #ff8aa4;
  --accent-warm: #ff9d6c;
  --ink-900: #1f1535;
  --ink-700: #3a2f55;
  --ink-500: #5a4f78;
  --ink-300: #8a82a8;
  --bg-soft: #faf8fd;
}

@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB",
               "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: var(--ink-900);
  font-size: 11pt;
  line-height: 1.7;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  /* 关键: 强制矢量级字体抗锯齿,避免 PDF 里字模糊 */
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== 命名页 — 隐藏封面/目录/章节扉页的页眉页脚 ===== */
.cover         { page: cover; }
.toc-page      { page: clean; }
.chapter-cover { page: clean; }
@page cover {
  margin: 0;
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center { content: none; }
}
@page clean {
  @top-left { content: none; }
  @top-right { content: none; }
  @bottom-center { content: none; }
}

/* ===== 封面 ===== */
.cover {
  position: relative;
  page-break-after: always;
  width: 100%;
  height: 297mm;                    /* 整页满铺(因为 @page cover margin:0) */
  border-radius: 0;
  overflow: hidden;
  /* 关键: 用纯线性渐变,放弃 radial 叠加;
     radial-gradient 会触发 Chrome rasterize 整页,
     叠加在白色 CJK 文字下就出现"ghost text" 抗锯齿副本. */
  background: linear-gradient(135deg, var(--purple-700) 0%, var(--purple-500) 100%);
  color: #fff;
  padding: 36mm 24mm 24mm 24mm;
  display: flex;
  flex-direction: column;
}

.cover .badge-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18mm;
}
.cover .badge {
  border: 1px solid rgba(255,255,255,0.55);
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 9.5pt;
  letter-spacing: 0.5px;
}

.cover h1 {
  font-size: 64pt;
  /* 关键: 中文字体在 Chrome Windows 上,h1 默认的 bold + font-weight:700
     都会触发 synthetic-bold —— 同一字符画两遍 (y 错位 3px) 叠加成"模糊".
     强制 normal 让其只画一次,64pt 已经足够分量. */
  font-weight: normal;
  margin: 0;
  letter-spacing: 4px;
}

.cover .subtitle {
  font-size: 18pt;
  margin: 8mm 0 2mm 0;
  font-weight: 600;
  letter-spacing: 2px;
}
.cover .slogan {
  font-size: 13pt;
  font-weight: 400;
  opacity: 0.95;
  line-height: 1.6;
  margin-bottom: 18mm;
  border-left: 3px solid var(--accent-pink);
  padding-left: 14px;
}
.cover .slogan strong { color: #fff; font-weight: 700; }

.cover .pillars {
  display: flex;
  gap: 14px;
  margin-bottom: 18mm;
  flex-wrap: wrap;
}
.cover .pillar {
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.35);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 10.5pt;
  /* 不用 backdrop-filter — 会强制光栅化整个封面,导致字模糊 */
}

.cover .info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6mm 10mm;
  margin-top: auto;
  margin-bottom: 12mm;
}
.cover .info-grid .info-cell .k {
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.75;
  margin-bottom: 3px;
}
.cover .info-grid .info-cell .v {
  font-size: 11.5pt;
  font-weight: 600;
}

.cover .footer-strap {
  border-top: 1px solid rgba(255,255,255,0.30);
  padding-top: 6mm;
  display: flex;
  justify-content: space-between;
  font-size: 9.5pt;
  opacity: 0.92;
}

/* ===== 目录页 ===== */
.toc-page {
  page-break-after: always;
  padding: 8mm 4mm;
}
.toc-page .toc-head {
  border-left: 6px solid var(--purple-500);
  padding-left: 14px;
  margin-bottom: 12mm;
}
.toc-page .toc-head h2 {
  font-size: 26pt;
  margin: 0;
  color: var(--purple-700);
  letter-spacing: 4px;
}
.toc-page .toc-head .sub {
  color: var(--ink-500);
  font-size: 10pt;
  margin-top: 4px;
  letter-spacing: 1px;
}

.toc-list { list-style: none; margin: 0; padding: 0; }
.toc-list > li {
  display: grid;
  grid-template-columns: 22mm 1fr;
  gap: 8mm;
  margin-bottom: 8mm;
  align-items: center;
  border-bottom: 1px dashed var(--purple-200);
  padding-bottom: 6mm;
}
.toc-list .roman {
  width: 18mm;
  height: 18mm;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--purple-500), var(--purple-400));
  color: #fff;
  border-radius: 14px;
  font-size: 22pt;
  font-weight: 700;                  /* 与封面一致,避免 synthetic-bold */
  box-shadow: 0 4px 14px rgba(106,79,184,0.30);
}
.toc-list .meta .name { font-size: 16pt; font-weight: 700; color: var(--purple-700); }
.toc-list .meta .desc { font-size: 10pt; color: var(--ink-500); margin-top: 4px; }

/* ===== 章节扉页 ===== */
.chapter-cover {
  page-break-before: always;
  page-break-after: always;
  height: 250mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12mm;
  background:
    linear-gradient(135deg, var(--purple-50), #fff 70%);
  border-left: 12px solid var(--purple-500);
  border-radius: 8px;
}
.chapter-cover .label {
  color: var(--purple-400);
  letter-spacing: 8px;
  font-size: 12pt;
  margin-bottom: 6mm;
  font-weight: 600;
}
.chapter-cover .num {
  font-size: 110pt;
  font-weight: 700;                 /* 避免 synthetic-bold 双层叠加导致字糊 */
  color: var(--purple-500);
  line-height: 1;
  letter-spacing: -4px;
  margin-bottom: 4mm;
}
.chapter-cover .title {
  font-size: 36pt;
  font-weight: 700;
  color: var(--purple-700);
  margin-bottom: 8mm;
}
.chapter-cover .strip {
  height: 6px;
  width: 80mm;
  background: linear-gradient(90deg, var(--purple-500), var(--accent-pink));
  border-radius: 4px;
}
.chapter-cover .meta {
  margin-top: 14mm;
  color: var(--ink-500);
  font-size: 11pt;
  max-width: 120mm;
  line-height: 1.7;
}

/* ===== 正文 ===== */
.content { padding-top: 4mm; }

.content h1 {
  font-size: 22pt;
  color: var(--purple-700);
  border-bottom: 3px solid var(--purple-500);
  padding-bottom: 6px;
  margin: 14mm 0 6mm 0;
  page-break-after: avoid;
}
.content h2 {
  font-size: 16pt;
  color: var(--purple-700);
  margin: 10mm 0 4mm 0;
  page-break-after: avoid;
  position: relative;
  padding-left: 14px;
}
.content h2::before {
  content: "";
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 5px;
  background: linear-gradient(180deg, var(--purple-500), var(--accent-pink));
  border-radius: 3px;
}
.content h3 {
  font-size: 13pt;
  color: var(--purple-600);
  margin: 8mm 0 3mm 0;
  page-break-after: avoid;
}
.content h3::before {
  content: "◆";
  color: var(--purple-400);
  margin-right: 6px;
  font-size: 0.7em;
}
.content h4 {
  font-size: 11.5pt;
  color: var(--purple-600);
  margin: 6mm 0 2mm 0;
  page-break-after: avoid;
}
.content h4::before {
  content: "▸ ";
  color: var(--purple-400);
}

.content p { margin: 4px 0 8px 0; text-align: justify; }
.content strong { color: var(--purple-700); }
.content em { color: var(--ink-700); font-style: italic; }

.content ul, .content ol { margin: 4px 0 10px 0; padding-left: 22px; }
.content li { margin: 3px 0; }
.content li::marker { color: var(--purple-500); }

.content blockquote {
  border-left: 4px solid var(--purple-400);
  background: var(--purple-50);
  padding: 10px 16px;
  margin: 8px 0;
  color: var(--ink-700);
  border-radius: 0 8px 8px 0;
}

.content code {
  background: var(--purple-100);
  color: var(--purple-700);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9.5pt;
  font-family: "Consolas", "Monaco", monospace;
}
.content pre {
  background: #2b1f4a;
  color: #e8dff5;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 9pt;
  line-height: 1.5;
  page-break-inside: avoid;
}
.content pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  font-size: inherit;
}

/* 表格 */
.content table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 14px 0;
  font-size: 10pt;
  page-break-inside: avoid;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(74,51,128,0.08);
}
.content thead {
  background: linear-gradient(135deg, var(--purple-600), var(--purple-500));
  color: #fff;
}
.content th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 10pt;
  letter-spacing: 0.3px;
}
.content td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--purple-100);
  vertical-align: top;
}
.content tbody tr:nth-child(even) { background: var(--purple-50); }
.content tbody tr:last-child td { border-bottom: none; }
.content tbody tr:hover { background: var(--purple-100); }

.content table strong { color: var(--purple-700); }

/* 图片 */
.content img {
  display: block;
  max-width: 95%;
  margin: 10px auto;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(74,51,128,0.15);
  page-break-inside: avoid;
}

/* Mermaid */
.mermaid {
  background: var(--bg-soft);
  border: 1px solid var(--purple-200);
  border-radius: 10px;
  padding: 14px;
  margin: 10px 0;
  text-align: center;
  page-break-inside: avoid;
}

/* 水平线 */
.content hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--purple-300), transparent);
  margin: 10mm 0;
}

/* 页眉模拟 — 用 fixed 区块,在每页底部位置预留 */
.page-header-band {
  position: running(header);
}
@page {
  @top-left {
    content: "「她盾」职场女性权益守护智能体  ·  参赛项目书";
    font-size: 8.5pt;
    color: #8a82a8;
  }
  @top-right {
    content: "2026 腾讯开悟全球 AI 公开赛 · D06";
    font-size: 8.5pt;
    color: #8a82a8;
  }
  @bottom-center {
    content: counter(page);
    font-size: 9pt;
    color: #6b4fb8;
    font-weight: 600;
  }
}

/* highlight 风格 — 关键数字 */
.hl { color: var(--accent-pink); font-weight: 700; }

/* 防止小块拆页 */
.content table, .content pre, .mermaid { page-break-inside: avoid; }

/* 列表里的 emoji 不变色 */
.content li::marker { color: var(--purple-500); }
"""

# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------

def b64_data_url(p: Path) -> str:
    suffix = p.suffix.lower().strip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "svg": "image/svg+xml"}.get(suffix, "image/png")
    data = base64.b64encode(p.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}"


def fix_image_src(html: str, md_path: Path) -> str:
    """把 markdown 里的相对图片路径转成 data: URL,避免 PDF 渲染时找不到。"""
    def repl(m: re.Match) -> str:
        src = m.group(1)
        if src.startswith(("http://", "https://", "data:")):
            return m.group(0)
        # 相对路径从 md 所在目录解析
        target = (md_path.parent / src).resolve()
        if not target.exists():
            print(f"  [warn] image not found: {target}")
            return m.group(0)
        return f'src="{b64_data_url(target)}"'
    return re.sub(r'src="([^"]+)"', repl, html)


def extract_mermaid_to_pre(md_text: str) -> str:
    """把 ```mermaid 代码块替换成 <pre class="mermaid">…</pre>,让 mermaid.js 渲染。"""
    pat = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)

    def repl(m: re.Match) -> str:
        code = m.group(1)
        # 转义 HTML 特殊字符不必要 — mermaid 接 raw text
        return f'<div class="mermaid">{code}</div>'

    return pat.sub(repl, md_text)


def md_to_html(md_text: str, md_path: Path) -> str:
    # 先抽 mermaid（避免被 fenced_code 处理成 <pre><code>）
    md_text = extract_mermaid_to_pre(md_text)

    md = markdown.Markdown(
        extensions=[
            "extra",          # tables / footnotes / abbr / attr_list
            "sane_lists",
            "admonition",
            "toc",
            "md_in_html",
        ],
        extension_configs={
            "toc": {"toc_depth": "2-4"},
        },
    )
    html = md.convert(md_text)
    html = fix_image_src(html, md_path)
    return html


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------

def build_cover() -> str:
    logo_url = b64_data_url(LOGO_PATH) if LOGO_PATH.exists() else ""
    return f"""
<section class="cover">
  <div class="badge-row">
    <span class="badge">D06 法律 AI 应用创新与实践</span>
    <span class="badge">第十七届 · 服务外包创新创业大赛</span>
  </div>
  <h1>「她盾」</h1>
  <div class="subtitle">职场女性权益守护智能体</div>
  <div class="slogan">
    <strong>你的身后,站着一个懂法更懂你的"她"</strong><br>
    AI 驱动的职场女性权益守护伴侣 — 精准识别 · 证据保全 · 路径指引 · 情感支持
  </div>
  <div class="pillars">
    <div class="pillar">🔍 她眼 · 言行雷达</div>
    <div class="pillar">⚖️ 她权 · 权益指南</div>
    <div class="pillar">🧾 她证 · 证据保全</div>
    <div class="pillar">🧭 她行 · 维权导航</div>
    <div class="pillar">💬 她心 · 情绪树洞</div>
    <div class="pillar">🌸 她声 · 共鸣回响</div>
  </div>

  <div class="info-grid">
    <div class="info-cell"><div class="k">参赛赛道</div><div class="v">2026 腾讯开悟全球 AI 公开赛 · D06 法律 AI 应用创新与实践</div></div>
    <div class="info-cell"><div class="k">大赛全称</div><div class="v">第十七届中国大学生服务外包创新创业大赛 AI 专项赛</div></div>
    <div class="info-cell"><div class="k">团队名称</div><div class="v">她说了算队</div></div>
    <div class="info-cell"><div class="k">作品链接</div><div class="v">huangjwwen.github.io/her_shield</div></div>
  </div>

  <div class="footer-strap">
    <span>在你犹豫时,给你破局的底气</span>
    <span>在你受伤时,给你拥抱的温度</span>
  </div>
</section>
"""


def build_toc() -> str:
    items_html = ""
    desc_map = {
        "项目介绍":   "项目定位 · 需求分析 · 6 大模块功能详解 · 3 大典型使用场景 · 工程亮点",
        "项目解决方案": "五层全栈架构 · 后端代理与缓存策略 · 双层评测体系 · 智能体 Prompt 设计",
        "项目说明书":  "整体使用流程 · 模块操作指引 · 部署与运行 · 工程细节与未来展望",
    }
    for roman, _big, name, _fname in SECTIONS:
        items_html += f"""
      <li>
        <div class="roman">{roman}</div>
        <div class="meta">
          <div class="name">{name}</div>
          <div class="desc">{desc_map.get(name, '')}</div>
        </div>
      </li>"""
    return f"""
<section class="toc-page">
  <div class="toc-head">
    <h2>目  录</h2>
    <div class="sub">CONTENTS</div>
  </div>
  <ol class="toc-list">{items_html}
  </ol>
</section>
"""


def build_chapter_cover(roman: str, big_num: str, name: str, desc: str = "") -> str:
    return f"""
<section class="chapter-cover">
  <div class="label">CHAPTER {big_num} · 第 {roman} 章</div>
  <div class="num">{big_num}</div>
  <div class="title">{name}</div>
  <div class="strip"></div>
  <div class="meta">{desc}</div>
</section>
"""


def main() -> int:
    # 1. 读取并合并 3 份 MD
    chapters_html = ""
    chapter_descs = {
        "项目介绍": "本章介绍「她盾」的项目定位、市场痛点(隐形化 · 举证难 · 维权贵)、五层用户困境，并按「判断 → 证据 → 行动 → 支持」四层任务模型,详解 6 大智能体模块功能。",
        "项目解决方案": "本章呈现「她盾」的五层全栈架构,详解后端代理层的密钥下沉与 3 层缓存策略,以及业界少有的事实-映射分离的双层评测体系,并附 5 个智能体的 Prompt 设计。",
        "项目说明书": "本章面向使用者与运维者,描述项目的整体使用流程、6 大模块的具体操作指引、部署运行细节,以及工程亮点与未来展望。",
    }

    for roman, big_num, name, fname in SECTIONS:
        md_path = SUBMISSION_DIR / fname
        if not md_path.exists():
            print(f"  [skip] missing: {md_path}")
            continue
        print(f"  [{roman} | {big_num}] {fname} ...")
        text = md_path.read_text(encoding="utf-8")
        # 章节扉页已经显示了标题,去掉 MD 第一行的 H1 + 紧跟着的 > 引用块 + 第一条 --- 分隔线,避免重复
        text = re.sub(r"^# [^\n]+\n+", "", text)                 # 首行 H1
        text = re.sub(r"^(?:> [^\n]*\n)+\n*", "", text)            # 紧跟的 blockquote 段
        text = re.sub(r"^---+\n+", "", text)                       # 紧跟的水平线
        html_body = md_to_html(text, md_path)
        chapters_html += build_chapter_cover(roman, big_num, name, chapter_descs.get(name, ""))
        chapters_html += f'<div class="content">{html_body}</div>'

    # 2. 组装完整 HTML
    full_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>「她盾」职场女性权益守护智能体 — 参赛项目书</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function() {{
    mermaid.initialize({{
      startOnLoad: true,
      theme: "base",
      themeVariables: {{
        primaryColor: "#ece4f7",
        primaryTextColor: "#3a2a6e",
        primaryBorderColor: "#6b4fb8",
        lineColor: "#8a6fd1",
        secondaryColor: "#fff",
        tertiaryColor: "#faf8fd",
        fontFamily: "Microsoft YaHei, PingFang SC, sans-serif"
      }}
    }});
  }});
</script>
</head>
<body>
{build_cover()}
{build_toc()}
{chapters_html}
</body>
</html>
"""

    OUTPUT_HTML.write_text(full_html, encoding="utf-8")
    print(f"\n[ok] HTML written: {OUTPUT_HTML}  ({len(full_html)/1024:.1f} KB)")

    # 3. Chrome headless → PDF
    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    chrome = next((c for c in chrome_candidates if Path(c).exists()), None)
    if chrome is None:
        print("\n[!] Chrome / Edge 未找到,跳过 PDF 自动生成。")
        print("    请手动打开 HTML,在浏览器里 Ctrl+P → 保存为 PDF。")
        return 1

    print(f"\n[chrome] using: {chrome}")
    file_url = OUTPUT_HTML.as_uri()
    pdf_target = _resolve_pdf_path(OUTPUT_PDF)
    if pdf_target != OUTPUT_PDF:
        print(f"  [!] 主 PDF 被占用,改写到: {pdf_target.name}")
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        "--virtual-time-budget=15000",
        f"--print-to-pdf={pdf_target}",
        file_url,
    ]
    print("  $", " ".join(f'"{a}"' if " " in a else a for a in cmd))
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if res.returncode != 0:
        print("[chrome stderr]", res.stderr[-500:])
        return res.returncode
    if pdf_target.exists():
        size_kb = pdf_target.stat().st_size / 1024
        print(f"\n[done] PDF written: {pdf_target}  ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
