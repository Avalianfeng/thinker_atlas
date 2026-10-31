# 思想者图谱（Thinker's Atlas）

只给自己看的思想展馆：一人一间展厅，路径进入思想。纯静态站；**展馆真源 = git `content/people/`**，独立运行，**不依赖 SilverBullet**。

- 站点：[atlas.cylf.me](https://atlas.cylf.me)（basic auth；`/api/` 另 Bearer；全站 `noindex`）
- 栈：Astro 7 + Content Collections；内容标准 Markdown（GFM）+ YAML；Zod 构建期校验
- 前端 JS：顶栏日月主题、展厅墙视图切换、肖像墙轮播、多人时间线悬停/平移——其余静态 HTML
- 肖像：真图优先（`content/people/<id>/portrait.*` → `public/portraits/`）；无图才字母占位
- 字体：正文拉丁 Source Serif 4 + 中文 Noto Serif SC；UI Noto Sans SC（`@fontsource` 自托管）

合同：[`docs/independence.md`](docs/independence.md)。字段：[`docs/content-format.md`](docs/content-format.md)。给 coding agent 的约束：[`AGENT.md`](AGENT.md)。

---

## 第一次跑起来

```bash
npm ci
cp .env.example .env   # 本地预览可不填部署项
npm run dev            # http://localhost:4321
```

```bash
npm test
npm run build          # prebuild 同步肖像 → astro → Pagefind → API 自检
npm run preview
```

Node `>=22.23.4`。

## 日常

### 加人物

```bash
npm run new feyerabend
```

在 `content/people/<id>/` 改 `index.md`（`id`/`name`/`born`/`died`/`order`/`intro`，可选 `portrait`/`name_en`/`visibility`），放真图，追加 `01-….md`（`title` + `kind`: `life|work|note|other`）。可选 `timeline.yml`。**不要** MDX / 自定义组件。关系与总时间线页：暂不做。

### 写作

- 引文 `>` + 出处；来源在段末或脚注
- **AI 不直接写长文入库**；草稿须人确认后再进 `content/`

### 发布

推 **`main`** → GitHub Actions：`test` → `build` → `rsync`（[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）。Secrets：`DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH` / `DEPLOY_PORT`（可选）/ `DEPLOY_SSH_KEY`——只放仓库 Settings，勿进 git。

Secrets 未齐时，本机：

```bash
npm run publish   # build + deploy（信息在 .env）
```

细节见 [`deploy/README.md`](deploy/README.md)。`npm run sync` 默认禁用（无 SB 双向）。

## 结构（v2）

```
content/people/<id>/
  index.md            # 人物卡
  timeline.yml        # 可选；multi:true 进主页多人线
  01-….md             # 篇章
  portrait.jpg        # 可选真图
public/portraits/     # sync-portraits 产物
src/
  content.config.ts
  pages/              # / 、 /people/<id>/ 、 api
  components/ lib/ scripts/ styles/
scripts/              # new-thinker / sync-portraits / deploy
docs/                 # content-format · independence
.github/workflows/deploy.yml
dist/                 # 构建产物（含 api JSON、pagefind）
```

旧 v1（MDX / relations / journal / sb-cache）在 `archive/`，勿复活。

## 读侧要点

- `/`：沙龙挂墙肖像 + 展厅墙（详牌 / 卡片网格）+ 底部多人时间线（仅有 `multi` 时）
- `/people/<id>/`：个人纵向时间线 + 篇章
- 展厅冷色按**出生年升序**轮换；时间线 kind 用形状区分，不按 kind 配色
- 顶栏：中文「思想者图谱」+ 英文 Thinker's Atlas 字幕 + 日月切换

## 注意

- `content/` 是真源；凭据不进仓库（`.env` 已 ignore）
- CI **不**改 Caddy / DNS；基建另册
