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

// 自定义历史渲染器:把法律引用涂蓝,其余按纯文本渲染(保留换行)
function renderSelfcheckHistory(container, records) {
    if (!records || records.length === 0) {
        container.innerHTML = '<p class="history-empty">暂无对话记录，开始查询吧～</p>';
        return;
    }
    container.innerHTML = records.map(r => {
        const escaped = selfcheckEscape(r.botMessage);
        const highlighted = highlightLawCitations(escaped);
        // 保留换行
        const body = `<div class="history-bot selfcheck-bot">${highlighted.replace(/\n/g, '<br>')}</div>`;
        return `<div class="history-item" data-id="${r.id}">
            <div class="history-time">${selfcheckEscape(r.time)}</div>
            <div class="history-user">${selfcheckEscape(r.userMessage)}</div>
            ${body}
            <div class="history-item-actions">
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

