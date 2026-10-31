# 思想者图谱（Thinker's Atlas）

一个**只给自己看**的思想展馆：每位人物一间展厅，沿着设计好的路径进入他的思想。纯静态站，**展馆真源 = git `content/people/`**，独立运行，**不依赖 SilverBullet**。内容以 Markdown + YAML 存在仓库里，逐段标注来源；构建时同时输出只读 JSON 接口。

- 站点：Astro 7 + Content Collections；内容为标准 Markdown（GFM），Zod 在构建时校验字段
- 前端 JS：只有顶栏日月主题切换，其余全是静态 HTML
- 私有：服务器 basic auth；`/api/` 另用 Bearer token；全站 `noindex`
- 肖像：**真图优先**（`public/portraits/<slug>.*` 或 `content/people/<id>/portrait.*`）；无图才用字母占位

合同摘要见 [`docs/independence.md`](docs/independence.md)。内容字段见 [`docs/content-format.md`](docs/content-format.md)。

---

## 一、第一次跑起来

```bash
npm install
cp .env.example .env      # 按需填；不填也能本地预览
npm run dev               # http://localhost:4321
```

构建与预览：

```bash
npm run build     # 会先同步肖像、字体子集化，再 astro build，最后跑 Pagefind
npm run preview   # 预览 dist/
npm test          # 单元测试与内容自检
```

> Node 需要 `>=22.23.4`（Astro 7）。字体：`predev` / `prebuild` 会跑 `scripts/subset-fonts.mjs`。

## 二、日常三件事

### 1. 加一位新人物

```bash
npm run new feyerabend
```

会在 `content/people/feyerabend/` 生成 `index.md` + `01-导读.md`。然后：

1. 改 `index.md`：`id`（=夹名）、`name`、`born`/`died`、`order`、`intro`、`portrait`。
2. **上传真图**：`content/people/<id>/portrait.jpg`（或 `public/portraits/<id>.jpg`）；frontmatter 写 `portrait: ./portrait.jpg`。无图才用字母占位。
3. 追加篇章：`02-….md` 等，frontmatter 含 `title`、`kind`（`life`|`work`|`note`|`other`）。
4. 正文用标准 Markdown；图片 `![说明](./xxx.png)`。**不要** MDX / 自定义组件。
5. 关系与总时间线：暂不做。

详见 [`docs/content-format.md`](docs/content-format.md)（v2）。

### 2. 写作约定

- 引文用 `>` 块引用 + 出处行。
- 来源写在段末括号或引用脚。
- AI **不**直接写长文入库。

### 3. 构建与发布

推送到 **`main`** 会由 GitHub Actions 自动：`npm test` → `npm run build` → `rsync` 到 VPS（见 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)）。也可在 Actions 里手动 `workflow_dispatch`。

本地仍可用：

```bash
npm run build     # 本地构建
npm run deploy    # rsync dist/ 到 VPS（信息在 .env）
npm run publish   # build + deploy
```

CI 所需 Secrets 名：`DEPLOY_HOST`、`DEPLOY_USER`、`DEPLOY_PATH`、`DEPLOY_PORT`（可选）、`DEPLOY_SSH_KEY`。值只放在 GitHub 仓库 Settings，**不要**写进 git。细节见 [`deploy/README.md`](deploy/README.md)。

`npm run sync` **默认禁用**（独立展馆，无 SB 双向/拉取）。遗留脚本仍在仓库里，仅当你显式 `npm run sync -- --enable` 才会跑；日常不要用。

## 三、部署到 VPS

1. 服务器上准备好 `rsync` 与 Caddy；站点目录例如 `/var/www/atlas`。
2. 在 GitHub 仓库 Settings → Secrets 填 `DEPLOY_*`（见上）；日常推 `main` 即自动部署。
3. 本机紧急发布仍可：`.env` 填同名变量后 `npm run publish`。
4. 把 [`deploy/Caddyfile`](deploy/Caddyfile) 改成你的域名与凭据，放到服务器上 reload（CI **不**改 Caddy/DNS）。

更多见 [`deploy/README.md`](deploy/README.md)。

## 四、结构

```
content/
  people/<id>/{index,life,afterlife,path}.mdx
  people/<id>/thought/*.mdx
  people/<id>/works/*.mdx
  people/<id>/portrait.jpg   可选真图（构建复制到 public/portraits/）
  relations/<a>--<b>.mdx
  journal/            可选本地随笔（非 SB 工作流）
  sb-cache/           遗留缓存，可空
public/portraits/     运行时肖像 URL：/portraits/<slug>.jpg
src/
  content.config.ts   Zod schema
  lib/                ID、来源、肖像解析、API
  components/         Block / Quote / Portrait / 时间线 …
  pages/              展厅墙、人物、概念、作品、时间线 …
scripts/              subset-fonts / sync-portraits / new-thinker / deploy
docs/content-format.md  内容格式
docs/independence.md    独立运行合同
dist/api/v1/          构建产物 JSON
```

## 五、JSON 接口

`npm run build` 后提供 `/api/v1/…` 与 `/api/public/…`（仅 `visibility: public`）。版本号在路径里，字段只增不删。

## 六、顶栏

页头只有站点标题（回首页）与一个日月主题切换；无主导航、无来源/批注开关。主题状态存 localStorage。

## 七、注意

- `content/` 是**展馆真源**；AI 不直接生成入库。
- 本仓库不含凭据；`.env` 已在 `.gitignore`。
- 不做 SilverBullet 双向；不把 SB 当展馆真源。
