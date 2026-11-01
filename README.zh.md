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
  回合结束时按红色按钮庆祝。思考时，省略号气泡的顶部会锚定在"深度求索"状态行上方那条细分隔线上，
  让气泡正好从分隔线开始，而不是飘在线上方；聊天布局、窗口或缩放变化时会按真实分隔线重新计算。
- **移动与物理**：拖拽、flick、`Shift+←/→` 投掷、`←/→` 连续跳跃、下落时用指针/Enter/空格接住弹跳，
  以及掉出输入框后的传送门消失/重生。DSH 窗口可见时宠物只把输入卡片上沿当作落脚点；窗口或输入框
  尺寸变化时会自动贴回卡片上沿；撞到左右边缘会短暂停顿、旋转并反弹；重生从输入框上方的限高位置
  落下。桌面显示时则以任务栏（任务栏自动隐藏时为屏幕底部）为地面。
- **桌面显示（仅 Windows 桌面端）**：右键菜单新增可勾选的**桌面显示**，选中后行尾显示 ✓，其下紧接
  **智能隐藏**。启用后原生 helper 会提前在后台待命；DSH 最小化/隐藏，**或被其他窗口遮住**时，
  Blobby 通过官方的重生传送门立即切换到桌面，在任务栏上方落下。仅仅失去焦点不够：如果 DSH 仍然可见
  且没有被遮住（例如点了一下桌面或旁边的窗口），宠物继续留在窗口内；客户端每 600ms 重新探测一次，
  一旦有其他窗口盖住 DSH 仍会切到桌面。重新聚焦 DSH 时在窗口内播放
  传送门/下落回归。双击桌面 Blobby 可唤起 DSH 窗口。桌面右键菜单与窗口内一致：帽子、颜色、跳跳乐
  会恢复 DSH 并打开现有面板/游戏；跑路/回来、大小、桌面显示、智能隐藏则在桌面层生效。桌面投掷永远
  落在任务栏/屏幕底部，不会触发坠落重生。helper 窗口底边正好停在任务栏上沿，且只有宠物/菜单区域接收
  点击，任务栏和被它遮住的窗口仍可操作；菜单先完成定位再显示，不会闪一下再跳位。菜单中的大小行
  可以连续点击并保持打开，左侧缩小文字靠左、右侧放大文字靠右，和在 DSH 窗口内一致；菜单配色和
  文案会跟随 DSH 当前的浅色/深色主题与界面语言。菜单现在有独立的分层窗口，打开菜单不再改变宠物
  窗口的位置/大小（分层窗口 resize 会清空表面并让宠物闪烁一帧），缩放时菜单也固定停在打开时的位置。
  桌面渲染使用合成
  帧循环并补偿窗口整数移动造成的亚像素误差，同时不再每帧重设 topmost，运动手感和窗口内一致，而不是
  贴着窗口的像素网格滑动；grab 光标通过运行时捕获 DSH 宠物实际显示的同一光标（图标/热点完全一致，
  不另外制作素材），并保留相同的拖拽抵抗抖动、被抓住时的叉号眼睛（沿用窗口内 CSS 眼睛覆盖层的
  同一套几何尺寸，按桌面帧比例烘焙，不是另做的图标）；会话思考中的气泡也会同步显示。打字动作
  特意不再同步：只有在 DSH 文档获得焦点时才上报输入状态，所以输入框里残留的文字不会让桌面宠物
  跟着打字。桌面状态机
  也补齐了窗口内的行为：被 facts 唤醒时的 waking、请求完成（非取消）时的
  **buttonPress**、在宠物身边快速来回划动触发的 dizzy（由 idle 朝向变化驱动，240px 范围内，
  第一次方向不计，8 次变化/600ms，与窗口内一致）、减少动态效果的变体，以及 typing/buttonPress/love
  姿势下的眼睛。周期眨眼通过一张很小的透明眼睛覆盖层实现（用身体色盖住瞳孔、再画 2px 的闭合
  眼线），每 1.4–3.4 秒显示 260ms，与窗口内的 ChatPetBlinkController 一致，减少动态效果时关闭。
  瞳孔跟随光标用 9 张预生成的眼睛覆盖层（身体色盖住眼框，瞳孔最多偏移 2 显示像素），在会追踪光标
  的姿势按鼠标方向切换，眨眼/拖拽时跳过。覆盖层用每帧的源帧号（payload 里的 `frameIndices`，例如
  idle `[0,20]`）决定 bobbed 眼睛的 2px 下移；宠物朝左时还会在覆盖层源里翻转水平方向，抵消宠物
  图像的镜像，保证瞳孔仍朝屏幕上的鼠标方向移动，与窗口内未镜像的眼睛覆盖层一致。弹跳计数是宠物
  右上角的一枚 accent 色胶囊（5 秒或下一次
  投掷时清除），20 次及以上弹跳会放出和窗口内相同的 24 粒彩带（窗口临时扩大到覆盖彩带范围，减少
  动态效果时不放）。仍然保留的差异：桌面不触发坠落重生（任务栏是地板）、跳跳乐会回到 DSH 内打开、
  DSH 移植版不追踪成就，以及 VS Code 专属的 painting/searching 和键盘跳不适用。
  朝向只在 idle 姿势下跟随鼠标；sleep/waking/typing/rendering/clapping 和点击反应状态会保持进入该
  姿势时的方向，与窗口内的 ChatPetFacingController 一致。
  开启**智能隐藏**后，
  Blobby 只显示在桌面，不置顶在其他应用前。原生 helper 随 DSH 退出；非 Windows 环境下不显示这些
  菜单项，Host 也拒绝启动桌面显示；Web 版同样隐藏这些菜单项。
- **右键菜单**：帽子、跳跳乐、跑路/回来、`− 缩小 / 放大 +` 与“恢复大小”两行大小控制、颜色。
- **帽子**：官方 13 顶帽子，加上“颜色自定义”项，并带上 DSH 专属的“不戴帽子”选项，组成
  3 列共 15 个 card、五行。计数沿用 VS Code 原版的“14 of 14 unlocked”说法，只统计 13 顶帽子和
  “颜色自定义”，因此显示“14 项 已解锁”。DSH 移植版不做成就追踪，所有帽子默认解锁；初始形象为
  **Insiders 配色 + 牛仔帽**。面板不再显示解锁条件、奖励和“新”标记；`/blobby` 仍用于解锁
  颜色自定义，以获得纯色与自定义颜色。
- 约 1% 的点击会触发 **yapping** 反应：Blobby 会摔倒并张开嘴，图片中的白色/镂空部分是官方
  sprite 的嘴部，不是缺失素材。点击**睡着**的 Blobby 会先播放官方的抖动-醒来动画（8 帧
  `buddy-waking`，880ms），状态栏提示它醒来了；下一次点击才会触发随机反应。
- **颜色**：稳定版 / 预览版、官方 8 个纯色预设、自定义十六进制颜色；帽子与颜色点击立即生效并持久化。
- **跳跳乐**：空格蓄力、松手起跳，左右瞄准/小跳，Esc 退出；包含移动平台、碎裂平台、撞墙反弹、
  弹跳计分和本地最高分。
- **可访问性**：`prefers-reduced-motion`、键盘操作、`aria-live` 状态播报、焦点管理和错误边界。
- **显示开关**：`/vscode-pet` 可隐藏/重新显示宠物，不影响插件安装状态。

## 性能与内存

- 桌面 helper 按需加载动画帧：prepared 阶段只解码 idle、blink、gaze 覆盖层（基准 bundle 140 帧中的
  7 帧，约 0.26 MB，原来一次性解码 6.26 MB）；其余状态/效果在首次使用时才解码对应 PNG。同一次基准中
  prepared helper 从约 117.7 MB 降到约 103.2 MB 工作集（私有内存约 119.5 MB → 99.7 MB）。
- prepared helper 在 DSH 聚焦期间复用，用于桌面秒开；如果客户端停止发送 250ms facts 心跳超过 5 分钟，
  host 会回收 helper，崩溃/重载的页面不会留下隐藏的 PowerShell/WPF 进程和临时帧。host 会串行化
  `prepare`/`start`/`stop`；客户端给 `/start` 设 15 秒上限，并且只在 helper 真正显示后才挂起窗口内
  宠物，因此 warmup/prepare 卡住不会让 Blobby 在两边都消失；DSH 抢回焦点时，进行中的 start 会被
  stop 而不是显示出来。
- 客户端图片按需加载：只预取当前佩戴的帽子；帽子面板预览自行加载 accessory，并在面板关闭时释放
  非佩戴帽子的图片；自定义色 sprite 缓存上限为 1 MP，并改为 LRU 淘汰。
- 桌面主题最多每 2 秒重新检测一次并缓存，菜单文案按 locale 版本缓存；250ms 的 facts 只在
  `theme`/`labels` 变化时携带它们，helper 在缺省时保留上次值。
- 桌面帧烘焙每批复用一个 canvas（PNG payload 逐字节一致）；跳跳乐会剪掉相机下方的平台/墙；widget、
  slot 和 desktop bridge 的 teardown 会释放定时器、observer、空闲预加载、debug API 与帧缓存。
- 诊断：加 `?blobbyDebug=1`（或 `localStorage["dsh.vscode-pet.debug"]="1"`）后，
  `window.__dshBlobby.memory()` 会报告 JS heap、图片/颜色缓存大小、桌面帧字节数、定时器/监听器/DOM
  数量；helper 的 `status.json` 会报告 `frames: {loaded, total, bytes}`。
- 1.2.17 的桌面传送修复：失焦/隐藏时在事件里直接 start（最小化后的 renderer 里 250ms 定时器可能被
  节流/冻结）；facts 心跳的响应带回 helper 的 `prepared`，即使隐藏页的长轮询停住，客户端也能清掉
  `active`（`/pending` 等待也加了上限并重试）；helper 的 `status.json` 报告 `stopReason`、
  `dshWindow`、`dshIconic`、`dshForeground`、`dshWasIconic`，客户端快照暴露 `starting`、
  `stopping`、`lastHiddenReason`，便于把收回归因到回焦、window-restored 还是客户端 stop。
- 1.2.19 的桌面消失修复：helper 最多每 250ms 才重写一次 `status.json`，而 1.2.17 起 host 把该文件的
  `phase` 当成权威状态，于是 `/start` 成功后紧接着的第一次 facts 心跳仍读到旧文件里的 `prepared`，
  客户端据此认为 helper 已经自己隐藏，在同一个 tick 里把它 stop 掉——表现就是每次最小化/失焦后
  Blobby 直接消失。现在 host 给每次 show 带一个递增的 `showSeq`，helper 把它写进 `status.json`，
  host 只接受属于当前 show 的快照；helper 在显示/隐藏切换时立即落盘（不再等 250ms），并在写完状态
  后才回 `shown`；`/start` 也改为等待这个 `shown` 确认，helper 不确认时返回 504 并让客户端恢复窗口内
  宠物，而不是把两边都挂起。
- 1.2.20 的 stdin 编码修复：helper 用控制台 ANSI 代码页（中文 Windows 上是 CP936）解码 stdin，
  show 命令里的 UTF-8 菜单文案被错误解码——"跳跳乐" 的最后一个前导字节把后面的引号一起吃掉，整行
  JSON 解析失败，helper 又静默丢弃该行，于是复用的 prepared helper 永远不显示；host 只看到 ack 超时
  并杀掉 helper，下一次冷启动又能用，所以表现为"有时能传送、有时不行"。现在 host 把所有 stdin 消息
  写成纯 ASCII（`\uXXXX` 转义，任何解码器都能还原原文），helper 也显式按 UTF-8 读取 stdin；无法解析
  的命令会写到 stderr 而不是被静默丢弃。
- 1.2.21 的浅色菜单修复：桌面主题读取器用 canvas 归一化颜色，但只解析 `rgb()/rgba()` 形式，而
  Chromium 会把不透明颜色序列化成 `#rrggbb`。于是所有不透明颜色（菜单文字、禁用文字、强调色）都被
  丢弃，host 用深色调色板的默认值补缺，浅色菜单就在白底上画出接近白色的文字（`#f2f3f5`），只有禁用
  行还看得清。现在读取器同时解析 hex 与 rgb 形式，缺字段时按 `dark` 选择同调色板的默认值，浅色菜单
  不可能再套用深色文字。
- 1.2.22 的桌面细节修复：菜单改为独立的 layered 窗口，打开菜单不再改变宠物窗口的位置/大小（
  分层窗口 resize 会重建表面、让 DWM 用新原点显示旧内容一帧，也就是宠物闪烁一下），并且缩放时菜单
  固定在打开时的位置。打字动作不再同步到桌面：只有 DSH 文档有焦点时才上报输入状态（在输入框打字
  本来就需要这个焦点）。仅仅失焦也不再立刻传送：新增 `/api/blobby/desktop/probe` 路由，让待命的
  helper 用 Win32 `WindowFromPoint` 在窗口内宠物位置采样，判断 DSH 是否仍可见且未被遮挡；因此点击
  桌面时 Blobby 留在窗口内，而真正盖住 DSH 的窗口仍会触发传送。DSH 可见期间客户端每 600ms 重新探测
  一次；拿不到 helper 回复时退回原来的按焦点切换逻辑。
- 1.2.23 的思考气泡对齐：气泡原先固定在宠物上方的 CSS 偏移处，思考时它的可见顶部会浮在"深度求索"
  状态行上方那条细分隔线的上面几像素（偏移量随窗口、字号和宠物缩放变化，固定值不可能在所有布局里
  都落在线上）。现在 widget 从聊天 DOM 里读取真实的分隔线（`[data-chat-running]` 及其分隔线 span），
  把距离换算成气泡的 CSS 坐标（考虑 30/96 的透明源像素和宠物缩放），让可见顶部正好落在这条线上；
  并对偏移做钳制，宠物特别大时不会把气泡拖进脸里。状态变化、布局、滚动和缩放时都会重新计算；没有
  运行中的状态行时回退到原来的 CSS 位置。默认 48px 尺寸下气泡顶部现在正好在分隔线上（实测偏移
  0.00px）；宠物远大于输入区留白时按钳制保留一点上浮，而不是遮住眼睛。
- 1.2.24 点击睡着的 Blobby 不播唤醒动画的修复：pointerdown 处理器只设置了 `waking` transient，
  但没有重新渲染，所以点击睡着的宠物后屏幕上它仍然是睡着的；只有碰巧来了一次无关的 facts 更新触发
  recompute 时抖动-醒来动画才会出现（键盘路径没问题，因为 `activate()` 自己调了 `recompute()`）。
  现在 `_wake()` 在开始唤醒动画时立即渲染（并对 `recompute()` 里 busy-start 分支的嵌套调用做了
  保护），官方 8 帧 `buddy-waking` sprite 会完整播放 880ms 再回到 idle，与 VS Code 原版一致。
  桌面 helper 的状态机本来就有这段处理。
- helper 剩余的主要占用来自 PowerShell 5.1 + .NET/WPF 运行时本身；要移除它需要更换 helper 宿主，
  不在当前实现范围内。

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
| 右键 → **桌面显示** | 仅 Windows 桌面端：DSH 最小化/隐藏或被其他窗口遮住时把 Blobby 放到桌面（启用后显示 ✓） |
| 右键 → **智能隐藏** | 仅 Windows 桌面端：桌面 Blobby 只显示在桌面，不置顶在其他应用前 |
| Alt+Tab 到会遮住 DSH 的窗口 / 最小化 | 仅 Windows 桌面端：把 Blobby 切到桌面并显示在其他窗口上方 |
| 点击桌面或 DSH 旁边的窗口 | 仅 Windows 桌面端：DSH 仍可见且未被遮住，Blobby 留在窗口内 |
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

1.2.19 的传送修复也用真实 helper 重新验证：`shown` 确认时 `status.json` 已刷新（`showSeq` 匹配、
phase 为 `starting`）、start 后立刻发生的 facts 心跳返回 `prepared: false`、DSH 最小化时 helper
保持在任务栏上方 resting，以及 stop 后 helper 回到 prepared 且 facts 再次返回 `prepared: true`。

1.2.20 的编码修复用带中文菜单文案的 bundle 验证：同一处原本 8 秒超时的复用 show 现在 3–6ms 就确认，
真实 helper 连续 8 次最小化/恢复只复用一个 prepared 会话（`showSeq` 从 1 到 6），没有再出现冷启动。

1.2.21 的浅色菜单在同一屏幕上与窗口内菜单逐像素对比：可用文字都是 `#0F1115`、禁用文字都是
`#81858C`，菜单底色相差 1 个色阶（桌面 `#FBFCFC`，窗口内 `#FAFBFB`），因为桌面菜单是不透明的，
而窗口内菜单是半透明叠加在页面上。

1.2.22 在真实桌面上验证：右键菜单打开前后以 ~15ms 间隔连拍宠物区域，没有出现空白帧（1.2.21 会丢
一帧）；输入框里留文字再最小化时，转发给 helper 的 facts 在隐藏期间是 `hasInput:false`（聚焦时是
`true`），桌面 helper 的状态保持 idle/rendering 而不再出现 typing；probe 对真实记事本窗口的判断也
正确（记事本在 DSH 旁边：未被遮挡；盖住窗口内宠物：被遮挡；DSH 最小化：iconic）。

1.2.23 的气泡对齐在真实聊天界面里按默认尺寸验证：宠物停在 top 644、输入卡片顶部 692 时，"深度求索"
分隔线在 637，气泡可见顶部也落在 637（偏移 0.00px；截图中分隔线所在行与气泡上边缘是同一行）。偏移
由分隔线真实矩形算出来，所以换窗口/字号布局时会自动跟随，并在滚动/缩放时重算，而不是假设固定偏移。

1.2.24 的唤醒修复在窗口内和桌面两种状态下都实测过。DSH 窗口内用真实鼠标点击睡着宠物后，
`data-state` 时间线为 `sleep` → `waking`（880ms）→ `idle`，并且连拍宠物区域确认唤醒帧的 sprite
确实发生了变化。桌面 helper 显示期间（DSH 最小化）对点击前后采样 `status.json`，同样是
`sleep` → `waking` → `idle`，两种状态下都会播放抖动-醒来动画。

`docs/states.png` 是状态矩阵，`docs/hats.png` 与 `docs/color.png` 是自定义面板截图。


