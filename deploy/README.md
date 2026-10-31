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
3. `npm run publish` = `build` + `deploy`。

Atlas **独立运行**：展馆真源是 git `content/`，部署机不需要 SilverBullet。

## 两个凭据是分开的

| 用途 | 位置 | 轮换方式 |
| --- | --- | --- |
| 网页 basic auth | Caddyfile 里的 bcrypt 哈希 | `caddy hash-password` 生成新哈希，改配置，`systemctl reload caddy` |
| 只读 API Bearer | Caddyfile 里的 `<API_TOKEN>` | 换 token，同时改调用方，reload |

二者互不影响。

## 迁移到别的机器

- 内容：`git clone` + `npm ci` + `npm run build`，无数据库、无后台。
- 页面：静态文件，任何静态服务器都能托管；`deploy/Caddyfile` 只是其中一种写法。
- 接口：`dist/api/v1/*.json` 是构建产物；`docs/content-format.md` 是格式规范；`docs/independence.md` 是独立运行合同。
