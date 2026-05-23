async function callSmartAgent_radar(content) {
    // 构建提示消息
    const promptMessage = `请分析以下言行是否构成职场性别歧视或性骚扰，并给出判断结果：

"${content}"

请按以下格式回复：
1. 判断结果：是否构成歧视/性骚扰
2. 违规言行核心点：具体指出问题所在
3. 法律依据：引用相关法律条文`;

    try {
        // 调用腾讯元器API
        const response = await callYuanqiAPI('radar', promptMessage);
        
        if (response) {
            // 解析智能体回复
            const result = parseRadarResponse(response);
            return result;
        }
    } catch (error) {
        console.error('调用言行雷达API失败，使用模拟数据:', error);
    }

    // 模拟识别结果（演示用/备用）
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockResponses = [
                {
                    judgment: "构成职场性骚扰",
                    core: "以工作机会作为威胁进行性暗示，要求陪同喝酒",
                    law: "《妇女权益保障法》第二十三条：禁止对妇女实施性骚扰。受害妇女有权向单位和有关机关投诉。"
                },
                {
                    judgment: "构成就业歧视",
                    core: "性别偏见言论，否定女性工作能力",
                    law: "《就业促进法》第三条：劳动者依法享有平等就业和自主择业的权利。劳动者就业，不因民族、种族、性别、宗教信仰等不同而受歧视。"
                }
            ];

            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            resolve(randomResponse);
        }, 1500);
    });
}

/**
 * 解析言行雷达响应
 * @param {string} response - 智能体回复
 * @returns {Object} - 解析后的结果
 */
function parseRadarResponse(response) {
    // 默认结果
    let result = {
        judgment: "需要进一步分析",
        core: "请详细描述具体情况",
        law: "建议咨询专业律师"
    };
    
    // 尝试提取判断结果
    const judgmentMatch = response.match(/(?:判断结果|是否构成)[：:]\s*([^\n]+)/);
    if (judgmentMatch) {
        result.judgment = judgmentMatch[1].trim();
    }
    
    // 尝试提取违规核心点
    const coreMatch = response.match(/(?:违规言行核心点|核心点|问题所在)[：:]\s*([^\n]+)/);
    if (coreMatch) {
        result.core = coreMatch[1].trim();
    }
    
    // 尝试提取法律依据
    const lawMatch = response.match(/(?:法律依据|相关法律)[：:]\s*([^\n]+(?:\n(?!\\d)[^\n]+)*)/);
    if (lawMatch) {
        result.law = lawMatch[1].trim();
    }
    
    return result;
}

// 问题ID对应的问题文本
// ==================== 言行雷达模块 ====================

// 初始化言行雷达
function initRadar() {
    const radarInput = document.getElementById('radarInput');
    const clearInput = document.getElementById('clearRadarInput');
    const radarBtn = document.getElementById('radarBtn');
    const saveResult = document.getElementById('saveRadarResult');
    const clearHistoryBtn = document.getElementById('clearRadarHistory');

    // 加载历史记录
    loadHistory('radar');

    // 执行识别
    async function runRadar() {
        const content = radarInput.value.trim();
        if (!content) {
            showToast('请输入需要识别的言行内容');
            return;
        }

        toggleLoading(true);

        try {
            // 直接调用API获取智能体回复
            const promptMessage = `请分析以下言行是否构成职场性别歧视或性骚扰：

"${content}"

请给出判断结果、违规言行分析、法律依据和维权建议。`;
            
            const response = await callYuanqiAPI('radar', promptMessage);
            
            if (response) {
                // 保存历史记录并刷新显示
                saveHistory('radar', content, response);
                // 清空输入框
                radarInput.value = '';
                showToast('识别完成');
            } else {
                // 如果API调用失败，使用模拟数据
                const result = await callSmartAgent_radar(content);
                const mockResponse = `【判断结果】${result.judgment}\n\n【违规言行核心点】${result.core}\n\n【法律依据】${result.law}`;
                saveHistory('radar', content, mockResponse);
                radarInput.value = '';
                showToast('识别完成（使用备用数据）');
            }
        } catch (error) {
            console.error('言行雷达识别失败:', error);
            showToast('识别失败，请重试');
        } finally {
            toggleLoading(false);
        }
    }

    radarBtn.addEventListener('click', runRadar);

    clearInput.addEventListener('click', () => {
        radarInput.value = '';
        clearAllImages('radar');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('radar'));
    }
}

