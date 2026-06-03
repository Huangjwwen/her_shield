# CloudBase proxy 缓存策略升级方案

> **致后端组(第 1 组)**
> **背景:** 当前 proxy 云函数的内存缓存按 hash 直接覆盖式写入,不区分响应类型,导致异常响应被缓存后用户重试拿到完全相同的异常,体验上等同于"重试无效"。
> **目标:** 加 3 道防线让缓存真正"只缓存成功响应",并允许前端显式跳过缓存。

---

## 一、问题映射

**当前实现:** 所有响应(包括错误响应)都被缓存,导致以下 5 类异常场景下用户重试无意义:

| # | 异常类型 | 响应特征 | 当前后果 |
|---|---|---|---|
| A | **proxy 自身失败** | `{success: false, error: "未知 agentType"}` | 缓存了错误对象 |
| B | **元器工作流运行异常** | `{success:true, data:{error:{code:"10003"}}}` | 缓存了 10003 |
| C | **内容审查截断** | `choices[0].finish_reason === "content_filter"` + 半句话 | 缓存了半句话 |
| D | **token 上限截断** | `choices[0].finish_reason === "length"` + 半句话 | 缓存了半句话 |
| E | **工作流 JSON 解析兜底** | `content === '{"risk_level":null,"parse_error":"..."}'` | 缓存了 null risk |

---

## 二、改造方案(3 件套)

### 2.1 写入白名单 `shouldCache()`

**只缓存"真正成功"的响应。**

```javascript
function shouldCache(raw, agentType) {
  // A: proxy 层失败
  if (!raw || raw.success === false) return false;

  const data = raw.data || raw;

  // B: 元器内层错误(10003 / 10008 / 460101 等)
  if (data.error) return false;

  // 必须有 choices
  const choice = data.choices?.[0];
  if (!choice) return false;

  // C/D: finish_reason 必须是 stop,排除 content_filter / length
  if (choice.finish_reason !== 'stop') return false;

  // content 必须非空字符串
  const content = choice.message?.content;
  if (typeof content !== 'string' || content.trim() === '') return false;

  // E: 对期望返回 JSON 的 agent(radar/selfcheck/evidence/guide),
  //    额外校验 JSON 解析成功且无 parse_error 标记
  if (['radar', 'selfcheck', 'evidence', 'guide'].includes(agentType)) {
    try {
      const cleaned = content.trim().replace(/^[​-‍﻿]/, '');
      const parsed = JSON.parse(cleaned);
      if (parsed.risk_level === null || parsed.parse_error) return false;
    } catch (e) {
      // 期望 JSON 但解析失败也不缓存
      return false;
    }
  }

  return true;
}
```

### 2.2 `nocache=true` 入参

**让前端在用户主动重试时显式跳过缓存。**

#### API 设计

```http
POST /proxy
Content-Type: application/json

{
  "agentType": "radar",
  "messages": [...],
  "nocache": true,        // ← 新增,默认 false
  "force": true,           // 已有
  "query": "...",          // 已有
  "has_image": false,      // 已有
  "image_urls": []         // 已有
}
```

#### 代理函数核心逻辑

```javascript
exports.main = async (event, context) => {
  const body = parseBody(event);
  const { agentType, messages, nocache = false, ...extras } = body;

  const key = computeCacheKey(agentType, messages, extras);

  // ── 读缓存:nocache 跳过 ──
  if (!nocache) {
    const cached = cache.get(key);
    if (cached) return { ...cached, fromCache: true };
  }

  // ── 调元器 ──
  const result = await callYuanqi(agentType, messages, extras);

  // ── 写缓存:nocache 时也跳过,且只写白名单通过的响应 ──
  if (!nocache && shouldCache(result, agentType)) {
    cache.set(key, result);
  }

  return result;
};
```

#### 前端集成(自动行为,用户无感)

```javascript
// js/core.js callYuanqiAPI
async function callYuanqiAPI(agentType, userMessage, useStream = false, extras = {}) {
  const requestBody = { agentType, messages, ...extras };

  // ★ 强制深度分析 = 用户主动重试 = 必须绕开缓存
  if (extras.force === true) {
    requestBody.nocache = true;
  }

  // ... fetch 调用
}
```

**触发场景:**

| 场景 | 是否带 nocache=true |
|---|---|
| 普通输入 → 立即识别 | ❌(默认走缓存提升体验) |
| 言行雷达「🔄 强制深度分析」按钮 | ✅(自动) |
| 独立「🔄 重试」按钮 | ✅(显式) |
| 答辩演示连续同输入 | ✅(防止 fromCache 暴露 demo) |

### 2.3 TTL 30 分钟 + LRU 1000 上限

**控制内存占用 + 让元器侧改 prompt 后能自动失效。**

```javascript
class TTLCache {
  constructor(ttlMs = 30 * 60 * 1000, maxSize = 1000) {
    this.ttl = ttlMs;
    this.maxSize = maxSize;
    this.store = new Map();  // 利用 Map 的插入顺序做 LRU
  }

  set(key, value) {
    // 容量上限触发 LRU 淘汰最老的
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    // 惰性过期:读时检查
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    // LRU touch:命中后重新插入,延后淘汰
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  size() { return this.store.size; }
  clear() { this.store.clear(); }
}

const cache = new TTLCache(30 * 60 * 1000, 1000);
```

**为什么这两个数字:**

| 参数 | 值 | 理由 |
|---|---|---|
| TTL | **30 分钟** | 覆盖一次典型用户会话(10-20 分钟);答辩单场 ~15 分钟,场间清缓存;元器侧改 prompt 后 30 分钟内自动生效 |
| maxSize | **1000** | CloudBase 函数实例 256MB 内存;一条响应 5-10 KB → 1000 项 = 5-10 MB,完全可承受;超过用 LRU 淘汰最老的 |

---

## 三、缓存键 hash 设计

```javascript
const crypto = require('crypto');

function computeCacheKey(agentType, messages, extras) {
  const normalized = {
    agentType,
    // 只取 messages 的 role + content,忽略可能变动的字段
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string'
        ? m.content
        : JSON.stringify(m.content)
    })),
    // 跟工作流分支判定相关的入参也参与 hash
    force: extras.force || false,
    has_image: extras.has_image || false,
    image_urls: extras.image_urls || []
  };
  const str = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(str).digest('hex');
}
```

**关键点:**
- ✅ `force` 参与 hash → `force=true` 和 `force=false` 算两个 key
- ❌ `user_id` 不参与(每次都随机)
- ❌ `timestamp / nonce` 不参与(否则永远不会命中)
- ✅ `image_urls` 参与 hash(不同图片视为不同请求)

---

## 四、改造前后对比矩阵

| 场景 | 改造前 | 改造后 |
|---|---|---|
| 同输入 + 首次成功 | 缓存 OK,重试拿同结果 ✅ | 缓存 OK,重试拿同结果 ✅ |
| 同输入 + 首次 **10003** | **缓存了 10003,重试还 10003** ❌ | whitelist 拦截,重试可能成功 ✅ |
| 同输入 + 首次 **content_filter 截断** | 缓存半句话,重试还半句 ❌ | whitelist 拦截 ✅ |
| 同输入 + 首次 **解析兜底**(risk_level=null) | 缓存兜底,重试还兜底 ❌ | whitelist 拦截 ✅ |
| 用户点「强制深度分析」 | 无法绕开缓存 ❌ | `nocache=true` 一定绕过 ✅ |
| 答辩演示连续同输入 | 第二次起 `fromCache: true` 暴露 demo | `nocache=true` 每次都打元器 ✅ |
| 长期运行内存累积 | 永不过期 ❌ | 30 分钟 TTL + 1000 LRU 双保险 ✅ |
| 元器侧改 prompt 后 | 旧缓存继续生效 ❌ | 30 分钟内自动失效 ✅ |

---


## 六、验收清单(6 项黑盒测试)

```bash
PROXY='https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy'

# Test 1: 正常响应应该被缓存
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d '{"agentType":"radar","messages":[{"role":"user","content":[{"type":"text","text":"测试缓存-A"}]}]}' \
  | grep -o '"fromCache":[^,}]*'
# 立刻第二次:应该 fromCache:true
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d '{"agentType":"radar","messages":[{"role":"user","content":[{"type":"text","text":"测试缓存-A"}]}]}' \
  | grep -o '"fromCache":[^,}]*'

# Test 2: 10003 异常响应应该不被缓存
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d "{\"agentType\":\"selfcheck\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"测试不缓存-$(date +%s)\"}]}]}" \
  | head -c 200
# 立刻第二次同输入:不应该 fromCache:true
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d "{\"agentType\":\"selfcheck\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"测试不缓存-X\"}]}]}" \
  | grep -o '"fromCache":[^,}]*'

# Test 3: nocache=true 应该绕过读取
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d '{"agentType":"radar","messages":[{"role":"user","content":[{"type":"text","text":"测试缓存-A"}]}],"nocache":true}' \
  | grep -o '"fromCache":[^,}]*'
# 期望:无 fromCache 字段 或 false

# Test 4: force=true 自动带 nocache (前端入参形式)
curl -s -X POST $PROXY -H 'Content-Type: application/json' \
  -d '{"agentType":"radar","messages":[{"role":"user","content":[{"type":"text","text":"测试缓存-A"}]}],"force":true}' \
  | grep -o '"fromCache":[^,}]*'

# Test 5/6: TTL 过期 / LRU 容量 —— 看代码是否实现
grep -n "ttl\|expiry\|30.*60" cloudbase-functions/proxy/index.js
grep -n "maxSize\|1000\|LRU\|eviction" cloudbase-functions/proxy/index.js
```

---

## 七、答辩话术(把工程精细度展示给评委)

如果评委问"为什么有缓存机制":

> "我们用 CloudBase 内存缓存治理元器 LLM 的'同问不同答'问题。**但缓存策略带 3 道防线**:
>
> **第一,写入白名单** —— 只缓存 `finish_reason: stop` 且 content 非空的真正成功响应。工作流异常、内容审查截断、解析失败这些异常响应一律不缓存,确保用户重试有意义。
>
> **第二,`nocache=true` 显式跳过** —— 当用户点「强制深度分析」或「重试」按钮,前端自动带 `nocache=true`,确保 100% 重新打元器。
>
> **第三,30 分钟 TTL + 1000 LRU 上限** —— 控制内存占用,同时让元器侧改 prompt 后能在 30 分钟内自动生效。
>
> 这是从用户视角出发的工程细节 —— **缓存不是为了节省成本,是为了提升体验**。"

---


