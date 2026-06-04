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

// ==================== 通用历史记录管理 ====================

// 各模块历史记录存储
let historyStorage = {
    radar: [],
    selfcheck: [],
    evidence: [],
    guide: [],
    harbor: []
};

// 各模块可注册自定义历史渲染器（如 radar 的红橙绿风险报告）。
// 用法：在模块的 init 函数里 customHistoryRenderers.radar = renderRadarHistory;
const customHistoryRenderers = {};

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

    // 若该模块注册了自定义渲染器，交给它处理（如 radar 富文本风险报告）
    if (customHistoryRenderers[moduleName]) {
        customHistoryRenderers[moduleName](historyList, historyStorage[moduleName]);
        return;
    }

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
    
    // 同步清理 checklist 勾选状态
    if (moduleName === 'evidence') {
        const savedState = JSON.parse(localStorage.getItem('evidenceChecklistState') || '{}');
        delete savedState[id];
        localStorage.setItem('evidenceChecklistState', JSON.stringify(savedState));
    }
    
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

// ==================== 输入区可折叠 ====================
// 给每个 .chat-input-area 加一个折叠/展开切换按钮,状态持久化到 localStorage
function initCollapsibleInputs() {
    const areas = document.querySelectorAll('.chat-input-area');
    areas.forEach((area, idx) => {
        // 避免重复初始化(热重载时)
        if (area.querySelector('.input-collapse-toggle')) return;

        // 用所属 chat-content panel 的 id 做存储键,稳定且可读
        const panel = area.closest('.chat-content');
        const panelId = panel && panel.id ? panel.id : `inputArea${idx}`;
        const storageKey = `inputCollapsed:${panelId}`;

        // 创建切换按钮
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'input-collapse-toggle';
        toggle.setAttribute('aria-label', '折叠或展开输入框');

        const render = (isCollapsed) => {
            // 展开状态显示 ▲(向上,点击可收起);折叠状态显示 ▼(向下,点击可展开)
            // 实际上 UX 上习惯反过来:收起的箭头朝下指示"展开后内容会向下出现",展开的箭头朝上指示"点击收起向上"
            // 这里按用户要求:展开按钮的三角符号朝上 = collapsed 时显示 ▲
            toggle.innerHTML = isCollapsed
                ? '<span class="chevron">▲</span>'
                : '<span class="chevron">▼</span>';
            toggle.title = isCollapsed ? '点击展开输入框' : '点击收起输入框';
            toggle.setAttribute('aria-label', isCollapsed ? '展开输入框' : '收起输入框');
        };

        // 初始状态:从 localStorage 读取,默认展开
        let collapsed = false;
        try { collapsed = localStorage.getItem(storageKey) === '1'; } catch (e) {}
        if (collapsed) area.classList.add('collapsed');
        render(collapsed);

        toggle.addEventListener('click', () => {
            const willCollapse = !area.classList.contains('collapsed');
            area.classList.toggle('collapsed', willCollapse);
            render(willCollapse);
            try { localStorage.setItem(storageKey, willCollapse ? '1' : '0'); } catch (e) {}
        });

        // 插入到 area 的第一个位置(z-index 高于其他元素)
        area.insertBefore(toggle, area.firstChild);
    });
}

// 页面 DOMContentLoaded 之后自动启用;若 features.html 已加载完则立即跑一次
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCollapsibleInputs);
} else {
    initCollapsibleInputs();
}
