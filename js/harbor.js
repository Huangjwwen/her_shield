// ==================== 危机干预关键词检测系统 ====================

// 危机干预关键词表 - 这些关键词表示用户可能处于心理危机中
const CRISIS_KEYWORDS = {
    suicidal: [
        '自杀', '自杀念头', '想死', '活不下去', '不想活', '去死',
        '寻死', '投河', '跳楼', '割腕', '喝药', '死一死了',
        '一死了之', '了此残生', '结束生命', '不想活了', '轻生',
        '想自杀', '想结束自己', '死了算了'
    ],
    hopeless: [
        '绝望', '完全绝望', '没有希望', '活着没意思', '人生无望',
        '无路可走', '山穷水尽', '彻底失望', '这辈子完了'
    ],
    extreme_pain: [
        '太痛苦了', '活着太难了', '受不了了', '快疯了', '精神崩溃',
        '心如刀割', '生不如死', '极度痛苦', '承受不起'
    ],
    self_harm: [
        '自伤', '伤害自己', '自残', '割自己', '打自己',
        '撞墙', '惩罚自己', '虐待自己'
    ]
};

// 将所有关键词展平为一个数组以便搜索
const ALL_CRISIS_KEYWORDS = Object.values(CRISIS_KEYWORDS).flat();

/**
 * 检测用户输入中是否包含危机干预关键词
 * @param {string} text - 用户输入的文本
 * @returns {boolean} - 是否需要危机干预
 */
function hasCrisisKeywords(text) {
    const lowerText = text.toLowerCase();
    // 检查是否包含任何关键词
    return ALL_CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * 检测危机意图 — 发送消息前的检测入口
 * @param {string} text - 用户输入文本
 * @returns {boolean} - 是否命中危机关键词
 */
function detectCrisisIntent(text) {
    if (!text) return false;
    const result = hasCrisisKeywords(text);
    if (result) {
        console.log('危机命中:', text);
    }
    return result;
}

/**
 * 创建危机干预弹窗 DOM（只创建一次）
 */
function createCrisisModal() {
    let modal = document.getElementById('crisisModal');
    if (modal) return modal;
    
    modal = document.createElement('div');
    modal.id = 'crisisModal';
    modal.className = 'crisis-modal';
    modal.innerHTML = `
        <div class="crisis-overlay"></div>
        <div class="crisis-content">
            <div class="crisis-header">
                <span class="crisis-icon">💜</span>
                <span>你现在并不需要一个人扛着</span>
            </div>
            <div class="crisis-body">
                <p>如果你有伤害自己的冲动，<br>请立刻联系：</p>
            </div>
            
            <div class="crisis-hotline">
                <div class="hotline-title">📞 24h 心理援助热线</div>
                <div class="hotline-number">12356</div>
            </div>
            
            <div class="crisis-hotline">
                <div class="hotline-title">📞 北京心理危机干预中心</div>
                <div class="hotline-number">800-810-1117</div>
            </div>
            
            <div class="crisis-hotline">
                <div class="hotline-title">📞 紧急情况</div>
                <div class="hotline-number">110 / 120</div>
            </div>
            
            <div class="crisis-actions">
                <button class="crisis-btn crisis-btn-primary" onclick="closeCrisisModal()">我愿意寻求帮助</button>
                <button class="crisis-btn crisis-btn-secondary" onclick="closeCrisisModal()">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

// 标志位：当前这一轮对话中危机干预弹窗是否已显示过
let crisisModalShownThisSession = false;

/**
 * 显示危机干预弹窗
 */
function showCrisisModal() {
    // 本次对话中已显示过，不再重复弹出
    if (crisisModalShownThisSession) return;

    const modal = createCrisisModal();
    modal.classList.add('show');
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭危机干预弹窗
 */
function closeCrisisModal() {
    const modal = document.getElementById('crisisModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    // 标记本次对话已显示过，同一次对话中不再重复弹出
    crisisModalShownThisSession = true;
}

// ==================== 语音引导系统 ====================

const VOICE_GUIDE_TEXT = `慢慢呼吸……
先不用急着让自己振作。
你已经撑了很久了。

现在，把肩膀慢慢放松一点。
不用立刻解决问题。
也不用逼自己马上好起来。

这一刻，
你只需要先陪陪自己。

我会在这里。`;

// 全局语音状态（统一管理所有语音按钮的播放状态）
let isSpeaking = false;
let currentUtterance = null;
let currentAudio = null; // 云端 TTS 播放的 Audio 实例

// 云端 TTS 代理地址
const HARBOR_CLOUD_BASE_URL = (window.HER_SHIELD_CONFIG && window.HER_SHIELD_CONFIG.CLOUDBASE_BASE_URL)
    ? window.HER_SHIELD_CONFIG.CLOUDBASE_BASE_URL.replace(/\/$/, '')
    : '';
const TTS_PROXY_URL = `${HARBOR_CLOUD_BASE_URL}/proxy/tts`;

/**
 * 切换语音引导播放/停止（输入区域旁的呼吸引导按钮）
 */
function toggleVoiceGuide() {
    const btn = document.getElementById('voiceGuideBtn');
    if (!btn) return;

    if (isSpeaking) {
        // 停止所有语音
        stopAllAudio();
        isSpeaking = false;
        updateAllVoiceButtons();
        resetVoiceGuideBtn();
        return;
    }

    startVoiceGuide();
}

/**
 * 开始播放语音引导（呼吸放松）
 */
function startVoiceGuide() {
    const btn = document.getElementById('voiceGuideBtn');
    if (!btn) return;

    // 检查浏览器支持
    if (!window.speechSynthesis) {
        showToast('您的浏览器不支持语音播放功能');
        return;
    }

    // 如果已有正在播放的，先取消
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(VOICE_GUIDE_TEXT);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    // 选择最佳中文语音包
    const bestVoice = getBestChineseVoice();
    if (bestVoice) {
        utterance.voice = bestVoice;
    } else {
        showToast('您的浏览器没有中文语音包，请使用 Chrome 或 Edge 浏览器');
        return;
    }

    utterance.onstart = () => {
        isSpeaking = true;
        currentUtterance = utterance;
        btn.textContent = '⏹ 停止语音';
        btn.classList.add('playing');
    };

    utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        resetVoiceGuideBtn();
        updateAllVoiceButtons();
    };

    utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
            console.error('语音播放错误:', e.error);
        }
        isSpeaking = false;
        currentUtterance = null;
        resetVoiceGuideBtn();
        updateAllVoiceButtons();
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * 停止语音引导
 */
function stopVoiceGuide() {
    stopAllAudio();
    isSpeaking = false;
    resetVoiceGuideBtn();
    updateAllVoiceButtons();
}

/**
 * 重置呼吸引导按钮状态
 */
function resetVoiceGuideBtn() {
    const btn = document.getElementById('voiceGuideBtn');
    if (btn) {
        btn.textContent = '🎵 语音引导';
        btn.classList.remove('playing');
    }
}

// ==================== 她心港湾模块 ====================

// 初始化她心港湾
function initHarbor() {
    const harborInput = document.getElementById('harborInput');
    const clearInput = document.getElementById('clearHarborInput');
    const harborBtn = document.getElementById('harborBtn');
    const clearHistoryBtn = document.getElementById('clearHarborHistory');
    const voiceGuideBtn = document.getElementById('voiceGuideBtn');

    // 加载历史记录
    loadHistory('harbor');
    
    // 监听输入框，进行危机关键词检测
    harborInput.addEventListener('input', (e) => {
        const content = e.target.value;
        if (content && hasCrisisKeywords(content)) {
            // 发现危机关键词，显示弹窗
            showCrisisModal();
        }
    });

    // 执行倾诉
    async function runHarbor() {
        const content = harborInput.value.trim();
        if (!content) {
            showToast('请输入您想倾诉的内容');
            return;
        }

        // 发送前检测危机关键词
        if (detectCrisisIntent(content)) {
            showCrisisModal();
            return;
        }

        toggleLoading(true);

        try {
            const response = await callYuanqiAPI('harbor', content);
            
            if (response) {
                saveHistory('harbor', content, response);
                harborInput.value = '';
                crisisModalShownThisSession = false;
                showToast('倾诉完成');
            } else {
                const mockResponse = getMockHarborResponse(content);
                saveHistory('harbor', content, mockResponse);
                harborInput.value = '';
                crisisModalShownThisSession = false;
                showToast('倾诉完成（使用备用数据）');
            }
        } catch (error) {
            console.error('情绪树洞API调用失败:', error);
            const mockResponse = getMockHarborResponse(content);
            saveHistory('harbor', content, mockResponse);
            harborInput.value = '';
            crisisModalShownThisSession = false;
            showToast('倾诉完成（使用备用数据）');
        } finally {
            toggleLoading(false);
        }
    }

    // 备用模拟数据
    function getMockHarborResponse(content) {
        // 增强的CBT结构化回复
        return generateCBTResponse(content);
    }

    harborBtn.addEventListener('click', runHarbor);

    // 语音引导按钮
    if (voiceGuideBtn) {
        voiceGuideBtn.addEventListener('click', toggleVoiceGuide);
    }

    clearInput.addEventListener('click', () => {
        harborInput.value = '';
        clearAllImages('harbor');
    });

    // 清空历史记录
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => clearAllHistory('harbor'));
    }
    
    // 修改港湾模块的历史记录渲染方式，添加语音引导
    const originalRenderHistory = window.renderHistory;
    window.renderHistory = function(moduleName) {
        if (moduleName !== 'harbor') {
            return originalRenderHistory.call(this, moduleName);
        }
        
        // 港湾模块特殊处理 - 添加语音引导
        const historyList = document.getElementById('harborHistoryList');
        if (!historyList) return;
        
        const history = historyStorage['harbor'];
        if (history.length === 0) {
            historyList.innerHTML = '<p class="history-empty">暂无对话记录，开始倾诉吧～</p>';
            return;
        }
        
        historyList.innerHTML = history.map((record, index) => `
            <div class="history-item" data-id="${record.id}">
                <div class="history-time">${record.time}</div>
                <div class="history-user">${escapeHtml(record.userMessage)}</div>
                <div class="history-bot">${escapeHtml(record.botMessage)}</div>
                <div style="margin-top: 10px;">
                    <button class="voice-guide-btn voice-guide-history-btn" data-guide-index="${index}" data-bot-message="${escapeHtml(record.botMessage)}">
                        🎧 AI 语音回放
                    </button>
                </div>
                <div class="history-item-actions">
                    <button class="btn-small" onclick="copyHistoryItem('harbor', '${record.id}')">复制</button>
                    <button class="btn-small" onclick="deleteHistoryItem('harbor', '${record.id}')">删除</button>
                </div>
            </div>
        `).join('');
        
        // 为历史记录中的语音按钮绑定事件
        historyList.querySelectorAll('.voice-guide-history-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const botMsg = this.getAttribute('data-bot-message');
                speakGuideHistory(botMsg, this);
            });
        });
    };
}

// ==================== CBT 认知行为疗法结构 ====================

/**
 * 生成 CBT 结构的回复
 * CBT 三步骤：识别 → 挑战 → 重构信念
 */
function generateCBTResponse(userContent) {
    // 识别用户的情绪和认知模式
    const emotions = detectEmotions(userContent);
    const thinkingPatterns = detectThinkingPatterns(userContent);
    
    let response = `【🧠 情绪识别】\n`;
    
    // 1. 识别阶段 - 帮助用户认识自己的情绪
    response += `我听到了你的声音。你现在感受到的情绪包括：${emotions.join('、')}\n`;
    response += `这些情绪是正常的反应，值得被重视。\n\n`;
    
    // 2. 认知识别 - 识别非理性思维模式
    if (thinkingPatterns.length > 0) {
        response += `【⚡ 认知模式识别】\n`;
        response += `在你的描述中，我注意到了这些常见的思维模式：\n`;
        thinkingPatterns.forEach((pattern, index) => {
            response += `${index + 1}. ${pattern}\n`;
        });
        response += `\n`;
    }
    
    // 3. 挑战阶段 - 温和地挑战非理性思维
    response += `【💡 重新审视】\n`;
    response += `让我们一起来温和地审视这些想法：\n`;
    response += `• 这个想法是100%准确的吗？有没有其他的可能性？\n`;
    response += `• 如果这件事发生在你信任的朋友身上，你会怎么看待它？\n`;
    response += `• 在这种情况下，你的优点和资源有哪些？\n\n`;
    
    // 4. 重构阶段 - 帮助构建更理性的信念
    response += `【🌈 新的视角】\n`;
    response += `尝试用这个更平衡的观点：\n`;
    response += generateBalancedThought(userContent);
    response += `\n\n`;
    
    // 5. 行动计划 - 制定小步骤
    response += `【🎯 今天可以尝试】\n`;
    response += generateActionSteps(userContent);
    response += `\n\n`;
    
    // 6. 自我同情
    response += `【💚 温暖的话】\n`;
    response += `"你正在经历困难，但这不意味着你很弱。相反，你正在勇敢地面对它。\n`;
    response += `每一个小的改变都是值得庆祝的。你值得被善待，首先要对自己善待。"\n\n`;
    
    response += `如果这些感受继续困扰你，寻求专业心理咨询师的帮助是一个很好的选择。`;
    
    return response;
}

/**
 * 检测情绪
 */
function detectEmotions(text) {
    const emotionMap = {
        '难过|伤心|痛苦|悲伤': '悲伤',
        '愤怒|生气|烦|烦躁': '愤怒',
        '焦虑|紧张|担心|害怕': '焦虑',
        '无助|无力|绝望': '无力感',
        '委屈|委屈|被伤害': '受伤感',
        '孤独|孤单|被遗弃': '孤独感'
    };
    
    const emotions = [];
    for (const [keywords, emotion] of Object.entries(emotionMap)) {
        const regex = new RegExp(keywords);
        if (regex.test(text)) {
            emotions.push(emotion);
        }
    }
    
    return emotions.length > 0 ? emotions : ['困扰和不适'];
}

/**
 * 检测非理性思维模式
 */
function detectThinkingPatterns(text) {
    const patterns = [];
    
    // 绝对化思维
    if (/应该|必须|一定要|永远|从不|总是/.test(text)) {
        patterns.push('绝对化思维：用过于绝对的语言来评判自己和他人');
    }
    
    // 灾难化思维
    if (/完了|毁了|最坏|永远无法|无救/.test(text)) {
        patterns.push('灾难化思维：倾向于预期最糟的结果');
    }
    
    // 标签化
    if (/我是|我很|我不是/.test(text)) {
        patterns.push('标签化：用不变的标签来定义自己');
    }
    
    // 自责
    if (/都是我的错|我太|我应该/.test(text)) {
        patterns.push('过度自责：承担过多的责任');
    }
    
    return patterns;
}

/**
 * 生成更平衡的想法
 */
function generateBalancedThought(userContent) {
    if (userContent.includes('失败')) {
        return `"失败不是永久的，而是学习的机会。一次的失败不代表总会失败。"`;
    } else if (userContent.includes('不好') || userContent.includes('坏')) {
        return `"这种情况虽然困难，但不代表一切都是坏的。也许现在很硬，但可能会改变。"`;
    } else if (userContent.includes('别人')) {
        return `"每个人都有困难时期。你不是一个人在经历这些。"`;
    }
    return `"这是一个挑战，而不是一个永久的状态。你有能力适应和改变。"`;
}

/**
 * 生成行动步骤
 */
function generateActionSteps(userContent) {
    const steps = [
        '• 1个小行动：今天做一件让自己感到舒服的事（走路、听音乐、和朋友聊天）',
        '• 2个观察：注意今天发生的两件好事，无论多小',
        '• 3次呼吸：当感受强烈时，做3次深呼吸，给自己停顿',
    ];
    
    return steps.join('\n');
}

// ==================== 语音引导系统 ====================

/**
 * 按优先级获取最佳中文语音包
 * 优先级：Microsoft Huihui > Microsoft Yaoyao > 中文 Female > 任意中文
 * @returns {SpeechSynthesisVoice|null} 最佳语音对象，或 null（无中文语音时）
 */
function getBestChineseVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Microsoft Huihui（微软慧慧 - Edge 内置，最自然的女声）
    let voice = voices.find(v => v.name === 'Microsoft Huihui');
    if (voice) return voice;

    // 2. Microsoft Yaoyao（微软瑶瑶 - Edge 内置女声）
    voice = voices.find(v => v.name === 'Microsoft Yaoyao');
    if (voice) return voice;

    // 3. 名称含 Female 且 lang 为 zh 开头
    voice = voices.find(v => /female/i.test(v.name) && v.lang.startsWith('zh'));
    if (voice) return voice;

    // 4. 任意 lang 为 zh 开头的语音
    voice = voices.find(v => v.lang.startsWith('zh'));
    if (voice) return voice;

    return null;
}

// ==================== 云端 TTS 播放系统 ====================

/**
 * 停止所有正在播放的音频（云端 Audio + 浏览器 SpeechSynthesis）
 */
function stopAllAudio() {
    // 停止云端 TTS 的 Audio 实例
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        // 释放 Blob URL
        if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
            URL.revokeObjectURL(currentAudio.src);
        }
        currentAudio = null;
    }
    // 停止浏览器 SpeechSynthesis
    window.speechSynthesis.cancel();
    currentUtterance = null;
}

/**
 * 使用云端 Azure TTS 播放语音
 * @param {string} text - 待播放的文本
 * @param {HTMLElement} btnElement - 触发播放的按钮
 * @returns {Promise<boolean>} true 表示成功，false 表示需降级
 */
async function playWithCloudTTS(text, btnElement) {
    try {
        const url = `${TTS_PROXY_URL}?text=${encodeURIComponent(text)}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn('云端 TTS 请求失败，状态码:', response.status);
            return false;
        }

        const blob = await response.blob();
        if (!blob || blob.size === 0) {
            console.warn('云端 TTS 返回空音频');
            return false;
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        // 播放开始
        audio.addEventListener('play', () => {
            isSpeaking = true;
            updateVoiceButtonState(btnElement, true);
        });

        // 播放结束
        audio.addEventListener('ended', () => {
            isSpeaking = false;
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            updateAllVoiceButtons();
        });

        // 播放出错
        audio.addEventListener('error', (e) => {
            console.error('云端 TTS 音频播放出错:', e);
            isSpeaking = false;
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            updateAllVoiceButtons();
        });

        await audio.play();
        return true;
    } catch (err) {
        console.error('云端 TTS 调用异常:', err);
        // 清理可能的残留状态
        if (currentAudio) {
            if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(currentAudio.src);
            }
            currentAudio = null;
        }
        return false;
    }
}

/**
 * 使用浏览器内置 SpeechSynthesis 播放语音（降级方案）
 * @param {string} text - 待播放的文本
 * @param {HTMLElement} btnElement - 触发播放的按钮
 */
function playWithBrowserTTS(text, btnElement) {
    if (!window.speechSynthesis) {
        showToast('您的浏览器不支持语音播放功能');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    const bestVoice = getBestChineseVoice();
    if (bestVoice) {
        utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
        isSpeaking = true;
        currentUtterance = utterance;
        updateVoiceButtonState(btnElement, true);
    };

    utterance.onend = () => {
        isSpeaking = false;
        currentUtterance = null;
        updateAllVoiceButtons();
    };

    utterance.onerror = (e) => {
        if (e.error !== 'canceled') {
            console.error('浏览器语音播放错误:', e.error);
        }
        isSpeaking = false;
        currentUtterance = null;
        updateAllVoiceButtons();
    };

    window.speechSynthesis.speak(utterance);
}

// 语音引导配置数组
const VOICE_GUIDES = [
    {
        title: '呼吸放松',
        text: `慢慢呼吸……
先不用急着让自己振作。
你已经撑了很久了。

现在，把肩膀慢慢放松一点。
不用立刻解决问题。
也不用逼自己马上好起来。

这一刻，
你只需要先陪陪自己。

我会在这里。`
    },
    {
        title: '自我关怀',
        text: `把手轻轻放在心口。
感受自己的心跳。
你是值得被温柔对待的。

不需要做到完美。
不需要让所有人都满意。
现在的你，已经足够好了。

给自己一个拥抱吧。
哪怕只是想象中也可以。`
    },
    {
        title: '情绪释放',
        text: `闭上眼睛。
允许自己的情绪自由流动。
悲伤也好，愤怒也好，
它们都是你的一部分。

不需要压抑。
不需要逃避。
让它们像云一样，
来了又走。

你是安全的。
现在很安全。`
    }
];

/**
 * 更新单个语音按钮的外观
 * @param {HTMLElement} btn - 按钮 DOM 元素
 * @param {boolean} isActive - 是否正在播放
 */
function updateVoiceButtonState(btn, isActive) {
    if (!btn) return;
    
    const guideIndex = parseInt(btn.getAttribute('data-guide-index'));
    const guide = VOICE_GUIDES[guideIndex];
    
    if (isActive) {
        btn.textContent = '⏹️ 停止语音';
        btn.classList.add('active');
    } else {
        btn.textContent = guide ? `🎧 ${guide.title}` : '🎧 语音引导';
        btn.classList.remove('active');
    }
}

/**
 * 恢复所有语音按钮的初始文字和样式
 */
function updateAllVoiceButtons() {
    const buttons = document.querySelectorAll('.voice-guide-btn');
    buttons.forEach(btn => {
        updateVoiceButtonState(btn, false);
    });
}

/**
 * 统一的语音引导播放/停止函数
 * @param {number} guideIndex - VOICE_GUIDES 数组的索引
 * @param {HTMLElement} btnElement - 触发点击的按钮 DOM 元素
 */
function speakGuide(guideIndex, btnElement) {
    const guide = VOICE_GUIDES[guideIndex];
    if (!guide) return;

    // 如果正在播放，则停止
    if (isSpeaking) {
        stopAllAudio();
        isSpeaking = false;
        updateAllVoiceButtons();
        return;
    }

    // 先尝试云端 TTS，失败则降级到浏览器 TTS
    playWithCloudTTS(guide.text, btnElement).then((cloudSuccess) => {
        if (!cloudSuccess) {
            // 云端 TTS 不可用，降级使用浏览器内置语音
            playWithBrowserTTS(guide.text, btnElement);
        }
    });
}

/**
 * 渲染语音引导按钮组
 * 在港湾模块初始化时调用，将按钮插入指定容器
 * @param {string} containerId - 按钮容器的 DOM ID
 */
function renderVoiceGuideButtons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = VOICE_GUIDES.map((guide, index) => `
        <button class="voice-guide-btn" data-guide-index="${index}">
            🎧 ${guide.title}
        </button>
    `).join('');

    // 为所有按钮绑定 click 事件
    container.querySelectorAll('.voice-guide-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.getAttribute('data-guide-index'));
            speakGuide(idx, this);
        });
    });
}

/**
 * 历史记录中的语音回放函数
 * 播放 AI 回复的文本内容，同时复用按钮状态管理
 * @param {string} text - AI 回复文本
 * @param {HTMLElement} btnElement - 触发点击的按钮 DOM 元素
 */
function speakGuideHistory(text, btnElement) {
    if (!text) return;

    // 如果正在播放，则停止
    if (isSpeaking) {
        stopAllAudio();
        isSpeaking = false;
        updateAllVoiceButtons();
        return;
    }

    // 清理文本（去除markdown格式）
    const cleanText = text
        .replace(/\[.*?\]/g, '')
        .replace(/[#*_`【】]/g, '')
        .replace(/\n/g, '。')
        .substring(0, 1000);

    // 先尝试云端 TTS，失败则降级到浏览器 TTS
    playWithCloudTTS(cleanText, btnElement).then((cloudSuccess) => {
        if (!cloudSuccess) {
            // 云端 TTS 不可用，降级使用浏览器内置语音
            playWithBrowserTTS(cleanText, btnElement);
        }
    });
}
