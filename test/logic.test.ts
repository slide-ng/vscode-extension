// Tests for the helpers that need no editor: clicks, outline, command lines, entry rules, status text, server probe.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateClicks } from '../src/clicks.ts';
import { configFile, deckOptions, resolveEntry, translationFiles } from '../src/entry.ts';
import { buildOutline, describe } from '../src/outline.ts';
import { parseSlides } from '../src/parser.ts';
import { isSlideNg, probe } from '../src/probe.ts';
import { previewUrl, routerModeOf } from '../src/preview-url.ts';
import { commandLine, exportOptions, langOption, pathArg, portOption } from '../src/shell.ts';
import { statusText } from '../src/status-text.ts';

const deck = readFileSync(new URL('./fixtures/deck.md', import.meta.url), 'utf8');

test('clicks: slide-ng-click forms', () => {
  assert.equal(estimateClicks('<div slide-ng-click>a</div>\n<div slide-ng-click>b</div>').count, 2);
  assert.equal(estimateClicks('<div slide-ng-click="5">a</div>').count, 5);
  assert.equal(estimateClicks('<div slide-ng-click>a</div>\n<div slide-ng-click="+2">b</div>').count, 3);
  assert.equal(estimateClicks('<div [slide-ng-click]="[2, 4]">a</div>').count, 4);
  assert.equal(estimateClicks('<div slide-ng-click>a</div>\n<div slide-ng-after>b</div>').count, 1);
  assert.equal(estimateClicks('<div slide-ng-click="2" slide-ng-click-hide>a</div>').count, 2);
  assert.equal(estimateClicks('<slide-ng-click-gap size="2" />\n<div slide-ng-click>a</div>').count, 3);
  assert.equal(estimateClicks('# No clicks\n\ntext').count, 0);
});

test('clicks: hide, ranges as text and presets (2.0)', () => {
  const clicks = (text: string) => estimateClicks(text).count;
  // `slide-ng-click-hide="3"` hides at click 3; with a show click, the hide click is the last one
  assert.equal(clicks('<div slide-ng-click-hide="3">a</div>'), 3);
  assert.equal(clicks('<div slide-ng-click-hide>a</div>'), 1);
  assert.equal(clicks('<div slide-ng-click="2" slide-ng-click-hide="3">a</div>'), 3);
  assert.equal(clicks('<div slide-ng-click="+1" slide-ng-click-hide="+1">a</div>\n<div slide-ng-click>b</div>'), 3);
  // `.hide` is the hide flag, so the click counts
  assert.equal(clicks('<div slide-ng-click.hide>a</div>'), 1);
  assert.equal(clicks('<div slide-ng-click.hide="2">a</div>'), 2);
  assert.equal(clicks('<div slide-ng-click>a</div>\n<div slide-ng-after.hide>b</div>'), 1);
  // a range written as text, with presets, and bound with presets
  assert.equal(clicks('<div slide-ng-click="[2, 4]">a</div>'), 4);
  assert.equal(clicks('<div slide-ng-click.up="[2, 4]">a</div>'), 4);
  assert.equal(clicks('<div [slide-ng-click.up]="[2, 4]">a</div>'), 4);
  // presets do not change the count
  assert.equal(clicks('<div slide-ng-click.fade.right>a</div>\n<div slide-ng-click.scale="+2">b</div>'), 3);
  assert.equal(clicks('<div slide-ng-click.fade.right="3">a</div>'), 3);
  // an absolute click does not move the counter that bare and +n clicks count from
  assert.equal(clicks('<div slide-ng-click="3">a</div>\n<div slide-ng-click>b</div>'), 3);
  assert.equal(
    clicks('<div slide-ng-click="2">a</div>\n<div slide-ng-click="+2">b</div>\n<div slide-ng-click>c</div>'),
    3,
  );
  // values that never show
  assert.equal(clicks('<div slide-ng-click="abc">a</div>'), 0);
  assert.equal(clicks('<div slide-ng-click="false">a</div>'), 0);
  assert.equal(clicks('<div [slide-ng-click]="computed()">a</div>'), 0);
});

test('clicks: <slide-ng-clicks> lists', () => {
  const list = '<slide-ng-clicks>\n\n- a\n- b\n  - nested\n- c\n\n</slide-ng-clicks>';
  assert.equal(estimateClicks(list).count, 3);
  assert.equal(estimateClicks(list.replace('<slide-ng-clicks>', '<slide-ng-clicks depth="2">')).count, 4);
  assert.equal(estimateClicks(list.replace('<slide-ng-clicks>', '<slide-ng-clicks every="2">')).count, 2);
});

test('clicks: <slide-ng-clicks> tables and other children', () => {
  const table = '<slide-ng-clicks>\n\n| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n\n</slide-ng-clicks>';
  assert.equal(estimateClicks(table).count, 2);
  const bare = '<slide-ng-clicks>\n\na | b\n--- | ---\n1 | 2\n| | |\n\n</slide-ng-clicks>';
  assert.equal(estimateClicks(bare).count, 2);
  const blocks = '<slide-ng-clicks>\n\nOne paragraph.\n\n![a picture](/a.png)\n\n- a\n- b\n\n</slide-ng-clicks>';
  assert.equal(estimateClicks(blocks).count, 3);
  const list = '<slide-ng-clicks every="0.5">\n\n- a\n- b\n- c\n\n</slide-ng-clicks>';
  assert.equal(estimateClicks(list).count, 6);
});

test('clicks: code ranges count, code text does not', () => {
  assert.equal(estimateClicks('```ts {1|3-4|all}\nconst a = 1;\n```').count, 2);
  assert.equal(estimateClicks('```html\n<div slide-ng-click>not markup</div>\n```').count, 0);
  assert.equal(estimateClicks('```ts {lines:true}\nx\n```').count, 0);
  assert.equal(estimateClicks('```ts {1|2}\nx\n```\n\n<div slide-ng-click>a</div>').count, 2);
});

test('clicks: frontmatter clicks wins and is exact', () => {
  assert.deepEqual(estimateClicks('<div slide-ng-click>a</div>', { clicks: 7 }), { count: 7, fixed: true });
  assert.deepEqual(estimateClicks('<div slide-ng-click>a</div>', { clicks: 'x' }), { count: 1, fixed: false });
});

test('outline of the fixture deck', async () => {
  const outline = buildOutline(await parseSlides(deck, '/deck/slides.md'));
  assert.deepEqual(
    outline.map((o) => [o.no, o.title, o.layout, o.clicks]),
    [
      [1, 'Demo deck', 'cover', 0],
      [2, 'Plain slide', 'default', 0],
      [3, 'Centered', 'center', 5],
      [4, 'import ./pages/intro.md', 'default', 0],
      [5, 'Two columns', 'two-cols', 0],
      [6, 'Hidden one', 'default', 0],
      [7, 'Fixed clicks', 'default', 7],
    ],
  );
  assert.equal(outline[3].src, './pages/intro.md');
  assert.equal(outline[5].hidden, true);
  assert.equal(outline[6].clicksFixed, true);
  assert.equal(outline[1].hasNote, true);
  // `line` is where the editor jumps to: the first line of content
  const lines = deck.split('\n');
  assert.equal(lines[outline[2].line], '# Centered');
  assert.equal(lines[outline[1].line], '# Plain slide');
  assert.equal(lines[outline[3].line], '---'); // no text: the slide's own first line
});

test('outline: titles lose HTML, empty slides get a number, a bad YAML block does not stop the outline', async () => {
  const outline = buildOutline(
    await parseSlides('# One <b>bold</b>\n\n---\n\n---\nlayout: [oops\n---\n\ntext\n', '/d/slides.md'),
  );
  assert.equal(outline[0].title, 'One bold');
  assert.equal(outline[1].title, 'Slide 2');
  assert.equal(outline.length, 3);
});

test('outline: describe', async () => {
  const outline = buildOutline(await parseSlides(deck, '/deck/slides.md'));
  assert.equal(describe(outline[2]), 'center · ~5 clicks');
  assert.equal(describe(outline[6]), 'default · 7 clicks');
  assert.equal(describe(outline[5]), 'default · hidden');
  assert.equal(describe(outline[2], false), 'center');
});

test('command lines: quoting and refusal', () => {
  assert.equal(
    commandLine('npx --no-install slide-ng', 'dev', 'slides.md', portOption(4230)),
    'npx --no-install slide-ng dev "slides.md" --port 4230',
  );
  assert.equal(pathArg('talks\\my deck/slides.md'), '"talks/my deck/slides.md"');
  for (const bad of ['a";rm -rf ~;"', 'a$(x).md', 'a`x`.md', '../x.md', 'a&b.md', "a'b.md", '%PATH%.md'])
    assert.throws(() => pathArg(bad), /cannot be passed/, bad);
  assert.deepEqual(exportOptions('pdf', true), ['--format', 'pdf', '--with-clicks']);
  assert.deepEqual(exportOptions('png', false), ['--format', 'png']);
  assert.throws(() => exportOptions('exe; calc', false));
  assert.deepEqual(langOption(''), []);
  assert.deepEqual(langOption(' tr '), ['--lang', 'tr']);
  assert.deepEqual(langOption('pt-BR'), ['--lang', 'pt-BR']);
  assert.deepEqual(langOption('pt_br'), ['--lang', 'pt_br']);
  for (const bad of ['en;calc', 'en us', '$(x)', 'e', '"tr"'])
    assert.throws(() => langOption(bad), /language tag/, bad);
  assert.throws(() => portOption(70000));
  assert.throws(() => portOption(1.5));
});

test('entry: default, setting, confinement', () => {
  const have =
    (...files: string[]) =>
    (p: string) =>
      files.includes(p);
  assert.deepEqual(resolveEntry('/w', '', have('/w/slides.md')), { path: '/w/slides.md' });
  assert.deepEqual(resolveEntry('/w', undefined, have()), {});
  assert.deepEqual(resolveEntry('/w', 'talks/a.md', have('/w/talks/a.md')), { path: '/w/talks/a.md' });
  assert.match(resolveEntry('/w', 'talks/a.md', have()).problem!, /does not exist/);
  assert.match(resolveEntry('/w', '../x.md', have('/x.md')).problem!, /outside/);
  assert.match(resolveEntry('/w', '/etc/x.md', have('/etc/x.md')).problem!, /outside/);
  assert.match(resolveEntry('/w', 'a.txt', have('/w/a.txt')).problem!, /not a \.md/);
});

test('translations: the other files of languages (2.1)', async () => {
  const head = async (text: string) => (await parseSlides(`---\n${text}\n---\n\n# A\n`, '/w/slides.md'))[0].frontmatter;
  assert.deepEqual(translationFiles(await head('languages:\n  en: slides.md\n  tr: slides.tr.md'), '/w/slides.md'), [
    '/w/slides.tr.md',
  ]);
  assert.deepEqual(
    translationFiles(await head('languages: { en: ./slides.md, de: de/slides.md, fr: notes.txt }'), '/w/slides.md'),
    ['/w/de/slides.md'],
  );
  assert.deepEqual(translationFiles(await head('title: x'), '/w/slides.md'), []);
  assert.deepEqual(translationFiles(await head('languages: [slides.tr.md]'), '/w/slides.md'), []);
  assert.deepEqual(translationFiles(undefined, '/w/slides.md'), []);
});

test('config file: slide-ng.config.yaml under the headmatter (2.2)', async () => {
  const files: Record<string, string> = {};
  const exists = (p: string) => p in files;
  const read = (p: string) => {
    if (!(p in files)) throw new Error(`no ${p}`);
    return files[p];
  };
  const head = async (text: string) => (await parseSlides(`---\n${text}\n---\n\n# A\n`, '/w/slides.md'))[0].frontmatter;
  // No file: the headmatter alone.
  assert.equal(configFile('/w/slides.md', exists), undefined);
  assert.equal(deckOptions(await head('routerMode: hash'), '/w/slides.md', exists, read).routerMode, 'hash');
  // The config file's keys count, and the headmatter wins key by key.
  files['/w/slide-ng.config.yaml'] = 'routerMode: memory\nlanguages:\n  en: slides.md\n  tr: slides.tr.md\n';
  assert.equal(configFile('/w/slides.md', exists), '/w/slide-ng.config.yaml');
  const options = deckOptions(await head('title: x'), '/w/slides.md', exists, read);
  assert.equal(routerModeOf(options), 'memory');
  assert.deepEqual(translationFiles(options, '/w/slides.md'), ['/w/slides.tr.md']);
  assert.equal(routerModeOf(deckOptions(await head('routerMode: hash'), '/w/slides.md', exists, read)), 'hash');
  assert.deepEqual(
    translationFiles(
      deckOptions(await head('languages: { en: slides.md, de: slides.de.md }'), '/w/slides.md', exists, read),
      '/w/slides.md',
    ),
    ['/w/slides.de.md'],
  );
  // .yaml comes before .yml and .json; only the entry file's folder is looked in.
  files['/w/slide-ng.config.json'] = '{ "routerMode": "hash" }';
  assert.equal(configFile('/w/slides.md', exists), '/w/slide-ng.config.yaml');
  delete files['/w/slide-ng.config.yaml'];
  assert.equal(routerModeOf(deckOptions(await head('title: x'), '/w/slides.md', exists, read)), 'hash');
  assert.equal(configFile('/w/talk/slides.md', exists), undefined);
  // A file that is not valid, or not a map of keys, counts as empty (the CLI reports it).
  files['/w/slide-ng.config.json'] = '{ routerMode: hash';
  assert.equal(routerModeOf(deckOptions(await head('title: x'), '/w/slides.md', exists, read)), 'history');
  delete files['/w/slide-ng.config.json'];
  files['/w/slide-ng.config.yml'] = '- routerMode: hash\n';
  assert.equal(routerModeOf(deckOptions(await head('title: x'), '/w/slides.md', exists, read)), 'history');
  assert.deepEqual(deckOptions(undefined, '/w/slides.md', exists, read), {});
});

test('status text', () => {
  assert.equal(statusText({ state: 'running', port: 4230, current: 3, total: 12 }), '$(broadcast) slide.ng :4230 3/12');
  assert.equal(statusText({ state: 'stopped', port: 4230 }), '$(circle-outline) slide.ng');
  assert.equal(
    statusText({ state: 'starting', port: 4230, current: 1, total: 2 }),
    '$(sync~spin) slide.ng starting 1/2',
  );
  assert.equal(statusText({ state: 'busy', port: 4300 }), '$(warning) slide.ng port 4300 in use');
  assert.equal(previewUrl(4230, 7), 'http://localhost:4230/7');
  assert.equal(previewUrl(4230, 0), 'http://localhost:4230/1');
});

test('preview addresses follow routerMode', async () => {
  assert.equal(previewUrl(4230, 3, 'history'), 'http://localhost:4230/3');
  assert.equal(previewUrl(4230, 3, 'hash'), 'http://localhost:4230/#/3');
  // memory reads #/<n> once at load, so each slide is its own address (the query) and the page loads again
  assert.equal(previewUrl(4230, 3, 'memory'), 'http://localhost:4230/?slide=3#/3');
  const mode = async (headmatter: string) =>
    routerModeOf(
      (await parseSlides(`---\n${headmatter}\n---\n\n# One\n\n---\n\n# Two\n`, '/d/slides.md'))[0].frontmatter,
    );
  assert.equal(await mode('routerMode: memory'), 'memory');
  assert.equal(await mode('routerMode: hash'), 'hash');
  assert.equal(await mode('title: x'), 'history');
  assert.equal(await mode('routerMode: other'), 'history');
});

test('probe: what counts as a slide.ng server', async () => {
  assert.equal(isSlideNg(200, '{"token":"abc","remote":false}'), true);
  assert.equal(isSlideNg(401, '{"error":"password required"}'), true);
  assert.equal(isSlideNg(200, '<html>hello</html>'), false);
  assert.equal(isSlideNg(404, '{"error":"not found"}'), false);
  assert.equal(isSlideNg(200, '{"token":1}'), false);
});

test('probe: against small local servers', async () => {
  const listen = (handler: Parameters<typeof createServer>[1]) =>
    new Promise<{ port: number; close: () => void }>((ok) => {
      const s = createServer(handler).listen(0, '127.0.0.1', () =>
        ok({ port: (s.address() as { port: number }).port, close: () => s.close() }),
      );
    });
  const real = await listen((req, res) => {
    assert.equal(req.url, '/__slide-ng/session');
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"token":"t","remote":false}');
  });
  const other = await listen((_req, res) => res.writeHead(200).end('hello'));
  assert.equal(await probe(real.port), 'slide-ng');
  assert.equal(await probe(other.port), 'other');
  real.close();
  other.close();
  assert.equal(await probe(real.port), 'down');
});
