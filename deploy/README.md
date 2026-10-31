# VPS 上的目录与权限（参考）

```bash
# 站点文件（rsync 目标）
sudo mkdir -p /var/www/atlas
sudo chown -R atlas:atlas /var/www/atlas

# Caddy
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile   # 或 include 到已有配置
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 日志目录
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
```

## 首次部署

1. 在本机 `.env` 里填 `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_PATH`（见 `.env.example`）。
2. `npm run build`，再 `npm run deploy`（等价于 `rsync -az --delete dist/ user@host:path/`）。
3. `npm run publish` = `sync` + `build` + `deploy`，日常用这一条。

## 两个凭据是分开的

| 用途 | 位置 | 轮换方式 |
| --- | --- | --- |
| 网页 basic auth | Caddyfile 里的 bcrypt 哈希 | `caddy hash-password` 生成新哈希，改配置，`systemctl reload caddy` |
| 只读 API Bearer | Caddyfile 里的 `<API_TOKEN>` | 换 token，同时改调用方，reload |
| SilverBullet 同步 | 本机 `.env` 的 `SB_USER` | 在 SilverBullet 里换密码，改 `.env` |

三者互不影响：吊销 API token 不会影响你自己看网页，反之亦然。

## 定时同步（可选）

如果想让站点每天自动跟 SilverBullet 对齐，在 VPS 上加一条 cron，只做拉取与重建（不回写、不生成入口页，避免与本地编辑打架）：

```cron
*/30 * * * * cd /srv/atlas-src && npm run sync -- --pull-only >> /var/log/atlas-sync.log 2>&1 && npm run build >> /var/log/atlas-sync.log 2>&1 && rsync -az --delete dist/ /var/www/atlas/ >> /var/log/atlas-sync.log 2>&1
```

注意：这台机器上要有仓库与 `.env`，且只拉不改。双向区的回写仍在你自己的机器上手动做。

## 迁移到别的机器

- 内容：`git clone` + `npm ci` + `npm run build`，无数据库、无后台。
- 页面：静态文件，任何静态服务器都能托管；`deploy/Caddyfile` 只是其中一种写法。
- 数据：`sync/state.json` 进 git，换机器后同步关系不断。
- 接口：`dist/api/v1/*.json` 是构建产物，任何工具都能直接读；`docs/content-format.md` 是格式规范。
