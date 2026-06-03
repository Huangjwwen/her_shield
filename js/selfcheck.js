// ==================== 权利自查模块 (selfcheck / 她权·权益指南) ====================
// 历史遗留:早期前端用 callSmartAgent_selfcheck / parseSelfcheckResponse / QUESTION_MAP
// 三件套手工拼接 prompt + 正则抽段落,现已全部由元器工作流内置 system prompt 接管。
// 这段死代码已删除(2026-06-02),保留 runSelfcheck + mock 兜底两条主路径。

// 安全转义(避免 XSS)
function selfcheckEscape(text) {
    const div = document.createElement('div');
    div.textContent = (text == null ? '' : String(text));
    return div.innerHTML;
}

// 将"《XXX》第X条"等法律引用涂蓝高亮,同时尝试把后续法律原文段也高亮
// 顺序很重要:必须先涂"《...》+ 条款号"组合(包含原文段),再涂单独的"《...》"或"第X条",
// 否则后面两个正则会先匹配,把组合切碎。
function highlightLawCitations(escapedText) {
    let s = escapedText;
    // 中文数字 + 阿拉伯数字 都接受
    const NUM = '[一二三四五六七八九十百千零0-9]+';

    // ① 组合形式:《...》第X条[第X项](后面紧跟"，[法律原文]。" 把整段都涂蓝)
    //   宽松匹配第一个句号之前不超过 120 字的原文段
    s = s.replace(
        new RegExp('(《[^》]{1,40}》)\\s*(第' + NUM + '条(?:第' + NUM + '[款项])?)([:：，,]\\s*[^。!?！?]{1,120}[。!?！?])', 'g'),
        '<span class="law-name">$1</span><span class="law-article">$2</span><span class="law-text">$3</span>'
    );

    // ② 单独的法规名《...》(可能后面没跟具体条款,或者条款被 ① 吃掉了)
    s = s.replace(/《([^》]{1,40})》/g, m => {
        // 跳过已经在 span 里的(简单判断:m 前后是否已有 law- 类标记)
        return `<span class="law-name">${m}</span>`;
    });

    // ③ 单独的"第X条"或"第X条第X项"(不在 law-article span 里的)
    s = s.replace(
        new RegExp('(?<!"law-article">)(第' + NUM + '条(?:第' + NUM + '[款项])?)', 'g'),
        '<span class="law-article">$1</span>'
    );

    // 避免 ② 重复包裹已被 ① 匹配过的法规名 —— 简单去重:把
    // `<span class="law-name"><span class="law-name">...</span></span>` 压平
    s = s.replace(/<span class="law-name"><span class="law-name">([^<]+)<\/span><\/span>/g,
                  '<span class="law-name">$1</span>');

    return s;
}

// 根据用户输入识别"场景标签"作为权益图谱的头部芯片
function detectSelfcheckScene(userInput) {
    const text = String(userInput || '');
    const tags = [];
    if (/孕|怀孕|哺乳|产假|生育/.test(text)) tags.push('🤰 孕产期');
    if (/面试|招聘|求职|录用/.test(text))     tags.push('🔍 求职阶段');
    if (/在职|工作中|公司|单位/.test(text) && !tags.includes('🤰 孕产期')) tags.push('💼 在职阶段');
    if (/调岗|降薪|晋升|绩效|工资|薪酬/.test(text)) tags.push('📉 薪酬调岗');
    if (/辞退|解雇|开除|劳动合同/.test(text)) tags.push('🚪 解雇离职');
    if (/骚扰|性骚扰|猥亵/.test(text)) tags.push('⚠️ 性骚扰');
    if (/歧视|不平等|区别对待/.test(text)) tags.push('⚖️ 性别歧视');
    if (/产检|产前|生育保险/.test(text)) tags.push('🏥 医疗保障');
    return tags.length > 0 ? tags : ['📋 一般查询'];
}

// 尝试把 LLM 自然语言输出拆解为"权利条目"卡片数据
// 期望格式(来自 selfcheck prompt):
//   开头一段总览
//   · 不被随意解雇的权利。根据《劳动合同法》第42条，原文。简单说，白话。
//   · 获得产假的权利。根据《女职工劳动保护特别规定》第7条，原文。通俗讲，白话。
//   ...
//   温馨提示...
// 拆解失败时返回 null,调用方走纯文本兜底
function parseSelfcheckRights(rawText) {
    if (!rawText || typeof rawText !== 'string') return null;
    const text = rawText.replace(/\r\n/g, '\n').trim();

    // 找到"温馨提示"分隔
    const tipMatch = text.match(/(?:^|\n)\s*[#＃]*\s*(温馨提示|友情提示|小贴士)[：:\s]*([\s\S]*)$/);
    const tipText = tipMatch ? tipMatch[2].trim() : '';
    const bodyText = tipMatch ? text.slice(0, tipMatch.index).trim() : text;

    // 切出引导段(权利清单之前的一段总览)
    // 引导段以 "法律给你的权利" / "享有...的权利" / "为您梳理" 等开头
    const introMatch = bodyText.match(/^([\s\S]*?)(?=\n\s*[·•・▪◆●]\s)/);
    const introText = introMatch ? introMatch[1].trim() : '';
    const listText = introMatch ? bodyText.slice(introMatch[0].length) : bodyText;

    // 按"·" / "•" / "◆" / "●" / 数字编号开头拆条
    const itemPattern = /(?:^|\n)\s*[·•・▪◆●]\s+/g;
    const parts = listText.split(itemPattern).map(s => s.trim()).filter(Boolean);

    if (parts.length < 2) return null; // 至少要 2 条权利才划得来用卡片

    // 每条解析出 name / lawCite / lawText / plain
    const items = parts.map(part => {
        // name 边界优先级:
        // ① "...的权利" 作为最优边界(权益指南输出几乎条条以"XXX 的权利"开头)
        // ② 退到第一个句号/分号
        let name = '';
        let nameLen = 0;
        const rightWordMatch = part.match(/^([\s\S]*?的(?:权利|保护|保障))(?=[，,。.；;])/);
        if (rightWordMatch) {
            name = rightWordMatch[1].trim();
            nameLen = rightWordMatch[0].length;
        } else {
            const sentenceMatch = part.match(/^[^。.；;！!？?]+[。.；;！!？?]/);
            const firstSentence = sentenceMatch ? sentenceMatch[0] : part.split(/[。.]/)[0];
            name = firstSentence.replace(/[。.；;！!？?]+$/, '').trim();
            nameLen = firstSentence.length;
        }

        const rest = part.slice(nameLen).replace(/^[，,。.；;\s]+/, '').trim();

        // 法律依据: "根据《...》第X条" / "依据《...》第X条" / "依据是《...》第X条" / "依据为《...》第X条"
        // 关键:把连接词("是"、"为"、"按"等)从前缀去除
        const lawCiteMatch = rest.match(/(?:根据|依据是|依据为|按照|依据|按)?\s*(《[^》]{1,40}》)(\s*第[一二三四五六七八九十百千零0-9]+条(?:第[一二三四五六七八九十百千零0-9]+[款项])?)?/);
        let lawCite = '';
        if (lawCiteMatch) {
            // 拼回去:法规名 + (可选)条款号,前缀不要
            lawCite = (lawCiteMatch[1] + (lawCiteMatch[2] || '')).replace(/\s+/g, '').trim();
        }

        // 白话解释: "简单说" / "通俗讲" / "也就是说" 之后到段末
        const plainMatch = rest.match(/(?:简单说|通俗讲|通俗地讲|也就是说|意思就是|意思是|说白了|意味着|这意味着|这就是说)[，,：:]?\s*([\s\S]+?)$/);
        const plain = plainMatch ? plainMatch[1].trim().replace(/^就是\s*/, '') : '';

        // 法律原文: 在 lawCite 之后、白话引导词之前的那段;若长度 < 8 视为"无原文"(避免抓到"简单说"等碎片)
        let lawText = '';
        if (lawCite) {
            // 用 indexOf 找原始位置(因为 lawCite 已经被 trim 过,要去原文找带前缀的位置)
            const citeIdx = rest.indexOf(lawCite);
            if (citeIdx !== -1) {
                const afterCite = rest.slice(citeIdx + lawCite.length);
                // 切到白话引导词之前
                const cutMatch = afterCite.match(/^([\s\S]*?)(?=简单说|通俗讲|通俗地讲|也就是说|意思就是|意思是|说白了|意味着|这意味着|这就是说|$)/);
                const candidate = (cutMatch ? cutMatch[1] : afterCite)
                    .replace(/^[，,：:。.\s]+/, '')
                    .replace(/[，,。.\s]+$/, '')
                    .trim();
                // 过滤过短碎片(< 8 个非空白字符)
                if (candidate.replace(/\s/g, '').length >= 8) lawText = candidate;
            }
        }

        return { name, lawCite, lawText, plain };
    });

    // 校验:至少 70% 的条目要识别出 name(否则说明 LLM 输出格式跟预期差太多)
    const namedCount = items.filter(it => it.name && it.name.length > 0).length;
    if (namedCount / items.length < 0.7) return null;

    return {
        intro: introText,
        items,
        tip: tipText
    };
}

// 渲染单条权利记录:优先卡片网格(rights grid),解析失败时退回带蓝色高亮的纯文本
function renderSelfcheckRecord(rec) {
    const parsed = parseSelfcheckRights(rec.botMessage);
    const sceneTags = detectSelfcheckScene(rec.userMessage);

    // 场景头部:无论卡片还是兜底都先展示
    const sceneHead = `<div class="selfcheck-scene-head">
        <span class="selfcheck-scene-label">📍 场景识别</span>
        ${sceneTags.map(t => `<span class="selfcheck-scene-tag">${selfcheckEscape(t)}</span>`).join('')}
    </div>`;

    if (!parsed) {
        // 兜底:仍用原蓝色高亮文本
        const escaped = selfcheckEscape(rec.botMessage);
        const highlighted = highlightLawCitations(escaped);
        return `<div class="history-bot selfcheck-bot">
            ${sceneHead}
            <div class="selfcheck-fallback">${highlighted.replace(/\n/g, '<br>')}</div>
        </div>`;
    }

    const introHtml = parsed.intro
        ? `<div class="selfcheck-intro">${highlightLawCitations(selfcheckEscape(parsed.intro)).replace(/\n/g, '<br>')}</div>`
        : '';

    const cardsHtml = parsed.items.map((it, i) => {
        const nameHtml = selfcheckEscape(it.name || `权利 ${i + 1}`);
        const lawCiteHtml = it.lawCite
            ? `<div class="right-card-law-cite">${highlightLawCitations(selfcheckEscape(it.lawCite))}</div>`
            : '';
        const lawTextHtml = it.lawText
            ? `<div class="right-card-law-text">${highlightLawCitations(selfcheckEscape(it.lawText))}</div>`
            : '';
        const plainHtml = it.plain
            ? `<div class="right-card-plain"><span class="plain-icon">💡</span>${selfcheckEscape(it.plain)}</div>`
            : '';
        return `<div class="right-card">
            <div class="right-card-head">
                <span class="right-card-no">${i + 1}</span>
                <span class="right-card-name">${nameHtml}</span>
            </div>
            ${lawCiteHtml}${lawTextHtml}${plainHtml}
        </div>`;
    }).join('');

    const tipHtml = parsed.tip
        ? `<div class="selfcheck-tip">
            <div class="selfcheck-tip-title">🌸 温馨提示</div>
            <div class="selfcheck-tip-body">${highlightLawCitations(selfcheckEscape(parsed.tip)).replace(/\n/g, '<br>')}</div>
           </div>`
        : '';

    return `<div class="history-bot selfcheck-bot">
        ${sceneHead}
        ${introHtml}
        <div class="rights-grid">${cardsHtml}</div>
        ${tipHtml}
    </div>`;
}

// 重试:跳过代理缓存,真打元器
async function retrySelfcheckQuery(btn) {
    const item = btn.closest('.history-item');
    if (!item) return;
    const id = item.dataset.id;
    const records = (typeof historyStorage !== 'undefined' && historyStorage.selfcheck) || [];
    const record = records.find(r => String(r.id) === String(id));
    if (!record || !record.userMessage) { showToast('找不到原始问题'); return; }
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '重试中…';
    toggleLoading(true);
    try {
        const response = await callYuanqiAPI('selfcheck', record.userMessage, false, { nocache: true });
        if (response) {
            saveHistory('selfcheck', record.userMessage, response);
            showToast('重试完成');
        } else {
            showToast('⚠️ 智能体仍未连通');
        }
    } catch (error) {
        console.error('selfcheck 重试失败:', error);
        showToast('重试失败:' + (error && error.message || error));
    } finally {
        toggleLoading(false);
        try { btn.disabled = false; btn.textContent = oldText; } catch (e) {}
    }
}

// 自定义历史渲染器:权利清单可视化卡片网格 + 场景头部 + 法律引用蓝色高亮
function renderSelfcheckHistory(container, records) {
    if (!records || records.length === 0) {
        container.innerHTML = '<p class="history-empty">暂无对话记录，开始查询吧～</p>';
        return;
    }
    container.innerHTML = records.map(r => {
        return `<div class="history-item" data-id="${r.id}">
            <div class="history-time">${selfcheckEscape(r.time)}</div>
            <div class="history-user">${selfcheckEscape(r.userMessage)}</div>
            ${renderSelfcheckRecord(r)}
            <div class="history-item-actions">
                <button class="btn-small btn-retry" onclick="retrySelfcheckQuery(this)" title="不用缓存,重新查询">🔄 重试</button>
                <button class="btn-small" onclick="deleteHistoryItem('selfcheck', '${r.id}')">删除</button>
            </div>
        </div>`;
    }).join('');
}

// 初始化权利自查
function initSelfcheck() {
    // 注册富文本渲染器(法律引用高亮)
    if (typeof customHistoryRenderers !== 'undefined') {
        customHistoryRenderers.selfcheck = renderSelfcheckHistory;
    }

    const selfcheckInput = document.getElementById('selfcheckInput');
    const clearInput = document.getElementById('clearSelfcheckInput');
    const selfcheckBtn = document.getElementById('selfcheckBtn');
    const clearHistoryBtn = document.getElementById('clearSelfcheckHistory');

    // 加载历史记录
    loadHistory('selfcheck');

    // 执行查询
    async function runSelfcheck() {
        const content = selfcheckInput.value.trim();
        if (!content) {
            showToast('请输入您想了解的职场权益问题');
            return;
        }

        toggleLoading(true);

        // 内嵌 fallback:无论 callYuanqiAPI 返回 null 还是 throw 都走同一段
        const fallback = (reason) => {
            console.warn('[selfcheck] 走本地兜底:', reason);
            const mockResponse = '⚠️ 本次查询未连通智能体,以下内容为离线示例（不代表针对您输入的真实分析,请稍后重试或换用她眼·言行雷达获取真实判定）:\n\n' + getMockSelfcheckResponse(content);
            saveHistory('selfcheck', content, mockResponse);
            selfcheckInput.value = '';
            showToast('⚠️ 智能体未连通,显示离线示例');
        };

        try {
            const response = await callYuanqiAPI('selfcheck', content);
            if (response) {
                saveHistory('selfcheck', content, response);
                selfcheckInput.value = '';
                showToast('查询完成');
            } else {
                fallback('callYuanqiAPI 返回 null');
            }
        } catch (error) {
            console.error('权利查询 API 调用失败:', error);
            fallback(error && error.message || String(error));
        } finally {
            toggleLoading(false);
        }
    }

    // 备用模拟数据
    function getMockSelfcheckResponse(content) {
        const mockResponses = [
            `【您的合法权利】
根据相关法律规定，您在职场中享有平等就业、同工同酬、不受性别歧视等权利。

【相关法律法规】
• 《就业促进法》第二十六条：用人单位招用人员，不得以性别为由拒绝录用妇女或者提高对妇女的录用标准。
• 《妇女权益保障法》：妇女在各领域享有与男子平等的权利。
• 《劳动法》：工资分配应当遵循按劳分配原则，实行同工同酬。

【维权建议】
1. 收集并保存相关证据材料
2. 可向公司HR或上级反映情况
3. 如公司不处理，可向劳动监察部门投诉
4. 必要时可申请劳动仲裁或提起诉讼`,

            `【您的合法权利】
孕期、产期、哺乳期女职工受法律特殊保护，用人单位不得降低工资、违法调岗或解除劳动合同。

【相关法律法规】
• 《劳动合同法》第四十二条：女职工在孕期、产期、哺乳期的，用人单位不得依照本法第四十条、第四十一条的规定解除劳动合同。
• 《女职工劳动保护特别规定》：用人单位不得因女职工怀孕、生育、哺乳降低其工资、予以辞退、与其解除劳动或者聘用合同。

【维权建议】
1. 不同意违法调岗降薪
2. 要求公司出具书面调岗通知
3. 保留工资条、劳动合同等证据
4. 可向劳动监察部门投诉或申请仲裁`
        ];
        
        if (content.includes('孕') || content.includes('产') || content.includes('哺乳')) {
            return mockResponses[1];
        }
        return mockResponses[0];
    }

    selfcheckBtn.addEventListener('click', runSelfcheck);

    clearInput.addEventListener('click', () => {
        selfcheckInput.value = '';
        clearAllImages('selfcheck');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('selfcheck'));
    }
}

