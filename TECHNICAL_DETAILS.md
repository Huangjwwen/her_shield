# 技术实现细节文档

## 📚 目录
1. [API 与依赖](#api-与依赖)
2. [函数签名](#函数签名)
3. [数据流](#数据流)
4. [错误处理](#错误处理)
5. [性能优化](#性能优化)
6. [安全考虑](#安全考虑)
7. [扩展指南](#扩展指南)

---

## API 与依赖

### 使用的 Web API

#### 1. Web Crypto API（3.1）
```javascript
// 用途：计算文件 SHA-256 哈希
crypto.subtle.digest(algorithm, data)

// 支持情况
- Chrome 37+
- Firefox 34+
- Safari 11+
- Edge 79+
- 不支持 IE

// 示例
const buffer = await file.arrayBuffer();
const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
```

#### 2. Web Speech API（3.4）
```javascript
// 用途：文本转语音
speechSynthesis.speak(utterance)

// 支持情况
- Chrome 14+
- Firefox 49+
- Safari 14.1+
- Edge 79+
- 不支持 IE

// 示例
const utterance = new SpeechSynthesisUtterance('文本内容');
utterance.lang = 'zh-CN';
speechSynthesis.speak(utterance);
```

#### 3. Clipboard API（3.1）
```javascript
// 用途：复制到剪贴板
navigator.clipboard.writeText(text)

// 支持情况
- Chrome 63+
- Firefox 53+
- Safari 13.1+
- Edge 79+

// 示例
navigator.clipboard.writeText(hashValue).then(() => {
    showToast('已复制');
});
```

#### 4. File API（3.1）
```javascript
// 用途：读取文件
file.arrayBuffer()

// 支持情况
- 所有现代浏览器

// 示例
const buffer = await file.arrayBuffer();
```

### 外部依赖
- ❌ 无任何 npm 包依赖
- ✅ 纯原生 JavaScript
- ✅ 可选：html2canvas（用于截图功能的完整版）

---

## 函数签名

### 3.1 SHA-256 函数集

#### calculateFileSHA256(file: File): Promise<string>
```javascript
/**
 * 计算文件的 SHA-256 哈希值
 * @param {File} file - 上传的文件对象
 * @returns {Promise<string>} - 十六进制的 SHA-256 哈希值（64个字符）
 * @throws {Error} - 如果计算失败
 * 
 * 示例：
 * const file = event.target.files[0];
 * const hash = await calculateFileSHA256(file);
 * console.log(hash); // "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
 */
```

#### generateCertificateCard(file: File, hash: string): string
```javascript
/**
 * 生成存证凭证卡片 HTML
 * @param {File} file - 原始文件对象
 * @param {string} hash - SHA-256 哈希值
 * @returns {string} - HTML 字符串（包含卡片和交互功能）
 * 
 * 包含的信息：
 * - 证书 ID：CERT_[时间戳]
 * - 文件名、大小、修改时间
 * - SHA-256 指纹
 * - 操作按钮（下载、截图、删除）
 */
```

#### downloadCertificate(certId: string): void
```javascript
/**
 * 下载证书为 JSON 文件
 * @param {string} certId - 证书 ID（如 "CERT_1234567890"）
 * 
 * 下载的 JSON 结构：
 * {
 *   "id": "CERT_xxx",
 *   "fileName": "document.pdf",
 *   "sha256": "abc123...",
 *   "timestamp": "2026-05-26T10:30:00.000Z",
 *   "description": "..."
 * }
 */
```

#### screenshotCertificate(certId: string): void
```javascript
/**
 * 截图证书（需要 html2canvas 库）
 * 备用方案：复制卡片文本内容到剪贴板
 * @param {string} certId - 证书 ID
 */
```

#### deleteCertificate(certId: string): void
```javascript
/**
 * 删除证书卡片（带消失动画）
 * @param {string} certId - 证书 ID
 */
```

#### initEvidenceFileUpload(): void
```javascript
/**
 * 初始化文件上传功能
 * - 创建拖拽上传区域
 * - 绑定拖拽和点击事件
 * - 处理文件上传和哈希计算
 * 
 * 自动在 initEvidence() 中调用
 */
```

### 3.2 ToDoList 函数集

#### renderEvidenceChecklist(record: Object): string
```javascript
/**
 * 将证据取证指南转换为可勾选的 ToDoList
 * @param {Object} record - 历史记录对象
 *   - record.id: 记录 ID（时间戳）
 *   - record.time: 时间字符串
 *   - record.userMessage: 用户输入
 *   - record.botMessage: 智能体回复（包含【取证方法】）
 * @returns {string} - HTML 字符串（包含 ToDoList）
 * 
 * 自动解析【取证方法】部分并转换为清单项目
 */
```

#### updateEvidenceProgress(checklistId: string, totalItems: number): void
```javascript
/**
 * 更新取证清单的进度条
 * @param {string} checklistId - 清单 ID（如 "checklist_1234567890"）
 * @param {number} totalItems - 清单总项数
 * 
 * 功能：
 * - 计算已勾选的项数
 * - 更新进度条宽度
 * - 更新计数器文本（X/Y）
 * - 完成 100% 时显示庆祝提示
 */
```

### 3.3 危机干预函数集

#### hasCrisisKeywords(text: string): boolean
```javascript
/**
 * 检测文本中是否包含危机干预关键词
 * @param {string} text - 要检测的文本
 * @returns {boolean} - 是否包含危机关键词
 * 
 * 示例：
 * hasCrisisKeywords("我想自杀"); // true
 * hasCrisisKeywords("我有点难过"); // false
 * 
 * 关键词来源：
 * - CRISIS_KEYWORDS.suicidal: 自杀相关
 * - CRISIS_KEYWORDS.hopeless: 绝望相关
 * - CRISIS_KEYWORDS.extreme_pain: 极端痛苦
 * - CRISIS_KEYWORDS.self_harm: 自伤相关
 */
```

#### showCrisisModal(): void
```javascript
/**
 * 显示危机干预弹窗
 * - 如果已存在，直接显示
 * - 否则创建新的弹窗 DOM
 * - 配置样式和交互
 * - 防止通过点击背景关闭
 */
```

#### closeCrisisModal(): void
```javascript
/**
 * 关闭危机干预弹窗
 * - 移除 show 类（触发退出动画）
 * - 延迟后从 DOM 移除元素
 */
```

### 3.4 CBT 和语音函数集

#### generateCBTResponse(userContent: string): string
```javascript
/**
 * 生成基于 CBT 的心理支持回复
 * @param {string} userContent - 用户的倾诉内容
 * @returns {string} - 完整的 CBT 结构化回复
 * 
 * 返回结构包含六个部分：
 * 1. 【🧠 情绪识别】
 * 2. 【⚡ 认知识别】
 * 3. 【💡 重新审视】
 * 4. 【🌈 新的视角】
 * 5. 【🎯 今天可以尝试】
 * 6. 【💚 温暖的话】
 */
```

#### detectEmotions(text: string): string[]
```javascript
/**
 * 从用户文本中检测情绪
 * @param {string} text - 用户文本
 * @returns {string[]} - 检测到的情绪列表
 * 
 * 可识别的情绪：
 * - 悲伤：难过、伤心、痛苦、悲伤
 * - 愤怒：愤怒、生气、烦、烦躁
 * - 焦虑：焦虑、紧张、担心、害怕
 * - 无力感：无助、无力、绝望
 * - 受伤感：委屈、被伤害
 * - 孤独感：孤独、孤单、被遗弃
 */
```

#### detectThinkingPatterns(text: string): string[]
```javascript
/**
 * 检测非理性思维模式
 * @param {string} text - 用户文本
 * @returns {string[]} - 检测到的思维模式列表
 * 
 * 可识别的模式：
 * - 绝对化思维：应该、必须、一定要、永远、从不、总是
 * - 灾难化思维：完了、毁了、最坏、永远无法、无救
 * - 标签化：我是...、我很...、我不是...
 * - 过度自责：都是我的错、我应该...
 */
```

#### generateBalancedThought(userContent: string): string
```javascript
/**
 * 生成更平衡、更理性的信念
 * @param {string} userContent - 用户的倾诉内容
 * @returns {string} - 平衡的观点（引号形式）
 * 
 * 示例：
 * 输入包含 "失败" → 返回 "失败不是永久的，而是学习的机会"
 * 输入包含 "坏" → 返回 "这种情况虽然困难，但也许会改变"
 */
```

#### generateActionSteps(userContent: string): string
```javascript
/**
 * 生成可执行的小步骤行动计划
 * @param {string} userContent - 用户的倾诉内容
 * @returns {string} - 行动步骤（1个小行动、2个观察、3次呼吸）
 */
```

#### playVoiceGuide(recordId: string, text: string): void
```javascript
/**
 * 播放语音引导
 * @param {string} recordId - 历史记录 ID
 * @param {string} text - 要朗读的文本
 * 
 * 自动处理：
 * - 清除 markdown 格式（去除 [#*_`【】]）
 * - 限制长度为 1000 字符
 * - 停止已有的播放
 * - 使用 zh-CN 中文语音
 * - 语速 0.9（略慢，清晰）
 * - 监听播放完成事件
 * 
 * 错误处理：
 * - 浏览器不支持时显示提示
 */
```

---

## 数据流

### 3.1 SHA-256 数据流
```
用户上传文件
    ↓
[File API] 文件读取
    ↓
[Web Crypto API] SHA-256 计算
    ↓
generateCertificateCard() 生成 HTML
    ↓
插入 DOM
    ↓
用户交互（下载/截图/删除）
    ↓
downloadCertificate() 生成 JSON
    ↓
[Blob API] 创建下载链接
    ↓
浏览器下载或截图保存
```

### 3.2 ToDoList 数据流
```
用户输入场景
    ↓
callYuanqiAPI('evidence', content)
    ↓
AI 返回取证指南（包含【取证方法】）
    ↓
saveHistory('evidence', input, response)
    ↓
renderHistory('evidence') 调用定制版本
    ↓
renderEvidenceChecklist() 解析响应
    ↓
正则表达式提取【取证方法】列表
    ↓
生成 HTML（复选框 + 进度条）
    ↓
insertBefore() 插入历史记录
    ↓
用户勾选项目
    ↓
updateEvidenceProgress() 更新进度
    ↓
完成 100% → showToast('🎉...')
```

### 3.3 危机干预数据流
```
用户在 harborInput 输入
    ↓
触发 'input' 事件监听
    ↓
hasCrisisKeywords() 检测
    ↓
检测到关键词？
    ├─ 是 → showCrisisModal()
    └─ 否 → 继续

showCrisisModal() 执行：
    ├─ 检查 DOM 是否存在弹窗
    ├─ 不存在 → 创建新弹窗 HTML
    └─ 存在 → 添加 show 类

用户点击背景 → 显示提示
用户点击"✕" → closeCrisisModal()

closeCrisisModal() 执行：
    ├─ 移除 show 类
    └─ 延迟 300ms 后删除 DOM
```

### 3.4 CBT 和语音数据流
```
用户倾诉内容
    ↓
callYuanqiAPI('harbor', content) 或 getMockHarborResponse()
    ↓
generateCBTResponse(content) 处理
    ├─ detectEmotions() 识别情绪
    ├─ detectThinkingPatterns() 识别思维模式
    ├─ generateBalancedThought() 生成平衡观点
    └─ generateActionSteps() 生成行动步骤
    ↓
返回 6 步 CBT 结构化文本
    ↓
saveHistory('harbor', input, response)
    ↓
renderHistory('harbor') 调用定制版本
    ↓
生成历史记录 + "🎧 语音引导" 按钮
    ↓
用户点击语音按钮
    ↓
playVoiceGuide(recordId, text)
    ├─ 清除 markdown
    ├─ 限制长度
    ├─ 停止现有播放
    └─ 创建 SpeechSynthesisUtterance
    ↓
speechSynthesis.speak(utterance)
    ↓
系统播放中文语音
    ↓
播放完成 → 恢复按钮状态
```

---

## 错误处理

### 3.1 SHA-256 错误处理
```javascript
// 在 initEvidenceFileUpload() 中
try {
    const hash = await calculateFileSHA256(file);
    // 成功处理
} catch (error) {
    console.error('计算SHA-256失败:', error);
    showToast(`❌ 计算失败: ${error.message}`);
}

// 可能的错误
- NotSupportedError: 浏览器不支持 crypto.subtle
- TypeError: 文件类型错误
- AbortError: 操作被中断
- InvalidAccessError: 权限问题
```

### 3.2 ToDoList 错误处理
```javascript
// renderEvidenceChecklist() 中
try {
    const methodsMatch = message.match(/【取证方法】/);
    if (!methodsMatch) {
        // 回退到普通渲染
        return oldHistoryItem;
    }
    // 解析清单
} catch (error) {
    console.error('解析清单失败:', error);
    // 返回原始文本
}
```

### 3.3 危机干预错误处理
```javascript
// hasCrisisKeywords() 中
try {
    const lowerText = text.toLowerCase();
    return ALL_CRISIS_KEYWORDS.some(keyword => 
        lowerText.includes(keyword)
    );
} catch (error) {
    console.error('关键词检测失败:', error);
    return false; // 默认不触发（安全起见）
}

// showCrisisModal() 中确保幂等性
if (document.getElementById('crisisModal')) {
    // 已存在，直接显示
} else {
    // 创建新弹窗
}
```

### 3.4 语音错误处理
```javascript
// playVoiceGuide() 中
utterance.onerror = (event) => {
    console.error('语音播放失败:', event.error);
    showToast('浏览器不支持语音功能，请尝试其他浏览器');
    btn.classList.remove('playing');
    btn.disabled = false;
};

// 可能的错误
- network_error: 网络错误
- no-speech: 未检测到语音
- audio-busy: 音频繁忙
- bad-grammar: 语法错误
- service-not-allowed: 服务不允许
```

---

## 性能优化

### 3.1 SHA-256 优化
```javascript
// ✅ 当前实现已经高效
// 使用 Web Crypto API（原生，最快）
// 避免额外的编码转换

// 可能的优化
1. 分块处理大文件（流式计算）
2. Web Worker 处理（避免阻塞 UI）
3. 缓存已计算的哈希值
```

### 3.2 ToDoList 优化
```javascript
// 当前：在 renderHistory() 中检查每条记录
// 潜在问题：大量历史记录时性能下降

// 可能的优化
1. 虚拟滚动（只渲染可见项）
2. 延迟渲染（首屏快速，后续加载）
3. 事件委托（减少事件监听器数量）

// 实现示例
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // 渲染这条记录
        }
    });
});
```

### 3.3 危机干预优化
```javascript
// 当前：on('input') 监听每个字符
// 性能问题：频繁调用正则匹配

// 可能的优化
1. 防抖处理（debounce）
2. 预编译正则表达式
3. 使用 Set 数据结构（O(1) 查找）

// 实现示例
const crisisKeywordSet = new Set(ALL_CRISIS_KEYWORDS);
function hasCrisisKeywords(text) {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/[\s,，。!！?？]/);
    return words.some(word => crisisKeywordSet.has(word));
}

// 防抖示例
let debounceTimer;
harborInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (hasCrisisKeywords(e.target.value)) {
            showCrisisModal();
        }
    }, 300);
});
```

### 3.4 语音引导优化
```javascript
// 当前：每次都清理并重新创建 Utterance
// 性能问题：频繁播放时可能有延迟

// 可能的优化
1. 复用 Utterance 对象
2. 预加载语音库
3. 异步加载文本内容
4. 使用 Web Audio API（更细粒度控制）

// 实现示例
let cachedUtterance = null;
function playVoiceGuide(recordId, text) {
    if (currentSpeechSynthesis) {
        speechSynthesis.cancel();
    }
    
    if (!cachedUtterance) {
        cachedUtterance = new SpeechSynthesisUtterance();
        cachedUtterance.lang = 'zh-CN';
        cachedUtterance.rate = 0.9;
    }
    
    cachedUtterance.text = cleanText;
    speechSynthesis.speak(cachedUtterance);
}
```

---

## 安全考虑

### 3.1 文件上传安全
```javascript
// ✅ 当前保护措施
1. 纯前端处理，不上传到服务器
2. 使用本地 crypto API（不通过网络）
3. 无 XSS 风险（不执行 JavaScript）

// 可能的增强
1. 验证文件大小上限（防止内存耗尽）
   const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
   if (file.size > MAX_FILE_SIZE) {
       throw new Error('文件过大');
   }

2. 验证文件类型
   const ALLOWED_TYPES = ['application/pdf', 'image/*'];
   if (!ALLOWED_TYPES.some(type => file.type.match(type))) {
       throw new Error('不支持的文件类型');
   }

3. 处理特殊文件名（防止目录遍历）
   const safeName = file.name.replace(/[\/\\]/g, '_');
```

### 3.2 数据存储安全
```javascript
// ✅ 当前保护措施
1. 使用 localStorage（同源）
2. 客户端加密敏感信息（可选）

// 可能的增强
1. 加密存储敏感记录
   const encrypted = btoa(JSON.stringify(record)); // Base64 编码
   localStorage.setItem(key, encrypted);

2. 设置过期时间
   record.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30天
   
3. 定期清理旧数据
   function cleanupOldRecords() {
       const now = Date.now();
       const records = JSON.parse(localStorage.getItem(key) || '[]');
       const fresh = records.filter(r => 
           r.expiresAt === undefined || r.expiresAt > now
       );
       localStorage.setItem(key, JSON.stringify(fresh));
   }
```

### 3.3 危机干预安全
```javascript
// ✅ 当前保护措施
1. 关键词检测（防止遗漏）
2. 强制弹窗（无法跳过）
3. 显示多条热线（增加可达性）

// 可能的增强
1. 定期更新关键词表（基于心理学研究）
2. A/B 测试弹窗内容有效性
3. 记录触发情况（仅用于改进，不上传）
4. 集成实时心理援助服务（与第三方合作）
5. 本地化热线（根据地区显示）

// 实现示例
const CRISIS_HOTLINES = {
    'CN': {
        beijing: '400-161-9995',
        national: '010-8295-1332',
        guangzhou: '020-8393-0332'
    },
    'US': {
        '988': '988 Suicide & Crisis Lifeline'
    }
};

function getLocalizedHotlines() {
    const region = detectUserRegion(); // 基于 IP 或用户设置
    return CRISIS_HOTLINES[region] || CRISIS_HOTLINES['CN'];
}
```

### 3.4 语音和隐私安全
```javascript
// ✅ 当前保护措施
1. 纯前端处理（无数据上传）
2. 本地语音合成（浏览器内部）

// 可能的增强
1. 避免保存敏感内容
   // 不保存倾诉内容到 localStorage（默认保存）
   // 提供清空历史选项
   
2. 本地处理vs在线处理选项
   // 某些浏览器可能通过网络请求语音
   // 提示用户或提供离线语音库

3. 用户隐私协议
   // 明确说明数据处理方式
   // 提供匿名选项
   
// 实现示例
const PRIVACY_MODE = {
    enabled: localStorage.getItem('privacyMode') === 'true',
    toggle: () => {
        const current = PRIVACY_MODE.enabled;
        localStorage.setItem('privacyMode', String(!current));
        showToast(!current ? '隐私模式已启用，历史记录不保存' : '隐私模式已禁用');
    }
};

function saveHistory(moduleName, userInput, botResponse) {
    if (PRIVACY_MODE.enabled) {
        // 不保存
        return;
    }
    // 正常保存
}
```

---

## 扩展指南

### 如何添加更多关键词（3.3）
```javascript
// 修改 harbor.js 顶部的关键词表
const CRISIS_KEYWORDS = {
    suicidal: [
        '自杀', '想死', '...',
        '你的新关键词' // 添加在这里
    ],
    // ... 其他类别
};

// 重建关键词数组
const ALL_CRISIS_KEYWORDS = Object.values(CRISIS_KEYWORDS).flat();

// 不需要修改检测函数，自动生效
```

### 如何自定义 CBT 提示词（3.4）
```javascript
// 修改 generateCBTResponse() 函数中的各个模板
function generateCBTResponse(userContent) {
    let response = `【🧠 情绪识别】\n`;
    response += `我的自定义文本...\n\n`;
    
    // 修改情绪检测
    const emotions = detectEmotions(userContent);
    // ... 等等
}

// 或者：与 AI 智能体集成
// 在 callYuanqiAPI('harbor', content) 之前添加系统提示词
const systemPrompt = `你是一个基于认知行为疗法(CBT)的心理支持专家...`;
```

### 如何集成真实 AI 智能体（3.2）
```javascript
// 当前：使用 callYuanqiAPI() 返回文本
// 修改为返回结构化数据

// 智能体返回格式（建议）
{
    "evidenceMethods": [
        "使用手机录音",
        "截图保存聊天"
    ],
    "notes": [
        "录音需说明时间",
        "截图要连贯"
    ],
    "save": "建议多处备份"
}

// 修改 saveHistory 调用
const structuredResponse = await callYuanqiAPI('evidence', content);
const formattedResponse = formatResponse(structuredResponse);
saveHistory('evidence', content, formattedResponse);

// 修改 renderEvidenceChecklist 使用原生结构体
function renderEvidenceChecklist(record, structuredData) {
    // 不需要正则解析，直接使用结构化数据
    return generateChecklistHTML(structuredData);
}
```

### 如何添加离线支持（所有功能）
```javascript
// 使用 Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

// Service Worker 中：
self.addEventListener('fetch', (event) => {
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});

// 检测离线状态
window.addEventListener('offline', () => {
    showToast('离线模式：功能可用，但不能访问网络智能体');
});

window.addEventListener('online', () => {
    showToast('已恢复在线');
});
```

### 如何国际化（所有功能）
```javascript
// 创建语言资源文件
const i18n = {
    'zh-CN': {
        certificateCard: {
            title: '⭐ 存证凭证',
            filename: '文件名：'
        },
        crisis: {
            title: '🆘 您可能需要帮助'
        }
    },
    'en-US': {
        certificateCard: {
            title: '⭐ Certificate',
            filename: 'File Name:'
        },
        crisis: {
            title: '🆘 You May Need Help'
        }
    }
};

// 使用
const lang = navigator.language || 'zh-CN';
const t = i18n[lang] || i18n['zh-CN'];
const title = t.certificateCard.title;
```

---

## 已知限制和 Future Work

### 已知限制
- 3.1: 无法直接截图，需要 html2canvas 库
- 3.2: 清单项目提取依赖正则表达式（可能不完全准确）
- 3.3: 关键词检测可能有假正（灵敏度 vs 准确度权衡）
- 3.4: 语音播放依赖浏览器的 TTS 引擎（质量不一）

### Future Work
- [ ] 集成 html2canvas 实现完整截图
- [ ] 使用 AI 返回结构化 JSON（不需要正则解析）
- [ ] 接入实时心理援助 API（自动更新热线）
- [ ] 实现 Service Worker 离线支持
- [ ] 多语言 i18n 国际化
- [ ] 用户偏好设置（语速、字体大小等）
- [ ] 数据加密和隐私保护增强
- [ ] 心理援助效果统计（匿名）
- [ ] 与医疗机构集成（紧急情况自动通知）

---

**最后更新**: 2026-05-26  
**版本**: 1.0.0  
**维护者**: 她护开发团队
