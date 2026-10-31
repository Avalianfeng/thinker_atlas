# Atlas 独立运行合同（v0.3）

更新：2026-10-31

## 定稿

1. **展馆真源 = git `content/people/`。** 人物卡、篇章、真图都在本仓库；编辑写回后构建发布。
2. **独立运行，无 SilverBullet 依赖。** 站点构建与浏览不要求 SB 可达。
3. **无双向同步。** `npm run sync` 默认 no-op。
4. **肖像用真图。** 文件放 `content/people/<id>/portrait.*` 或 `public/portraits/<id>.*`；无图才用字母 SVG 占位。
5. **content v2：** 一人一夹、标准 Markdown；不做关系网、不做总时间线；不把 AI 新长文写入 `content/`。

## 与旧草案的关系

- 「SilverBullet 唯一真源」作废。
- v1 `content/thinkers/…` 树作废，已迁 `archive/content-v1/`。

## 遗留代码

`scripts/adapters/silverbullet.mjs`、`scripts/lib/sync.mjs` 与相关测试仍保留，供显式 `--enable` 与回归；**不是工作流**。日常只改 `content/people/`、`npm run build`、`npm run deploy`。
