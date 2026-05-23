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

// ==================== 行动指南模块 ====================

// 初始化行动指南
function initGuide() {
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

