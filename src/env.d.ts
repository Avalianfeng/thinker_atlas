/// <reference types="astro/client" />

// Pagefind 的索引在构建后才生成，这里给它一个最小声明，避免类型检查报找不到模块。
declare module '/pagefind/pagefind.js' {
  const pagefind: {
    options(opts: Record<string, unknown>): Promise<void>;
    init(): Promise<void>;
    search(q: string): Promise<{ results: { data(): Promise<any> }[] }>;
  };
  export default pagefind;
}
