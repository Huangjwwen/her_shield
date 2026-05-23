const QUESTION_MAP = {
    recruit: "公司招聘标注仅限男性，我是否有维权权利？",
    promotion: "晋升时被告知'女生不适合管理岗位'怎么办？",
    interview: "面试时被问有没有男朋友/结婚计划",
    pregnancy: "入职时要求承诺几年内不怀孕",
    harassment: "领导经常单独约我出差/吃饭",
    remark: "同事经常开黄色玩笑",
    assign: "总是把累活/杂活派给女员工",
    maternity: "怀孕后被调岗降薪",
    maternityleave: "产假期间被扣发工资",
    breastfeed: "哺乳期不提供吸奶时间",
    salary: "同岗位男女薪酬差异大",
    bonus: "绩效奖金发放因性别区别对待",
    benefit: "福利待遇男女不一致"
};

/**
 * 权利自查 - 获取法律权利信息
 * @param {string} questionId - 选中的问题ID
 * @returns {Promise<Object>} - 自查结果
 */
async function callSmartAgent_selfcheck(questionId) {
    // 获取问题文本
    const questionText = QUESTION_MAP[questionId] || questionId;
    
    // 构建提示消息
    const promptMessage = `请针对以下职场性别权益问题，给出法律分析和维权建议：

问题：${questionText}

请按以下格式回复：
1. 你的合法权利：说明相关法律权利
2. 对应法律法规：引用具体法律条文
3. 维权方向：给出具体可行的维权建议`;

    try {
        // 调用腾讯元器API
        const response = await callYuanqiAPI('selfcheck', promptMessage);
        
        if (response) {
            // 解析智能体回复
            const result = parseSelfcheckResponse(response);
            return result;
        }
    } catch (error) {
        console.error('调用权利自查API失败，使用模拟数据:', error);
    }

    // 模拟自查结果（演示用/备用）
    return new Promise((resolve) => {
        setTimeout(() => {
            const results = {
                recruit: {
                    rights: "您有权要求平等就业机会，用人单位不得以性别为由拒绝录用或提高录用标准。",
                    law: "《就业促进法》第二十六条：用人单位招用人员，不得以性别为由拒绝录用妇女或者提高对妇女的录用标准。",
                    action: "可以向劳动监察部门投诉举报，或收集证据后申请仲裁。"
                },
                promotion: {
                    rights: "您有权获得平等的晋升机会，用人单位不得因性别在晋升、薪酬等方面予以歧视。",
                    law: "《妇女权益保障法》第三十二条：妇女在各领域享有与男子平等的权利。",
                    action: "可以与公司协商，协商不成可向劳动仲裁委员会申请仲裁。"
                },
                maternity: {
                    rights: "孕期、产假、哺乳期（三期）女职工受法律特殊保护，用人单位不得降低工资或违法调岗。",
                    law: "《劳动合同法》第四十二条：女职工在孕期、产期、哺乳期的，用人单位不得依照本法第四十条、第四十一条的规定解除劳动合同。",
                    action: "可以不同意调岗，或向劳动监察部门投诉，或申请仲裁。"
                },
                salary: {
                    rights: "同工同酬是法律规定，男女职工做同样工作应获得同等报酬。",
                    law: "《劳动法》第四十六条：工资分配应当遵循按劳分配原则，实行同工同酬。",
                    action: "可以要求公司说明薪酬差异理由，或向劳动监察部门投诉。"
                }
            };

            const result = results[questionId] || {
                rights: "建议您详细描述具体情况以便更好地为您解答。",
                law: "具体情况需要具体分析，建议咨询专业律师。",
                action: "可以点击「查看详细解读」进入言行雷达模块进一步分析。"
            };

            resolve(result);
        }, 1500);
    });
}

/**
 * 解析权利自查响应
 * @param {string} response - 智能体回复
 * @returns {Object} - 解析后的结果
 */
function parseSelfcheckResponse(response) {
    // 默认结果
    let result = {
        rights: "请详细描述您的情况",
        law: "建议咨询专业律师",
        action: "可以通过言行雷达进一步分析"
    };
    
    // 尝试提取合法权利
    const rightsMatch = response.match(/(?:你的合法权利|合法权利)[：:]\s*([^\n]+)/);
    if (rightsMatch) {
        result.rights = rightsMatch[1].trim();
    }
    
    // 尝试提取法律法规
    const lawMatch = response.match(/(?:对应法律法规|法律法规|法律依据)[：:]\s*([^\n]+(?:\n(?!\\d)[^\n]+)*)/);
    if (lawMatch) {
        result.law = lawMatch[1].trim();
    }
    
    // 尝试提取维权方向
    const actionMatch = response.match(/(?:维权方向|维权建议)[：:]\s*([^\n]+(?:\n(?!\\d)[^\n]+)*)/);
    if (actionMatch) {
        result.action = actionMatch[1].trim();
    }
    
    return result;
}

// 场景ID对应的场景文本
// ==================== 权利自查模块 ====================

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

        try {
            const response = await callYuanqiAPI('selfcheck', content);
            
            if (response) {
                saveHistory('selfcheck', content, response);
                selfcheckInput.value = '';
                showToast('查询完成');
            } else {
                const mockResponse = getMockSelfcheckResponse(content);
                saveHistory('selfcheck', content, mockResponse);
                selfcheckInput.value = '';
                showToast('查询完成（使用备用数据）');
            }
        } catch (error) {
            console.error('权利查询API调用失败:', error);
            const mockResponse = getMockSelfcheckResponse(content);
            saveHistory('selfcheck', content, mockResponse);
            selfcheckInput.value = '';
            showToast('查询完成（使用备用数据）');
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

