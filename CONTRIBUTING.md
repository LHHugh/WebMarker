# 为 WebMarker 做贡献

感谢你愿意帮助 WebMarker 变得更好。小到错别字，大到新功能，都欢迎通过 Issue 或 Pull Request 参与。

## 提交问题

在创建新 Issue 前，请先搜索是否已有相同问题，并尽量提供：

- Chrome 版本与操作系统；
- 出现问题的网页类型或可公开访问的示例地址；
- 最小、稳定的复现步骤；
- 预期行为与实际行为；
- 去除账号、Cookie 和私人内容后的截图或录屏。

Bug 请使用 [Bug Report](https://github.com/LHHugh/WebMarker/issues/new?template=bug_report.yml)，功能建议请使用 [Feature Request](https://github.com/LHHugh/WebMarker/issues/new?template=feature_request.yml)。安全或隐私问题不要提交公开 Issue，请按照 [SECURITY.md](./SECURITY.md) 私下报告。

## 本地开发

1. Fork 并克隆仓库。
2. 在 `chrome://extensions` 开启开发者模式。
3. 使用“加载已解压的扩展程序”选择仓库根目录。
4. 修改代码后点击扩展卡片上的“重新加载”，再刷新测试网页。

项目不需要构建步骤。提交前请检查：

- `manifest.json` 是合法 JSON，且版本号符合语义化版本；
- `background.js`、`content.js`、`popup.js` 通过 JavaScript 语法检查；
- 选择、标记、移除、撤销、清空和刷新恢复均正常；
- Chrome 受保护页面能给出合理提示；
- 没有引入远程脚本、分析服务或不必要权限。

## Pull Request

- 每个 PR 聚焦一个问题，避免混入无关格式化或重构。
- 说明为什么修改、如何验证，以及是否影响已有标记数据。
- 用户可见变更需要同步更新 README；正式发布内容需要写入 `CHANGELOG.md`。
- 建议使用清晰的提交前缀，例如 `feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`chore:`。

## 版本发布

版本号需要同时体现在 `manifest.json`、Git 标签和 `CHANGELOG.md` 中。运行以下命令可生成待发布 ZIP：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package-release.ps1
```

稳定版标签格式为 `vX.Y.Z`，测试版标签格式为 `vX.Y.Z-beta.N`。
