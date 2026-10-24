// Which markdown file is the deck, and its config file. No VS Code API here: `exists` and `read` are passed in, so the
// rules can be tested.
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';

export const DEFAULT_ENTRY = 'slides.md';

export interface EntryResult {
  /** Absolute path of the deck file, when there is one. */
  path?: string;
  /** Why there is none, or why the setting was refused. */
  problem?: string;
}

/**
 * `setting` is `slide-ng.entry` (empty = look for slides.md). A setting must stay inside the workspace folder and end in
 * .md; the file must exist. With no setting, a deck is a folder that has a slides.md.
 */
export function resolveEntry(
  folder: string,
  setting: string | undefined,
  exists: (path: string) => boolean,
): EntryResult {
  const wanted = (setting ?? '').trim();
  if (!wanted) {
    const path = join(folder, DEFAULT_ENTRY);
    return exists(path) ? { path } : {};
  }
  const path = resolve(folder, wanted);
  const rel = relative(folder, path);
  if (isAbsolute(wanted) || rel.startsWith('..') || isAbsolute(rel))
    return { problem: `slide-ng.entry "${wanted}" is outside the workspace folder.` };
  if (!path.toLowerCase().endsWith('.md')) return { problem: `slide-ng.entry "${wanted}" is not a .md file.` };
  return exists(path) ? { path } : { problem: `slide-ng.entry "${wanted}" does not exist.` };
}

/**
 * The translation files of a deck with `languages: { en: slides.md, tr: slides.tr.md }` in its headmatter (slide.ng 2.1):
 * absolute paths of the `.md` files other than the entry file, relative to its folder. Slides are paired with the entry
 * file's by number. Anything else in `languages` is left to the CLI to report.
 */
export function translationFiles(headmatter: Record<string, unknown> | undefined, entry: string): string[] {
  const languages = headmatter?.languages;
  if (!languages || typeof languages !== 'object' || Array.isArray(languages)) return [];
  const files = new Set<string>();
  for (const name of Object.values(languages)) {
    if (typeof name !== 'string' || !/\.md$/i.test(name.trim())) continue;
    const path = resolve(dirname(entry), name.trim());
    if (path !== resolve(entry)) files.add(path);
  }
  return [...files];
}

/** The names of the deck's config file (slide.ng 2.2), in the order slide.ng looks for them. */
export const CONFIG_FILES = ['slide-ng.config.yaml', 'slide-ng.config.yml', 'slide-ng.config.json'];

/** The deck's config file: the first of CONFIG_FILES in the entry file's folder, or undefined when there is none. */
export function configFile(entry: string, exists: (path: string) => boolean): string | undefined {
  return CONFIG_FILES.map((name) => join(dirname(entry), name)).find(exists);
}

/**
 * The deck's options: the keys of its config file under its headmatter, key by key, as slide.ng 2.2 reads them. `read`
 * gives the text of a file. A config file that cannot be read or is not a map of keys counts as empty: the CLI reports it.
 */
export function deckOptions(
  headmatter: Record<string, unknown> | undefined,
  entry: string,
  exists: (path: string) => boolean,
  read: (path: string) => string,
): Record<string, unknown> {
  const file = configFile(entry, exists);
  let config: unknown;
  if (file) {
    try {
      const text = read(file);
      config = file.endsWith('.json') ? JSON.parse(text) : parse(text);
    } catch {
      config = undefined;
    }
  }
  const keys = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  return { ...keys, ...headmatter };
}
