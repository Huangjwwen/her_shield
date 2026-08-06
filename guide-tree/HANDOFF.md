# 第一棵子树交接说明

## 交付范围

- 树：`pregnancy_pay_cut`，版本 `1.3.0-draft`。
- 终点：`PA` 至 `PF` 与范围外终点 `OOS`。
- 文书：7 份，其中 5 份按终点自动候选，仲裁要点和监察材料仅在用户勾选后候选。
- 法律依据：10 条全国性条文级记录，均为 `draft`。
- 用例：法学交付包 `P-01` 至 `P-20`，均由本地重放脚本验证。

## 后端接口契约

配置读取接口只返回以下前端投影：

```json
{
  "schemaVersion": 1,
  "treeId": "pregnancy_pay_cut",
  "treeVersion": "1.3.0-draft",
  "startNodeId": "P1",
  "nodes": {},
  "terminalRefs": ["PA", "PB", "PC", "PD", "PE", "PF", "OOS"]
}
```

正式裁决接口接收 `treeId`、`treeVersion`、`path`、`answers` 与用户填写的 `documentFields`。服务端必须从起点重放答案，重新派生 `{ node, flag }`，不要信任客户端提交的终点或 flag。只有重放成功后，才可根据 `terminal-mapping` 组装文书候选和法律依据。

`OOS` 不返回法律依据或文书。`PF` 只能返回证据目录，不能返回解除、赔偿、仲裁或调岗降薪成品文书。所有 `draft` 配置完成法学签署、原文核对和文书快照审核前，不得改为 `published`。

## 使用方式

```powershell
node guide-tree/scripts/validate-pregnancy-pay-cut.js
```

当前项目的 PowerShell 执行策略会阻止 `npm.ps1`，所以验证命令优先直接使用 `node`；等后端工程接入后，可改用 `npm run validate:guide-tree`。

本地全链路联调使用：

```powershell
node scripts/dev-guide-tree-server.js
```

然后访问 `http://127.0.0.1:8082/features.html`。该开发服务器同时托管页面和 `/api/guide-tree` 路由，不是生产部署方案。

## 已实现的本地云函数

`cloudfunctions/guide-tree/index.js` 已实现 `GET /api/guide-tree?treeId=pregnancy_pay_cut` 与 `POST /api/guide-tree/resolve`。部署此函数时，需将仓库的 `guide-tree/runtime.js` 和 `guide-tree/config/` 一并打进函数运行目录，或将 `GUIDE_TREE_CONFIG_DIR` 指向该配置目录。函数不依赖第三方包。
