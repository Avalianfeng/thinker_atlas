# 肖像目录

运行时由 `npm run sync:portraits`（`predev` / `prebuild`）从 `content/people/<id>/portrait.*`（也认 `photo.*` / `照片.*`）复制到这里：`public/portraits/<id>.<ext>`。

也可直接把真图放到本目录。人物卡 frontmatter 写 `portrait: ./portrait.jpg` 或 `/portraits/<id>.jpg`。

正文相对图会复制到 `public/people/<id>/`。

**无真图时**页面才用字母 SVG 占位——不要把 SVG 当正式肖像。
