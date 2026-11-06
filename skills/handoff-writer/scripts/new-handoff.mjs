#!/usr/bin/env node
/**
 * 按 handoff-writer 要求的段落顺序，生成 HANDOFF.md 骨架。
 *
 *   node scripts/new-handoff.mjs --title "修复 ingest 重试循环"
 *   node scripts/new-handoff.mjs --title "..." --out docs/HANDOFF.md --force
 *
 * 默认拒绝覆盖已有文件，除非显式传 --force。
 * 无网络请求，无第三方依赖。
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`✖ ${name} 需要一个值`);
    process.exit(2);
  }
  return value;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('用法: new-handoff.mjs [--title "标题"] [--out HANDOFF.md] [--force]');
  process.exit(0);
}

const title = flag('--title', '未命名的工作');
const out = path.resolve(process.cwd(), flag('--out', 'HANDOFF.md'));
const force = args.includes('--force');
const today = new Date().toISOString().slice(0, 10);

if (fs.existsSync(out) && !force) {
  console.error(`✖ ${out} 已存在 —— 加 --force 覆盖，或换一个 --out`);
  process.exit(1);
}

const template = `# HANDOFF — ${title}

## 目标

<一句话：这件事要达成什么。> 做完 = <可观测的条件>。

## 现状

- 能用：<子系统> —— 验证 \`<命令>\` → <结果>
- 不能用：<什么，以及在哪>
- 还没开始：<什么>

## 下一步

1. \`<命令>\` —— 预期：<结果>
2. <改这里>，位置 \`<文件:行>\`
3. \`<命令>\` —— 预期：<结果>

## 决策

- ${today} —— <决策>。否掉 <另一个方案>，原因是 <理由>。

## 坑

- <坑> —— <实际是什么样> —— <该怎么办>

## 地图

- \`<路径>\` —— <为什么重要>

## 待定

- <问题> —— 卡在 <人 / 实验 / 上游 issue>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, template);

const lines = template.split('\n').length;
const shown = path.relative(process.cwd(), out);
console.log(`✔ ${shown.startsWith('..') ? out : shown || out}（${lines} 行）`);
console.log('');
console.log('按这个顺序填：目标、现状、下一步。');
console.log('其余段落可以空着，但这三段不行。');
console.log('分享前检查：无密钥、无个人信息、无内部链接。');
