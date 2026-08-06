const GUIDE_TREE_ID = 'pregnancy_pay_cut';

function guideTreeApiUrl(path) {
    const base = (window.GUIDE_TREE_API_BASE || '').replace(/\/$/, '');
    return `${base}${path}`;
}

function guideTreeEscape(value) {
    const node = document.createElement('div');
    node.textContent = value == null ? '' : String(value);
    return node.innerHTML;
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
    selected.forEach((value) => {
        const option = options.find((item) => item.value === value);
        (option && option.setFlags || []).forEach((flag) => flags.push({ node: node.id, flag }));
    });
    const answers = { ...state.answers, [node.id]: answer };
    const context = { answers, flags };
    const option = options.find((item) => item.value === selected[0]);
    const preRule = (node.preRules || []).find((rule) => guideTreeCondition(rule.when, context));
    if (preRule) return { flags, terminal: preRule.terminal };
    if (option && option.terminal) return { flags, terminal: option.terminal };
    const optionRule = (option && option.rules || []).find((rule) => rule.otherwise || guideTreeCondition(rule.when, context));
    if (optionRule) return { flags, terminal: optionRule.terminal, next: optionRule.next };
    return { flags, next: node.type === 'multi' ? node.next : option && option.next };
}

async function initGuideTree() {
    const mount = document.getElementById('guideTreeMount');
    if (!mount) return;
    mount.innerHTML = '<div class="guide-tree-loading">正在加载维权问答...</div>';
    let tree;
    let online = true;
    try {
        const response = await fetch(guideTreeApiUrl(`/api/guide-tree?treeId=${GUIDE_TREE_ID}`));
        if (!response.ok) throw new Error('config unavailable');
        tree = (await response.json()).config;
    } catch (_) {
        online = false;
        try {
            const response = await fetch('guide-tree/config/pregnancy-pay-cut.full.json');
            if (!response.ok) throw new Error('fallback unavailable');
            tree = await response.json();
        } catch (_) {
            mount.innerHTML = '<div class="guide-tree-error">维权问答暂时无法加载。</div>';
            return;
        }
    }

    const state = { currentNodeId: null, answers: {}, flags: [], path: [], terminal: null, documentFields: {}, online };
    const renderStart = () => {
        mount.innerHTML = `<div class="guide-tree-intro"><div><strong>孕产期调岗降薪</strong><p>请根据实际情况逐题确认。</p></div><button type="button" class="btn-primary guide-tree-start">开始</button></div>`;
        mount.querySelector('.guide-tree-start').addEventListener('click', () => {
            state.currentNodeId = tree.startNodeId;
            renderQuestion();
        });
    };
    const resetTo = (index) => {
        const kept = state.path.slice(0, index);
        state.path.slice(index).forEach((nodeId) => delete state.answers[nodeId]);
        state.path = kept;
        state.flags = [];
        kept.forEach((nodeId) => {
            const node = tree.nodes[nodeId];
            const answer = state.answers[nodeId];
            const selected = Array.isArray(answer) ? answer : [answer];
            selected.forEach((value) => {
                const option = node.options.find((item) => item.value === value);
                (option && option.setFlags || []).forEach((flag) => state.flags.push({ node: nodeId, flag }));
            });
        });
        state.currentNodeId = kept[kept.length - 1] || tree.startNodeId;
    };
    const renderQuestion = () => {
        const node = tree.nodes[state.currentNodeId];
        if (!node) return renderStart();
        const back = state.path.length ? '<button type="button" class="btn-small guide-tree-back">返回上一题</button>' : '';
        const multiple = node.type === 'multi';
        const options = node.options.map((option) => `<label class="guide-tree-option"><input type="${multiple ? 'checkbox' : 'radio'}" name="guide-tree-answer" value="${guideTreeEscape(option.value)}"> <span>${guideTreeEscape(option.label)}</span></label>`).join('');
        mount.innerHTML = `<div class="guide-tree-question"><div class="guide-tree-meta">第 ${state.path.length + 1} 题</div><h3>${guideTreeEscape(node.title)}</h3><div class="guide-tree-options">${options}</div><div class="guide-tree-actions">${back}${multiple ? '<button type="button" class="btn-primary guide-tree-next">继续</button>' : ''}</div></div>`;
        const commit = (answer) => {
            if (multiple && answer.includes('none') && answer.length !== 1) return;
            const next = guideTreeNext(tree, state, node, answer);
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
        const fieldInputs = missing.map((field) => `<label>${guideTreeEscape(field)}<input type="text" data-guide-tree-field="${guideTreeEscape(field)}" value="${guideTreeEscape(state.documentFields[field] || '')}"></label>`).join('');
        const documents = result.documents.map((document) => `<article class="guide-tree-document"><h4>${guideTreeEscape(document.title)}</h4>${document.status === 'ready' ? `<pre>${guideTreeEscape(document.text)}</pre>` : '<p>补充必要信息后可生成。</p>'}</article>`).join('');
        mount.innerHTML = `<div class="guide-tree-result"><div class="guide-tree-result-title"><strong>${guideTreeEscape(result.terminal.title)}</strong><span>${state.online ? '已完成后端复核' : '待联网提交复核'}</span></div>${bases ? `<ul class="guide-tree-basis">${bases}</ul>` : ''}${fieldInputs ? `<div class="guide-tree-fields">${fieldInputs}<button type="button" class="btn-primary guide-tree-regenerate">生成文书</button></div>` : ''}<div class="guide-tree-documents">${documents}</div><button type="button" class="btn-small guide-tree-restart">重新开始</button></div>`;
        const regenerate = mount.querySelector('.guide-tree-regenerate');
        if (regenerate) regenerate.addEventListener('click', () => {
            collectFields();
            resolve();
        });
        mount.querySelector('.guide-tree-restart').addEventListener('click', () => {
            Object.assign(state, { currentNodeId: null, answers: {}, flags: [], path: [], terminal: null, documentFields: {} });
            renderStart();
        });
    };
    const resolve = async () => {
        mount.innerHTML = '<div class="guide-tree-loading">正在生成专属维权方案...</div>';
        try {
            const response = await fetch(guideTreeApiUrl('/api/guide-tree/resolve'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ treeId: tree.treeId, treeVersion: tree.treeVersion, path: state.path, answers: state.answers, documentFields: state.documentFields })
            });
            if (!response.ok) throw new Error('resolve unavailable');
            const payload = await response.json();
            state.online = true;
            renderResult(payload.result);
        } catch (_) {
            state.online = false;
            mount.innerHTML = '<div class="guide-tree-pending"><strong>问答已保存为待提交状态</strong><p>网络恢复后，请重新进入此流程以获取后端复核后的正式方案和文书。</p><button type="button" class="btn-small guide-tree-restart">重新开始</button></div>';
            mount.querySelector('.guide-tree-restart').addEventListener('click', renderStart);
        }
    };
    renderStart();
}
