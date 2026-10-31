# 思想者图谱（Thinker's Atlas）

一个**只给自己看**的思想展馆：每位人物一间展厅，沿着设计好的路径进入他的思想。纯静态站，**展馆真源 = git `content/`**，独立运行，**不依赖 SilverBullet**。内容以 Markdown + YAML 存在仓库里，逐段标注来源；构建时同时输出只读 JSON 接口。

- 站点：Astro 7 + Content Collections + MDX，Zod 在构建时校验字段
- 前端 JS：只有三个开关（来源显示 / 批注显示 / 亮暗切换），其余全是静态 HTML
- 私有：服务器 basic auth；`/api/` 另用 Bearer token；全站 `noindex`
- 肖像：**真图优先**（`public/portraits/<slug>.*` 或 `content/thinkers/<slug>/portrait.*`）；无图才用字母占位

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

会在 `content/thinkers/feyerabend/` 生成骨架。然后：

1. 改 `index.mdx`：姓名、生卒、领域、**强调色**、`maturity`、`periods`。
2. **上传真图**：把照片存为 `content/thinkers/<slug>/portrait.jpg`（构建时复制到 `public/portraits/`），或直接放到 `public/portraits/<slug>.jpg`；在 frontmatter 写 `portrait: /portraits/<slug>.jpg`。没有真图时页面用字母占位。
3. 在 `life.mdx` 的 `events` 里加时间线事件。
4. 概念写到 `thought/<slug>.mdx`，作品写到 `works/<slug>.mdx`。**ID 一旦定下就不要改**。
5. 关系（可选，暂不扩做）：`content/relations/<a>--<b>.mdx`。

### 2. 写作时怎么标来源

正文默认就是「自己的」。需要标注时用组件：

```mdx
<Block from="transcribed" source="《逻辑哲学论》5.6">
我的语言的界限意味着我的世界的界限。
</Block>

<Quote prop="5.6" source="《逻辑哲学论》5.6" original="Die Grenzen meiner Sprache..." lang="de" translator="暂译，待核">
我的语言的界限意味着我的世界的界限。
</Quote>

<Note title="我的疑问">这一步是不是走得太快？</Note>
<Todo>这里还没写；页面上会显示为「待写」，不会混进正文。</Todo>
```

- `transcribed` 与 `secondary` **必须**带 `source`，否则构建直接报错。
- 不确定时写 `<Todo>` 或「暂译，待核」，**不要猜**。

### 3. 构建与发布

```bash
npm run build     # 本地构建
npm run deploy    # rsync dist/ 到 VPS（信息在 .env）
npm run publish   # build + deploy
```

`npm run sync` **默认禁用**（独立展馆，无 SB 双向/拉取）。遗留脚本仍在仓库里，仅当你显式 `npm run sync -- --enable` 才会跑；日常不要用。

## 三、部署到 VPS

1. 服务器上准备好 `rsync` 与 Caddy；站点目录例如 `/var/www/atlas`。
2. 本机 `.env` 填 `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH`。
3. 把 [`deploy/Caddyfile`](deploy/Caddyfile) 改成你的域名与凭据，放到服务器上 reload。

更多见 [`deploy/README.md`](deploy/README.md)。

## 四、结构

```
content/
  thinkers/<slug>/{index,life,afterlife,path}.mdx
  thinkers/<slug>/thought/*.mdx
  thinkers/<slug>/works/*.mdx
  thinkers/<slug>/portrait.jpg   可选真图（构建复制到 public/portraits/）
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

## 六、三个开关

页头右侧：**来源**、**批注**、**夜读**。状态存 localStorage。

## 七、注意

- `content/` 是**展馆真源**；AI 不直接生成入库。
- 本仓库不含凭据；`.env` 已在 `.gitignore`。
- 不做 SilverBullet 双向；不把 SB 当展馆真源。
