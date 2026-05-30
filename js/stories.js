// 初始化她的故事
function initStories() {
    const submitBtn = document.getElementById('submitStory');
    const titleInput = document.getElementById('storyTitle');
    const contentInput = document.getElementById('storyContent');

    if (!submitBtn) return;

    // 故事采用「起因 → 恐惧 → 行动 → 胜利 → 感悟」的弧线，
    // 段落间用 \n\n 分隔，配合 CSS white-space: pre-line 自然换行。
    const defaultStories = [
        {
            title: '勇敢说不的经历',
            content: '刚入职某互联网公司第一周，直属领导就开始频繁在下班后单独约我"吃饭聊工作"。起初我以为只是正常的工作交流，直到有一次他在饭局上说"你要是跟着我好好干，晋升机会多的是"，还借故碰我的手。我当场表示不舒服并借故离开。\n\n回家后我把这件事告诉了朋友，她建议我录音留证。之后每次单独沟通我都会悄悄录音。一个月后他发微信说"不识抬举"，并开始在工作上刁难我。我把微信聊天记录、录音、他故意刁难的工作安排邮件全部留好，正式向 HR 和上级领导提交了投诉。\n\n最终公司对他进行了警告处分，我也成功转岗到另一个部门。过程很煎熬，但我一点都不后悔。\n\n💡 感悟：及时取证是关键。不要因为害怕而选择沉默——你的勇敢，可能正是下一个女生的护身符。',
            tag: '#性骚扰',
            time: '3天前'
        },
        {
            title: '孕期被调岗的维权之路',
            content: '在公司干了三年，好不容易升到项目负责人，结果怀孕 5 个月时，公司突然以"业务调整"为由要把我调到客服部门，薪资直接降了 30%。HR 说："这是公司的决定，不接受就自己离职。"\n\n我当时整个人都懵了，甚至想过要不要打掉孩子保住工作。但家人的支持让我冷静下来。我打了 12348 免费法律援助热线，了解到《女职工劳动保护特别规定》明确规定：孕期、产期、哺乳期内公司不得降低工资或违法调岗。\n\n我没有签任何调岗同意书，而是用书面方式向公司提出异议，同时整理了劳动合同、原岗位证明、调岗通知、工资条等所有证据。劳动仲裁刚到调解阶段公司就妥协了——恢复原岗位、补回薪资，还赔了精神损失费。\n\n💡 感悟：法律是真的在保护我们的。孕期不是软肋，是法律划出的红线。一定要书面提出异议，绝不口头答应。',
            tag: '#孕期被辞',
            time: '1周前'
        },
        {
            title: '同工不同酬的胜利',
            content: '入职时谈的薪资是税前 12K，我觉得还行。后来跟同期入职的男同事聊天，无意中发现他拿 15K。我们做的是完全一样的工作，学历、经验都差不多——就因为他是男生？\n\n我开始默默收集证据：岗位描述、工作内容、KPI 标准全部一致。通过同事间的聊天和工资条，我确认了同组三个男生的薪资都比我高 20%-40%。\n\n我先找直属领导沟通，他说："男生要养家糊口，女生反正有老公。"这句话我录下来了。然后我带着所有证据向 HR 正式申诉，明确指出这是性别歧视。拉扯了两个月，公司最终同意补齐差额并上调我的薪资。\n\n💡 感悟：同工同酬是法律写明的权利。不要回避谈薪资——知道自己的市场价值，才能有理有据地拿回属于你的那一份。',
            tag: '#同工同酬',
            time: '2周前'
        },
        {
            title: '面试时被问婚育的反击',
            content: '去年面试一家外企，面试官一上来就问："你有男朋友吗？""打算什么时候结婚？""如果怀孕了工作怎么办？"我当时很紧张，只能尴尬地说"暂时没有打算"。\n\n面试后我越想越气——这不是明摆着的就业歧视吗？我查了《就业促进法》和《妇女权益保障法》，发现这些问题都是法律明文禁止的。于是我把面试经过详细记录下来：时间、地点、面试官问的每一个问题，然后向招聘平台和当地人社局都做了举报。\n\n虽然最后没拿到那份 offer，但人社局真的介入调查了，那家公司的 HR 后来还打电话来道歉。听说他们之后改了面试流程，不再问这些问题。至少，下一个去面试的女生不用再被这样为难了。\n\n💡 感悟：被问婚育，你可以直接拒答——这是合法权利。即使没拿到 offer，举报本身也是一种胜利。',
            tag: '#面试歧视',
            time: '1个月前'
        },
        {
            title: '试用期被"无理由"辞退的反击',
            content: '试用期还剩两周，部门经理突然说我"不符合岗位要求"要辞退我，但拿不出任何具体的考核记录。入职以来我从没接到过负面反馈，反倒因为加班帮同事赶项目被夸过两次。我隐约意识到，可能是因为前一周我请了一天病假——而我刚好在备孕。\n\n我没当场签离职单，回家立刻打了 12348。律师告诉我：试用期辞退也必须有"证明不符合录用条件"的具体证据，公司不能随口说说就把人赶走。\n\n第二天我用书面方式回复 HR："请提供具体的不符合录用条件的证据。"对方支吾着拿不出来，最后改口说"协商解除"，并按 N 个月支付了补偿。我用这段时间认真备孕、好好休息，三个月后入职了一家更好的公司。\n\n💡 感悟：试用期不等于"随便辞"。让公司白纸黑字给依据，多数情况下他们给不出来，反而会主动谈补偿。',
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

    // 种子版本号：每次更新 defaultStories 内容请把它 +1，
    // 老用户的 localStorage 缓存就会被自动迁移到新种子（用户提交的故事保留）。
    const SEED_VERSION = 2;

    function getStories() {
        const savedVersion = parseInt(localStorage.getItem('herShieldStoriesSeedVersion') || '0', 10);
        const saved = localStorage.getItem('herShieldStories');

        // 版本一致 → 直接用缓存
        if (saved && savedVersion === SEED_VERSION) {
            try { return JSON.parse(saved); } catch (e) { /* 损坏则重置 */ }
        }

        // 版本不一致（或首次访问）→ 重置种子，但保留用户提交（tag === '#用户分享'）
        let userStories = [];
        if (saved) {
            try {
                const old = JSON.parse(saved);
                if (Array.isArray(old)) {
                    userStories = old.filter(s => s && s.tag === '#用户分享');
                }
            } catch (e) { /* 解析失败就放弃旧数据 */ }
        }

        const merged = [...defaultStories, ...userStories];
        localStorage.setItem('herShieldStories', JSON.stringify(merged));
        localStorage.setItem('herShieldStoriesSeedVersion', String(SEED_VERSION));
        return merged;
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