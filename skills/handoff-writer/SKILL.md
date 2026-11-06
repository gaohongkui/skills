---
name: handoff-writer
description: >-
  把一段长会话整理成 HANDOFF.md，让新会话不读历史就能接手。
  当用户说「写个交接」「hand off」「总结上下文给新会话」「收尾」，
  或上下文快满了而工作还没做完时使用。
  Use when the user asks to write a handoff, wrap up, or summarize context for a new session.
license: MIT
compatibility: 可选的脚手架脚本需要 Node.js 18+，其余只需读写 Markdown。
metadata:
  version: 0.1.0
  category: meta
  tags: [handoff, context, session, resume]
  summary-en: Turn a long working session into a HANDOFF.md a fresh agent can resume from.
allowed-tools: Read Write Bash
---

# Handoff Writer

产出一份 `HANDOFF.md`，让下一个会话——另一个 agent、完全不记得这次对话——在两分钟内开始干活。

这个 skill 防的是同一个失败：**把对话复述一遍**。接手的人不需要知道刚才聊了什么，他需要的是
**世界现在的状态、已经定下的决策、以及唯一的下一个动作**。

## 什么时候用

- 用户要求交接、收尾，或者总结上下文给新会话。
- 上下文快用完了，而事情还没做完。
- 工作要留到以后、换台机器、或者交给别人继续。

**不要**用于：给在场的用户汇报进度（那是状态更新），或者替代 commit message 和 PR 描述。

## 工作流

### 1. 先确定读者

动笔前锁定三件事，只问推不出来的：

1. **谁来接手**——有仓库权限的新 agent、同事，还是未来的你自己？
2. **什么算做完**——一句话说清终点。
3. **从哪开始**——工作目录、分支，或者入口文件。

用户说得含糊时，你先给一句你的理解让他确认或纠正。**写错的目标比没有交接更糟**。

### 2. 分开「可复原的」和「不可复原的」

`git log`、README、代码里能翻到的东西，都是可复原的，不要誊抄。HANDOFF 只装新会话推不出来的：

| 留下 | 删掉 |
| --- | --- |
| 为什么这么定，以及被否掉的方案 | 代码 diff 本身 |
| 已经踩过的坑（「接口 200 但 body 里是错误」） | 对话的逐句过程 |
| 环境事实（版本、参数、凭据**名字**而非值） | 完整的命令输出 |
| 工作精确停在哪里 | 「我们讨论了几种方案」 |
| 下一步依赖的、还没验证的假设 | 客套、情绪、自我评价 |

判断标准一句话：**只要读仓库就能重新生成的，就删掉。**

### 3. 写文件

先生成骨架，再填：

```bash
node scripts/new-handoff.mjs --title "修复 ingest 重试循环" --out HANDOFF.md
```

也可以直接按带注释的模板写：[`references/handoff-template.md`](references/handoff-template.md)。
段落顺序是有意义的：目标 → 现状 → 下一步 → 其余。

### 4. 让「下一步」可以直接执行

「下一步」必须具体到不需要再做决策就能开工：

- 差：「继续调试重试逻辑」。
- 好：「跑 `npm test -- ingest`，`test/ingest.test.mjs:88-140` 三个用例失败，原因是
  `retryDelay()` 忽略了 `attempt`；改那里，然后重跑。」

写清命令、文件与行号、已经试过什么、接下来试什么。

### 5. 收口

回合结束时说一句：

```markdown
交接已写到 HANDOFF.md（N 行）。下个会话：先读 HANDOFF.md，再从 <入口> 开始。
```

## 输出契约

一个 Markdown 文件，写到用户指定的路径（默认 `./HANDOFF.md`），段落按此顺序：

1. **目标** —— 一句话，加上「做完」的可观测条件。
2. **现状** —— 什么能用、什么不能用、最后一次真正验证的命令和结果。
3. **下一步** —— 编号，≤ 5 条，第一条可以立刻开跑。
4. **决策** —— 选了什么、否了什么、为什么，带日期。
5. **坑** —— 花过时间、还会再花时间的地方。
6. **地图** —— 相关文件和目录，一行一个，写清为什么重要。
7. **待定** —— 没解决的问题，以及谁能解决。

控制在 150 行以内。一份没人读完的交接，等于没写。

## 硬规则

- **交接里永远不放密钥。** 凭据只写名字和位置（「token 在 `~/.config/x/credentials`」），不写值——
  交接文件会被贴进聊天窗口、issue，和别的 agent 的上下文。用户贴了密钥，就替换成 `<REDACTED>`
  并提醒他轮换。
- **不放个人信息。** 同事、客户的名字，内部链接，都不该出现在一个会被转发的文件里。参见仓库的
  `docs/publishing-checklist.md`。
- **不确定就写不确定。** 「假设是 X，未验证」是诚实的、可执行的；把猜测写成结论，会毒化下一个会话。
- **只有入口用绝对路径。** 其余一律仓库相对路径，接手的人可能在另一台机器上。
- **用用户的语言写。** 这份文件也是给人看的。
- **不编造状态。** 没验证过就写没验证过，并写清怎么验证。

## 示例

```markdown
# HANDOFF — 修复 ingest 重试循环

## 目标
ingest 的重试要指数退避，并在 5 次后停止。做完的标志：`npm test` 全绿，
且手动回放能看到 1s、2s、4s、8s、16s 的间隔。

## 现状
- 能用：解析、校验、正常路径的 ingest。最后验证 `npm test` → 41 passed。
- 不能用：`test/ingest.test.mjs:88-140` 三个用例失败——重试是立刻触发的。

## 下一步
1. 跑 `npm test -- ingest`，确认这三个失败还在。
2. 改 `src/ingest/retry.ts:31` 的 `retryDelay()`——它忽略了 `attempt`。
3. 重跑测试，再用 `node scripts/replay.mjs` 手动确认间隔。

## 决策
- 2026-11-06 —— 选指数退避而不是固定延迟。否掉固定延迟的理由：上游是突发限流，
  固定 5s 在预发环境仍然被打回。

## 坑
- 预发环境限流时返回 HTTP 200，错误在 body 里——要看 body，不要看状态码。

## 地图
- `src/ingest/retry.ts` —— 重试策略，bug 在这里。
- `test/ingest.test.mjs` —— 那三个失败用例。
- `scripts/replay.mjs` —— 手动回放工具，接受一个 fixture 路径。

## 待定
- 5 次上限要不要按数据源可配？没定，硬编码之前先问。
```
