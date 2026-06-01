# 后端(第1组)待办清单 —— 阻塞答辩前必须完成

> 本文档汇总目前后端侧待修复/待升级的事项,按优先级排序。
> 维护人:言行雷达组(对接第1组)。最后更新:2026-05-30。

---

## 🔴 P0 阻塞 —— proxy 代理对所有 agentType 返回"未知 agentType"

### 问题描述

线上代理(`https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy`)对前端发的 6 个 agentType **全部失败**,返回固定错误:

```json
{"success": false, "error": "未知 agentType"}
```

### 实测复现

```bash
# 这 6 个名字都该是合法的(对应前端 YUANQI_CONFIG.AGENTS 的 key),但全部失败
for t in radar consultation selfcheck evidence guide harbor; do
  echo "=== $t ==="
  curl -s -X POST 'https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy' \
    -H 'Content-Type: application/json' \
    -d "{\"agentType\":\"$t\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"测试\"}]}]}"
done
```

期望:每个都返回带 `choices` 的真实元器响应。
现状:全部 `{"success":false,"error":"未知 agentType"}`。

### 影响

- **所有 6 个智能体模块在线上演示时,全部走前端兜底样例**(case_references 显示"(示例)"前缀),等于密钥下沉的工作白做。
- 评测脚本(`eval/run.js`)默认走代理,跑出来 0 准确率。

### 这是同一个 bug 第 3 次出现

时间线:
1. 第 1 次:首次部署后发现,反馈后修好(我们一度看到真实元器 JSON)。
2. 第 2 次:之后某次部署/改配置又挂了,反馈后再次修好。
3. 第 3 次(当前):又挂了。

### 修复检查清单

请在 CloudBase 控制台 → 云函数 → proxy 函数下逐项核验:

#### A. 环境变量配置(`设置` / `环境变量` 标签)

确认下面 6 个键都存在且**值非空**,键名**一字不差**(全大写、下划线):

- [ ] `KEY_CONSULTATION`
- [ ] `KEY_RADAR`
- [ ] `KEY_SELFCHECK`
- [ ] `KEY_EVIDENCE`
- [ ] `KEY_GUIDE`
- [ ] `KEY_HARBOR`

值是元器后台对应智能体的真实 appkey(老的、已下沉到环境变量的那 6 个)。

#### B. 函数代码 KEY_MAP

确认函数代码里的 KEY_MAP 或 switch/case **包含全部 6 个小写名字**:

```javascript
// 期望长这样
const KEY_MAP = {
  radar:        process.env.KEY_RADAR,
  consultation: process.env.KEY_CONSULTATION,
  selfcheck:    process.env.KEY_SELFCHECK,
  evidence:     process.env.KEY_EVIDENCE,
  guide:        process.env.KEY_GUIDE,
  harbor:       process.env.KEY_HARBOR,
};
const appkey = KEY_MAP[agentType];
if (!appkey) {
  return { success: false, error: '未知 agentType' };  // ← 现在 6 个都进这条
}
```

容易翻车的点:
- 拼写大小写(`radar` 不是 `Radar`,`harbor` 不是 `Harbour`)
- `process.env.XXX` 取到 undefined(环境变量没配/拼错)
- 部署后没勾"保留环境变量"导致下次部署被清

#### C. 改完务必做的两件事

- [ ] **点保存并重新部署**(改环境变量必须重新部署函数才生效)
- [ ] **立刻跑一次 curl 自测**(下面的"健康自检"小节)

---

## 🟠 P1 升级 —— 支持 `force` / `has_image` / `query` / `image_urls` 字段透传

### 背景

言行雷达的元器工作流已经加了 4 个"开始节点入参":

| 字段 | 类型 | 用途 |
|------|------|------|
| `query` | string | 用户原始描述(与 messages 互补) |
| `force` | boolean | true 时**跳过门控**直接深度分析(用户对误判一键申诉) |
| `has_image` | boolean | 是否含图片(配合 OCR 节点) |
| `image_urls` | string[] | 图片 URL 数组(配合 OCR 节点) |

前端已经在 `js/core.js` 的 `callYuanqiAPI` 加了 `extras` 参数,把这 4 个字段塞进请求体顶层。前端实测请求 body 长这样:

```json
{
  "agentType": "radar",
  "messages": [{"role":"user","content":[{"type":"text","text":"面试 HR 问婚育"}]}],
  "query": "面试 HR 问婚育",
  "force": true,
  "has_image": false,
  "image_urls": []
}
```

### 后端需要做的

让 proxy 把 `query` / `force` / `has_image` / `image_urls` **一并透传给元器请求体**(放在元器要求的位置,看元器 API 文档)。

### 自测命令

```bash
# 测 force=true 是否真的跳过门控
curl -X POST 'https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy' \
  -H 'Content-Type: application/json' \
  -d '{
    "agentType": "radar",
    "messages": [{"role":"user","content":[{"type":"text","text":"今天天气"}]}],
    "query": "今天天气",
    "force": true,
    "has_image": false,
    "image_urls": []
  }'
```

期望:返回的 JSON 里有 `risk_level` 字段(说明 force 生效,跳过门控走完整判定);
现状:无论 force 怎样,如果命中门控就被判"不涉及"。

---

## 🟡 P2 建议 —— 加上线/部署自检脚本

为了避免**同一个 bug 第 4 次出现**,强烈建议把上面 curl 命令做成自动化脚本,每次部署完自动跑一遍:

```bash
#!/usr/bin/env bash
# health-check.sh —— 每次部署 proxy 后必须跑
set -e
URL='https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy'
TYPES=(radar consultation selfcheck evidence guide harbor)

failed=0
for t in "${TYPES[@]}"; do
  resp=$(curl -s -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -d "{\"agentType\":\"$t\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"health check\"}]}]}")
  if echo "$resp" | grep -q '"success":false'; then
    echo "❌ $t: $resp"
    failed=1
  else
    echo "✅ $t"
  fi
done

[[ $failed -eq 0 ]] && echo "💚 全部通过" || { echo "❌ 有失败"; exit 1; }
```

也可以加到 README 的"部署检查清单"里,作为团队约定。

---

## 答辩前必须完成的清单

| 项 | 状态 |
|------|------|
| P0 proxy 6 个 agentType 全跑通(返回真实元器 JSON 含 choices) | ❌ 当前 |
| P1 force/has_image/query/image_urls 字段被工作流读取生效 | ❌ 当前 |
| 健康自检脚本入库,部署后自动跑 | ⏳ |
| 跑通后,前端评测脚本能在 ~10 分钟内完成 100 条评测 | ⏳ |

修复完成后请通知言行雷达组,我们会立即:
1. 重跑 `eval/run.js`(代理模式)拿到完整答辩准确率数据
2. 删除前端的"代理失败 → 兜底样例"逻辑(或仅保留为 demo 离线模式)
3. 验证 force 按钮真能让被门控误判的输入再次走完整流程

---

## 沟通约定

- **修复状态**:每次改完代理后,在群里发一句"已修复 + curl 自测截图"(避免再次出现"我这边好的"但前端实际仍挂的情况)
- **回归测试**:任何 CloudBase 部署/改配置后,必须先跑健康自检脚本再宣布部署完成
- **联系人**:言行雷达组对接人(本仓库 PR 中可见提交者)
