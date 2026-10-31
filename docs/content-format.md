---
name: 内容格式规范
description: Thinker's Atlas 的 Markdown + YAML 内容格式（v1）。任何工具都可以按这份规范读写 content/，不依赖 Astro 私有语法。
version: 1
updated: 2026-10-31
---

# 内容格式规范 v1

这份文档定义 `content/` 下所有文件的字段与约定。目标是：内容本身可迁移——纯 Markdown + YAML，任何编辑器、任何构建器都能读；Astro 只是当前使用的渲染器。

字段只增不删。破坏性改动必须升版本号，并在这里写变更记录。

## 0. 通用约定

- **稳定 ID**：每个实体都有永不改变的 `id`，写法是 `atlas:<人物>` 或 `atlas:<人物>/<条目>`，全小写、连字符分隔。文件可以改名、搬家、换语言，ID 不动。其他站点、SilverBullet、JSON 接口一律用 ID 引用。
- **日期**：写作 `1889`、`1889-04` 或 `1889-04-26`，加引号以免 YAML 误解析。显示时生卒年用破折号：`1889—1951`。
- **`visibility`**：`private`（默认）或 `public`。只有 `public` 的条目进入 `dist/api/public/`。
- **`provenance`**：`own` / `own-discussed` / `transcribed` / `quote` / `secondary` / `ai-excerpt`。未标注的正文默认为 `own`。**AI 不直接生成内容入库**，`ai-excerpt` 只用于少数必须保留的摘录，且在页面上弱化显示。
- **正文组件**（MDX）：`<Block>`、`<Quote>`、`<Note>`、`<Sidenote>`、`<Todo>`、`<Dialogue>`、`<Say>`、`<Prop>`、`<SBNote>`。每个组件都有纯文本降级写法（见 §7）。

## 1. 目录结构

```
content/
  thinkers/<slug>/
    index.mdx        # 档案（必需）
    life.mdx         # 生平 + frontmatter 时间线事件
    thought/<slug>.mdx
    works/<slug>.mdx
    afterlife.mdx    # 身后
    path.mdx         # 学习路径
  relations/<from>--<to>.mdx
  journal/           # 与 SilverBullet atlas/ 双向同步的随笔
  sb-cache/          # npm run sync 拉取的 SilverBullet 笔记副本（只读，勿手改）
themes/              # 预留：跨人物主题
sync/state.json      # 同步哈希状态，进 git
```

## 2. 人物 `thinkers/<slug>/index.mdx`

| 字段 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✓ | `atlas:wittgenstein` |
| `name.zh` / `name.en` / `name.original` | string | zh、en 必需 | 中文名、英文名、原文名 |
| `born.date` / `born.place` | date / string | date 必需 | |
| `died.date` / `died.place` | date / string | | 在世者可省略 |
| `fields` | string[] | | 领域 |
| `maturity` | `种子` \| `生长中` \| `成形` | ✓ | 页面如实显示 |
| `accent` | `#RRGGBB` | ✓ | 人物强调色，只用于展厅头部、谱系节点、时间线条带 |
| `order` | int | ✓ | 展厅墙「按加入顺序」 |
| `added` | date | ✓ | 加入日期 |
| `intro` | string | ✓ | 一句话导言（展牌上） |
| `epigraph` | `{ text, original?, lang?, source?, translator?, from? }` | | 展厅头部引言；`source` 必填 |
| `portrait` | string | | 肖像图片路径；缺省时生成单色字母占位 |
| `periods` | `{ id, label, from, to }[]` | | 思想分期，概念页 `period` 必须取自这里 |
| `visibility` | enum | | |

## 3. 生平 `life.mdx`

frontmatter 的 `events` 是时间线的唯一数据源（同时供展厅缩略图、生平页纵向时间线、总时间线泳道使用）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | date | 必需 |
| `to` | date | 区间事件 |
| `kind` | `生活` \| `写作` \| `出版` \| `相遇` \| `历史背景` | 历史背景用浅色 |
| `title` | string | 必需 |
| `place` / `note` / `source` | string | |
| `work` | entity id | 关联作品 |

## 4. 概念 `thought/<slug>.mdx`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | `atlas:wittgenstein/language-games` |
| `title` / `original` / `lang` | string | |
| `period` | string | 对应人物的 `periods[].id` |
| `definition` | string | 概念卡「一句话定义」，必需 |
| `questions` | string[] | 这个概念要回答什么问题 |
| `builds_on` / `contrasts_with` | entity id[] | 必须指向存在的条目，否则构建失败 |
| `works` | entity id[] | |
| `evolution` | `{ period, text, ref? }[]` | 「演变」模块 |
| `interlocutors` | `{ concept, note? }[]` | 「对话者」：其他人物/本人物中的相关概念 |
| `terms` | `{ zh, original, lang? }[]` | 原文术语，进索引 |
| `order` | int | 展室内的顺序 |

## 5. 作品 `works/<slug>.mdx`

`id`、`title`、`original`、`year` 必需；`written`、`period`、`editions[]`、`reading`、`structure[{n,title,original?}]`、`theses[]`、`concepts[]` 可选。

`reading` 记录「我读的译本」，`editions` 记录版本信息。**没有核对过的版本不要写页码**；页码不确定时在正文里用 `<Todo>` 标注。

## 6. 关系 `relations/<from>--<to>.mdx`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | `atlas:rel/wittgenstein--feyerabend` |
| `from` / `to` | entity id | 端点可以是人物，也可以是概念 |
| `type` | `影响` \| `批判` \| `师承` \| `对话` \| `平行` \| `误读` | |
| `directed` | bool | 默认 true；`平行` 通常为 false |
| `since` / `until` | int | 年份 |
| `summary` | string | 一句说明，必需 |
| `source` | string | |
| `provenance` | enum | 默认 `own` |
| `verified` | bool | 默认 true。**不确定的关系必须写 `verified: false`**，页面上会标「待核实」 |

## 7. 正文组件与纯文本降级

| 组件 | 用法 | 降级 |
| --- | --- | --- |
| `<Block from source discussion sb>` | 段落级来源标注 | `> [来源：transcribed｜《逻辑哲学论》5.6]` 正文 |
| `<Quote original lang source translator prop>` | 译文/原文/出处三层 | 缩进引用 + 原文段落 + 出处行 |
| `<Note title>` | 「我的批注」，可全局隐藏 | 以「批注：」开头的段落 |
| `<Sidenote>` | 页边旁注 | 脚注 |
| `<Todo>` | 待写占位（不会被误当成内容） | `TODO: ...` |
| `<Dialogue title>` + `<Say who>` | 虚构对话 | 带「（虚构对话）」标注的对话体 |
| `<Prop n work>` | 维特根斯坦式编号，锚点 `#p-5.6` | `5.6` |

`<Block from="transcribed">` 与 `<Block from="secondary">` 必须带 `source`，否则构建直接报错。

## 8. 随笔 `journal/**`

与 SilverBullet 双向同步。frontmatter 至少含 `title`、`date`；`atlas:` 可以是单个 ID 或数组，用于把随笔挂到人物/概念上。同步脚本只管理 `atlas/` 与 `content/journal/` 之间的这两个文件，不改 frontmatter 里的其他字段。

## 9. SilverBullet 笔记缓存 `sb-cache/`

`npm run sync` 把 SilverBullet 中带 `atlas:` frontmatter 或 `#atlas/<人物>` 标签的笔记拉到这里，用于「相关笔记」栏与 `<SBNote>` 嵌入。**原笔记只在 SilverBullet 里改**，这里的副本每次同步覆盖。

## 10. 校验

- Astro 在构建时用 Zod 校验所有字段；缺来源、日期格式错、引用不存在的 ID、概念 `period` 未定义，都会让构建失败并指出文件。
- `npm test` 覆盖同步逻辑与来源统计。

## 变更记录

- v1（2026-10-31）：首版。
