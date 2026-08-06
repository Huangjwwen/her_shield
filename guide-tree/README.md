# 她行决策树配置包

本目录是“她行·维权导航”第一阶段的后端权威配置，不由现有 `js/guide.js` 直接加载。

- `config/pregnancy-pay-cut.full.json`：完整树、终点与判定规则，只能由后端裁决服务使用。
- `config/pregnancy-pay-cut.templates.json`：文书模板；正文、字段和条件均来自法学交付稿。
- `config/pregnancy-pay-cut.legal-basis.json`：本树引用的全国性法律依据草稿。
- `config/pregnancy-pay-cut.terminal-mapping.json`：终点到文书和法律依据的映射。
- `schemas/guide-tree.schema.json`：配置结构约束。
- `tests/pregnancy-pay-cut.cases.json`：法学交付包中的 P-01 至 P-20 验收路径。

交接约定：前端仅取得可执行树投影（节点、选项、跳转和 `terminalRefs`）。终点内容、法律依据、文书模板和文书正文只由后端重放 `path + answers` 后返回。所有配置目前均为 `draft`，不得在法学签署和快照核验前发布。

运行 `node guide-tree/scripts/validate-pregnancy-pay-cut.js` 校验结构、引用、投影边界和 20 条路径。
