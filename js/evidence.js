const SCENE_MAP = {
    recruit: "招聘性别歧视",
    verbal: "职场言语性骚扰",
    physical: "职场肢体性骚扰",
    pregnancy: "孕期调岗降薪",
    salary: "薪酬性别差异",
    other: "其他性别不公"
};

/**
 * 证据留存助手 - 获取取证指南
 * @param {string} scene - 维权场景
 * @returns {Promise<Object>} - 取证指南
 */
async function callSmartAgent_evidence(scene) {
    // 获取场景文本
    const sceneText = SCENE_MAP[scene] || scene;
    
    // 构建提示消息
    const promptMessage = `请针对以下维权场景，提供详细的取证指南：

场景：${sceneText}

请按以下格式回复：
1. 核心证据类型：说明需要收集的核心证据
2. 取证方法：列出具体的取证方法（多条）
3. 取证注意事项：说明取证时需要注意的事项
4. 证据保存方式：说明如何保存证据`;

    try {
        // 调用腾讯元器API
        const response = await callYuanqiAPI('evidence', promptMessage);
        
        if (response) {
            // 解析智能体回复
            const result = parseEvidenceResponse(response);
            return result;
        }
    } catch (error) {
        console.error('调用证据留存API失败，使用模拟数据:', error);
    }

    // 模拟取证指南（演示用/备用）
    return new Promise((resolve) => {
        setTimeout(() => {
            const guides = {
                verbal: {
                    core: "言语/文字类证据：微信聊天记录、短信、邮件、录音录像",
                    methods: [
                        "使用手机录音功能录制对话",
                        "截图保存暧昧/骚扰性聊天记录",
                        "保存邮件往来中的不当言论",
                        "录屏保存社交媒体上的骚扰内容"
                    ],
                    notes: [
                        "录音需说明时间、地点、人物",
                        "聊天记录截图需完整连贯",
                        "最好有第三方在场作证"
                    ],
                    save: "建议备份到云端和U盘双保存"
                },
                physical: {
                    core: "肢体接触类证据：录像、伤痕照片、证人证言",
                    methods: [
                        "安装隐蔽录像设备",
                        "及时拍摄身体上的伤痕/接触痕迹",
                        "寻找现场目击证人并记录联系方式",
                        "就医记录和诊断证明"
                    ],
                    notes: [
                        "录像要清晰显示时间地点",
                        "伤痕照片要显示拍摄时间",
                        "证人证言最好书面签字"
                    ],
                    save: "保留原始载体，同时备份电子版"
                },
                recruit: {
                    core: "招聘歧视证据：招聘广告、面试记录、拒绝通知",
                    methods: [
                        "截图招聘网站上的歧视性要求",
                        "保存面试过程中的录音",
                        "获取书面的拒绝录用通知",
                        "收集同期入职男性的待遇对比"
                    ],
                    notes: [
                        "招聘广告截图要完整",
                        "录音需征得对方同意或证明地点公开",
                        "注意保留招聘流程中的所有文件"
                    ],
                    save: "纸质材料扫描保存，电子档多处备份"
                },
                pregnancy: {
                    core: "孕期调岗降薪证据：调岗通知、工资条、劳动合同",
                    methods: [
                        "要求公司出具书面调岗通知",
                        "每月保留工资条或银行流水",
                        "保存劳动合同和员工手册",
                        "记录孕期期间的工作安排变化"
                    ],
                    notes: [
                        "调岗需双方书面同意",
                        "孕期不得安排国家规定的禁忌劳动",
                        "产假工资和生育津贴不得克扣"
                    ],
                    save: "所有文件复印留存，电子档备份"
                }
            };

            const guide = guides[scene] || {
                core: "根据具体场景收集相关证据",
                methods: ["保留相关书面材料", "录音录像保存", "寻找证人"],
                notes: ["证据要真实完整", "注意保存原始载体"],
                save: "建议多处备份"
            };

            resolve(guide);
        }, 1500);
    });
}

/**
 * 解析证据留存响应
 * @param {string} response - 智能体回复
 * @returns {Object} - 解析后的结果
 */
function parseEvidenceResponse(response) {
    // 默认结果
    let result = {
        core: "根据具体情况收集证据",
        methods: ["保留相关书面材料", "录音录像保存", "寻找证人"],
        notes: ["证据要真实完整", "注意保存原始载体"],
        save: "建议多处备份"
    };
    
    // 尝试提取核心证据类型
    const coreMatch = response.match(/(?:核心证据类型)[：:]\s*([^\n]+)/);
    if (coreMatch) {
        result.core = coreMatch[1].trim();
    }
    
    // 尝试提取取证方法（多条）
    const methodsMatch = response.match(/(?:取证方法)[：:]\s*([\s\S]*?)(?=(?:取证注意事项|证据保存|$))/);
    if (methodsMatch) {
        const methodsText = methodsMatch[1];
        const methods = methodsText.match(/[1-9][\.、)]\s*([^\n]+)/g);
        if (methods) {
            result.methods = methods.map(m => m.replace(/^[1-9][\.、)]\s*/, '').trim());
        }
    }
    
    // 尝试提取注意事项
    const notesMatch = response.match(/(?:取证注意事项)[：:]\s*([\s\S]*?)(?=(?:证据保存|$))/);
    if (notesMatch) {
        const notesText = notesMatch[1];
        const notes = notesText.match(/[1-9][\.、)]\s*([^\n]+)/g);
        if (notes) {
            result.notes = notes.map(n => n.replace(/^[1-9][\.、)]\s*/, '').trim());
        }
    }
    
    // 尝试提取保存方式
    const saveMatch = response.match(/(?:证据保存方式)[：:]\s*([^\n]+)/);
    if (saveMatch) {
        result.save = saveMatch[1].trim();
    }
    
    return result;
}

/**
 * 行动指南 - 获取分步维权路径
 * @param {string} scene - 维权场景
 * @returns {Promise<Object>} - 维权步骤
 */
// ==================== 证据留存助手模块 ====================

// 初始化证据留存助手
function initEvidence() {
    const evidenceInput = document.getElementById('evidenceInput');
    const clearInput = document.getElementById('clearEvidenceInput');
    const evidenceBtn = document.getElementById('evidenceBtn');
    const clearHistoryBtn = document.getElementById('clearEvidenceHistory');

    // 加载历史记录
    loadHistory('evidence');

    // 执行查询
    async function runEvidence() {
        const content = evidenceInput.value.trim();
        if (!content) {
            showToast('请描述您需要取证的维权场景');
            return;
        }

        toggleLoading(true);

        try {
            const response = await callYuanqiAPI('evidence', content);
            
            if (response) {
                saveHistory('evidence', content, response);
                evidenceInput.value = '';
                showToast('查询完成');
            } else {
                const mockResponse = getMockEvidenceResponse(content);
                saveHistory('evidence', content, mockResponse);
                evidenceInput.value = '';
                showToast('查询完成（使用备用数据）');
            }
        } catch (error) {
            console.error('证据取证API调用失败:', error);
            const mockResponse = getMockEvidenceResponse(content);
            saveHistory('evidence', content, mockResponse);
            evidenceInput.value = '';
            showToast('查询完成（使用备用数据）');
        } finally {
            toggleLoading(false);
        }
    }

    // 备用模拟数据
    function getMockEvidenceResponse(content) {
        if (content.includes('骚扰') || content.includes('黄色')) {
            return `【核心证据类型】
言语/文字类证据：微信聊天记录、短信、邮件、录音录像

【取证方法】
1. 使用手机录音功能录制对话
2. 截图保存暧昧/骚扰性聊天记录
3. 保存邮件往来中的不当言论
4. 录屏保存社交媒体上的骚扰内容

【取证注意事项】
• 录音需说明时间、地点、人物
• 聊天记录截图需完整连贯
• 最好有第三方在场作证

【证据保存方式】
建议备份到云端和U盘双保存`;
        }
        return `【核心证据类型】
根据具体场景收集相关证据：书面材料、录音录像、证人证言

【取证方法】
1. 保留相关书面材料
2. 录音录像保存
3. 寻找证人

【取证注意事项】
• 证据要真实完整
• 注意保存原始载体

【证据保存方式】
建议多处备份`;
    }

    evidenceBtn.addEventListener('click', runEvidence);

    clearInput.addEventListener('click', () => {
        evidenceInput.value = '';
        clearAllImages('evidence');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('evidence'));
    }
}

