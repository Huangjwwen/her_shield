async function callSmartAgent_consultation(inputText) {
    try {
        // 调用腾讯元器API（智能咨询使用consultation配置）
        const response = await callYuanqiAPI('consultation', inputText);
        
        if (response) {
            // 解析智能体回复，提取核心结论
            const conclusions = extractConclusions(response);
            
            // 保存对话记录
            conversations.push({
                user: inputText,
                bot: response,
                timestamp: Date.now()
            });
            
            return {
                answer: response,
                conclusions: conclusions
            };
        }
    } catch (error) {
        console.error('调用真实API失败，使用模拟数据:', error);
    }

    // 模拟智能体回复（演示用/备用）
    return new Promise((resolve) => {
        setTimeout(() => {
            const mockResponses = [
                {
                    answer: "根据您描述的情况，对方要求您单独陪酒并以工作机会作为威胁，这已经构成职场性骚扰。建议您：1. 立即保留所有相关证据（聊天记录、录音等）；2. 明确向对方表示拒绝；3. 向公司HR或上级反映；4. 如公司不作为，可向劳动监察部门投诉或申请仲裁。",
                    conclusions: [
                        "对方行为已构成职场性骚扰",
                        "建议立即保留证据（聊天记录、录音等）",
                        "明确拒绝并告知对方行为的严重性",
                        "向公司HR或上级反映情况",
                        "必要时可向劳动监察部门投诉"
                    ]
                },
                {
                    answer: "面试中询问婚育情况属于就业歧视，违反了《就业促进法》和《妇女权益保障法》。您有权拒绝回答此类问题，且这不能作为不予录用的合法理由。建议：1. 拒绝回答不合法问题；2. 如因此被拒，可收集证据维权；3. 可向劳动监察部门举报。",
                    conclusions: [
                        "面试询问婚育情况构成就业歧视",
                        "您有权拒绝回答此类问题",
                        "此情况不能作为不予录用的合法理由",
                        "可向劳动监察部门举报该企业"
                    ]
                },
                {
                    answer: "孕期调岗降薪必须经过员工本人同意，且调岗后的工资不得低于原工资。您可以：1. 不同意调岗降薪；2. 要求公司提供书面调岗通知；3. 保留工资条等证据；4. 向劳动监察部门投诉或申请仲裁。",
                    conclusions: [
                        "孕期调岗降薪必须员工本人同意",
                        "调岗后工资不得低于原工资",
                        "建议要求公司提供书面调岗通知",
                        "保留工资条等证据材料",
                        "可向劳动监察部门投诉或申请仲裁"
                    ]
                }
            ];

            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            
            // 保存对话记录
            conversations.push({
                user: inputText,
                bot: randomResponse.answer,
                timestamp: Date.now()
            });
            
            resolve(randomResponse);
        }, 1500);
    });
}

/**
 * 从回复中提取核心结论
 * @param {string} response - 智能体回复文本
 * @returns {Array<string>} - 核心结论列表
 */
function extractConclusions(response) {
    const conclusions = [];
    
    // 尝试匹配编号列表 (1. 2. 3. 或 一、二、三、)
    const numberPattern = /(?:^|\n)\s*(?:\d+[\.、)]\s*|[一二三四五六七八九十]+[、\.]\s*)([^\n]+)/g;
    let match;
    while ((match = numberPattern.exec(response)) !== null) {
        if (match[1] && match[1].length > 5) {
            conclusions.push(match[1].trim());
        }
    }
    
    // 如果没有提取到结论，尝试按句号分割取关键句
    if (conclusions.length === 0) {
        const sentences = response.split(/[。！？\n]/);
        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            // 提取包含关键词的句子作为结论
            if (trimmed.length > 10 && trimmed.length < 100 &&
                (trimmed.includes('建议') || trimmed.includes('应当') || 
                 trimmed.includes('可以') || trimmed.includes('有权'))) {
                conclusions.push(trimmed);
            }
        });
    }
    
    return conclusions.slice(0, 5); // 最多返回5条结论
}

/**
 * 言行雷达 - 识别歧视/骚扰言行
 * @param {string} content - 需要识别的言行内容
 * @returns {Promise<Object>} - 识别结果
 */
