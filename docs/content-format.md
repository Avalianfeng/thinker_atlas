---
name: 内容格式规范
description: Thinker's Atlas 的 Markdown + YAML 内容格式（v2）。一人一夹，标准 CommonMark/GFM，无 MDX、无自定义组件。
version: 2.1
updated: 2026-10-31
independence: docs/independence.md
---

# 内容格式规范 v2

展馆真源 = git `content/people/`。纯 Markdown + YAML；Astro 只是当前渲染器。

**v1 已废**（`thinkers/` + thought/works/relations/journal/sb-cache + MDX 组件）。旧树在 `archive/content-v1/`，旧规范在 `archive/docs/content-format-v1.md`。

## 0. 通用约定

- **稳定 id**：人物夹名 = `id`，小写、连字符（如 `wittgenstein`）。不使用 `atlas:` 前缀。
- **日期**：写作 `"1889-04-26"`（加引号以免 YAML 吞零）。生卒年显示用破折号：`1889—1951`。
- **`visibility`**：`private`（默认）或 `public`。只有 `public` 进入 `dist/api/public/`。
- **正文**：CommonMark + GFM。引文用 `>`；来源写在段末或引用脚。**不用** `<Block>` / `<Quote>` / `<Note>` 等自定义标签；**不用** MDX。
- **AI 不直接写长文入库**；本仓样例仅够跑通渲染。

## 1. 目录结构

```
content/
  people/
    <id>/
      index.md          # 人物卡（必需）
      timeline.yml      # 可选；个人事件（多人视图派生）
      01-….md           # 正文篇，按文件名排序
      02-….md
      portrait.jpg      # 可选真图
      *.png|*.webp…     # 正文相对路径引用的图
  _meta.md              # 可选，后补
public/portraits/<id>.* # sync-portraits 从 content 复制的肖像
public/people/<id>/*    # sync-portraits 复制的全部图（相对路径改写后访问）
```

禁止：`relations/`、`journal/`、`sb-cache/`、`links.yml`、MDX、自定义组件。

## 2. 人物卡 `people/<id>/index.md`

| 字段 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✓ | 与夹名相同，如 `wittgenstein` |
| `name` | string | ✓ | 中文（或常用）名 |
| `name_en` | string | | 英文名 |
| `born` / `died` | string | | 建议加引号；在世可省 `died` |
| `order` | int | ✓ | 展厅墙排序 |
| `intro` | string | ✓ | 展牌一句话 |
| `portrait` | string | | `./portrait.jpg` 或 `/portraits/<id>.jpg` |
| `visibility` | enum | | 默认 `private` |

正文可空或写人物总述。

## 3. 篇章 `01-….md`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 必需 |
| `kind` | `life` \| `work` \| `note` \| `other` | 必需 |

- 文件名：`两位数字-短名.md`，排序靠文件名。
- 图片：`![说明](./xxx.png)`（构建时复制到 `public/people/<id>/` 并改写 URL）。
- 不做站内批注 / SB 笔记；可用纯文本 `TODO:` 备忘（样例请避免留下未完成占位）。

## 4. 肖像

1. 照片放 `content/people/<id>/portrait.jpg`（也认 `photo.*` / `照片.*`），或直接放 `public/portraits/<id>.*`。
2. frontmatter 写 `portrait: ./portrait.jpg`（推荐）或 `/portraits/<id>.jpg`。
3. `npm run sync:portraits`（挂在 `predev` / `prebuild`）复制肖像与正文图。
4. **无真图时**才用字母 SVG 占位。

## 5. 时间线 `people/<id>/timeline.yml`

个人事件的唯一真源；多人简略视图只合并 `multi: true` 的条目。

```yaml
events:
  - date: "1889-04-26"
    title: 生于维也纳
    # to: "1908"       # 可选区间终点
    # kind: life       # 可选；默认 life。取值 life|write|publish|meet|context
    # multi: true      # 可选；true 才进多人简略线，默认 false
```

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `date` | ✓ | `"1889"` / `"1889-04"` / `"1889-04-26"`（建议加引号） |
| `title` | ✓ | 短标题 |
| `to` | | 区间终点，同 date 格式 |
| `kind` | | `life`（默认）、`write`、`publish`、`meet`、`context` |
| `multi` | | 默认 `false`；`true` 才出现在主页多人线 |

**不做**：`place` / `note` / `source` / `refs` / `with` / `verified` / `links.yml` / 人与人关系边。

`index.md` 的 `born`/`died` 仍作展牌生卒；与 timeline 宜一致。

### 展示约定

- **个人** `/people/<id>/`：纵向列表（细竖轴），按 date 排序；区间显示为「起—止」。
- **多人** 主页底部：横轴=时间，每行一人（左名、右线+圆点）；只消费 `multi: true`。
- **交互**：悬停圆点显示 date + title（可含人名）；可横向拖/滑平移。**点击圆点不跳转**。
- **不要**人与人关系辅助线。无人 `multi` 时隐藏该区块（或极简提示）。

## 6. 站点读侧

- `/` 展厅墙（读 `people`）+ 底部多人时间线（若有 multi 事件）
- `/people/<id>/` 一人页（时间线列表 + 篇章锚点）
- 关系网、独立总时间线页：不做（本版）

## 7. 校验

- Zod 校验 frontmatter；夹名与 `id` 不一致、篇章无主人物时构建失败。
- `timeline.yml` 由读侧解析校验（缺 date/title 或非法 kind 则构建失败）。
- `npm test` 覆盖 v2 内容自检、timeline 解析/合并与工具函数。

## 变更记录

- v2.1（2026-10-31）：增补 `timeline.yml`；个人纵轴 + 主页多人横轴；无 links/关系边。
- v2（2026-10-31）：`people/<id>/` 扁平；废 MDX 与 thought/works/relations；真源仍为 git content/。
- v1.1 / v1：见 `archive/docs/content-format-v1.md`。
