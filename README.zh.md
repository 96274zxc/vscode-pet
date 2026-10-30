# Blobby — 适用于 DSH 的 VS Code 宠物

[English](README.md) | **简体中文**

Blobby 是 VS Code 官方聊天宠物（chat pet）在 DeepSeek Harness Web 输入框上方的非官方移植版。
它直接使用官方的雪碧图、配件图集、帧时序、物理参数和交互规则，不是仿制形象。

![Blobby 状态矩阵](https://raw.githubusercontent.com/96274zxc/vscode-pet/main/docs/states.png)

## 来源与非官方声明

本项目是独立的社区移植，**不是 Microsoft 或 DeepSeek 官方产品**。

Blobby 的角色形象、配件图集、动画时序、物理常量、成就目录、颜色调色板与跳跳乐规则均来自
VS Code 官方实现，并在 MIT 许可证下使用。请优先阅读上游原始实现：

- 官方文档：<https://code.visualstudio.com/docs/agents/reference/chat-pet>
- 官方素材与运行时代码：
  <https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/chat/browser/widget/media/chatPet>
- 本移植锁定的上游 commit：`ce233327f26ef7791b7fff0143c24e81a8126bd2`
- 完整的派生文件清单与 Microsoft MIT 许可证文本见 [NOTICE.md](NOTICE.md)

图标同样是官方素材的合成：官方 idle 身体重着色为白色，叠加官方 `wizard-hat` 魔法帽与官方
thinking 气泡。主图为 144×144（插件卡片 36px 的 4 倍），`icons/icon-{144,72,48,36,30}.png`
保留了多个原生尺寸，`icon.svg` 内嵌 144px 主图。

感谢 VS Code 团队与 Blobby 原作者创造并开源了这个角色与素材。

## 功能

- **聊天反应**：目光跟随鼠标、输入时打字、等待回复时思考、需要确认时鼓掌、空闲 20 秒后睡觉、
  回合结束时按红色按钮庆祝。
- **移动与物理**：拖拽、flick、`Shift+←/→` 投掷、`←/→` 连续跳跃、下落时用指针/Enter/空格接住弹跳，
  以及掉出输入框后的传送门消失/重生。宠物只把输入卡片上沿当作落脚点；窗口或输入框尺寸变化时
  会自动贴回卡片上沿；撞到左右边缘会短暂停顿、旋转并反弹；重生从输入框上方的限高位置落下。
  因此默认出生点、落脚点和重生点都与输入栏一致，而不是聊天区顶部或右侧空白处。
- **右键菜单**：帽子、玩跳跳乐、跑路/回来、变大/变小/恢复大小、更换颜色。
- **帽子**：官方 13 顶帽子。DSH 移植版不做成就追踪，所有帽子默认解锁；初始形象为
  **Insiders 配色 + 牛仔帽**。原 vscode-pet 的成就面板已改为帽子选择面板，不再显示解锁条件、
  奖励和“新”标记。**True Name** 仍由 `/blobby` 解锁，用于纯色与自定义颜色。
- **颜色**：Stable / Insiders、官方 8 个纯色预设、自定义十六进制颜色；帽子与颜色点击立即生效并持久化。
- **跳跳乐**：空格蓄力、松手起跳，左右瞄准/小跳，Esc 退出；包含移动平台、碎裂平台、撞墙反弹、
  弹跳计分和本地最高分。
- **可访问性**：`prefers-reduced-motion`、键盘操作、`aria-live` 状态播报、焦点管理和错误边界。
- **显示开关**：`/vscode-pet` 可隐藏/重新显示宠物，不影响插件安装状态。

## 安装

当前 npm 包因账号 2FA 安全冻结暂未发布；可以先从公开 GitHub 仓库源码安装：

```bash
dsh plugin --profile web add github:96274zxc/vscode-pet
```

npm 发布后可使用：

```bash
dsh plugin --profile web add vscode-pet
```

Electron 桌面端可以在 **插件 → 添加插件** 中填写 `vscode-pet`，或在允许管理 desktop profile 的
环境中使用同样的 CLI 命令并指定 `--profile desktop`。

本地开发时可以 link 当前 checkout：

```powershell
$node = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
$pnpm = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs"
$profile = "$env:USERPROFILE\.dsh\profiles\desktop"
& $node $pnpm --dir $profile add "vscode-pet@link:C:/path/to/vscode-pet"
```

然后把 `vscode-pet` 加入 profile 的 `dsh.profile.bundles`（或在“插件”页启用）。刷新页面；
如果 Electron 没有热重载新的 Loader 条目，重启一次桌面应用。卸载时移除依赖和 bundle 选择即可。

## 使用

| 操作 | 行为 |
| --- | --- |
| 单击 / Enter / 空格 | 随机反应；唤醒 Blobby；星星出现时打开帽子面板 |
| `←` / `→` | 沿输入框跳跃 |
| `Shift+←` / `Shift+→` | 朝墙投掷 |
| 右键 / `Shift+F10` / ContextMenu | 打开右键菜单 |
| 拖拽 | 移动 Blobby；带速度松手会投掷 |
| 下落时指针接触 / Enter / 空格 | 弹跳 |
| `/blobby` | 解锁 True Name 并打开颜色页 |
| `/vscode-pet` | 显示/隐藏 Blobby（插件保持启用） |

拖拽到非初始位置后，单击播放随机动画会**留在当前位置**；朝左的宽精灵（typing、buttonPress 等）
也会正确对齐帽子、身体和眼睛。

## 构建与测试

```powershell
node scripts/fetch-assets.mjs   # 按锁定 commit 重新下载官方素材
node scripts/build.mjs          # 校验尺寸并生成 client.js
node --test test/*.test.mjs
```

`client.js` 是构建产物；请修改 `src/` 后重新构建，不要直接编辑 `client.js`。所有 PNG 素材以
data URL 内嵌，避免 desktop 的 `dsh-app://` 与 HTTP 之间的跨 origin / canvas taint 问题。

## 兼容性

- 目标：DSH `>=0.2.1-rc.1` 的 Web / Desktop profile。
- 仅使用客户端插件 API：`conversation.input.dock`、`locale`、`commandUi`；不注册 Host 路由或模型工具。
- 不修改 DSH 源码，不修改其他插件。
- 设置保存在浏览器 `localStorage['dsh.vscode-pet.prefs.v1']`，属于本地设备，不跟随账号跨设备同步。

## 许可证

插件代码使用 MIT 许可证，见 [LICENSE](LICENSE)。VS Code 派生素材与逻辑的 MIT 许可证文本及
完整来源见 [NOTICE.md](NOTICE.md)。

## 验证记录

插件已在临时 DSH web profile + headless Chrome 中验证：idle/typing/thinking/clapping/sleep/全部点击反应、
拖拽/投掷/死亡重生、右键菜单、帽子与颜色面板、帽子与颜色切换、True Name 解锁、跳跳乐、
左朝向宽精灵对齐、拖拽后点击保持位置，以及 `/vscode-pet` 显示开关。

另外在 Electron desktop profile（真实窗口，非 headless）中逐项验证了输入卡片落点、默认出生位置、
窗口最大化/还原时的自动回位、撞左右边缘的旋转反弹、限高重生和投掷中的窗口缩放；并与本机
VS Code 1.144 的 Blobby 逐帧对比了落下与重生轨迹。

`docs/states.png` 是状态矩阵，`docs/hats.png` 与 `docs/color.png` 是自定义面板截图。
