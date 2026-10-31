import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listPeople, readPerson, splitTitle, titleFromFilename, initialOf } from '../src/lib/atlas';

let root;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'atlas-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const write = async (rel, text) => {
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
};

describe('列人物与读一个人', () => {
  it('按 _meta.md 的顺序排，没列到的排在后面', async () => {
    await write('_meta.md', '---\n顺序: [乙, 甲]\n人物:\n  甲: { 生: 1900, 卒: 1980 }\n---\n');
    await write('甲/00-生平.md', '甲的内容');
    await write('乙/00-生平.md', '乙的内容');
    await write('丙/00-生平.md', '丙的内容');

    const people = await listPeople(root);
    expect(people.map((p) => p.folder)).toEqual(['乙', '甲', '丙']);
    expect(people.find((p) => p.folder === '甲').born).toBe(1900);
    expect(people.find((p) => p.folder === '甲').died).toBe(1980);
  });

  it('按文件名数字顺序渲染，跳过下划线开头', async () => {
    await write('某甲/00-生平.md', '一');
    await write('某甲/10-著作-b.md', '二');
    await write('某甲/2-中间.md', '三');
    await write('某甲/_草稿.md', '不该出现');

    const p = await readPerson(root, '某甲');
    expect(p.sections.map((s) => s.file)).toEqual(['00-生平.md', '2-中间.md', '10-著作-b.md']);
  });

  it('中文名与空格组成的文件夹、文件名都能读', async () => {
    await write('路德维希 维特根斯坦/00 生平 概述.md', '# 我的人生\n\n正文');
    const [p] = await listPeople(root);
    expect(p.folder).toBe('路德维希 维特根斯坦');
    expect(p.sections[0].title).toBe('我的人生');
    expect(p.sections[0].body.trim()).toBe('正文');
  });

  it('找不到的文件夹返回 null，不抛错', async () => {
    await write('甲/00-生平.md', 'x');
    expect(await readPerson(root, '不存在')).toBeNull();
  });

  it('空文件夹、空目录都只是返回空列表', async () => {
    await mkdir(path.join(root, '空的'), { recursive: true });
    expect(await listPeople(root)).toEqual([{ folder: '空的', name: '空的', photo: undefined, photoUrl: undefined, sections: [] }]);
    await rm(root, { recursive: true, force: true });
    expect(await listPeople(root)).toEqual([]);
  });

  it('_meta.md 写坏了也不影响列出人物', async () => {
    await write('_meta.md', '---\n顺序: [这: 不是合法yaml\n---\n');
    await write('甲/00-生平.md', 'x');
    const people = await listPeople(root);
    expect(people.map((p) => p.folder)).toEqual(['甲']);
    expect(people[0].born).toBeUndefined();
  });

  it('照片：优先 _meta.md 指定的，其次名字里像肖像的，最后第一张图', async () => {
    await write('甲/00-生平.md', 'x');
    await write('甲/b.jpg', '');
    await write('甲/照片.png', '');
    expect((await readPerson(root, '甲')).photo).toBe('照片.png');

    await write('乙/00-生平.md', 'x');
    await write('乙/a.jpg', '');
    await write('乙/b.jpg', '');
    expect((await readPerson(root, '乙')).photo).toBe('a.jpg');
  });

  it('photoUrl 对中文与空格做编码', async () => {
    await write('某 人/00-生平.md', 'x');
    await write('某 人/我 的照片.jpg', '');
    const p = await readPerson(root, '某 人');
    expect(p.photoUrl).toBe('/atlas/%E6%9F%90%20%E4%BA%BA/%E6%88%91%20%E7%9A%84%E7%85%A7%E7%89%87.jpg');
  });
});

describe('标题来源', () => {
  it('开头的 # 标题优先', () => {
    expect(splitTitle('# 标题甲\n\n正文', '00-x.md')).toEqual({ title: '标题甲', body: '正文' });
  });
  it('其次 frontmatter 的 title', () => {
    expect(splitTitle('---\ntitle: 标题乙\n---\n\n正文', '00-x.md').title).toBe('标题乙');
  });
  it('都没有就用文件名，去掉数字前缀', () => {
    expect(splitTitle('正文', '10-著作-逻辑哲学论.md').title).toBe('著作 逻辑哲学论');
    expect(titleFromFilename('00-生平.md')).toBe('生平');
  });
  it('正文中间的 # 不当标题', () => {
    expect(splitTitle('前言\n\n# 后面的标题', '00-x.md').title).toBe('x');
  });
  it('空的/怪的文件名也不炸', () => {
    expect(titleFromFilename('.md')).toBe('');
    expect(initialOf('')).toBe('·');
  });
});
