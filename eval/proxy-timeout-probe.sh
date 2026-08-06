#!/usr/bin/env bash
# proxy-timeout-probe.sh —— 验证代理 120s 超时是否够用
# 用 5 条详细的真实输入(每条加随机后缀绕过缓存)走深度链路,记录耗时和成功率

URL="${PROXY_URL:-https://her-shield-d8g3dpm9ucee2058f-1410225134.ap-shanghai.app.tcloudbase.com/proxy}"
TS=$(date +%s)

INPUTS=(
  "主管开例会时当众说我们部门最近招的女生胸都太小,加上一个新人长得不漂亮,要求 HR 下次招人多看脸"
  "HR 在面试时反复追问我什么时候结婚生孩子,还说他们公司女员工怀孕都会被劝退"
  "团建时部门经理在 KTV 硬要搂着我说陪他喝完这杯酒升职就有戏,我躲开他说我太敏感了"
  "我和男同事同岗位入职,工作两年我业绩比他好但他工资比我高 30%,问 HR 说男的要养家"
  "试用期延长到 6 个月,理由是女性产假风险高需要观察,问能不能签正式合同被说不要急"
)

PASS=0
FAIL=0
TIMEOUT=0
WORKFLOW_ERR=0
total_ms=0
max_ms=0

for i in "${!INPUTS[@]}"; do
  input="${INPUTS[$i]} [probe-${TS}-${i}]"
  echo "=== case $((i+1))/5 ==="
  echo "输入: ${input:0:60}..."

  t0=$(date +%s%3N)
  resp=$(curl -s --max-time 130 -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -d "{\"agentType\":\"radar\",\"messages\":[{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"$input\"}]}]}" 2>&1)
  t1=$(date +%s%3N)
  elapsed=$((t1 - t0))
  total_ms=$((total_ms + elapsed))
  [[ $elapsed -gt $max_ms ]] && max_ms=$elapsed

  if echo "$resp" | grep -q "FUNCTION_TIME_LIMIT_EXCEEDED"; then
    echo "  ⛔ 超时被截 (${elapsed}ms)"
    TIMEOUT=$((TIMEOUT+1))
    FAIL=$((FAIL+1))
  elif echo "$resp" | grep -qE '"error":\s*\{[^}]*"code"\s*:\s*"10003"'; then
    echo "  ⚠️  元器工作流 10003 (${elapsed}ms)"
    WORKFLOW_ERR=$((WORKFLOW_ERR+1))
    FAIL=$((FAIL+1))
  elif echo "$resp" | grep -q '"choices"'; then
    snippet=$(echo "$resp" | grep -oE '"risk_level":"[^"]*"' | head -1)
    echo "  ✅ 拿到 choices (${elapsed}ms) ${snippet}"
    PASS=$((PASS+1))
  else
    echo "  ❓ 其他失败 (${elapsed}ms): $(echo "$resp" | head -c 200)"
    FAIL=$((FAIL+1))
  fi
  sleep 3
done

echo ""
echo "=== 汇总 ==="
echo "成功: $PASS / 5"
echo "失败: $FAIL / 5 (超时截断: $TIMEOUT, 10003: $WORKFLOW_ERR)"
echo "平均耗时: $((total_ms/5))ms"
echo "最长耗时: ${max_ms}ms"
echo ""
if [[ $TIMEOUT -eq 0 && $PASS -ge 3 ]]; then
  echo "💚 120s 超时充足,代理路径可走"
elif [[ $TIMEOUT -gt 0 ]]; then
  echo "❌ 仍有超时,需要继续调高(180s+)"
else
  echo "⚠️  代理没截超时但有其他问题,看上面明细"
fi
