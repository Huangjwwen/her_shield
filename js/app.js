/**
 * 她盾 —— 职场女性权益守护智能体
 * JavaScript 交互逻辑
 * 腾讯元器智能体对接接口
 */

// ==================== 腾讯元器智能体配置 ====================

/**
 * 腾讯元器智能体配置
 * API文档：https://yuanqi.tencent.com/openapi/v1/agent/chat/completions
 * 
 * 配置说明：
 * - appkey: 用于Bearer方式鉴权的token
 * - appid: 智能体的唯一标识，填入请求体的 assistant_id
 */
const YUANQI_CONFIG = {
    // API 端点（腾讯元器智能体 API 地址）
    API_ENDPOINT: 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions',
    
    // 是否使用真实 API（设为 true 启用真实调用，false 使用模拟数据）
    USE_REAL_API: true,
    
    // 各功能模块对应的智能体配置
    AGENTS: {
        // 智能咨询模块（通用咨询）
        consultation: {
            appkey: 't5XTXdztRxbZBWDkdFbdWJFl9qSnwCEh',
            appid: '2037893130997763264'
        },
        // 言行雷达模块
        radar: {
            appkey: 't5XTXdztRxbZBWDkdFbdWJFl9qSnwCEh',
            appid: '2037893130997763264'
        },
        // 权益指南模块
        selfcheck: {
            appkey: 'E2aXPzs6oSyDcLvP11NTu9tAap0T0rk3',
            appid: '2041405236168255296'
        },
        // 证据保全模块
        evidence: {
            appkey: 'V7Lgtt3lMn3699JabHBSt1oA4Sk7Fvst',
            appid: '2041711833478227776'
        },
        // 行动导航模块
        guide: {
            appkey: 'nzt6hu1R5IUYBDIQzpROO08SDNVy0MAs',
            appid: '2041721348920706112'
        },
        // 情绪树洞模块
        harbor: {
            appkey: 'jdbbNZkSS05Lh1bLpnqTSZYDyFxZyea7',
            appid: '2043227755042047040'
        }
    }
};

// 全局变量
let conversations = [];
let sessionId = generateSessionId();

// 存储各模块上传的图片
let uploadedImages = {
    radar: [],
    selfcheck: [],
    evidence: [],
    guide: [],
    harbor: []
};

// 生成会话ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== 工具函数 ====================

// 显示提示
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 显示/隐藏加载动画
function toggleLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// ==================== 腾讯元器 API 调用核心函数 ====================

/**
 * 调用腾讯元器智能体 API - 核心函数
 * @param {string} agentType - 智能体类型 (consultation/radar/selfcheck/evidence/guide)
 * @param {string} userMessage - 用户消息
 * @param {boolean} useStream - 是否使用流式输出（默认false）
 * @returns {Promise<string>} - 智能体回复文本
 */
async function callYuanqiAPI(agentType, userMessage, useStream = false) {
    // 如果未启用真实API，返回null让调用方使用模拟数据
    if (!YUANQI_CONFIG.USE_REAL_API) {
        return null;
    }

    // 获取对应智能体的配置
    const agentConfig = YUANQI_CONFIG.AGENTS[agentType];
    if (!agentConfig) {
        console.error('未找到智能体配置:', agentType);
        return null;
    }

    try {
        // 构建消息内容（按照腾讯元器API格式）
        const messages = [];
        
        // 添加对话历史（最近5轮，避免请求过长）
        const recentHistory = conversations.slice(-5);
        recentHistory.forEach(conv => {
            messages.push({
                role: 'user',
                content: [{ type: 'text', text: conv.user }]
            });
            messages.push({
                role: 'assistant',
                content: [{ type: 'text', text: conv.bot }]
            });
        });
        
        // 添加当前用户消息
        messages.push({
            role: 'user',
            content: [{ type: 'text', text: userMessage }]
        });

        // 构建请求体（按照腾讯元器API格式）
        const requestBody = {
            assistant_id: agentConfig.appid,
            user_id: sessionId,
            stream: useStream,
            messages: messages.length > 0 ? messages : [{
                role: 'user',
                content: [{ type: 'text', text: userMessage }]
            }]
        };

        console.log('调用腾讯元器 API:', agentType, requestBody);

        const response = await fetch(YUANQI_CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${agentConfig.appkey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('腾讯元器 API 错误:', errorText);
            throw new Error(`API 请求失败: ${response.status}`);
        }

        // 处理流式响应
        if (useStream) {
            return await handleStreamResponse(response);
        }

        // 处理非流式响应
        const data = await response.json();
        console.log('API 完整响应:', JSON.stringify(data, null, 2));
        
        // 解析返回结果 - 腾讯元器API响应格式
        // 格式1: { choices: [{ message: { content: "文本" } }] }
        // 格式2: { choices: [{ message: { content: [{ type: "text", text: "文本" }] } }] }
        // 格式3: { content: "文本" } 或其他格式
        
        if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            console.log('Choice数据:', choice);
            
            const message = choice.message || choice.delta;
            if (message) {
                const content = message.content;
                console.log('Content类型:', typeof content, content);
                
                if (typeof content === 'string') {
                    return content;
                } else if (Array.isArray(content)) {
                    // 处理 content 数组格式
                    const text = content.map(c => {
                        if (typeof c === 'string') return c;
                        if (c.type === 'text') return c.text || '';
                        return c.text || '';
                    }).join('');
                    return text;
                }
            }
        }
        
        // 尝试其他可能的响应格式
        if (data.content && typeof data.content === 'string') {
            return data.content;
        }
        
        if (data.response && typeof data.response === 'string') {
            return data.response;
        }
        
        if (data.answer && typeof data.answer === 'string') {
            return data.answer;
        }
        
        if (data.text && typeof data.text === 'string') {
            return data.text;
        }
        
        console.error('无法解析的响应格式:', data);
        throw new Error('API 返回数据格式异常');
        
    } catch (error) {
        console.error('调用腾讯元器 API 失败:', error);
        throw error;
    }
}

/**
 * 处理流式响应
 * @param {Response} response - fetch响应对象
 * @returns {Promise<string>} - 完整的回复文本
 */
async function handleStreamResponse(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                    const json = JSON.parse(data);
                    if (json.choices && json.choices[0]?.delta?.content) {
                        const content = json.choices[0].delta.content;
                        if (typeof content === 'string') {
                            result += content;
                        } else if (Array.isArray(content)) {
                            result += content.map(c => c.text || '').join('');
                        }
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }
    }
    
    return result;
}

/**
 * 智能体对接接口 - 发送问题并获取回复
 * @param {string} inputText - 用户输入的问题
 * @returns {Promise<Object>} - 智能体返回的结果
 */
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

// ==================== 左右分栏布局 - 侧边栏导航 ====================

// 当前激活的功能
let currentActiveTab = null;

// 初始化侧边栏导航
function initSidebarNav() {
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    const welcomePanel = document.getElementById('welcomePanel');
    const chatPanel = document.getElementById('chatPanel');

    sidebarButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // 如果点击的是当前已激活的按钮，则重置为空闲状态
            if (currentActiveTab === targetTab) {
                // 重置为空闲状态
                currentActiveTab = null;
                sidebarButtons.forEach(b => b.classList.remove('active'));
                welcomePanel.style.display = 'flex';
                chatPanel.style.display = 'none';
                return;
            }

            // 切换到新功能
            currentActiveTab = targetTab;

            // 更新按钮状态
            sidebarButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 显示对话面板，隐藏欢迎面板
            welcomePanel.style.display = 'none';
            chatPanel.style.display = 'flex';

            // 切换内容显示
            document.querySelectorAll('.chat-content').forEach(content => {
                content.style.display = 'none';
            });
            const targetContent = document.getElementById(targetTab + 'Chat');
            if (targetContent) {
                targetContent.style.display = 'flex';
            }

            // 加载该功能的历史记录
            if (targetTab !== 'stories') {
                loadHistory(targetTab);
            }
        });
    });
}

// ==================== 标签页切换（兼容旧版） ====================

// 初始化标签页切换
function initTabs() {
    // 如果存在侧边栏按钮，使用新的初始化方式
    if (document.querySelector('.sidebar-btn')) {
        initSidebarNav();
        return;
    }

    // 旧版标签页切换逻辑（兼容）
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // 切换按钮状态
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 切换内容显示
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });

            // 导航栏链接同步高亮
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.classList.remove('active');
                if (link.dataset.tab === targetTab) {
                    link.style.color = 'var(--primary-color)';
                } else {
                    link.style.color = '';
                }
            });
        });
    });

    // 导航栏快速入口（仅处理带有 data-tab 属性的链接）
    document.querySelectorAll('.nav-links a[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = link.dataset.tab;
            const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
            if (targetBtn) {
                // 显示功能板块
                document.getElementById('features').classList.add('show');
                targetBtn.click();
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

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

// ==================== 她的故事模块 ====================

// 初始化她的故事
function initStories() {
    const submitBtn = document.getElementById('submitStory');
    const titleInput = document.getElementById('storyTitle');
    const contentInput = document.getElementById('storyContent');

    if (!submitBtn) return;

    submitBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            showToast('请填写故事标题/内容');
            return;
        }

        // 静态演示，无实际提交功能
        showToast('你的故事已成功提交，感谢分享～');

        // 清空输入框
        titleInput.value = '';
        contentInput.value = '';
    });
}

// ==================== 通用历史记录管理 ====================

// 各模块历史记录存储
let historyStorage = {
    radar: [],
    selfcheck: [],
    evidence: [],
    guide: [],
    harbor: []
};

// 通用历史记录函数
function loadHistory(moduleName) {
    try {
        const saved = localStorage.getItem(moduleName + 'History');
        if (saved) {
            historyStorage[moduleName] = JSON.parse(saved);
        }
    } catch (e) {
        console.error('加载历史记录失败:', e);
        historyStorage[moduleName] = [];
    }
    renderHistory(moduleName);
}

function saveHistory(moduleName, userInput, botResponse) {
    const record = {
        id: Date.now(),
        time: new Date().toLocaleString('zh-CN'),
        userMessage: userInput,
        botMessage: botResponse
    };
    historyStorage[moduleName].unshift(record);
    
    if (historyStorage[moduleName].length > 50) {
        historyStorage[moduleName] = historyStorage[moduleName].slice(0, 50);
    }
    
    try {
        localStorage.setItem(moduleName + 'History', JSON.stringify(historyStorage[moduleName]));
    } catch (e) {
        console.error('保存历史记录失败:', e);
    }
    
    renderHistory(moduleName);
}

function renderHistory(moduleName) {
    const historyList = document.getElementById(moduleName + 'HistoryList');
    if (!historyList) return;
    
    const history = historyStorage[moduleName];
    if (history.length === 0) {
        const emptyText = {
            radar: '暂无对话记录，开始识别吧～',
            selfcheck: '暂无对话记录，开始查询吧～',
            evidence: '暂无对话记录，开始查询吧～',
            guide: '暂无对话记录，开始查询吧～',
            harbor: '暂无对话记录，开始倾诉吧～'
        };
        historyList.innerHTML = `<p class="history-empty">${emptyText[moduleName] || '暂无对话记录'}</p>`;
        return;
    }
    
    historyList.innerHTML = history.map(record => `
        <div class="history-item" data-id="${record.id}">
            <div class="history-time">${record.time}</div>
            <div class="history-user">${escapeHtml(record.userMessage)}</div>
            <div class="history-bot">${escapeHtml(record.botMessage)}</div>
            <div class="history-item-actions">
                <button class="btn-small" onclick="copyHistoryItem('${moduleName}', '${record.id}')">复制</button>
                <button class="btn-small" onclick="deleteHistoryItem('${moduleName}', '${record.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

function copyHistoryItem(moduleName, id) {
    const record = historyStorage[moduleName].find(r => r.id == id);
    if (record) {
        const text = `【我的输入】\n${record.userMessage}\n\n【智能体回复】\n${record.botMessage}`;
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        });
    }
}

function deleteHistoryItem(moduleName, id) {
    historyStorage[moduleName] = historyStorage[moduleName].filter(r => r.id != id);
    localStorage.setItem(moduleName + 'History', JSON.stringify(historyStorage[moduleName]));
    renderHistory(moduleName);
    showToast('已删除该记录');
}

function clearAllHistory(moduleName) {
    if (confirm('确定要清空所有对话记录吗？')) {
        historyStorage[moduleName] = [];
        localStorage.removeItem(moduleName + 'History');
        renderHistory(moduleName);
        showToast('对话记录已清空');
    }
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 她心港湾模块 ====================

// 初始化她心港湾
function initHarbor() {
    const harborInput = document.getElementById('harborInput');
    const clearInput = document.getElementById('clearHarborInput');
    const harborBtn = document.getElementById('harborBtn');
    const clearHistoryBtn = document.getElementById('clearHarborHistory');

    // 加载历史记录
    loadHistory('harbor');

    // 执行倾诉
    async function runHarbor() {
        const content = harborInput.value.trim();
        if (!content) {
            showToast('请输入您想倾诉的内容');
            return;
        }

        toggleLoading(true);

        try {
            const response = await callYuanqiAPI('harbor', content);
            
            if (response) {
                saveHistory('harbor', content, response);
                harborInput.value = '';
                showToast('倾诉完成');
            } else {
                const mockResponse = getMockHarborResponse(content);
                saveHistory('harbor', content, mockResponse);
                harborInput.value = '';
                showToast('倾诉完成（使用备用数据）');
            }
        } catch (error) {
            console.error('情绪树洞API调用失败:', error);
            const mockResponse = getMockHarborResponse(content);
            saveHistory('harbor', content, mockResponse);
            harborInput.value = '';
            showToast('倾诉完成（使用备用数据）');
        } finally {
            toggleLoading(false);
        }
    }

    // 备用模拟数据
    function getMockHarborResponse(content) {
        return `【暖心回应】

我理解你现在的感受，面对这样的情况确实让人感到困扰和无助。请记住，你的感受是合理的，不要责怪自己。

【一些建议】

1. 允许自己有这些情绪，不要压抑
2. 找信任的朋友或家人倾诉
3. 如果情况持续影响你，可以考虑寻求专业心理咨询帮助
4. 记住，你并不孤单，有很多人和你有类似的经历

【温暖的话】

"每一次勇敢面对，都是对自己的保护和关爱。你值得被尊重，你的权益应该得到保护。"

如果需要更多帮助，可以拨打心理咨询热线：400-161-9995`;
    }

    harborBtn.addEventListener('click', runHarbor);

    clearInput.addEventListener('click', () => {
        harborInput.value = '';
        clearAllImages('harbor');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('harbor'));
    }
}

// ==================== 首屏入口 ====================

// 初始化首屏
function initHero() {
    const enterBtn = document.getElementById('enterBtn');

    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            // 跳转到功能页面
            window.location.href = 'features.html';
        });
    }
}

// 显示功能板块（供导航栏调用）
function showFeatures() {
    const featuresEl = document.getElementById('features');
    if (featuresEl) {
        featuresEl.classList.add('show');
    }
}

// ==================== 免责声明弹窗 ====================

// 初始化免责声明按钮
function initDisclaimer() {
    const disclaimerBtn = document.getElementById('disclaimerBtn');
    if (disclaimerBtn) {
        disclaimerBtn.addEventListener('click', () => {
            showToast('本智能体仅提供法律信息参考，不构成专业法律意见，具体维权请咨询执业律师。');
        });
    }
}

// ==================== 图片上传功能 ====================

/**
 * 初始化图片上传功能
 * @param {string} moduleName - 模块名称 (radar/selfcheck/evidence/guide/harbor)
 */
function initImageUpload(moduleName) {
    const uploadBtn = document.getElementById(moduleName + 'UploadBtn');
    const imageInput = document.getElementById(moduleName + 'ImageInput');
    const imageArea = document.getElementById(moduleName + 'ImageArea');
    const previewContainer = document.getElementById(moduleName + 'ImagePreview');
    const clearBtn = document.getElementById('clear' + moduleName.charAt(0).toUpperCase() + moduleName.slice(1) + 'Input');

    if (!uploadBtn || !imageInput) return;

    // 点击上传按钮触发文件选择
    uploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // 文件选择后处理
    imageInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                addImagePreview(moduleName, file);
            }
        });
        // 清空input以便重复选择同一文件
        imageInput.value = '';
    });

    // 清空按钮同时清除图片
    if (clearBtn) {
        const originalHandler = clearBtn.onclick;
        clearBtn.addEventListener('click', () => {
            clearAllImages(moduleName);
        });
    }
}

/**
 * 添加图片预览
 * @param {string} moduleName - 模块名称
 * @param {File} file - 图片文件
 */
function addImagePreview(moduleName, file) {
    const imageArea = document.getElementById(moduleName + 'ImageArea');
    const previewContainer = document.getElementById(moduleName + 'ImagePreview');
    
    // 创建FileReader读取图片
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        
        // 存储图片数据
        uploadedImages[moduleName].push({
            id: Date.now() + Math.random(),
            file: file,
            data: imageData
        });

        // 创建预览元素
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.dataset.imageId = uploadedImages[moduleName][uploadedImages[moduleName].length - 1].id;
        previewItem.innerHTML = `
            <img src="${imageData}" alt="预览图片">
            <button class="image-preview-remove" title="移除图片">×</button>
        `;

        // 绑定删除事件
        previewItem.querySelector('.image-preview-remove').addEventListener('click', () => {
            removeImage(moduleName, previewItem.dataset.imageId);
        });

        previewContainer.appendChild(previewItem);
        
        // 显示图片上传区域
        imageArea.classList.add('has-images');
    };
    
    reader.readAsDataURL(file);
}

/**
 * 移除单张图片
 * @param {string} moduleName - 模块名称
 * @param {string} imageId - 图片ID
 */
function removeImage(moduleName, imageId) {
    const previewContainer = document.getElementById(moduleName + 'ImagePreview');
    const imageArea = document.getElementById(moduleName + 'ImageArea');
    
    // 从数据中移除
    uploadedImages[moduleName] = uploadedImages[moduleName].filter(img => img.id != imageId);
    
    // 从DOM中移除
    const previewItem = previewContainer.querySelector(`[data-image-id="${imageId}"]`);
    if (previewItem) {
        previewItem.remove();
    }
    
    // 如果没有图片了，隐藏上传区域
    if (uploadedImages[moduleName].length === 0) {
        imageArea.classList.remove('has-images');
    }
}

/**
 * 清除所有图片
 * @param {string} moduleName - 模块名称
 */
function clearAllImages(moduleName) {
    const previewContainer = document.getElementById(moduleName + 'ImagePreview');
    const imageArea = document.getElementById(moduleName + 'ImageArea');
    
    uploadedImages[moduleName] = [];
    previewContainer.innerHTML = '';
    imageArea.classList.remove('has-images');
}

/**
 * 获取模块的图片描述文本
 * @param {string} moduleName - 模块名称
 * @returns {string} - 图片描述文本
 */
function getImageDescription(moduleName) {
    const images = uploadedImages[moduleName];
    if (images.length === 0) return '';
    
    return `\n\n[用户上传了 ${images.length} 张图片，请结合图片内容进行分析]`;
}

/**
 * 支持拖拽上传图片
 * @param {string} moduleName - 模块名称
 */
function initDragDrop(moduleName) {
    const inputArea = document.getElementById(moduleName + 'Input')?.parentElement;
    if (!inputArea) return;

    inputArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        inputArea.style.borderColor = 'var(--primary-color)';
    });

    inputArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        inputArea.style.borderColor = '';
    });

    inputArea.addEventListener('drop', (e) => {
        e.preventDefault();
        inputArea.style.borderColor = '';
        
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                addImagePreview(moduleName, file);
            }
        });
    });
}

// ==================== 初始化 ====================

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化免责声明按钮
    initDisclaimer();
    
    // 初始化侧边栏导航（新布局）
    if (document.querySelector('.sidebar-btn')) {
        initSidebarNav();
    }
    
    // 初始化标签页切换（仅在功能页面需要）
    if (document.querySelector('.tab-btn')) {
        initTabs();
    }
    
    // 初始化各功能模块（仅在功能页面需要）
    if (document.getElementById('radarInput')) {
        initRadar();
        initImageUpload('radar');
    }
    
    if (document.getElementById('selfcheckInput')) {
        initSelfcheck();
        initImageUpload('selfcheck');
    }
    
    if (document.getElementById('evidenceInput')) {
        initEvidence();
        initImageUpload('evidence');
    }
    
    if (document.getElementById('guideInput')) {
        initGuide();
        initImageUpload('guide');
    }
    
    if (document.getElementById('storyTitle')) {
        initStories();
    }
    
    if (document.getElementById('harborInput')) {
        initHarbor();
        initImageUpload('harbor');
    }
    
    // 初始化首屏按钮（仅在首页需要）
    initHero();
});
