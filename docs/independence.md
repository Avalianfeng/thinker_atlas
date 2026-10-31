# Atlas 独立运行合同（v0.2）

更新：2026-10-31

## 定稿

1. **展馆真源 = git `content/`。** 人物档案、模块正文、真图肖像都在本仓库；编辑写回 Atlas 内容树，再构建发布。
2. **独立运行，无 SilverBullet 依赖。** 站点构建与浏览不要求 SB 可达；不把 SB 当展馆中心或唯一真源。
3. **无双向同步。** `npm run sync` 默认 no-op。不启用 `atlas/` ⇄ `content/journal/` 回写；默认不做 `atlas/_index` 生成；默认不跑 SB 拉取。
4. **肖像用真图。** 文件放 `content/thinkers/<slug>/portrait.*` 或 `public/portraits/<slug>.*`，frontmatter `portrait` 指向 `/portraits/<slug>.*`；无图才用字母 SVG 占位。
5. **范围暂缓：** 不扩做人物关系、不重设计总时间线、不把 AI 新正文写入 `content/`。

## 与 v0.1 草案的关系

旧草案「SilverBullet 唯一真源 / Atlas 只做展示」**作废**。本文件为现行合同。

## 遗留代码

`scripts/adapters/silverbullet.mjs`、`scripts/lib/sync.mjs` 与相关测试仍保留，供显式 `--enable` 与回归；**不是工作流**。日常只改 `content/`、`npm run build`、`npm run deploy`。
