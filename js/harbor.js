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

