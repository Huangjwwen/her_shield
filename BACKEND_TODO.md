# 后端(第1组)待办清单

> **2026-06-01 更新**: P0 已修复 ✅(proxy 6 个 agentType 路由打通);新出现 🔴 P0-bis 元器 radar 工作流自身 10003 故障,详见底部"当前阻塞"小节。
>
> **2026-06-02 新阻塞 🔴**: selfcheck(她权·权益指南) 工作流走代理永远返回 10003,**但后台调试正常** —— 详见下方"selfcheck 错配"小节。

---

## 🔴 P0 新阻塞 —— selfcheck 工作流后台正常 / 前端代理 10003

### 现象

2026-06-02 实测:用户在网页"她权·权益指南"输入"在职怀孕女性受到哪些法律保护",前端永远显示本地兜底数据(`【您的合法权利】孕期、产期、哺乳期女职工受法律特殊保护...`),不是元器工作流真实输出。

经 curl 实测,代理对 `agentType=selfcheck` 始终返回:

```json
{"success":true,"data":{"id":"...","error":{"message":"工作流运行异常","type":"runtime_error","param":null,"code":"10003"}}}
```

而后端组反馈"工作流在元器编辑器后台调试正常"。

### 关键差异

| 入口 | 鉴权 | 工作流版本 | 结果 |
|---|---|---|---|
| 元器编辑器"试运行" | 后台 admin | **草稿版本** | ✅ 正常 |
| 前端 → CloudBase 代理 → 元器 API | `KEY_SELFCHECK` env var → 关联的 **已发布版本** | ⚠️ 10003 |

### 3 步排查建议

#### 1. 看版本号
在元器工作流编辑器顶部,看现在编辑的"草稿版本号" vs "已发布版本号":
- 如果你最近改过工作流但没点"发布并更新到 appkey",前端拿到的是旧版本

#### 2. curl 绕过 CloudBase 直连元器
用同一个 `KEY_SELFCHECK` 直接打元器 API:

```bash
curl -X POST 'https://yuanqi.tencent.com/openapi/v1/agent/chat/completions' \
  -H "Authorization: Bearer $KEY_SELFCHECK" \
  -H 'Content-Type: application/json' \
  -d '{
    "assistant_id": "2041405236168255296",
    "user_id": "test-001",
    "stream": false,
    "messages": [{"role":"user","content":[{"type":"text","text":"产假多少天"}]}]
  }'
```

- 直连也 10003 → 工作流**已发布版**本身有问题(可能跟最近改了草稿没发布有关)
- 直连 OK 而代理 10003 → CloudBase 上 `KEY_SELFCHECK` 配错了或过期

#### 3. 元器后台运行日志
工作流编辑器 → 运行日志 → 过滤最近的 selfcheck 10003,看是哪个节点 throw。**很大概率跟 radar 之前一样,某个 LLM 节点或代码节点空输入抛错**。

### 影响

- **答辩 demo 期间用户进"她权·权益指南"演示会看到假数据**(已加显眼 ⚠️ Toast 警告"智能体未连通,显示离线示例")
- 评测脚本不评 selfcheck,无直接影响

### 其他 4 个 agent 现状

| Agent | 工作流状态 |
|---|---|
| radar(言行雷达) | ✅ 完全可用,深度分析 38-58s |
| consultation(智能咨询) | ✅ |
| **selfcheck(她权·权益指南)** | 🔴 **10003 仍存在** |
| guide(行动导航) | ✅ |
| evidence(她证) | ⚠️ 待后端组核对(之前 10003) |
| harbor(她心) | ⚠️ 10008 模型余额不足 |

---

## ✅ P0 已修复 —— proxy 代理对所有 agentType 返回"未知 agentType"

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
| P0 proxy 6 个 agentType 全跑通(返回真实元器 JSON 含 choices) | ✅ 已修(2026-06-01 验证) |
| P1 force/has_image/query/image_urls 字段被工作流读取生效 | ⏳ 待复核 |
| 健康自检脚本入库,部署后自动跑 | ⏳ |
| 跑通后,前端评测脚本能在 ~10 分钟内完成 100 条评测 | ❌ 受元器 10003 阻塞,见下方 |

---

## 🔴 当前阻塞 —— 元器 radar 工作流 code 10003 "工作流运行异常"

### 现象(2026-06-01 实测)

proxy 路由已通,但元器侧的 radar 工作流**自身在抛运行时错**:

```bash
$ curl -s -X POST '<proxy>/proxy' -H 'Content-Type: application/json' \
    -d '{"agentType":"radar","messages":[{"role":"user","content":[{"type":"text","text":"主管硬要搂我肩膀"}]}]}'

{"success":true,"data":{
  "id":"a8c23a0a4ba5fcde9f66274901c98af7",
  "error":{
    "message":"工作流运行异常",
    "type":"runtime_error",
    "param":null,
    "code":"10003"
  }
}}
```

**关键观察**:
- `success: true` 说明 proxy 收到了元器响应(不是网络/路由层故障)
- 内层 `error.code: "10003"` 是元器**工作流执行引擎**抛出的 runtime_error
- 同一输入第二次调,因 proxy 缓存命中可能返回成功(干扰诊断)
- **新输入**(没缓存的)目前 100% 复现 10003
- consultation 等其他 agent 同样输入能拿到 choices(说明不是 KEY 问题)
- 仅 radar 工作流挂掉

**进一步定位(2026-06-01)**:
- 极短文本(如"health check xxx")能拿到 choices —— 说明 radar **门控分支**(判定为"一般询问"走兜底节点)是好的
- 详细情景描述(如"主管硬要搂我肩膀")100% 触发 10003 —— 说明 **门控判定"涉及"后走的"要件式深度分析"那条链路**有节点挂掉
- 5 次 selfcheck/evidence/guide 健康自检都返回 10003(短文本也挂)—— 跟 radar 不同,这 3 个**短输入也走不通**,可能是公共依赖(知识库/检索/某共享代码节点)出问题
- harbor 是 10008 "应用模型余额不足"(单独问题)

### 影响

- 评测脚本(`eval/run.js`)走代理跑 10 条,**全部** 10003 失败,n=0 → 无法生成答辩准确率数据
- 用户在前端测 radar 也会卡在"分析中"然后报错

### 排查方向(给元器 admin / 工作流维护者)

1. **打开元器后台 → 言行雷达智能体 → 工作流编辑器 → 运行日志**
   找最近的 10003 记录,看是哪个节点(LLM / 代码 / 检索)抛的
2. **常见 10003 原因**:
   - LLM 节点参数变更(model id / token 上限 / 余额不足)
   - 代码节点引用了不存在的字段(比如要 `query` 但前端没传)
   - 知识库节点检索超时
   - 串行链路里某个节点没设默认值,空输入直接 throw
3. **快速验证法**:在元器工作流编辑器里"试运行",用同样的输入文本,看会停在哪一步

### 给后端组的请求

- [ ] 与元器工作流维护者(言行雷达组)确认 radar 工作流目前的健康状态
- [ ] 如果工作流刚改过(比如加了 force/has_image/image_urls 入参),回滚或修复
- [ ] 修好后跑一次健康自检(下方 P2 脚本)

修好后请通知,我们会立即:
1. 重跑 `eval/run.js`(已更新为兼容新代理响应格式 `{success:true, data:{choices:[...]}}`)
2. 把真实准确率数字回填到答辩 PPT P9 准确率仪表盘
3. 验证 force 按钮真能让被门控误判的输入再次走完整流程


