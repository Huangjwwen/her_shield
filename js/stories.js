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

