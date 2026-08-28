<p align="center">
  <img src="./docs/assets/webmarker-hero.svg" width="100%" alt="WebMarker 柔光荧光笔：选中文字，即刻标记">
</p>

<p align="center">
  <a href="https://github.com/LHHugh/WebMarker/releases/latest"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/LHHugh/WebMarker?display_name=tag&style=flat-square&color=708c9c"></a>
  <a href="https://github.com/LHHugh/WebMarker/actions/workflows/validate.yml"><img alt="Validate extension" src="https://github.com/LHHugh/WebMarker/actions/workflows/validate.yml/badge.svg"></a>
  <img alt="Chrome 105+" src="https://img.shields.io/badge/Chrome-105%2B-5f6e76?style=flat-square&logo=googlechrome&logoColor=white">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-f1e2a1?style=flat-square&logo=googlechrome&logoColor=34404a">
  <a href="./PRIVACY.md"><img alt="Privacy: local only" src="https://img.shields.io/badge/Privacy-local--only-c6ddc1?style=flat-square"></a>
</p>

<p align="center">
  <strong>选中文字，即刻标记。让每一页网页，都变成你的阅读手账。</strong>
</p>

<p align="center">
  <a href="#-安装">立即安装</a> ·
  <a href="#-30-秒上手">30 秒上手</a> ·
  <a href="./CHANGELOG.md">更新日志</a> ·
  <a href="#-支持一下">支持一下</a>
</p>

---

## WebMarker 是什么？

WebMarker（柔光荧光笔）是一款基于 Chrome Manifest V3 的网页文字标记扩展。像使用实体荧光笔一样，按住左键选择文字，松开后即可添加低饱和背景色或彩色下划线。

无需注册账号，也没有云端同步：页面内容与标记数据只保存在你的浏览器本机。

<table>
  <tr>
    <td width="25%" align="center"><strong>⚡ 划一下就标记</strong><br><sub>选择文字后自动出现工具条</sub></td>
    <td width="25%" align="center"><strong>🎨 两种样式 · 六种颜色</strong><br><sub>背景色与下划线自由切换</sub></td>
    <td width="25%" align="center"><strong>🏷️ 右侧索引标签</strong><br><sub>点击标签立即跳回对应标记</sub></td>
    <td width="25%" align="center"><strong>🔒 本地优先</strong><br><sub>无账号、无分析、无数据上传</sub></td>
  </tr>
</table>

## ✨ 核心体验

- **所选即所得**：左键拖动选择文字，浮动工具条紧跟选区出现，不必先进入标记模式。
- **柔和但清晰**：柔黄、柔绿、柔蓝、柔粉、柔紫、柔橙 6 种低饱和常规颜色，长时间阅读也不过分抢眼。
- **背景色与下划线**：重要结论用背景色，轻量提示用下划线，同一页面可自由组合。
- **页面侧边索引**：每处标记都会生成同色小标签；悬停查看摘要，点击平滑定位。
- **刷新后自动恢复**：标记按网址保存在 `chrome.storage.local`，再次打开页面时自动重新定位。
- **适配动态文档站**：通过文字内容与上下文恢复位置，兼容 VitePress 等 SPA 站点的站内跳转与正文重渲染。
- **随时反悔**：弹窗提供“撤销上一处”和“清空本页”，局部标记也可从选区工具条移除。

## 🚀 30 秒上手

1. 在普通网页上按住鼠标左键，拖动选择想要保留的文字。
2. 松开鼠标，在选区旁的工具条中选择“背景色”或“下划线”。
3. 点击喜欢的颜色，标记立即完成，页面右侧同步出现索引标签。
4. 点击右侧标签即可回到对应段落；点击扩展图标可撤销或清空当前页面。

> [!TIP]
> 重新选中已经标记的文字，可以直接点击工具条中的“清除标记”。

## 📦 安装

### 方式一：下载稳定版（推荐）

1. 前往 [Releases](https://github.com/LHHugh/WebMarker/releases/latest)，下载最新的 `WebMarker-v*.zip`。
2. 解压 ZIP，在 Chrome 地址栏打开 `chrome://extensions`。
3. 打开右上角的 **开发者模式**，点击 **加载已解压的扩展程序**。
4. 选择刚刚解压得到的 WebMarker 文件夹。

### 方式二：从源码安装

```bash
git clone https://github.com/LHHugh/WebMarker.git
```

然后在 `chrome://extensions` 中选择仓库根目录。更新源码后，点击扩展卡片上的“重新加载”，并刷新已经打开的网页一次。

> [!NOTE]
> Chrome 设置页、Chrome 网上应用店、新标签页及其他受保护页面禁止扩展注入，这是浏览器的安全限制，并非 WebMarker 故障。

## 🧩 功能与兼容性

| 能力 | 状态 | 说明 |
| --- | :---: | --- |
| 选择文字后显示工具条 | ✅ | 支持普通 `http` / `https` 网页 |
| 背景色 / 下划线 | ✅ | 6 种低饱和颜色 |
| 右侧标签导航 | ✅ | 支持摘要预览与平滑跳转 |
| 刷新后恢复标记 | ✅ | 基于文字与上下文重新定位 |
| SPA 文档站 | ✅ | 已针对 VitePress 类页面优化 |
| 本地存储 | ✅ | 不上传页面内容或标记数据 |
| 云端同步 | — | 当前版本不提供 |
| Chrome 受保护页面 | — | 浏览器禁止扩展注入 |

如果网页正文发生大幅修改，或原文字已经不存在，对应记录仍会保留在本地，但可能暂时无法显示。

## 🔐 隐私与权限

WebMarker 不包含分析服务、广告、远程脚本或主动网络请求。完整说明见 [PRIVACY.md](./PRIVACY.md)。

| 权限 | 用途 |
| --- | --- |
| `storage` | 在本机保存默认样式与页面标记 |
| `activeTab` | 仅在用户操作扩展时访问当前标签页 |
| `scripting` | 为尚未加载脚本的普通网页补充注入标记工具 |
| `http://*/*` / `https://*/*` | 监听文本选择、显示工具条并恢复保存的标记 |

## 🏷️ 版本与更新

当前稳定版：**v2.1.0** · [查看发布说明](https://github.com/LHHugh/WebMarker/releases/tag/v2.1.0) · [完整更新日志](./CHANGELOG.md)

WebMarker 使用[语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本 `X`**：存在不兼容的行为或数据结构调整。
- **次版本 `Y`**：向后兼容的新功能与明显体验升级。
- **修订版本 `Z`**：向后兼容的问题修复、兼容性与文档改进。
- 测试版本使用 `vX.Y.Z-beta.N`，稳定版使用 `vX.Y.Z`。

每次发布会同步更新 `manifest.json`、Git 标签与 [CHANGELOG.md](./CHANGELOG.md)。维护者可运行 `tools/package-release.ps1` 生成与版本号一致的安装包。

## 🗺️ 路线图

- [x] 选择即标记与浮动工具条
- [x] 背景色、下划线与低饱和配色
- [x] 右侧索引标签与点击定位
- [x] SPA 页面标记恢复
- [ ] 页面级标记管理面板
- [ ] 标记导入与导出
- [ ] 键盘快捷键与更多无障碍优化

路线图用于表达探索方向，不代表确定的交付日期。欢迎在 [Feature Request](https://github.com/LHHugh/WebMarker/issues/new?template=feature_request.yml) 中分享真实使用场景。

## 💬 反馈与参与

- 遇到问题：提交 [Bug Report](https://github.com/LHHugh/WebMarker/issues/new?template=bug_report.yml)。
- 想要新功能：提交 [Feature Request](https://github.com/LHHugh/WebMarker/issues/new?template=feature_request.yml)。
- 准备贡献代码：请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 发现安全或隐私问题：请按照 [SECURITY.md](./SECURITY.md) 私下报告。

提交问题时，请附上 Chrome 版本、目标网页类型、复现步骤和必要截图；请勿公开包含账号、Cookie 或私人网页内容的材料。

## ☕ 支持一下

如果 WebMarker 让你的阅读、学习或资料整理轻松了一点，可以用下面任意一种方式支持它继续变好：

1. 给仓库点一个 [⭐ Star](https://github.com/LHHugh/WebMarker)。
2. 把 WebMarker 分享给需要网页标记的朋友。
3. 提交清晰的反馈，帮助定位真实问题。
4. 自愿请作者喝杯咖啡。

<p align="center">
  <img src="./docs/assets/alipay-support.jpg" width="360" alt="支付宝支持二维码">
</p>

<p align="center"><sub>赞赏完全自愿，不会解锁额外功能，也不影响正常使用与后续更新。请付款前核对支付宝页面显示的收款信息。</sub></p>

---

<p align="center">
  <strong>WebMarker · 柔光荧光笔</strong><br>
  <sub>Made with care by <a href="https://github.com/LHHugh">LHHugh</a></sub>
</p>
