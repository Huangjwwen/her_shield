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
            appkey: '',
            appid: '2037893130997763264'
        },
        // 言行雷达模块
        radar: {
            appkey: '',
            appid: '2037893130997763264'
        },
        // 权益指南模块
        selfcheck: {
            appkey: '',
            appid: '2041405236168255296'
        },
        // 证据保全模块
        evidence: {
            appkey: '',
            appid: '2041711833478227776'
        },
        // 行动导航模块
        guide: {
            appkey: '',
            appid: '2041721348920706112'
        },
        // 情绪树洞模块
        harbor: {
            appkey: '',
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
async function callYuanqiAPI(agentType, userMessage, useStream = false, extras = {}) {
    // extras: 额外透传给元器工作流"开始节点"的自定义入参，如 { force: true, has_image: false, image_urls: [], query: '...' }。
    // 代理云函数会把它们和 agentType/messages 一起转发给元器，工作流"开始节点"按自定义变量名取用。
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

        const response = await fetch(
            'https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentType,
                    messages,
                    ...(extras && typeof extras === 'object' ? extras : {})
                })
            }
        );

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
        const rawData = await response.json();
        const data = rawData && rawData.success === true && rawData.data
            ? rawData.data
            : rawData;

        if (rawData && rawData.success === false) {
            throw new Error(rawData.error || 'Proxy request failed');
        }

        if (data && data.error) {
            const err = data.error;
            throw new Error(err.message || err.code || 'Yuanqi workflow failed');
        }
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
