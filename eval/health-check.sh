#!/usr/bin/env bash
# health-check.sh —— 每次部署 proxy 后必须跑(参见 BACKEND_TODO.md)
# 检查 6 个 agentType 是否能从代理拿到带 choices 的真实元器响应。
# 用法:bash eval/health-check.sh

set -e
URL='https://her-shield-d7gyrtfxm65f3e782-1410225134.ap-shanghai.app.tcloudbase.com/proxy'
TYPES=(radar consultation selfcheck evidence guide harbor)

failed=0
for t in "${TYPES[@]}"; do
  resp=$(curl -s -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -d "{\"agentType\":\"$t\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"health check $(date +%s)\"}]}]}")

  # 路由失败:proxy 返回 {success:false,...}
  if echo "$resp" | grep -q '"success":false'; then
    echo "❌ $t (路由/KEY 失败): $(echo "$resp" | head -c 200)"
    failed=1
    continue
  fi

  # 元器工作流自身失败:内层 data.error 非空
  if echo "$resp" | grep -qE '"error":\s*\{[^}]*"code"'; then
    echo "⚠️  $t (元器工作流故障): $(echo "$resp" | head -c 200)"
    failed=1
    continue
  fi

  # 正常:data.choices 存在
  if echo "$resp" | grep -q '"choices"'; then
    echo "✅ $t"
  else
    echo "❓ $t (响应结构异常): $(echo "$resp" | head -c 200)"
    failed=1
  fi
done

if [[ $failed -eq 0 ]]; then
  echo ""
  echo "💚 6 个 agentType 全部正常"
  exit 0
else
  echo ""
  echo "❌ 有 agentType 异常,请按上面提示修复"
  exit 1
fi
