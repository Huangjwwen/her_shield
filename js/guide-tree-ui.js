function guideTreeApiUrl(route = '') {
    const config = window.HER_SHIELD_CONFIG || {};
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const base = (isLocal ? '' : (window.GUIDE_TREE_API_BASE || config.GUIDE_TREE_API_BASE || '')).replace(/\/$/, '');
    const root = (isLocal ? '/api/guide-tree' : (window.GUIDE_TREE_API_PATH || config.GUIDE_TREE_API_PATH || '/api/guide-tree')).replace(/\/$/, '');
    return `${base}${root}${route}`;
}

function guideTreeEscape(value) {
    const node = document.createElement('div');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
}

const GUIDE_TREE_FIELD_LABELS = {
    userName: '你的姓名',
    companyName: '单位/公司名称',
    respondentName: '对方单位或主体名称',
    complaintTarget: '投诉提交对象',
    caseTitle: '问题标题',
    issueTitle: '争议事项标题',
    currentRole: '当前岗位',
    originalRole: '原岗位',
    jobTitle: '岗位名称',
    eventDate: '事件发生日期',
    noticeDate: '收到通知日期',
    resultDate: '结果日期',
    offerDate: 'Offer 日期',
    effectiveDate: '调整生效日期',
    employmentStartDate: '入职日期',
    employmentEndDate: '离职日期',
    workRegion: '实际工作地',
    insuranceRegion: '生育保险参保地',
    originalSalary: '调整前工资/待遇',
    currentSalary: '调整后工资/待遇',
    performanceChange: '绩效或奖金变化',
    claimAmount: '主张金额',
    eventTimeline: '事件时间线',
    evidenceItems: '已有证据材料',
    attachmentList: '附件清单',
    quotedWords: '相关原话',
    notes: '备注',
    caseNumber: '案件编号',
    hearingDate: '开庭日期',
    supplementDeadline: '补充材料期限',
    replyDeadline: '希望回复日期',
    claimRecords: '已主张权利的记录',
    professionalReviewQuestions: '想请专业人士核对的问题'
};

function guideTreeFieldLabel(field) {
    return GUIDE_TREE_FIELD_LABELS[field] || field;
}

function guideTreeParseJson(text) {
    const raw = String(text || '').trim();
    try {
        return JSON.parse(raw);
    } catch (_) {
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced) return JSON.parse(fenced[1]);
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    }
    return null;
}

function guideTreeApplyEnhancement(result, enhancement) {
    if (!enhancement || typeof enhancement !== 'object') return false;
    result.caseSummary = enhancement.case_summary || enhancement.caseSummary || result.caseSummary;
    result.actionPlan = enhancement.action_plan || enhancement.actionPlan || result.actionPlan;
    result.documentNotes = enhancement.document_notes || enhancement.documentNotes || result.documentNotes;
    const docs = Array.isArray(enhancement.documents) ? enhancement.documents : [];
    if (docs.length) {
        const textByKey = new Map(docs.filter((doc) => doc && doc.documentKey && doc.text).map((doc) => [doc.documentKey, String(doc.text)]));
        result.documents = result.documents.map((document) => (
            document.status === 'ready' && textByKey.has(document.documentKey)
                ? { ...document, text: textByKey.get(document.documentKey), aiEnhanced: true }
                : document
        ));
    }
    return Boolean(result.caseSummary || result.actionPlan || result.documentNotes || docs.length);
}

function guideTreeMatchesFlag(flags, target) {
    return flags.some((item) => item.node === target.node && item.flag === target.flag);
}

function guideTreeCondition(condition, context) {
    if (!condition) return true;
    if (condition.all) return condition.all.every((item) => guideTreeCondition(item, context));
    if (condition.any) return condition.any.some((item) => guideTreeCondition(item, context));
    if (condition.node && condition.value !== undefined) return context.answers[condition.node] === condition.value;
    if (condition.node && condition.flag) return guideTreeMatchesFlag(context.flags, { node: condition.node, flag: condition.flag });
    const field = condition.field || '';
    const value = field.startsWith('answers.') ? context.answers[field.slice(8)] : field === 'flags' ? context.flags : undefined;
    if (condition.op === 'eq') return value === condition.value;
    if (condition.op === 'neq') return value !== condition.value;
    if (condition.op === 'in') return condition.value.includes(value);
    if (condition.op === 'contains') return field === 'flags' && guideTreeMatchesFlag(context.flags, condition.value);
    if (condition.op === 'containsAny') return field === 'flags' && condition.value.some((item) => guideTreeMatchesFlag(context.flags, item));
    return false;
}

function guideTreeNext(tree, state, node, answer) {
    const options = node.options || [];
    const selected = node.type === 'multi' ? answer : [answer];
    const flags = state.flags.slice();
    const selectedOptions = selected.map((value) => options.find((item) => item.value === value)).filter(Boolean);
    selected.forEach((value) => {
        const option = options.find((item) => item.value === value);
        (option && option.setFlags || []).forEach((flag) => flags.push({ node: node.id, flag }));
    });
    const answers = { ...state.answers, [node.id]: answer };
    const context = { answers, flags };
    const option = options.find((item) => item.value === selected[0]);
    const preRule = (node.preRules || []).find((rule) => guideTreeCondition(rule.when, context));
    if (preRule) return { flags, terminal: preRule.terminal };
    const terminalOption = selectedOptions.find((item) => item.terminal);
    if (terminalOption) return { flags, terminal: terminalOption.terminal };
    if (option && option.terminal) return { flags, terminal: option.terminal };
    const optionRule = (option && option.rules || []).find((rule) => rule.otherwise || guideTreeCondition(rule.when, context));
    if (optionRule) return { flags, terminal: optionRule.terminal, next: optionRule.next };
    return { flags, next: node.type === 'multi' ? node.next : option && option.next };
}

async function initGuideTree() {
    const mount = document.getElementById('guideTreeMount');
    if (!mount) return;
    const state = { tree: null, catalog: null, currentNodeId: null, answers: {}, flags: [], path: [], terminal: null, documentFields: {}, online: true, aiEnhanced: false };
    const loadCatalog = async () => {
        try {
            const response = await fetch(guideTreeApiUrl());
            if (!response.ok) throw new Error('catalog unavailable');
            state.online = true;
            return (await response.json()).catalog;
        } catch (_) {
            state.online = false;
            const response = await fetch('guide-tree/config/scene-catalog.json');
            if (!response.ok) throw new Error('catalog fallback unavailable');
            return response.json();
        }
    };
    const loadTree = async (treeId) => {
        try {
            const response = await fetch(guideTreeApiUrl(`?treeId=${encodeURIComponent(treeId)}`));
            if (!response.ok) throw new Error('tree unavailable');
            state.online = true;
            return (await response.json()).config;
        } catch (_) {
            state.online = false;
            const scene = state.catalog.scenes.find((item) => item.action && item.action.treeId === treeId);
            const slug = scene && scene.action.treeId.replaceAll('_', '-');
            if (!slug) throw new Error('scene unavailable');
            const response = await fetch(`guide-tree/config/${slug}.full.json`);
            if (!response.ok) throw new Error('tree fallback unavailable');
            return response.json();
        }
    };
    const resetState = () => Object.assign(state, { tree: null, currentNodeId: null, answers: {}, flags: [], path: [], terminal: null, documentFields: {}, aiEnhanced: false });
    const selectTree = async (treeId) => {
        mount.innerHTML = '<div class="guide-tree-loading">正在加载场景...</div>';
        state.tree = await loadTree(treeId);
        const startNode = state.tree.nodes[state.tree.startNodeId];
        const selfSelect = startNode && startNode.type === 'single' && startNode.options.find((option) => option.value === treeId && option.next);
        if (selfSelect) {
            state.answers[startNode.id] = treeId;
            state.path.push(startNode.id);
            state.currentNodeId = selfSelect.next;
            renderQuestion();
            return;
        }
        renderStart();
    };
    const renderStart = () => {
        if (!state.tree) {
            const scenes = state.catalog.scenes.filter((scene) => scene.availability === 'full');
            const options = scenes.map((scene) => `<button type="button" class="btn-small guide-tree-scene" data-tree-id="${guideTreeEscape(scene.action.treeId)}">${guideTreeEscape(scene.title)}</button>`).join('');
            mount.innerHTML = `<div class="guide-tree-intro guide-tree-entry"><div><strong>你现在遇到的是哪类问题？</strong><p>请选择一个场景进入决策树，或选择其他后手动描述。</p></div><div class="guide-tree-actions">${options}<button type="button" class="btn-small guide-tree-scene guide-tree-other">其他问题（手动描述）</button></div></div>`;
            mount.querySelectorAll('[data-tree-id]').forEach((button) => button.addEventListener('click', async () => {
                try {
                    await selectTree(button.dataset.treeId);
                } catch (_) {
                    mount.innerHTML = '<div class="guide-tree-error">当前场景暂时无法加载。</div>';
                }
            }));
            const other = mount.querySelector('.guide-tree-other');
            if (other) other.addEventListener('click', () => {
                const input = document.getElementById('guideInput');
                if (input) {
                    input.focus();
                    input.placeholder = '请手动描述你遇到的问题，系统会调用她行智能体生成维权路径。';
                }
            });
            return;
        }
        const scene = state.catalog.scenes.find((item) => item.action && item.action.treeId === state.tree.treeId);
        mount.innerHTML = `<div class="guide-tree-intro"><div><strong>${guideTreeEscape(scene ? scene.title : state.tree.treeId)}</strong><p>请根据实际情况逐题确认。</p></div><button type="button" class="btn-primary guide-tree-start">开始</button><button type="button" class="btn-small guide-tree-change">更换场景</button></div>`;
        mount.querySelector('.guide-tree-start').addEventListener('click', () => {
            state.currentNodeId = state.tree.startNodeId;
            renderQuestion();
        });
        mount.querySelector('.guide-tree-change').addEventListener('click', () => { resetState(); renderStart(); });
    };
    const resetTo = (index) => {
        const kept = state.path.slice(0, index);
        state.path.slice(index).forEach((nodeId) => delete state.answers[nodeId]);
        state.path = kept;
        state.flags = [];
        kept.forEach((nodeId) => {
            const node = state.tree.nodes[nodeId];
            const answer = state.answers[nodeId];
            const selected = Array.isArray(answer) ? answer : [answer];
            selected.forEach((value) => {
                const option = node.options.find((item) => item.value === value);
                (option && option.setFlags || []).forEach((flag) => state.flags.push({ node: nodeId, flag }));
            });
        });
        state.currentNodeId = kept[kept.length - 1] || state.tree.startNodeId;
    };
    const renderQuestion = () => {
        const node = state.tree.nodes[state.currentNodeId];
        if (!node) return renderStart();
        const back = state.path.length ? '<button type="button" class="btn-small guide-tree-back">返回上一题</button>' : '';
        const multiple = node.type === 'multi';
        const options = node.options.map((option) => `<label class="guide-tree-option"><input type="${multiple ? 'checkbox' : 'radio'}" name="guide-tree-answer" value="${guideTreeEscape(option.value)}"> <span>${guideTreeEscape(option.label)}</span></label>`).join('');
        mount.innerHTML = `<div class="guide-tree-question"><div class="guide-tree-meta">第 ${state.path.length + 1} 题</div><h3>${guideTreeEscape(node.title)}</h3><div class="guide-tree-options">${options}</div><div class="guide-tree-actions">${back}${multiple ? '<button type="button" class="btn-primary guide-tree-next">继续</button>' : ''}</div></div>`;
        const commit = (answer) => {
            if (multiple && answer.includes('none') && answer.length !== 1) return;
            const next = guideTreeNext(state.tree, state, node, answer);
            state.answers[node.id] = answer;
            state.flags = next.flags;
            state.path.push(node.id);
            if (next.terminal) {
                state.terminal = next.terminal;
                resolve();
                return;
            }
            if (!next.next) {
                mount.innerHTML = '<div class="guide-tree-error">当前配置缺少下一步，请联系管理员。</div>';
                return;
            }
            state.currentNodeId = next.next;
            renderQuestion();
        };
        if (multiple) {
            mount.querySelector('.guide-tree-next').addEventListener('click', () => {
                const selected = [...mount.querySelectorAll('input:checked')].map((input) => input.value);
                if (!selected.length) return;
                commit(selected);
            });
        } else {
            mount.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => commit(input.value)));
        }
        const backButton = mount.querySelector('.guide-tree-back');
        if (backButton) backButton.addEventListener('click', () => {
            const previousIndex = state.path.length - 1;
            resetTo(previousIndex);
            renderQuestion();
        });
    };
    const collectFields = () => {
        mount.querySelectorAll('[data-guide-tree-field]').forEach((input) => {
            if (input.value.trim()) state.documentFields[input.dataset.guideTreeField] = input.value.trim();
        });
    };
    const renderResult = (result) => {
        const bases = result.legalBasis.map((basis) => `<li><strong>${guideTreeEscape(basis.lawName)}${guideTreeEscape(basis.article)}</strong><span>${guideTreeEscape(basis.displayText)}</span></li>`).join('');
        const missing = [...new Set(result.documents.flatMap((document) => document.missingFields || []))];
        const fieldInputs = missing.map((field) => `<label>${guideTreeEscape(guideTreeFieldLabel(field))}<input type="text" data-guide-tree-field="${guideTreeEscape(field)}" value="${guideTreeEscape(state.documentFields[field] || '')}" placeholder="请填写${guideTreeEscape(guideTreeFieldLabel(field))}"></label>`).join('');
        const caseSummary = result.caseSummary ? `<section class="guide-tree-plan"><h4>案情摘要</h4><p>${guideTreeEscape(result.caseSummary)}</p></section>` : '';
        const actionPlan = result.actionPlan ? `<section class="guide-tree-plan"><h4>行动方案</h4><p>${guideTreeEscape(result.actionPlan)}</p></section>` : '';
        const documentNotes = result.documentNotes ? `<section class="guide-tree-plan"><h4>文书说明</h4><p>${guideTreeEscape(result.documentNotes)}</p></section>` : '';
        const statusText = state.aiEnhanced ? '已生成智能体增强方案' : state.online ? '已完成后端复核' : '待联网提交复核';
        const documents = result.documents.map((document) => `<article class="guide-tree-document"><h4>${guideTreeEscape(document.title)}</h4>${document.status === 'ready' ? `<pre>${guideTreeEscape(document.text)}</pre>` : '<p>补充必要信息后可生成。</p>'}</article>`).join('');
        mount.innerHTML = `<div class="guide-tree-result"><div class="guide-tree-result-title"><strong>${guideTreeEscape(result.terminal.title)}</strong><span>${statusText}</span></div>${caseSummary}${actionPlan}${bases ? `<ul class="guide-tree-basis">${bases}</ul>` : ''}${fieldInputs ? `<div class="guide-tree-fields">${fieldInputs}<button type="button" class="btn-primary guide-tree-regenerate">生成文书</button></div>` : ''}${documentNotes}<div class="guide-tree-documents">${documents}</div><button type="button" class="btn-small guide-tree-restart">重新开始</button></div>`;
        const regenerate = mount.querySelector('.guide-tree-regenerate');
        if (regenerate) regenerate.addEventListener('click', () => {
            collectFields();
            resolve();
        });
        mount.querySelector('.guide-tree-restart').addEventListener('click', () => {
            resetState();
            renderStart();
        });
    };
    const enhanceInBrowser = async (result) => {
        if (typeof window.callYuanqiAPI !== 'function') return false;
        if (result.terminal.scopeStatus === 'out_of_scope') return false;
        if (!result.documents.some((document) => document.status === 'ready')) return false;
        const readyDocuments = result.documents
            .filter((document) => document.status === 'ready')
            .map((document) => ({ documentKey: document.documentKey, title: document.title, text: document.text }));
        const prompt = [
            '你是“她行·维权导航”的语言整理模块。以下终点、法律路径、法律依据和文书白名单已经由后端规则引擎复算，不能修改。',
            '你只负责生成更清晰的案情摘要、行动方案、文书说明，并可润色输入中已有 documentKey 的文书正文。',
            '不得新增用户未提供的事实，不得承诺胜诉，不得断言单位一定违法。缺少事实时写“待补充/建议核对”。',
            '请仅返回 JSON：{"case_summary":"...","action_plan":"...","document_notes":"...","documents":[{"documentKey":"...","text":"..."}]}。',
            JSON.stringify({
                treeId: result.treeId,
                treeVersion: result.treeVersion,
                terminal: result.terminal,
                answers: result.canonicalAnswers,
                flags: result.canonicalFlags,
                legalBasis: result.legalBasis,
                documents: readyDocuments
            })
        ].join('\n\n');
        try {
            const text = await window.callYuanqiAPI('guide', prompt, false, { nocache: true });
            return guideTreeApplyEnhancement(result, guideTreeParseJson(text));
        } catch (_) {
            return false;
        }
    };
    const resolve = async () => {
        mount.innerHTML = '<div class="guide-tree-loading">正在生成专属维权方案...</div>';
        try {
            const response = await fetch(guideTreeApiUrl('/resolve'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ treeId: state.tree.treeId, treeVersion: state.tree.treeVersion, path: state.path, answers: state.answers, documentFields: state.documentFields })
            });
            if (!response.ok) throw new Error('resolve unavailable');
            const payload = await response.json();
            state.online = true;
            state.aiEnhanced = Boolean(payload.aiEnhanced);
            if (!state.aiEnhanced) state.aiEnhanced = await enhanceInBrowser(payload.result);
            renderResult(payload.result);
        } catch (_) {
            state.online = false;
            mount.innerHTML = '<div class="guide-tree-pending"><strong>问答已保存为待提交状态</strong><p>网络恢复后，请重新进入此流程以获取后端复核后的正式方案和文书。</p><button type="button" class="btn-small guide-tree-restart">重新开始</button></div>';
            mount.querySelector('.guide-tree-restart').addEventListener('click', renderStart);
        }
    };
    try {
        state.catalog = await loadCatalog();
        renderStart();
    } catch (_) {
        mount.innerHTML = '<div class="guide-tree-error">维权场景暂时无法加载。</div>';
    }
}
