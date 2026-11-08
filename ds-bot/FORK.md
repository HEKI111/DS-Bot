# 这个 fork 改了什么

上游 [Fei2411/DS-Bot](https://github.com/Fei2411/DS-Bot)：一个把「Bot 团队」装进 DeepSeek Harness（DSH）的插件。装完之后它用自己的一整套界面盖住 DSH，切换的开关只在 **设置 → 通用 → 模式 → 经典 Agent 模式 → 切换**，Bot 界面里没有任何反向入口。于是从 DSH 界面进去之后，看起来就像 DSH 消失了。

这个 fork 把「会话 / 机器人」做成了一个常驻开关。

## 装法

装的是 `ds-bot` 这个子包，不是仓库根目录：

```sh
dsh plugin --profile desktop add github:HEKI111/DS-Bot#feat/surface-switch&path:/ds-bot
```

或者在桌面端「设置 → 插件 → 添加」，填同一串。`client.js` 已经构建好并提交了，装下去不用再编译。

> 现在这台机器的 `~/.dsh/profiles/desktop/node_modules/ds-bot/` 里放的也是这份构建（原版备份在同目录 `.ds-bot-upstream-backup`）。那是手工覆盖，插件一升级就会被冲掉，长期用请改成上面的装法。

## 开关长在哪

| 场景 | 位置 |
|---|---|
| Bot 模式，侧栏展开 | 顶部一行，`DS Bot` 字样右边：`会话 ｜ 机器人` |
| Bot 模式，侧栏收起成导轨 | 导轨上一竖排，各显示一个字 |
| Agent 模式（DSH 自己的界面） | 左侧栏底部、设置按钮旁边：`会话 ｜ 机器人` |

三个位置操作的是同一个状态（`ds-bot:surface`），也就是设置页那个按钮改的东西，所以已有的会话归属、`plain` 处理、以及建立在其上的功能都不变。

## 几个刻意的选择

- **是 radio group，不是 tab**：tablist 承诺每个 tab 一个 tabpanel，而这里点一下换的是整个应用表面。所以是 `role="radiogroup"` + `aria-checked` + roving tabindex，方向键左右上下都接受（导轨那一版是竖排的）。
- **任何窗口都能切**：只读锁管的是对团队数据的写入；表面只是本浏览器看什么。之前有个只读变体，会把占着数据锁的第二个 DSH 永久困在一个表面里，已删掉。
- **导轨上一个字**：`会话 / 机器人` 在 28px 里会被截成省略号，所以导轨显示单字，完整名字留在 `aria-label` 和 `title`。

## 开发

```sh
cd ds-bot
npm ci
npm run harness   # 一次
npm run build     # src/client → client.js
npm test
```

改动集中在：`src/client/surface-switch.js`（新增）、`src/client/sidebar.js` 的顶部行与 `BotReturn`、`src/client/index.js` 的样式安装、`src/client/i18n.js` 的中文词条、`test/surface-switch.test.js`（新增）。
