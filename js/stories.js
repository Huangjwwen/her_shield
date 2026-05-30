// 初始化她的故事
function initStories() {
    const submitBtn = document.getElementById('submitStory');
    const titleInput = document.getElementById('storyTitle');
    const contentInput = document.getElementById('storyContent');

    if (!submitBtn) return;

    const defaultStories = [
        {
            title: '孕期被调岗的经历',
            content: '我怀孕后被公司突然调到很远的岗位，当时很害怕，但后来开始保留聊天记录和排班信息。',
            tag: '#孕期被辞',
            time: '刚刚'
        },
        {
            title: '面试时被问婚育计划',
            content: '面试中被问到是否准备结婚生育，我当时没有意识到这可能是不合适的问题。',
            tag: '#面试歧视',
            time: '刚刚'
        },
        {
            title: '试用期被无理由辞退',
            content: '试用期快结束时，公司突然说我不适合岗位，但没有给出明确标准。',
            tag: '#试用期',
            time: '刚刚'
        }
    ];

    function desensitize(text) {
        return text
            .replace(/1[3-9]\d{9}/g, '手机号已隐藏')
            .replace(/\d{17}[\dXx]/g, '身份证号已隐藏')
            .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '邮箱已隐藏');
    }

    function getStories() {
        const saved = localStorage.getItem('herShieldStories');
        if (saved) {
            return JSON.parse(saved);
        }
        localStorage.setItem('herShieldStories', JSON.stringify(defaultStories));
        return defaultStories;
    }

    function saveStories(stories) {
        localStorage.setItem('herShieldStories', JSON.stringify(stories));
    }

    function renderStories(filterTag = '') {
        // 渲染目标 = .stories-list（正确位置，而非 input-actions）
        const list = document.querySelector('#storiesChat .stories-list');
        if (!list) return;

        const safe = (typeof escapeHtml === 'function')
            ? escapeHtml
            : (s => String(s == null ? '' : s));

        const stories = getStories();
        const filteredStories = filterTag
            ? stories.filter(story => story.tag === filterTag)
            : stories;

        const resetBar = filterTag
            ? `<button type="button" class="story-filter-reset">← 显示全部（当前：${safe(filterTag)}）</button>`
            : '';

        const cards = filteredStories.map(story => `
            <div class="story-item">
                <h4 class="story-item-title">${safe(story.title)}</h4>
                <p class="story-item-content">${safe(story.content)}</p>
                <div class="story-item-foot">
                    <button type="button" class="story-tag" data-tag="${safe(story.tag)}">${safe(story.tag)}</button>
                    <span class="story-item-time">${safe(story.time)}</span>
                </div>
            </div>
        `).join('');

        list.innerHTML = resetBar + (cards || '<p class="history-empty">这个标签下还没有故事～</p>');

        document.querySelectorAll('#storiesChat .story-tag').forEach(btn => {
            btn.addEventListener('click', () => renderStories(btn.dataset.tag));
        });
        document.querySelectorAll('#storiesChat .story-filter-reset').forEach(btn => {
            btn.addEventListener('click', () => renderStories(''));
        });
    }

    submitBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            showToast('请填写故事标题/内容');
            return;
        }

        const cleanTitle = desensitize(title);
        const cleanContent = desensitize(content);

        const newStory = {
            title: cleanTitle,
            content: cleanContent,
            tag: '#用户分享',
            time: '刚刚'
        };

        const stories = getStories();
        stories.unshift(newStory);
        saveStories(stories);

        renderStories();

        // 上传到云端
        fetch('https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newStory)
        })
        .then(res => res.json())
        .then(data => {
            console.log('云端保存成功', data);
        })
        .catch(err => {
            console.error('云端保存失败', err);
        });

        showToast('你的故事已成功提交，感谢分享～');

        titleInput.value = '';
        contentInput.value = '';
    });

    renderStories();
}