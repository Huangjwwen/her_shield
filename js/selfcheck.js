// ==================== 权利自查模块 (selfcheck / 她权·权益指南) ====================
// 历史遗留:早期前端用 callSmartAgent_selfcheck / parseSelfcheckResponse / QUESTION_MAP
// 三件套手工拼接 prompt + 正则抽段落,现已全部由元器工作流内置 system prompt 接管。
// 这段死代码已删除(2026-06-02),保留 runSelfcheck + mock 兜底两条主路径。

// 初始化权利自查
function initSelfcheck() {
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

