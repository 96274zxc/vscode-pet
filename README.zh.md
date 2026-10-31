# Blobby — 适用于 DSH 的 VS Code 宠物

[English](README.md) | **简体中文**

Blobby 是 VS Code 官方聊天宠物（chat pet）在 DeepSeek Harness Web 输入框上方的非官方移植版。
它直接使用官方的雪碧图、配件图集、帧时序、物理参数和交互规则，不是仿制形象。在 Windows
桌面端，DSH 窗口最小化时它还可以走到桌面上活动。

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
  以及掉出输入框后的传送门消失/重生。DSH 窗口可见时宠物只把输入卡片上沿当作落脚点；窗口或输入框
  尺寸变化时会自动贴回卡片上沿；撞到左右边缘会短暂停顿、旋转并反弹；重生从输入框上方的限高位置
  落下。桌面显示时则以任务栏（任务栏自动隐藏时为屏幕底部）为地面。
- **桌面显示（仅 Windows 桌面端）**：右键菜单新增可勾选的**桌面显示**，选中后行尾显示 ✓，其下紧接
  **智能隐藏**。启用后原生 helper 会提前在后台待命；DSH 最小化**或失去焦点（被其他窗口覆盖/Alt+Tab）**
  时，Blobby 通过官方的重生传送门立即切换到桌面，在任务栏上方落下；重新聚焦 DSH 时在窗口内播放
  传送门/下落回归。双击桌面 Blobby 可唤起 DSH 窗口。桌面右键菜单与窗口内一致：帽子、颜色、跳跳乐
  会恢复 DSH 并打开现有面板/游戏；跑路/回来、大小、桌面显示、智能隐藏则在桌面层生效。桌面投掷永远
  落在任务栏/屏幕底部，不会触发坠落重生。helper 窗口底边正好停在任务栏上沿，且只有宠物/菜单区域接收
  点击，任务栏和被它遮住的窗口仍可操作；菜单先完成定位再显示，不会闪一下再跳位。菜单中的大小行
  可以连续点击并保持打开，菜单配色和文案会跟随 DSH 当前的浅色/深色主题与界面语言。桌面渲染使用合成
  帧循环并补偿窗口整数移动造成的亚像素误差，同时不再每帧重设 topmost，运动手感和窗口内一致，而不是
  贴着窗口的像素网格滑动；grab 光标通过运行时捕获 DSH 宠物实际显示的同一光标（图标/热点完全一致，
  不另外制作素材），并保留相同的拖拽抵抗抖动；会话思考中的气泡也会同步显示。开启**智能隐藏**后，
  Blobby 只显示在桌面，不置顶在其他应用前。原生 helper 随 DSH 退出；非 Windows 环境下不显示这些
  菜单项，Host 也拒绝启动桌面显示；Web 版同样隐藏这些菜单项。
- **右键菜单**：帽子、跳跳乐、跑路/回来、`− 缩小 / 放大 +` 与“恢复大小”两行大小控制、颜色。
- **帽子**：官方 13 顶帽子，加上“颜色自定义”项，并带上 DSH 专属的“不戴帽子”选项，组成
  3 列共 15 个 card、五行。计数沿用 VS Code 原版的“14 of 14 unlocked”说法，只统计 13 顶帽子和
  “颜色自定义”，因此显示“14 项 已解锁”。DSH 移植版不做成就追踪，所有帽子默认解锁；初始形象为
  **Insiders 配色 + 牛仔帽**。面板不再显示解锁条件、奖励和“新”标记；`/blobby` 仍用于解锁
  颜色自定义，以获得纯色与自定义颜色。
- 约 1% 的点击会触发 **yapping** 反应：Blobby 会摔倒并张开嘴，图片中的白色/镂空部分是官方
  sprite 的嘴部，不是缺失素材。
- **颜色**：稳定版 / 预览版、官方 8 个纯色预设、自定义十六进制颜色；帽子与颜色点击立即生效并持久化。
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
| `/blobby` | 解锁颜色自定义并打开颜色页 |
| `/vscode-pet` | 显示/隐藏 Blobby（插件保持启用） |
| 右键 → **桌面显示** | 仅 Windows 桌面端：DSH 最小化或失焦时把 Blobby 放到桌面（启用后显示 ✓） |
| 右键 → **智能隐藏** | 仅 Windows 桌面端：桌面 Blobby 只显示在桌面，不置顶在其他应用前 |
| Alt+Tab / 点击其他窗口 / 最小化 | 仅 Windows 桌面端：把 Blobby 切到桌面并显示在其他窗口上方 |
| 重新聚焦 DSH 窗口 | 仅 Windows 桌面端：把 Blobby 收回 DSH 窗口 |
| 双击桌面上的 Blobby | 唤起 DSH 窗口 |

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
测试套件还会编译并运行 Windows 桌面 helper 的确定性自测（`desktop/blobby-desktop.ps1 -SelfTest`）；
helper 是由 Host 半在 Windows 桌面端启动的本地 PowerShell/.NET WPF 进程。

## 兼容性

- 目标：DSH `>=0.2.1-rc.1` 的 Web / Desktop profile。
- 窗口内功能只用客户端插件 API：`conversation.input.dock`、`locale`、`commandUi`；桌面显示额外使用
  Host 的 `connection` 鉴权路由 `/api/blobby/desktop/*` 和本地 helper 进程，不注册模型工具。
- 桌面显示仅支持 Windows 桌面应用；Web 版隐藏菜单项。非 Windows 环境下菜单项不显示，Host 也拒绝
  启动（返回 501）。启用桌面显示后 helper 在后台待命以缩短切换延迟，并随 DSH 退出而结束。
- 不修改 DSH 源码，不修改其他插件。helper 只接收本地生成的 PNG 帧、菜单文案和屏幕几何信息，
  不访问网络。
- 设置保存在浏览器 `localStorage['dsh.vscode-pet.prefs.v1']`，属于本地设备，不跟随账号跨设备同步。

## 许可证

插件代码使用 MIT 许可证，见 [LICENSE](LICENSE)。VS Code 派生素材与逻辑的 MIT 许可证文本及
完整来源见 [NOTICE.md](NOTICE.md)。

## 验证记录

插件已在临时 DSH web profile + headless Chrome 中验证：idle/typing/thinking/clapping/sleep/全部点击反应、
拖拽/投掷/死亡重生、右键菜单、帽子与颜色面板、帽子与颜色切换、颜色自定义解锁、跳跳乐、
左朝向宽精灵对齐、拖拽后点击保持位置，以及 `/vscode-pet` 显示开关。

另外在 Electron desktop profile（真实窗口，非 headless）中逐项验证了输入卡片落点、默认出生位置、
窗口最大化/还原时的自动回位、撞左右边缘的旋转反弹、限高重生和投掷中的窗口缩放；并与本机
VS Code 1.144 的 Blobby 逐帧对比了落下与重生轨迹。

桌面显示也在同一个 Windows Electron profile 中验证：行尾 ✓ 与条件显示的智能隐藏项、最小化/恢复时的
传送门交接、任务栏落点、投掷不坠落重生、智能隐藏对前台应用的隐藏/恢复、双击唤起窗口、桌面菜单的
帽子命令打开现有面板，以及 DSH 关闭 stdin 后 helper 自动退出。helper 的几何、物理和状态机自测
包含在测试套件中。切换优化后再次验证了：后台待命 helper（点击离开后约半秒内出现桌面传送门）、
按焦点切换（Alt+Tab/点击其他窗口）、投掷时合成帧循环、亚像素精确落位（appliedScreenX 与物理位置
一致，而不是窗口取整后的坐标）、运行时捕获的同一 grab 光标（图标逐字节一致）、拖拽抵抗抖动、会话
思考气泡同步、任务栏在宠物窗口下方仍可点击，以及桌面右键菜单在最终位置显示而不闪跳。

`docs/states.png` 是状态矩阵，`docs/hats.png` 与 `docs/color.png` 是自定义面板截图。
