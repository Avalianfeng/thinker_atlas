# AGENT.md — Thinker's Atlas

给在本仓库动手的 coding agent。人读 README；字段细节读 `docs/content-format.md`；独立边界读 `docs/independence.md`。**不要**把那些文档整段抄进本文件。

## 这是什么

私人静态思想展馆。真源 = `content/people/`。站点 Astro 7，构建出 HTML + `/api/v1|public` JSON + Pagefind。线上 [atlas.cylf.me](https://atlas.cylf.me)。

## 动手前

1. 改码前先读本文件 + 相关 `docs/`；不确定出处的内容**不要猜进 content/**。
2. 默认开 PR，**不要**自行 merge / 推 `main` / 部署，除非任务写明。
3. 改完跑：`npm test` 与 `npm run build`（Node `>=22.23.4`）。
4. 中文短句汇报：做了什么、tip SHA、测过什么、还缺什么。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 安装 |
| `npm run dev` | 本地预览（predev 同步肖像） |
| `npm test` | Vitest + 内容自检 |
| `npm run build` | 肖像同步 → 构建 → Pagefind → API 自检 |
| `npm run new <id>` | 脚手架新人物夹 |
| `npm run deploy` / `publish` | 本机 rsync（需 `.env`）；CI 另见 workflow |
| `npm run sync` | **默认禁用**；勿当日常工作流 |

## 内容边界（硬）

- **写**：`content/people/<id>/` 下标准 MD + YAML（`index.md`、`01-….md`、可选 `timeline.yml`、图）。
- **不写进 content/**：AI 新生长文、SB 随笔/讨论草稿、关系边、`links.yml`、MDX、自定义组件标签。
- **不做**（本版）：人物关系网、独立总时间线页、站内编辑器、SB 双向。
- 样例人物仅够渲染；扩内容须人确认后再入库。

## 目录与读侧

```
content/people/<id>/{index.md,timeline.yml?,01-….md,portrait.*?}
src/pages/index.astro          # 挂墙 + 展厅墙 + 多人线
src/pages/people/[id].astro    # 个人页
src/styles/                    # tokens / fonts / base / layout / components
```

- 展厅墙：详牌 ↔ 卡片网格（单按钮切换）；卡片一行多人、`auto-fill` + 最大宽，少人时左侧排、右侧留白。
- 挂墙：沙龙重叠框，正常约 3:4，勿做成第二排卡片或压住下方控件。
- 多人时间线：只合并 `timeline.yml` 里 `multi: true`；悬停/点击 tip；圆点**不**跳人物页；无人际关系辅助线。
- 冷色盘按人物**出生年升序**分配（展牌与行线同色）；kind 用形状（●○■◆△），不用 kind 配色。
- 文案：界面只留必要标题与内容；勿加「最近修改 / 从这里开始」类操作说明。
- 顶栏保留中文名 + 英文 *Thinker's Atlas*；大标题用衬线（思源宋/Noto Serif 体系），勿改成 UI 黑体。

## 代码约定

- TypeScript / Astro；样式走现有 CSS 变量（`--rule`、`--ink`、`--font-*` 等），勿引入另一套设计 token。
- 肖像解析走 `src/lib/portrait.ts` + `scripts/sync-portraits.mjs`；有图时**必须**隐藏字母 fallback（注意 `display` 盖过 `[hidden]`）。
- 勿把密钥、`.env`、SSH 私钥、basic auth 密码写进仓库或 PR 正文。
- 不要「顺手」恢复 `archive/` 里的 v1 结构或启用 SB sync。
- 部署相关：可改 `scripts/deploy.mjs` / workflow；**不要**在 CI 里改服务器 Caddy/DNS。Actions Secrets 未配置时 PR 说明里写明，勿假装已自动上线。

## 红线（停下来问人）

1. 向 `content/` 写入未确认的长文或新人物传记。
2. Merge 进 `main`、生产部署、改 DNS/Caddy/Secrets。
3. 引入 SB 真源、双向 sync、关系图谱、MDX 组件体系。
4. 新增运行时后端或数据库（本站保持静态）。
5. 强制推送已共享分支、或提交凭据。

## 协作角色（仓外）

- **Thinker's Atlas bot**：内容与优先级、验收、协调。
- **atlas-hand**：本仓云盒改码 / 构建 / 测试。
- 人（Aeris）：合并与上线最终点头；本机副本常在 `E:\projects\development\thinker_atlas`。

任务只说「改 UI / 修 bug / 加字段」时，默认开分支 + PR，等合并指示。
