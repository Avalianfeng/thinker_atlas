# 人物肖像（真图）

把真图放到这里，文件名用人物 slug：

- `wittgenstein.jpg`
- `jung.png`
- `lukacs.webp`

也支持把图放在 `content/thinkers/<slug>/portrait.jpg`（或 `photo.*` / `照片.*`），构建前 `npm run sync:portraits`（已挂在 `predev` / `prebuild`）会复制到本目录。

然后在 `content/thinkers/<slug>/index.mdx` 写：

```yaml
portrait: /portraits/wittgenstein.jpg
```

若 frontmatter 省略 `portrait`，但本目录已有 `<slug>.*`，页面会自动选用。  
**没有真图时**才用字母 SVG 占位——不要把 SVG 当作正式肖像。
