# 思想者图谱（Thinker's Atlas）

一个**只给自己看**的思想展馆：每位人物一间展厅，沿着设计好的路径进入他的思想。纯静态站，内容以 Markdown + YAML 存在 git 里，逐段标注来源；构建时同时输出只读 JSON 接口。

- 站点：Astro 7 + Content Collections + MDX，Zod 在构建时校验字段
- 前端 JS：只有三个开关（来源显示 / 批注显示 / 亮暗切换），其余全是静态 HTML
- 私有：服务器 basic auth；`/api/` 另用 Bearer token；全站 `noindex`
- 与 SilverBullet 部分双向关联：引用拉取、`atlas/` ⇄ `content/journal/` 同步、入口页生成

---

## 一、第一次跑起来

```bash
npm install
cp .env.example .env      # 按需填；不填也能本地预览
npm run dev               # http://localhost:4321
```

构建与预览：

```bash
npm run build     # 会先做字体子集化，再 astro build，最后跑 Pagefind 建索引
npm run preview   # 预览 dist/
npm test          # 同步逻辑与工具函数的单元测试
```

> 字体：`npm run build` / `npm run dev` 之前会自动运行 `scripts/subset-fonts.mjs`，从 content 与 src 里收集实际用到的汉字，按字频切成小块，输出到 `public/fonts/`。新增大量内容后重新构建即可，不需要手动处理。

## 二、日常三件事

### 1. 加一位新人物

```bash
npm run new feyerabend
```

会在 `content/thinkers/feyerabend/` 生成骨架（`index.mdx`、`life.mdx`、`afterlife.mdx`、`path.mdx`、`thought/`、`works/` 里各一个示例）。然后：

1. 改 `index.mdx`：姓名（中/英/原文）、生卒、领域、**强调色**、`maturity`（`种子` / `生长中` / `成形`）、`periods`（思想分期，概念页的 `period` 必须取自这里）。
2. 在 `life.mdx` 的 `events` 里加时间线事件（`kind` 取 生活/写作/出版/相遇/历史背景）。同一条数据会同时出现在展厅缩略图、生平页纵向时间线、总时间线泳道里。
3. 概念写到 `thought/<slug>.mdx`，作品写到 `works/<slug>.mdx`。**ID 一旦定下就不要改**，别人和接口都靠它。
4. 与已有人物建立关系：在 `content/relations/` 新建 `<a>--<b>.mdx`。
5. `npm run sync` 会顺手在 SilverBullet 生成 `atlas/_index/该人物.md` 与各概念入口页。

字段全表见 [`docs/content-format.md`](docs/content-format.md)。

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

<Sidenote>页边旁注，窄屏下点数字展开。</Sidenote>

<Todo>这里还没写；页面上会显示为「待写」，不会混进正文。</Todo>
```

- `transcribed` 与 `secondary` **必须**带 `source`，否则构建直接报错。
- 不确定页码、译本、出处时，写 `<Todo>` 或标「暂译，待核」，**不要猜**。
- 关系不确定时在关系文件里写 `verified: false`，页面会标「待核实」。

### 3. 同步与发布

```bash
npm run sync      # 拉取 SilverBullet 引用 + 双向同步 atlas/ + 生成入口页
npm run sync -- --dry-run     # 只看会做什么
npm run sync -- --pull-only   # 只拉取与生成，不回写
npm run sync -- --local demo/notes   # 用本地目录代替 SilverBullet（离线开发）
npm run deploy    # rsync dist/ 到 VPS（信息全在 .env）
npm run publish   # sync + build + deploy
```

同步的三条通路：

| 通路 | 方向 | 说明 |
| --- | --- | --- |
| 引用 | SilverBullet → Atlas | 任意笔记的 frontmatter 写 `atlas: wittgenstein/language-games`（可多个），或正文带 `#atlas/wittgenstein`，同步后出现在对应页面的「笔记中心里的相关笔记」栏；正文里也可用 `<SBNote page="notes/xxx" />` 嵌入 |
| 双向区 | `atlas/` ⇄ `content/journal/` | 两边都能改。`sync/state.json` 记哈希：只有一边变了就同步过去，两边都变了**不覆盖**，把对方版本存成 `xxx.conflict.md` 并提示你合并 |
| 入口页 | Atlas → SilverBullet | 每个人物与概念一篇 `atlas/_index/…`，顶部标「由 Atlas 生成，勿改」；同名手写文件不会被覆盖 |

**删除不自动同步**：只在一侧消失的文件会被列为提示，由你决定保留还是清掉。冲突未解决时 `npm run sync` 退出码为 2，合并后删掉 `.conflict.md` 再跑一次即可。

## 三、部署到 VPS

1. 服务器上准备好 `rsync` 与 Caddy；站点目录例如 `/var/www/atlas`。
2. 本机 `.env` 填 `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH`（可选 `DEPLOY_PORT`、`DEPLOY_SSH_KEY`）。
3. 把 [`deploy/Caddyfile`](deploy/Caddyfile) 改成你的域名与凭据，放到服务器上 reload：

```bash
caddy hash-password --plaintext '你的网页密码'   # 填进 Caddyfile 的 basic_auth
openssl rand -hex 32                            # 填进 Caddyfile 的 Bearer <API_TOKEN>
caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

配置要点：网页走 basic auth；`/api/*` 走 `Authorization: Bearer <token>` 且只允许 GET/HEAD；全站 `X-Robots-Tag: noindex`；字体与 `_astro/` 长缓存。

更多（权限、cron 自动拉取、迁移）见 [`deploy/README.md`](deploy/README.md)。

## 四、结构

```
content/
  thinkers/<slug>/{index,life,afterlife,path}.mdx
  thinkers/<slug>/thought/*.mdx
  thinkers/<slug>/works/*.mdx
  relations/<a>--<b>.mdx
  journal/            与 SilverBullet atlas/ 双向同步
  sb-cache/           拉取来的笔记副本（只读，勿手改）
sync/state.json       同步哈希，进 git
src/
  content.config.ts   所有 Zod schema
  lib/                ID、来源统计、git 时间、API 形状
  components/         Block / Quote / Note / Sidenote / Todo / Dialogue / 概念卡 / 时间线 / 谱系图
  pages/              展厅墙、人物展厅、概念、作品、身后、谱系、总时间线、索引、搜索、随笔、笔记
scripts/              subset-fonts / sync / new-thinker / deploy
deploy/               Caddyfile 与服务器说明
docs/content-format.md 内容格式规范（可迁移）
dist/api/v1/          构建产物：只读 JSON
dist/api/public/      只含 visibility: public 的子集
```

## 五、JSON 接口

`npm run build` 后：

- `/api/v1/index.json` — 端点清单与计数
- `/api/v1/thinkers.json`、`/api/v1/thinkers/{id}.json`
- `/api/v1/concepts.json`、`/api/v1/concepts/{thinker}/{concept}.json`
- `/api/v1/relations.json`（可按 `type`、`thinker` 过滤）
- `/api/v1/timeline.json`、`/api/v1/graph.json`、`/api/v1/journal.json`
- `/api/public/…` — 同样的结构，只含 `visibility: public` 的条目

默认全部 `private`。仓库里的示例把维特根斯坦与荣格设为 `public`、卢卡奇与费耶阿本德设为 `private`，用来演示这份子集确实在按条目过滤（连关系边也只留两端都公开的那些）。

版本号在路径里，字段只增不删。每个对象都带稳定 `atlas:` ID、`updated` 与来源统计。

## 六、三个开关

页头右侧：**来源**（隐藏来源边线与标签）、**批注**（隐藏「我的批注」）、**夜读**（亮暗切换）。状态存 localStorage，键盘可用，跟随系统 `prefers-color-scheme` 的初始值。

## 七、注意

- `content/` 里的内容是**你自己写的或转写的**；AI 不直接生成入库。少数必须保留的 AI 摘录用 `ai-excerpt`，视觉上弱化。
- 本仓库不含任何凭据；`.env` 已在 `.gitignore` 里。
- `docs/content-format.md` 是内容格式的权威说明，改字段先改它。
