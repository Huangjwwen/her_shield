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
// ==================== SHA-256 证据指纹功能 ====================

/**
 * 计算文件的 SHA-256 哈希值
 * @param {File} file - 上传的文件
 * @returns {Promise<string>} - 十六进制哈希值
 */
async function calculateFileSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * 生成存证凭证卡片
 * @param {File} file - 原始文件
 * @param {string} hash - SHA-256哈希值
 * @returns {string} - HTML卡片内容
 */
function generateCertificateCard(file, hash) {
    const timestamp = new Date();
    const dateStr = timestamp.toLocaleString('zh-CN');
    const certificateId = 'CERT_' + Date.now();
    
    return `
        <div class="certificate-card" data-cert-id="${certificateId}">
            <div class="cert-header">
                <span class="cert-title">⭐ 存证凭证</span>
                <span class="cert-time">${dateStr}</span>
            </div>
            <div class="cert-content">
                <div class="cert-item">
                    <label>文件名：</label>
                    <span class="cert-value" id="cert-filename">${escapeHtml(file.name)}</span>
                    <button class="btn-icon" onclick="copyCertField('${certificateId}', 'cert-filename')" title="复制">📋</button>
                </div>
                <div class="cert-item">
                    <label>文件大小：</label>
                    <span class="cert-value">${(file.size / 1024).toFixed(2)} KB</span>
                </div>
                <div class="cert-item">
                    <label>修改时间：</label>
                    <span class="cert-value">${new Date(file.lastModified).toLocaleString('zh-CN')}</span>
                </div>
                <div class="cert-item cert-hash">
                    <label>SHA-256 指纹：</label>
                    <span class="cert-value mono" id="cert-hash">${hash}</span>
                    <button class="btn-icon" onclick="copyCertField('${certificateId}', 'cert-hash')" title="复制">📋</button>
                </div>
                <div class="cert-item">
                    <label>证书ID：</label>
                    <span class="cert-value mono">${certificateId}</span>
                </div>
            </div>
            <div class="cert-actions">
                <button class="btn-small" onclick="downloadCertificate('${certificateId}')">📥 下载凭证</button>
                <button class="btn-small" onclick="screenshotCertificate('${certificateId}')">📸 截图凭证</button>
                <button class="btn-small" onclick="deleteCertificate('${certificateId}')">🗑️ 删除</button>
            </div>
        </div>
    `;
}

/**
 * 复制证书字段
 */
function copyCertField(certId, fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        navigator.clipboard.writeText(field.textContent).then(() => {
            showToast('已复制到剪贴板');
        });
    }
}

/**
 * 下载证书为 JSON
 */
function downloadCertificate(certId) {
    const card = document.querySelector(`[data-cert-id="${certId}"]`);
    if (!card) return;
    
    const filename = card.querySelector('#cert-filename').textContent;
    const hash = card.querySelector('#cert-hash').textContent;
    const certificate = {
        id: certId,
        fileName: filename,
        sha256: hash,
        timestamp: new Date().toISOString(),
        description: '这是使用她盾生成的文件存证凭证，证明该文件在指定时间的原始内容。'
    };
    
    const dataStr = JSON.stringify(certificate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${certId}_certificate.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('凭证已下载');
}

/**
 * 截图证书
 */
function screenshotCertificate(certId) {
    const card = document.querySelector(`[data-cert-id="${certId}"]`);
    if (!card) return;
    
    // 使用html2canvas库（需在HTML中引入）
    if (typeof html2canvas !== 'undefined') {
        html2canvas(card, { 
            backgroundColor: '#fff',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `${certId}_screenshot.png`;
            link.click();
            showToast('截图已保存');
        });
    } else {
        // 备用：复制卡片内容
        const text = Array.from(card.querySelectorAll('.cert-item')).map(item => {
            const label = item.querySelector('label').textContent;
            const value = item.querySelector('.cert-value').textContent;
            return `${label} ${value}`;
        }).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制证书内容，可自行截图');
        });
    }
}

/**
 * 删除证书卡片
 */
function deleteCertificate(certId) {
    const card = document.querySelector(`[data-cert-id="${certId}"]`);
    if (card) {
        card.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => card.remove(), 300);
    }
}

// ==================== 证据留存助手模块 ====================

// 初始化证据留存助手
function initEvidence() {
    const evidenceInput = document.getElementById('evidenceInput');
    const clearInput = document.getElementById('clearEvidenceInput');
    const evidenceBtn = document.getElementById('evidenceBtn');
    const clearHistoryBtn = document.getElementById('clearEvidenceHistory');

    // 【修复】必须在 loadHistory 之前覆盖 renderHistory，否则首次加载不会渲染清单
    const originalRenderHistory = window.renderHistory;
    window.renderHistory = function(moduleName) {
        if (moduleName !== 'evidence') {
            return originalRenderHistory.call(this, moduleName);
        }
        
        // 证据模块特殊处理：结构化取证清单
        const historyList = document.getElementById('evidenceHistoryList');
        if (!historyList) return;
        
        const history = historyStorage['evidence'];
        if (history.length === 0) {
            historyList.innerHTML = '<p class="history-empty">暂无对话记录，开始查询吧～</p>';
            return;
        }
        
        historyList.innerHTML = history.map(record => {
            // 检测是否是证据取证指南（兼容多种格式：【取证方法】、取证方法、或包含编号列表）
            const msg = record.botMessage || '';
            console.log('record.botMessage:', record.botMessage);
            const hasChecklist = /【?(?:核心证据类型|取证方法)[】:]/.test(msg)
                || /取证方法/.test(msg)
                || /\n[1-9][\.、)]\s*[^\n]{3,}/.test(msg)
                || /(?:^|\n)\s*[•·●-]\s*[^\n]{3,}/.test(msg);
            console.log('hasChecklist:', hasChecklist);
            if (hasChecklist) {
                return renderEvidenceChecklist(record);
            } else {
                return `
                    <div class="history-item" data-id="${record.id}">
                        <div class="history-time">${record.time}</div>
                        <div class="history-user">${escapeHtml(record.userMessage)}</div>
                        <div class="history-bot">${escapeHtml(record.botMessage)}</div>
                        <div class="history-item-actions">
                            <button class="btn-small" onclick="copyHistoryItem('evidence', '${record.id}')">复制</button>
                            <button class="btn-small" onclick="deleteHistoryItem('evidence', '${record.id}')">删除</button>
                        </div>
                    </div>
                `;
            }
        }).join('');
    };

    // 加载历史记录
    loadHistory('evidence');
    
    // 初始化文件上传功能（SHA-256指纹）
    initEvidenceFileUpload();

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
            console.log('AI原始返回:', response);
            
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

/**
 * 根据关键词自动分类证据取证方法
 * @param {string[]} methods - 取证方法数组
 * @returns {Object} - { 分类名: [{ method, index }] }
 */
function classifyEvidenceMethods(methods) {
    const rules = [
        { emoji: '📱', name: '电子证据', keywords: ['聊天', '微信', 'QQ', '短信', '录屏', '截图', '截屏', '邮件', '邮箱', '音频', '录音', '视频', '时间戳', '区块链', '云盘', '网盘', '云端', '备份', '电子', '数字', 'APP', '应用', '软件', '平台'] },
        { emoji: '👥', name: '人证', keywords: ['证人', '目击者', '同事', '朋友', '家人', '亲属', '联系方式', '证人证言', '询问', '第三方', '在场'] },
        { emoji: '📄', name: '文书证据', keywords: ['日记', '记录', '书面', '材料', '文件', '证明', '合同', '协议', '单据', '凭证', '鉴定', '报告', '公证', '律师函', '报警', '回执'] }
    ];
    
    const categorized = {};
    const unmatched = [];
    
    methods.forEach((method, index) => {
        let matched = false;
        for (const rule of rules) {
            if (rule.keywords.some(kw => method.includes(kw))) {
                const key = `${rule.emoji} ${rule.name}`;
                if (!categorized[key]) categorized[key] = [];
                categorized[key].push({ method, index });
                matched = true;
                break;
            }
        }
        if (!matched) {
            unmatched.push({ method, index });
        }
    });
    
    if (unmatched.length > 0) {
        categorized['📋 其他证据'] = unmatched;
    }
    
    return categorized;
}

/**
 * 将证据指南转换为可勾选的 ToDoList
 */
function renderEvidenceChecklist(record) {
    const message = record.botMessage;
    
    // 解析取证方法（兼容【取证方法】、取证方法：、取证方法\n 等格式）
    const methodsMatch = message.match(/【?取证方法[】:]?\s*?\n?([\s\S]*?)(?=\n?\s*【?(?:取证注意事项|核心证据类型|证据保存)|$)/);
    let methods = [];
    
    if (methodsMatch) {
        const methodsText = methodsMatch[1].trim();
        methods = methodsText
            .split(/\n/)
            .filter(m => m.trim())
            .filter(m => /^[1-9]|^[•·]|^-|^•/.test(m.trim()))
            .map(m => m.replace(/^[1-9][\.、)]\s*|^[•·]\s*|^-\s*|^•\s*/, '').trim())
            .filter(m => m.length > 0);
    }
    
    // Fallback：提取自然语言中的 bullet points（如 • 聊天记录类证据）
    if (methods.length === 0) {
        const bulletPoints = message.match(/^[•·●]\s*(.+)$/gm);
        if (bulletPoints) {
            methods = bulletPoints.map(b => b.replace(/^[•·●]\s*/, '').trim()).filter(m => m.length > 0);
        }
    }
    
    // 对 methods 按证据类型分组（保留全局 index 不变）
    const grouped = classifyEvidenceMethods(methods);
    
    // 生成 checklist ID
    const checklistId = 'checklist_' + record.id;
    
    // 读取持久化的勾选状态
    const savedState = JSON.parse(localStorage.getItem('evidenceChecklistState') || '{}');
    const checkedSet = new Set(savedState[record.id]?.checked || []);
    
    // 计算恢复后的初始进度
    const totalItems = methods.length;
    const completedItems = checkedSet.size;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    let checklistHTML = `
        <div class="history-item" data-id="${record.id}">
            <div class="history-time">${record.time}</div>
            <div style="margin: 10px 0;">
                <strong>${escapeHtml(record.userMessage)}</strong>
            </div>
            
            <div class="todolist-container">
                <div class="todolist-header">
                    <span style="flex: 1;">📋 取证清单</span>
                    <span id="${checklistId}_progress" style="font-size: 12px; color: #fff;">
                        ${completedItems}/${totalItems}
                    </span>
                </div>
                <div style="height: 4px; background: #e0d0ff;">
                    <div class="progress-fill" id="${checklistId}_bar" style="width: ${progress}%; background: linear-gradient(90deg, #9370DB 0%, #7B5DC4 100%);"></div>
                </div>
                <div class="todolist-items">
    `;
    
    // 按分组渲染，每个分组一个 section
    let firstSection = true;
    for (const [category, items] of Object.entries(grouped)) {
        const sectionClass = firstSection ? '' : ' evidence-section-nested';
        checklistHTML += `<div class="evidence-section${sectionClass}">
            <div class="evidence-section-title">${category}</div>`;
        firstSection = false;
        
        for (const { method, index } of items) {
            const itemId = `${checklistId}_${index}`;
            const checkedAttr = checkedSet.has(index) ? ' checked' : '';
            checklistHTML += `
            <div class="todo-item" data-item-id="${itemId}">
                <input type="checkbox" class="todo-checkbox" id="${itemId}"${checkedAttr}
                    onchange="updateEvidenceProgress('${checklistId}', ${totalItems})">
                <label for="${itemId}" class="todo-label">
                    <span class="todo-text">${escapeHtml(method)}</span>
                </label>
            </div>`;
        }
        
        checklistHTML += `</div>`;
    }
    
    checklistHTML += `
                </div>
            </div>
            
            <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 6px;">
                <div style="font-size: 12px; color: #999; margin-bottom: 8px;">📌 提示：</div>
    `;
    
    // 添加其他信息（兼容多种格式）
    const coreMatch = message.match(/【?核心证据类型[】:]?\s*?\n?([\s\S]*?)(?=\n?\s*【?(?:取证方法|取证注意事项|证据保存)|$)/);
    if (coreMatch) {
        checklistHTML += `<div style="font-size: 12px; color: #666; margin-bottom: 6px;"><strong>核心证据：</strong> ${escapeHtml(coreMatch[1].trim())}</div>`;
    }
    
    const notesMatch = message.match(/【?取证注意事项[】:]?\s*?\n?([\s\S]*?)(?=\n?\s*【?(?:证据保存|$))/);
    if (notesMatch) {
        const notesText = notesMatch[1].trim();
        checklistHTML += `<div style="font-size: 12px; color: #666; margin-bottom: 6px;"><strong>注意事项：</strong><br>${escapeHtml(notesText)}</div>`;
    }
    
    checklistHTML += `
            </div>
            
            <div class="history-item-actions">
                <button class="btn-small" onclick="copyHistoryItem('evidence', '${record.id}')">复制</button>
                <button class="btn-small" onclick="deleteHistoryItem('evidence', '${record.id}')">删除</button>
            </div>
        </div>
    `;
    
    return checklistHTML;
}

/**
 * 更新证据清单进度
 */
function updateEvidenceProgress(checklistId, totalItems) {
    let count = 0;
    const checkedIndexes = [];
    for (let i = 0; i < totalItems; i++) {
        const checkbox = document.getElementById(`${checklistId}_${i}`);
        if (checkbox && checkbox.checked) {
            count++;
            checkedIndexes.push(i);
        }
    }
    
    // 持久化勾选状态
    const recordId = checklistId.replace('checklist_', '');
    const savedState = JSON.parse(localStorage.getItem('evidenceChecklistState') || '{}');
    savedState[recordId] = { checked: checkedIndexes };
    localStorage.setItem('evidenceChecklistState', JSON.stringify(savedState));
    
    const progress = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
    const progressBar = document.getElementById(`${checklistId}_bar`);
    const progressText = document.getElementById(`${checklistId}_progress`);
    
    if (progressBar) {
        progressBar.style.width = progress + '%';
    }
    if (progressText) {
        progressText.textContent = `${count}/${totalItems}`;
    }
    
    // 当进度到达 100% 时，显示庆祝
    if (progress === 100) {
        showToast('🎉 恭喜，取证清单已完成！');
    }
}

/**
 * 初始化证据文件上传（SHA-256指纹）
 */
function initEvidenceFileUpload() {
    // 创建文件上传容器（如果不存在）
    const chatBody = document.querySelector('#evidenceChat .chat-body');
    if (!chatBody) return;
    
    // 检查是否已经添加过容器
    if (document.getElementById('evidenceFileUploadArea')) return;
    
    // 创建上传区域
    const uploadArea = document.createElement('div');
    uploadArea.id = 'evidenceFileUploadArea';
    uploadArea.className = 'file-upload-area';
    uploadArea.innerHTML = `
        <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #333;">⭐ SHA-256 证据指纹（防篡改）</label>
            <div class="drag-drop-zone" id="evidenceDropZone" style="
                border: 2px dashed #999;
                padding: 20px;
                border-radius: 6px;
                text-align: center;
                background: #f9f9f9;
                cursor: pointer;
                transition: all 0.3s;
            ">
                <p style="margin: 0; color: #666;">📁 拖拽文件或点击选择</p>
                <input type="file" id="evidenceFileInput" hidden multiple accept="*">
            </div>
            <div id="evidenceFileOutput" style="margin-top: 15px;"></div>
        </div>
    `;
    
    // 插入到历史记录之前
    const historyList = chatBody.querySelector('.chat-history');
    if (historyList) {
        chatBody.insertBefore(uploadArea, historyList);
    } else {
        chatBody.insertBefore(uploadArea, chatBody.firstChild);
    }
    
    // 绑定事件
    const dropZone = document.getElementById('evidenceDropZone');
    const fileInput = document.getElementById('evidenceFileInput');
    const fileOutput = document.getElementById('evidenceFileOutput');
    
    if (!dropZone || !fileInput || !fileOutput) return;
    
    // 拖拽事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007bff';
        dropZone.style.backgroundColor = '#e7f3ff';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#999';
        dropZone.style.backgroundColor = '#f9f9f9';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#999';
        dropZone.style.backgroundColor = '#f9f9f9';
        handleFileUpload(e.dataTransfer.files);
    });
    
    // 点击打开文件选择
    dropZone.addEventListener('click', () => fileInput.click());
    
    // 文件输入事件
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });
    
    // 处理文件上传
    async function handleFileUpload(files) {
        if (!files || files.length === 0) return;
        
        for (let file of files) {
            try {
                // 显示处理中
                const processingDiv = document.createElement('div');
                processingDiv.className = 'processing';
                processingDiv.textContent = `正在计算 ${file.name} 的SHA-256...`;
                processingDiv.style.cssText = 'color: #666; margin: 10px 0; font-size: 0.9em;';
                fileOutput.appendChild(processingDiv);
                
                // 计算哈希
                const hash = await calculateFileSHA256(file);
                
                // 删除处理提示
                processingDiv.remove();
                
                // 生成证书卡片
                const cardHtml = generateCertificateCard(file, hash);
                const cardDiv = document.createElement('div');
                cardDiv.innerHTML = cardHtml;
                fileOutput.insertBefore(cardDiv.firstElementChild, fileOutput.firstChild);
                
                showToast(`✅ ${file.name} 指纹已生成`);
            } catch (error) {
                console.error('计算SHA-256失败:', error);
                showToast(`❌ 计算失败: ${error.message}`);
            }
        }
    }
}

