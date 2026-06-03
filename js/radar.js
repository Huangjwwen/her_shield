// ==================== 言行雷达模块 ====================
// 输入用户描述 -> 元器工作流（门控/要件式判定/得理检索/风险分级）-> 返回结构化 JSON
// 本文件负责：发起识别、解析 JSON、渲染红橙绿风险报告

// 风险等级 -> 样式类 + 图标
const RADAR_RISK_META = {
    "高危":   { cls: "risk-high", icon: "🔴" },
    "中危":   { cls: "risk-mid",  icon: "🟠" },
    "低危":   { cls: "risk-low",  icon: "🟡" },
    "无风险": { cls: "risk-none", icon: "🟢" }
};

// 要件状态 -> 徽标类
const RADAR_STATUS_CLS = {
    "满足": "st-yes", "存疑": "st-doubt", "不满足": "st-no", "不适用": "st-na"
};

// 强制分析关键词（自然语言触发的兜底，主交互是按钮）
const FORCE_KEYWORDS = ["继续分析", "强制分析", "我就要投诉", "重新分析", "深入分析"];

function shouldForceAnalysis(text) {
    return typeof text === 'string' && FORCE_KEYWORDS.some(kw => text.indexOf(kw) > -1);
}

// 安全转义
function radarEscape(text) {
    const div = document.createElement('div');
    div.textContent = (text == null ? '' : String(text));
    return div.innerHTML;
}

// 尝试把响应解析成报告 JSON
// 容错：去除 ```json 围栏、首尾空白、以及元器返回内容前后常见的隐形字符
// （BOM ﻿ / 零宽空格 ​-‍ / 不间断空格   / 字间隔 ⁠）
function tryParseRadar(str) {
    if (str == null) return null;
    if (typeof str === 'object') return str;
    let s = String(str);
    // 1. 去掉首尾隐形字符 + 空白
    s = s.replace(/^[﻿​-‍⁠ \s]+/, '')
         .replace(/[﻿​-‍⁠ \s]+$/, '');
    // 2. 若被 ```json ... ``` 围栏包裹，剥掉
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
        s = fence[1]
            .replace(/^[﻿​-‍⁠ \s]+/, '')
            .replace(/[﻿​-‍⁠ \s]+$/, '');
    }
    // 3. 截取从第一个 { 或 [ 到最后一个 } 或 ] 之间的内容（兜底防止前后还有杂字）
    const start = s.search(/[{[]/);
    const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (start !== -1 && end > start) {
        s = s.slice(start, end + 1);
    }
    try {
        return JSON.parse(s);
    } catch (e) {
        return null;
    }
}

// 渲染单条风险报告 -> HTML 字符串
function renderRadarReport(data) {
    // ★ 工作流 JSON 解析失败兜底:risk_level === null 或带 parse_error 字段
    // 不再静默渲染成"无风险",避免把异常伪装成安全
    if (!data || data.risk_level === null || data.risk_level === '解析失败' || data.parse_error) {
        const errMsg = (data && (data.parse_error || data.risk_summary)) || '系统未能生成完整分析';
        return `<div class="radar-report risk-error">
            <div class="radar-badge">
                <span class="radar-badge-icon">⚠️</span>
                <span class="radar-badge-level">分析异常</span>
                <span class="radar-badge-summary">${radarEscape(errMsg)}</span>
            </div>
            <div class="radar-narrative">本次分析未能正常完成。可能原因:模型输出格式偶发异常 / 网络波动。<br>请点击下方"强制深度分析"重试一次,系统会跳过门控直接进入完整判定。</div>
            <div class="radar-force-zone">
                <p class="radar-force-tip">这不代表你描述的情景"没问题"——只是 AI 这次没分析成功。</p>
                <button class="radar-force-btn" type="button" onclick="forceRadarAnalysis(this)">🔍 强制深度分析(重试)</button>
            </div>
            <div class="radar-disclaimer">本指导不构成正式法律意见,重大维权请咨询律师或拨打 12338 / 12348。</div>
        </div>`;
    }

    const meta = RADAR_RISK_META[data.risk_level] || RADAR_RISK_META["无风险"];
    const lowConf = data.confidence === "低";

    let html = `<div class="radar-report ${meta.cls}">`;

    // 风险标
    html += `<div class="radar-badge">
        <span class="radar-badge-icon">${meta.icon}</span>
        <span class="radar-badge-level">${radarEscape(data.risk_level || '—')}</span>
        <span class="radar-badge-summary">${radarEscape(data.risk_summary || '')}</span>
        ${lowConf ? '<span class="radar-badge-warn">⚠ 信息不足，建议补充</span>' : ''}
    </div>`;

    // 暖心正文
    if (data.narrative) {
        html += `<div class="radar-narrative">${radarEscape(data.narrative).replace(/\n/g, '<br>')}</div>`;
    }

    // 三句话术
    const sc = data.response_scripts || {};
    if (sc.gentle || sc.firm || sc.formal) {
        const item = (tag, cls, text) => text ? `
            <div class="script-card ${cls}">
                <div class="script-head">
                    <span class="script-tag">${tag}</span>
                    <button class="script-copy" onclick="copyRadarScript(this)">复制</button>
                </div>
                <p class="script-text">${radarEscape(text)}</p>
            </div>` : '';
        html += `<div class="radar-block">
            <h4 class="radar-h4">你可以这样回应</h4>
            ${item('委婉', 'sc-gentle', sc.gentle)}
            ${item('坚定', 'sc-firm', sc.firm)}
            ${item('正式', 'sc-formal', sc.formal)}
        </div>`;
    }

    // 法律依据(不展示 source 来源标签:"得理"/"模型知识" 混杂显示不专业)
    const laws = data.law_references || [];
    if (laws.length) {
        html += `<div class="radar-block"><h4 class="radar-h4">法律依据</h4>` +
            laws.map(l => `
                <div class="law-card">
                    <div class="law-head">
                        <span class="law-name">${radarEscape(l.name)}${l.article ? ' ' + radarEscape(l.article) : ''}</span>
                    </div>
                    <div class="law-content">${radarEscape(l.content)}</div>
                </div>`).join('') +
            `</div>`;
    }

    // 相似案例（v1.2 schema：title 必填 + 可选 court/case_number/date + 必填 facts/judgment/key_point）
    const cases = data.case_references || [];
    if (cases.length) {
        const renderCase = (c) => {
            const meta = [c.court, c.case_number, c.date].filter(Boolean).map(radarEscape).join(' · ');
            const row = (label, val, cls) => val
                ? `<div class="case-row ${cls}"><span class="case-label">${label}</span><span class="case-val">${radarEscape(val)}</span></div>`
                : '';
            return `
                <div class="case-card">
                    <div class="case-head">
                        <span class="case-title">${radarEscape(c.title || '—')}</span>
                    </div>
                    ${meta ? `<div class="case-meta">${meta}</div>` : ''}
                    ${row('案情', c.facts, 'cs-facts')}
                    ${row('判决', c.judgment, 'cs-judgment')}
                    ${row('裁判要点', c.key_point, 'cs-point')}
                </div>`;
        };
        html += `<div class="radar-block"><h4 class="radar-h4">相似案例</h4>` +
            cases.map(renderCase).join('') +
            `</div>`;
    }

    // 可折叠：判定依据
    const elems = data.elements_check || [];
    if (elems.length) {
        const rows = elems.map(e => `
            <li>
                <span class="basis-name">${radarEscape(e.name)}</span>
                <span class="basis-status ${RADAR_STATUS_CLS[e.status] || ''}">${radarEscape(e.status)}</span>
                ${e.note ? `<span class="basis-note">${radarEscape(e.note)}</span>` : ''}
            </li>`).join('');
        const agg = data.aggravating_factors || [];
        const ds = data.discrimination_severity || {};
        let extra = '';
        if (agg.length) {
            extra += `<div class="basis-extra">加重情节：${agg.map(radarEscape).join('、')}</div>`;
        }
        if (ds.institutional || ds.concrete_harm) {
            extra += `<div class="basis-extra">制度性：${radarEscape(ds.institutional || '—')}　实质后果：${radarEscape(ds.concrete_harm || '—')}</div>`;
        }
        html += `<details class="radar-basis">
            <summary>查看判定依据</summary>
            <ul class="basis-list">${rows}</ul>
            ${extra}
        </details>`;
    }

    // 强制深度分析按钮（工作流"友好提示"分支会带 suggest_force: true）
    if (data.suggest_force === true) {
        html += `<div class="radar-force-zone">
            <p class="radar-force-tip">感觉被误解？如果你认为这件事属于性别歧视或骚扰，可以让 AI 跳过初步判断、深入分析一次。</p>
            <button class="radar-force-btn" type="button" onclick="forceRadarAnalysis(this)">🔍 强制深度分析</button>
        </div>`;
    }

    // 免责声明
    if (data.disclaimer) {
        html += `<div class="radar-disclaimer">${radarEscape(data.disclaimer)}</div>`;
    }

    html += `</div>`;
    return html;
}

// 复制某条话术
function copyRadarScript(btn) {
    const card = btn.closest('.script-card');
    const p = card && card.querySelector('.script-text');
    if (p) {
        navigator.clipboard.writeText(p.innerText).then(() => showToast('话术已复制'));
    }
}

// 强制深度分析：从历史记录拿到当时的原始 query，带 force=true 重发
async function forceRadarAnalysis(btn) {
    const item = btn.closest('.history-item');
    if (!item) return;
    const id = item.dataset.id;
    const records = (typeof historyStorage !== 'undefined' && historyStorage.radar) || [];
    const record = records.find(r => String(r.id) === String(id));
    if (!record || !record.userMessage) {
        showToast('找不到原始问题');
        return;
    }

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '深度分析中…';
    toggleLoading(true);

    const content = record.userMessage;
    try {
        const response = await callYuanqiAPI('radar', content, false, {
            query: content,
            force: true,
            has_image: false,
            image_urls: []
        });
        const resultStr = (response && tryParseRadar(response))
            ? response
            : JSON.stringify(getRadarMock(content));
        // 新增一条记录，保留原"不涉及"的旧记录，方便用户对比
        saveHistory('radar', content, resultStr);
        showToast('深度分析完成');
    } catch (error) {
        console.error('强制分析失败，使用本地示例:', error);
        saveHistory('radar', content, JSON.stringify(getRadarMock(content)));
        showToast('深度分析完成（本地示例）');
    } finally {
        toggleLoading(false);
        // saveHistory 触发的重渲染会把按钮所在 DOM 重建，这里只是兜底
        try { btn.disabled = false; btn.textContent = oldText; } catch (e) {}
    }
}

// 重试:从历史拿到原始 query,带 nocache=true 重发(不开 force,保留原工作流路径)
async function retryRadarAnalysis(btn) {
    const item = btn.closest('.history-item');
    if (!item) return;
    const id = item.dataset.id;
    const records = (typeof historyStorage !== 'undefined' && historyStorage.radar) || [];
    const record = records.find(r => String(r.id) === String(id));
    if (!record || !record.userMessage) {
        showToast('找不到原始问题');
        return;
    }
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '重试中…';
    toggleLoading(true);
    const content = record.userMessage;
    try {
        const response = await callYuanqiAPI('radar', content, false, {
            query: content,
            force: false,
            has_image: false,
            image_urls: [],
            nocache: true   // ★ 跳过代理缓存,真打元器
        });
        const resultStr = (response && tryParseRadar(response))
            ? response
            : JSON.stringify(getRadarMock(content));
        saveHistory('radar', content, resultStr);
        showToast('重试完成');
    } catch (error) {
        console.error('重试失败，使用本地示例:', error);
        saveHistory('radar', content, JSON.stringify(getRadarMock(content)));
        showToast('重试完成（本地示例）');
    } finally {
        toggleLoading(false);
        try { btn.disabled = false; btn.textContent = oldText; } catch (e) {}
    }
}

// 自定义历史渲染器：每条记录渲染成风险报告，旧的/非 JSON 记录退回纯文本
function renderRadarHistory(container, records) {
    if (!records || records.length === 0) {
        container.innerHTML = '<p class="history-empty">暂无对话记录，开始识别吧～</p>';
        return;
    }
    container.innerHTML = records.map(r => {
        const data = tryParseRadar(r.botMessage);
        const body = (data && (data.risk_level || data.narrative))
            ? renderRadarReport(data)
            : `<div class="history-bot">${radarEscape(r.botMessage)}</div>`;
        return `<div class="history-item" data-id="${r.id}">
            <div class="history-time">${radarEscape(r.time)}</div>
            <div class="history-user">${radarEscape(r.userMessage)}</div>
            ${body}
            <div class="history-item-actions">
                <button class="btn-small btn-retry" onclick="retryRadarAnalysis(this)" title="不用缓存,重新分析">🔄 重试</button>
                <button class="btn-small" onclick="deleteHistoryItem('radar', '${r.id}')">删除</button>
            </div>
        </div>`;
    }).join('');
}

// 初始化言行雷达
function initRadar() {
    // 注册富文本渲染器（ui-common.js 已加载，customHistoryRenderers 可用）
    if (typeof customHistoryRenderers !== 'undefined') {
        customHistoryRenderers.radar = renderRadarHistory;
    }

    const radarInput = document.getElementById('radarInput');
    const clearInput = document.getElementById('clearRadarInput');
    const radarBtn = document.getElementById('radarBtn');
    const clearHistoryBtn = document.getElementById('clearRadarHistory');

    // 加载历史记录（走自定义渲染器）
    loadHistory('radar');

    // 执行识别
    async function runRadar() {
        const content = radarInput.value.trim();
        if (!content) {
            showToast('请输入需要识别的言行内容');
            return;
        }

        // 自然语言触发兜底：用户主动说"继续分析/强制分析…"则带 force=true
        const force = shouldForceAnalysis(content);

        toggleLoading(true);
        try {
            // 直接把用户描述交给元器；force/query/has_image/image_urls 透传给工作流"开始节点"
            const response = await callYuanqiAPI('radar', content, false, {
                query: content,
                force,
                has_image: false,
                image_urls: []
            });
            const resultStr = (response && tryParseRadar(response))
                ? response
                : JSON.stringify(getRadarMock(content)); // 离线/解析失败 -> 本地示例
            saveHistory('radar', content, resultStr);
            radarInput.value = '';
            if (typeof clearAllImages === 'function') clearAllImages('radar');
            showToast(force ? '已为你强制深度分析' : '识别完成');
        } catch (error) {
            console.error('言行雷达识别失败，使用本地示例:', error);
            saveHistory('radar', content, JSON.stringify(getRadarMock(content)));
            radarInput.value = '';
            showToast('识别完成（本地示例）');
        } finally {
            toggleLoading(false);
        }
    }

    if (radarBtn) radarBtn.addEventListener('click', runRadar);

    if (clearInput) {
        clearInput.addEventListener('click', () => {
            radarInput.value = '';
            if (typeof clearAllImages === 'function') clearAllImages('radar');
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('radar'));
    }
}

// ==================== 本地兜底示例（离线 / API 失败时用，便于演示与前端联调）====================
function getRadarMock(content) {
    const t = content || '';

    // 招聘环节制度性歧视 -> 高危
    if (/招聘|仅限男|只要男|限男|男性优先/.test(t)) {
        return {
            risk_level: "高危",
            risk_summary: "招聘环节限定性别，涉嫌制度性就业歧视",
            type: ["性别歧视"],
            confidence: "高",
            elements_check: [
                { name: "基于性别或婚育状况的区别对待", status: "满足", note: "招聘明确限定男性" },
                { name: "发生在就业环节", status: "满足", note: "招聘录用环节" },
                { name: "无合理职业资格依据", status: "满足", note: "该岗位无性别限制的合理依据" }
            ],
            aggravating_factors: [],
            discrimination_severity: { institutional: "是", concrete_harm: "存疑" },
            law_references: [
                { name: "《中华人民共和国就业促进法》", article: "第二十七条", content: "用人单位招用人员，除国家规定的不适合妇女的工种或者岗位外，不得以性别为由拒绝录用妇女或者提高对妇女的录用标准。", source: "得理" }
            ],
            case_references: [
                {
                    title: "（示例）小丽与某公司平等就业权纠纷案",
                    court: "上海市浦东新区人民法院",
                    date: "2023",
                    facts: "女求职者投递简历后，公司以\"想招男性\"为由婉拒，原岗位招聘要求并未限定性别。",
                    judgment: "判决公司赔偿精神损害抚慰金 3000 元。",
                    key_point: "法院认为，用人单位在公示任职条件之外额外设置性别门槛、对女性求职者区别对待，已构成对劳动者平等就业权的侵犯，应依法承担侵权责任。"
                }
            ],
            response_scripts: {
                gentle: "请问这个岗位限定男性是出于什么样的岗位要求呢？我对这份工作很有信心，希望能有公平竞争的机会。",
                firm: "依据法律规定，用人单位不得以性别为由拒绝录用女性。希望贵公司能给予我平等的应聘机会。",
                formal: "贵单位招聘中限定性别，已涉嫌违反《就业促进法》第二十七条。请依法平等对待求职者，否则我将保留向人社部门投诉的权利。"
            },
            narrative: "看到招聘只要男性，你一定觉得很不公平，这种被一刀切排除在外的感觉，确实让人难受。\n法律是站在你这边的：用人单位除国家规定的特殊工种外，不得以性别为由拒绝录用女性，也不能因此提高对女性的录用标准。简单说，能不能胜任靠的是能力，不是性别。\n在类似的情况里，已经有公司因招聘限定性别被判赔礼道歉并赔偿。你完全有权争取一个公平竞争的机会。\n如果想知道怎么投诉维权，可以去「她行·行动导航」；想留存招聘广告等证据，可以看「她证·证据保全」。",
            suggested_modules: ["她行", "她证"],
            disclaimer: "本指导不构成正式法律意见，重大维权请咨询律师或拨打 12338 / 12348。"
        };
    }

    // 涉性骚扰（含胁迫）-> 高危
    if (/陪|出差|过夜|身体|肢体|摸|揩油|性暗示|潜规则|陪睡/.test(t)) {
        return {
            risk_level: "高危",
            risk_summary: "以工作机会施压的性要求，涉嫌职场性骚扰",
            type: ["性骚扰"],
            confidence: "高",
            elements_check: [
                { name: "行为与性有关", status: "满足", note: "包含性暗示或性要求" },
                { name: "违背对方意愿", status: "满足", note: "你明确感到不适" },
                { name: "职场情境", status: "满足", note: "利用职权或从属关系" }
            ],
            aggravating_factors: ["职权胁迫"],
            discrimination_severity: { institutional: "不适用", concrete_harm: "不适用" },
            law_references: [
                { name: "《中华人民共和国妇女权益保障法》", article: "第二十五条", content: "禁止违背妇女意愿、以言语、文字、图像、肢体行为等方式对其实施性骚扰。", source: "得理" }
            ],
            case_references: [
                {
                    title: "（示例）周某强制猥亵案",
                    court: "安徽省芜湖市镜湖区人民法院",
                    date: "2023",
                    facts: "某公司负责人将女求职者哄骗至宾馆房间，以散布谣言、影响行业立足相威胁，对其实施亲吻、摸胸等猥亵行为。",
                    judgment: "以强制猥亵罪判处有期徒刑六个月，自愿赔偿被害人精神损失 4 万元。",
                    key_point: "法院认为，行为人利用招募女职工过程中的地位优势、心理优势，以散布谣言败坏名誉相威胁，足以使被害人不敢反抗，已达到强制猥亵罪中\"胁迫\"的程度。"
                }
            ],
            response_scripts: {
                gentle: "抱歉，工作之外的这些安排我不太方便，我们还是把精力放在工作本身吧。",
                firm: "你的这些话让我很不舒服，请立刻停止。我们之间只有工作关系。",
                formal: "你的言行已涉嫌性骚扰，违反《妇女权益保障法》。请立即停止，否则我将保留聊天记录并向公司及有关部门投诉。"
            },
            narrative: "遇到这样的事，你感到害怕、愤怒或不知所措，都是非常正常的反应，这绝不是你的错。\n法律明确禁止违背你意愿、以言语或肢体等方式实施性骚扰。简单说，对方拿工作机会作筹码提出这种要求，是法律严厉禁止的。\n你不是一个人在面对，请先照顾好自己的安全与情绪。\n建议尽快前往「她证·证据保全」留存证据，再到「她行·行动导航」了解投诉与维权路径。",
            suggested_modules: ["她证", "她行"],
            disclaimer: "本指导不构成正式法律意见，重大维权请咨询律师或拨打 12338 / 12348。"
        };
    }

    // 面试/婚育询问 -> 中危（默认）
    return {
        risk_level: "中危",
        risk_summary: "涉嫌面试环节询问婚育状况的性别歧视",
        type: ["性别歧视"],
        confidence: "高",
        elements_check: [
            { name: "行为与性有关", status: "不适用", note: "" },
            { name: "违背对方意愿", status: "不适用", note: "" },
            { name: "职场情境", status: "不适用", note: "" },
            { name: "基于性别或婚育状况的区别对待", status: "满足", note: "面试中询问婚育情况，属于基于婚育状况的区别对待" },
            { name: "发生在就业环节", status: "满足", note: "发生在面试招聘环节" },
            { name: "无合理职业资格依据", status: "满足", note: "婚育状况与工作岗位无直接关联" }
        ],
        aggravating_factors: [],
        discrimination_severity: { institutional: "否", concrete_harm: "否" },
        law_references: [
            { name: "《中华人民共和国妇女权益保障法》", article: "第四十三条第（二）项", content: "用人单位在招录（聘）过程中，除国家另有规定外，不得实施下列行为：……（二）除个人基本信息外，进一步询问或者调查女性求职者的婚育情况；", source: "得理" }
        ],
        case_references: [
            {
                title: "（示例）严女士与某公司平等就业权纠纷案",
                court: "上海市浦东新区人民法院",
                date: "2023",
                facts: "公司将怀孕检测列为入职体检项目，发现求职者已怀孕后以\"岗位规划调整\"为由取消录用，但同岗位仍在外发布招聘信息。",
                judgment: "认定构成就业歧视，公司承担缔约过失责任，赔偿严女士相关损失 3 万余元。",
                key_point: "法院认为，将妊娠测试作为入职体检项目违反《妇女权益保障法》第四十三条，得知应聘者怀孕后恶意取消招聘岗位，侵害了劳动者平等就业权，应承担缔约过失责任。"
            }
        ],
        response_scripts: {
            gentle: "关于刚才问的婚育情况，我觉得这属于我的个人隐私，和工作能力没有直接关系，咱们还是聊聊岗位要求吧。",
            firm: "根据法律规定，婚育状况属于个人隐私，用人单位在招聘时无权过问，我不方便回答这个问题。",
            formal: "请注意，根据《妇女权益保障法》第四十三条规定，用人单位在招录过程中不得询问女性求职者的婚育情况，请您尊重法律规定。"
        },
        narrative: "面试时被问“有没有结婚”“打算什么时候生孩子”，这种被冒犯的感觉我能理解，也值得被认真对待。\n其实法律对此态度很明确——这很可能构成就业性别歧视。简单说，你的婚育计划属于个人隐私，与工作能力无关，用人单位无权过问。\n在类似的情况里，法院也支持过劳动者，认定婚育状况属于个人隐私，不能作为录用与否的依据。\n你不是一个人在面对，你的感受是被法律认可和支持的。如果想了解下一步怎么做，可以去「她行·行动导航」；想留存证据，可以看「她证·证据保全」。",
        suggested_modules: ["她行", "她证"],
        disclaimer: "本指导不构成正式法律意见，重大维权请咨询律师或拨打 12338 / 12348。"
    };
}
