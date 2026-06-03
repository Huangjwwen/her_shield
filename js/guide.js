async function callSmartAgent_guide(scene) {
    // 获取场景文本
    const sceneText = SCENE_MAP[scene] || scene;

    // 构建提示消息
    const promptMessage = `请针对以下维权场景，提供详细的分步维权路径：

场景：${sceneText}

请按以下格式回复，每一步包含：
步骤编号. 标题
- 具体行动：说明具体要做什么
- 渠道方式：通过什么渠道/方式
- 注意事项：需要注意的问题

请提供4-5个步骤的维权路径。`;

    try {
        // 调用腾讯元器API
        const response = await callYuanqiAPI('guide', promptMessage);
        
        if (response) {
            // 解析智能体回复
            const result = parseGuideResponse(response);
            return result;
        }
    } catch (error) {
        console.error('调用行动指南API失败，使用模拟数据:', error);
    }

    // 模拟维权路径（演示用/备用）
    return new Promise((resolve) => {
        setTimeout(() => {
            const guides = {
                verbal: [
                    {
                        step: 1,
                        title: "明确拒绝",
                        detail: "第一时间明确表示拒绝对方的不当言行，告知对方行为的不妥和严重性",
                        channel: "当面或书面（微信/邮件）",
                        note: "保留拒绝的证据，如回复的短信"
                    },
                    {
                        step: 2,
                        title: "保留证据",
                        detail: "收集并保存所有相关证据：聊天记录、录音录像、证人证言等",
                        channel: "手机存储 + 云端备份",
                        note: "原始载体不要删除"
                    },
                    {
                        step: 3,
                        title: "向公司投诉",
                        detail: "向公司HR或上级领导正式投诉，提供证据，要求公司处理",
                        channel: "公司内部投诉渠道",
                        note: "书面投诉并要求回复"
                    },
                    {
                        step: 4,
                        title: "向劳动监察投诉",
                        detail: "如公司不处理或处理不当，向当地劳动监察大队投诉举报",
                        channel: "12333劳动维权热线",
                        note: "可匿名举报"
                    },
                    {
                        step: 5,
                        title: "申请仲裁或起诉",
                        detail: "必要时可向劳动仲裁委员会申请仲裁，或向法院提起诉讼",
                        channel: "劳动仲裁委员会/人民法院",
                        note: "注意仲裁时效一般为1年"
                    }
                ],
                recruit: [
                    {
                        step: 1,
                        title: "收集证据",
                        detail: "收集招聘广告、面试过程、拒绝通知等证据材料",
                        channel: "招聘网站、邮件、书面通知",
                        note: "注意保全完整证据链"
                    },
                    {
                        step: 2,
                        title: "与企业协商",
                        detail: "先尝试与企业沟通，说明其行为的违法性，要求纠正",
                        channel: "电话、邮件、面谈",
                        note: "沟通记录注意保存"
                    },
                    {
                        step: 3,
                        title: "向劳动监察投诉",
                        detail: "向当地劳动监察大队投诉招聘歧视行为",
                        channel: "12333劳动监察投诉",
                        note: "提供完整证据材料"
                    },
                    {
                        step: 4,
                        title: "向人社局举报",
                        detail: "可向人力资源和社会保障局举报企业违法行为",
                        channel: "人社局热线12333",
                        note: "可能涉及行政处罚"
                    }
                ]
            };

            const guide = guides[scene] || [
                {
                    step: 1,
                    title: "了解权益",
                    detail: "先了解相关法律法规，明确自己的权利",
                    channel: "本平台智能咨询",
                    note: "可先咨询了解具体情况"
                },
                {
                    step: 2,
                    title: "收集证据",
                    detail: "保留相关证据材料，包括书面材料、录音录像等",
                    channel: "自行收集",
                    note: "证据越充分越好"
                },
                {
                    step: 3,
                    title: "内部申诉",
                    detail: "先尝试公司内部申诉渠道解决",
                    channel: "HR/工会",
                    note: "保留申诉记录"
                },
                {
                    step: 4,
                    title: "外部维权",
                    detail: "内部解决不了时，通过劳动监察、仲裁等外部渠道维权",
                    channel: "12333/劳动仲裁",
                    note: "注意时效"
                }
            ];

            resolve(guide);
        }, 1500);
    });
}

/**
 * 解析行动指南响应
 * @param {string} response - 智能体回复
 * @returns {Array} - 解析后的步骤列表
 */
function parseGuideResponse(response) {
    // 默认结果
    let steps = [];
    
    // 尝试提取步骤（匹配 "1. 标题" 格式）
    const stepPattern = /(\d+)[\.、)]\s*([^\n]+)([\s\S]*?)(?=\d+[\.、)]|$)/g;
    let match;
    
    while ((match = stepPattern.exec(response)) !== null) {
        const stepNum = parseInt(match[1]);
        const title = match[2].trim();
        const content = match[3];
        
        // 提取具体行动
        let detail = "";
        const detailMatch = content.match(/(?:具体行动|行动)[：:]\s*([^\n]+)/);
        if (detailMatch) {
            detail = detailMatch[1].trim();
        }
        
        // 提取渠道方式
        let channel = "";
        const channelMatch = content.match(/(?:渠道方式|渠道)[：:]\s*([^\n]+)/);
        if (channelMatch) {
            channel = channelMatch[1].trim();
        }
        
        // 提取注意事项
        let note = "";
        const noteMatch = content.match(/(?:注意事项|注意)[：:]\s*([^\n]+)/);
        if (noteMatch) {
            note = noteMatch[1].trim();
        }
        
        if (title) {
            steps.push({
                step: stepNum,
                title: title,
                detail: detail || "请根据实际情况执行",
                channel: channel || "根据实际情况选择",
                note: note || "注意保留相关证据"
            });
        }
    }
    
    // 如果没有提取到步骤，返回默认步骤
    if (steps.length === 0) {
        steps = [
            {
                step: 1,
                title: "了解权益",
                detail: "先了解相关法律法规，明确自己的权利",
                channel: "本平台",
                note: "可先咨询了解具体情况"
            },
            {
                step: 2,
                title: "收集证据",
                detail: "保留相关证据材料",
                channel: "自行收集",
                note: "证据越充分越好"
            },
            {
                step: 3,
                title: "维权申诉",
                detail: response.substring(0, 100),
                channel: "根据实际情况选择",
                note: "注意时效"
            }
        ];
    }
    
    return steps;
}

// ==================== 行动指南模块 (guide / 她行·维权导航) ====================

// 安全转义
function guideEscape(text) {
    const div = document.createElement('div');
    div.textContent = (text == null ? '' : String(text));
    return div.innerHTML;
}

// 维权热线 -> tel: 链接 + 图标
const GUIDE_HOTLINES = {
    '12333': '劳动监察',
    '12338': '妇联',
    '12348': '法律援助',
    '12388': '纪检监察',
    '400-161-9995': '心理援助'
};

// 把文本里的电话号码包装成可点击的胶囊
function wrapHotlines(escapedText) {
    let s = escapedText;
    Object.keys(GUIDE_HOTLINES).forEach(num => {
        const label = GUIDE_HOTLINES[num];
        const re = new RegExp(num.replace(/-/g, '-?'), 'g');
        s = s.replace(re, `<a class="guide-hotline" href="tel:${num}" title="${label}">📞 ${num}</a>`);
    });
    return s;
}

// 时效字眼涂红橙
function highlightTimeLimit(escapedText) {
    return escapedText.replace(
        /(\d+\s*(?:年|个月|月|日|天)|一年|半年|三年|十五日|十五天)/g,
        '<span class="guide-timelimit">⏰ $1</span>'
    );
}

// 解析 LLM 输出为维权步骤数组
// 期望格式(prompt 约束):
//   ① 共情段(开头 1-2 句)
//   ② 第一步：现场反应与证据意识：...
//   ③ 第二步：内部渠道投诉：...
//   ④ 第三步：行政投诉举报：...(可能内嵌 12333/12338/12388)
//   ⑤ ... 第六步
//   ⑥ 时效提醒
//   ⑦ 结尾鼓励 + 引导其他模块
function parseGuideSteps(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const text = rawText.replace(/\r\n/g, '\n').trim();

    // 中文/阿拉伯数字步骤号
    const CN_NUMS = ['一','二','三','四','五','六','七','八','九','十'];
    // 匹配 "第X步" 模式 —— 允许行首前缀 ·/•/* 等列表符号
    const stepRe = /(?:^|\n)\s*[·•・▪◆●▸\-*]?\s*第([一二三四五六七八九十]|\d{1,2})步[：:、.]?\s*/g;

    const matches = [];
    let m;
    while ((m = stepRe.exec(text)) !== null) {
        matches.push({ start: m.index + m[0].search(/第/), full: m[0], numChar: m[1], textIdx: m.index + m[0].length });
    }

    if (matches.length < 2) return null;  // 至少 2 步才有时间轴感

    // 共情段:第一个 "第X步" 之前
    const introText = text.slice(0, matches[0].start).trim();

    // 时效尾段:最后一步之后到末尾,识别"时效""提醒"等
    const lastEnd = matches[matches.length - 1].textIdx;
    let tailStart = text.length;
    // 试找"时效提醒""关键节点"等结尾段标识
    const tailRe = /(?:^|\n)\s*[·•・▪◆●▸\-*]?\s*(?:时效提醒|关键节点|关键时效|关键时效提醒|重要提醒|温馨提示|时效与关键节点|寻求专业帮助)[：:、.\s]*/;
    const tailMatch = text.slice(lastEnd).match(tailRe);
    if (tailMatch) tailStart = lastEnd + tailMatch.index;

    // 切出每一步的 body
    const steps = matches.map((mm, i) => {
        const bodyStart = mm.textIdx;
        const bodyEnd = i < matches.length - 1 ? matches[i + 1].start : tailStart;
        const raw = text.slice(bodyStart, bodyEnd).trim();
        // 第一行通常是 "标题：详细说明" 或 "标题。详细说明"
        const titleMatch = raw.match(/^([^：:。\n]{2,30})[：:。]?\s*([\s\S]*)$/);
        const title = titleMatch ? titleMatch[1].trim() : `第${mm.numChar}步`;
        const body  = titleMatch ? titleMatch[2].trim() : raw;
        return {
            stepNo: mm.numChar,
            stepIdx: i + 1,
            title,
            body
        };
    });

    const tailText = tailStart < text.length ? text.slice(tailStart).trim() : '';

    return { intro: introText, steps, tail: tailText };
}

// 渲染单条 guide 记录:竖直时间轴
function renderGuideRecord(rec) {
    const parsed = parseGuideSteps(rec.botMessage);

    // 兜底:解析失败就纯文本(带电话/时效高亮)
    if (!parsed) {
        const escaped = guideEscape(rec.botMessage);
        const html = highlightTimeLimit(wrapHotlines(escaped)).replace(/\n/g, '<br>');
        return `<div class="history-bot guide-bot">
            <div class="guide-fallback">${html}</div>
        </div>`;
    }

    const introHtml = parsed.intro
        ? `<div class="guide-intro">${highlightTimeLimit(wrapHotlines(guideEscape(parsed.intro))).replace(/\n/g, '<br>')}</div>`
        : '';

    const stepsHtml = parsed.steps.map((s, i) => {
        const isLast = i === parsed.steps.length - 1;
        const titleHtml = guideEscape(s.title);
        const bodyHtmlRaw = highlightTimeLimit(wrapHotlines(guideEscape(s.body))).replace(/\n/g, '<br>');
        return `<div class="guide-step${isLast ? ' guide-step-last' : ''}">
            <div class="guide-step-dot">${s.stepIdx}</div>
            <div class="guide-step-content">
                <div class="guide-step-title">${titleHtml}</div>
                <div class="guide-step-body">${bodyHtmlRaw}</div>
            </div>
        </div>`;
    }).join('');

    const tailHtml = parsed.tail
        ? `<div class="guide-tail">
            <div class="guide-tail-title">⏰ 时效提醒与关键节点</div>
            <div class="guide-tail-body">${highlightTimeLimit(wrapHotlines(guideEscape(parsed.tail))).replace(/\n/g, '<br>')}</div>
           </div>`
        : '';

    return `<div class="history-bot guide-bot">
        ${introHtml}
        <div class="guide-timeline">${stepsHtml}</div>
        ${tailHtml}
    </div>`;
}

// 重试:跳过代理缓存,重新规划维权路径
async function retryGuideQuery(btn) {
    const item = btn.closest('.history-item');
    if (!item) return;
    const id = item.dataset.id;
    const records = (typeof historyStorage !== 'undefined' && historyStorage.guide) || [];
    const record = records.find(r => String(r.id) === String(id));
    if (!record || !record.userMessage) { showToast('找不到原始问题'); return; }
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '重试中…';
    toggleLoading(true);
    try {
        const response = await callYuanqiAPI('guide', record.userMessage, false, { nocache: true });
        if (response) {
            saveHistory('guide', record.userMessage, response);
            showToast('重试完成');
        } else {
            showToast('⚠️ 智能体未连通');
        }
    } catch (error) {
        console.error('guide 重试失败:', error);
        showToast('重试失败:' + (error && error.message || error));
    } finally {
        toggleLoading(false);
        try { btn.disabled = false; btn.textContent = oldText; } catch (e) {}
    }
}

// 自定义历史渲染器
function renderGuideHistory(container, records) {
    if (!records || records.length === 0) {
        container.innerHTML = '<p class="history-empty">暂无对话记录，开始查询吧～</p>';
        return;
    }
    container.innerHTML = records.map(r => {
        return `<div class="history-item" data-id="${r.id}">
            <div class="history-time">${guideEscape(r.time)}</div>
            <div class="history-user">${guideEscape(r.userMessage)}</div>
            ${renderGuideRecord(r)}
            <div class="history-item-actions">
                <button class="btn-small btn-retry" onclick="retryGuideQuery(this)" title="不用缓存,重新规划">🔄 重试</button>
                <button class="btn-small" onclick="deleteHistoryItem('guide', '${r.id}')">删除</button>
            </div>
        </div>`;
    }).join('');
}

// 初始化行动指南
function initGuide() {
    // 注册时间轴渲染器
    if (typeof customHistoryRenderers !== 'undefined') {
        customHistoryRenderers.guide = renderGuideHistory;
    }

    const guideInput = document.getElementById('guideInput');
    const clearInput = document.getElementById('clearGuideInput');
    const guideBtn = document.getElementById('guideBtn');
    const clearHistoryBtn = document.getElementById('clearGuideHistory');

    // 加载历史记录
    loadHistory('guide');

    // 执行查询
    async function runGuide() {
        const content = guideInput.value.trim();
        if (!content) {
            showToast('请描述您需要的维权场景');
            return;
        }

        toggleLoading(true);

        try {
            const response = await callYuanqiAPI('guide', content);
            
            if (response) {
                saveHistory('guide', content, response);
                guideInput.value = '';
                showToast('查询完成');
            } else {
                const mockResponse = getMockGuideResponse(content);
                saveHistory('guide', content, mockResponse);
                guideInput.value = '';
                showToast('查询完成（使用备用数据）');
            }
        } catch (error) {
            console.error('行动指南API调用失败:', error);
            const mockResponse = getMockGuideResponse(content);
            saveHistory('guide', content, mockResponse);
            guideInput.value = '';
            showToast('查询完成（使用备用数据）');
        } finally {
            toggleLoading(false);
        }
    }

    // 备用模拟数据
    function getMockGuideResponse(content) {
        if (content.includes('骚扰')) {
            return `【维权路径】

步骤1：明确拒绝
• 具体行动：第一时间明确表示拒绝对方的不当言行
• 渠道方式：当面或书面（微信/邮件）
• 注意事项：保留拒绝的证据

步骤2：保留证据
• 具体行动：收集并保存所有相关证据
• 渠道方式：手机存储 + 云端备份
• 注意事项：原始载体不要删除

步骤3：向公司投诉
• 具体行动：向公司HR或上级领导正式投诉
• 渠道方式：公司内部投诉渠道
• 注意事项：书面投诉并要求回复

步骤4：向劳动监察投诉
• 具体行动：如公司不处理，向劳动监察大队投诉
• 渠道方式：12333劳动维权热线
• 注意事项：可匿名举报

步骤5：申请仲裁或起诉
• 具体行动：向劳动仲裁委员会申请仲裁
• 渠道方式：劳动仲裁委员会/人民法院
• 注意事项：注意仲裁时效一般为1年`;
        }
        return `【维权路径】

步骤1：了解权益
• 具体行动：先了解相关法律法规，明确自己的权利
• 渠道方式：本平台智能咨询
• 注意事项：可先咨询了解具体情况

步骤2：收集证据
• 具体行动：保留相关证据材料
• 渠道方式：自行收集
• 注意事项：证据越充分越好

步骤3：内部申诉
• 具体行动：先尝试公司内部申诉渠道解决
• 渠道方式：HR/工会
• 注意事项：保留申诉记录

步骤4：外部维权
• 具体行动：通过劳动监察、仲裁等外部渠道维权
• 渠道方式：12333/劳动仲裁
• 注意事项：注意时效`;
    }

    guideBtn.addEventListener('click', runGuide);

    clearInput.addEventListener('click', () => {
        guideInput.value = '';
        clearAllImages('guide');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('guide'));
    }
}

