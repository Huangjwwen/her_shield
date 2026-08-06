// 初始化她的故事
function initStories() {
    const submitBtn = document.getElementById('submitStory');
    const titleInput = document.getElementById('storyTitle');
    const contentInput = document.getElementById('storyContent');

    if (!submitBtn) return;

    // 故事尽量像真实分享：不套"感悟：……"模板，让每条按各自情绪自然收尾。
    // 段落间用 \n\n 分隔，配合 CSS white-space: pre-line 自然换行。
    const defaultStories = [
        {
            title: '勇敢说不的经历',
            content: '我入职刚满一周，那个男领导就开始频繁找我"下班单聊"。一开始我以为是新人培训的形式，直到有一次他在饭桌上说："你要是跟着我好好干，晋升机会多得是。"——边说边把手放到我手背上。我装作不经意把手抽回来，借口要赶末班地铁就走了。\n\n回家路上我手都在抖，把这事跟一个学法律的朋友吐槽，她让我从下次开始所有单独沟通都录音。我照做了。一个多月后，他发微信骂我"不识抬举"，给我派的活也越来越离谱。这时候我已经攒了：录音、微信记录、被故意刁难的工作邮件，整整一个文件夹。证据齐了之后我直接走 HR 投诉，没给他任何"私下道歉就算了"的余地。\n\n走完流程他被记过、调出我们组，我也顺势申请转岗成功。\n\n现在他在隔壁部门，电梯里偶尔遇到，他会很快低头看手机。说真的，那一刻比拿到处分通知还爽。',
            tag: '#性骚扰',
            time: '3天前'
        },
        {
            title: '孕期被调岗的维权之路',
            content: '我在这家公司做了三年，刚晋升项目负责人没多久就发现自己怀孕了。怀孕到第五个月那天，HR 把我叫进会议室，说"公司业务调整，把你调去客服部"，工资降 30%。我问为什么是我，她说："这是公司决定，你不接受就自己走。"\n\n那天晚上我躺在床上一直哭，老公说什么我都听不进去。最低谷的时候我甚至想过要不要不要这个孩子，先把工作保住——这种念头出现的时候，我自己都被自己吓到了。\n\n第二天我打了 12348。律师一句话点醒了我："孕期内单位不能降薪、不能违法调岗，《女职工劳动保护特别规定》写得很清楚。" 我没签那张调岗同意书，只用书面方式回了一份异议，把劳动合同、原岗位证明、调岗通知、过去半年的工资条全部整理出来。仲裁刚到调解阶段公司就退让了：恢复原岗、补回薪资、再加一笔精神损害抚慰金。\n\n现在女儿快两岁了。每次想起当时差点为了一份工作不要她，我还是会哭一会儿。但那通法律热线，是我那段时间最重要的电话——它告诉我，我没疯，错的是公司。',
            tag: '#孕期被辞',
            time: '1周前'
        },
        {
            title: '同工不同酬的胜利',
            content: '入职时 HR 跟我谈了 12K，税前。我觉得在行业内还可以接受。直到入职半年后跟同组一个男同事一起出差，吃饭时他半玩笑说"15K 也就那样"。我愣了三秒：我们同期入职、同岗位、同 KPI，他凭什么比我高 25%？\n\n回来我就开始悄悄查：岗位说明书一模一样、年度考核标准一致、连入职背景调查的要求都没差别。再通过几次"无意"的聊天，我确认了同组三个男生的薪资全部比我高 20%–40%。我直接去问直属领导，他想都没想就回："男生要养家糊口嘛，女生反正有老公。"——这句话我顺手录了。\n\n带着所有证据走完正式申诉流程，HR 跟我拉了两个月锯，最后老老实实补差额、调薪资。\n\n这件事最让我意外的不是结果，是过程里很多女同事的反应——"你居然敢问？" 嗯，我居然敢问。后来才琢磨明白，"职场上聊钱不体面"这套话术最大的受益者从来不是我们。',
            tag: '#同工同酬',
            time: '2周前'
        },
        {
            title: '面试时被问婚育的反击',
            content: '去年面试一家外企，面试官刚坐下就连发三问："有男朋友吗？""打算什么时候结婚？""如果怀孕了工作怎么办？" 我那天准备得很认真，反而被这几个问题问懵了，最后只挤出一句"暂时没规划"，整场面试都没缓过来。\n\n走出大楼我打了车，在车上一直哭——觉得自己很失败，明明专业能力都没问题，怎么就败给了几句不相关的废话。\n\n哭完冷静下来，我去查了《就业促进法》和《妇女权益保障法》，越查越气：原来这些问题本身就是违法的。我把面试时间、地点、面试官的原话一字一字记下来，向那家招聘平台和当地人社局都递了举报材料。\n\n最后 offer 当然没了。但人社局确实介入调查了，那家公司的招聘经理还专门打电话来道歉，听说他们改了面试流程。我没拿到那份工作，下一个去那家面试的女生却不会再被这样问了——这笔买卖，算我赚的。\n\n下次你要是也碰上，希望你比当时的我勇敢一点：不想答可以直接说"这跟岗位无关"，不必硬挤出微笑回答。',
            tag: '#面试歧视',
            time: '1个月前'
        },
        {
            title: '试用期被"无理由"辞退的反击',
            content: '试用期还剩两周的时候，部门经理把我叫到会议室，说"我们觉得你不太适合这个岗位"，让我下周来办离职。我懵了：入职这几个月没有任何负面反馈，反而因为帮组里加班赶项目被夸过两次。直到他犹犹豫豫补一句"你之前请的那天病假……"我才反应过来——那天我请假是因为去医院做了备孕检查，我不知道他怎么知道的。\n\n我没签当场的离职单，借口"想跟家人商量一下"先回家了。回家立刻打 12348。律师在电话里说：试用期辞退也需要"不符合录用条件"的具体证据，公司不能凭一句话把人赶走。\n\n第二天我回邮件："请书面写明我具体哪条不符合录用条件。" 对方支吾了几天后改口"协商解除"，按 N 个月给了补偿。\n\n后来事情的发展挺意外：我用这段时间认真备孕、好好休息，三个月后入职了一家氛围好得多的公司，现在女儿已经三个月了。那笔协商补偿，我留着买了月子餐。',
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
    const SEED_VERSION = 3;

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
        const cloudBaseUrl = (window.HER_SHIELD_CONFIG && window.HER_SHIELD_CONFIG.CLOUDBASE_BASE_URL)
            ? window.HER_SHIELD_CONFIG.CLOUDBASE_BASE_URL.replace(/\/$/, '')
            : '';

        fetch(`${cloudBaseUrl}/story`, {
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
