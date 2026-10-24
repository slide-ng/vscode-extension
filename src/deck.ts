// The deck of the workspace: which file it is, its parsed slides, and which slide the cursor is on.
// Everything else (outline, status bar, preview, commands) asks this class.
import { existsSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import * as vscode from 'vscode';
import { settings } from './config.ts';
import { slideAtLine } from './edit.ts';
import { deckOptions, resolveEntry, translationFiles } from './entry.ts';
import { buildOutline, type OutlineItem } from './outline.ts';
import { parseSlides, type SlideSource } from './parser.ts';
import { routerModeOf, type RouterMode } from './preview-url.ts';

export class Deck implements vscode.Disposable {
  /** The deck file, when the workspace has one. */
  entry?: vscode.Uri;
  folder?: vscode.WorkspaceFolder;
  /** Why the `slide-ng.entry` setting was not used. */
  problem?: string;
  slides: SlideSource[] = [];
  items: OutlineItem[] = [];
  /** Set when the file could not be read as slides. */
  error?: string;
  current = 1;
  /** The headmatter over the deck's `slide-ng.config.yaml`, if it has one (slide.ng 2.2). */
  options: Record<string, unknown> = {};
  /** The translation files the deck's `languages` lists (slide.ng 2.1). Their slides are paired with ours by number. */
  translations: vscode.Uri[] = [];
  private translated?: { uri: string; version: number; slides: SlideSource[] };

  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;
  private readonly currentChanged = new vscode.EventEmitter<number>();
  readonly onDidChangeCurrent = this.currentChanged.event;
  private readonly disposables: vscode.Disposable[] = [];
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    const configWatcher = vscode.workspace.createFileSystemWatcher('**/slide-ng.config.{yaml,yml,json}');
    const configChanged = (uri: vscode.Uri) => this.isConfig(uri) && this.schedule();
    this.disposables.push(
      this.changed,
      this.currentChanged,
      watcher,
      configWatcher,
      configWatcher.onDidCreate(configChanged),
      configWatcher.onDidDelete(configChanged),
      configWatcher.onDidChange(configChanged),
      watcher.onDidCreate(() => void this.detect()),
      watcher.onDidDelete(() => void this.detect()),
      watcher.onDidChange((uri) => this.isEntry(uri) && this.schedule()),
      vscode.workspace.onDidChangeTextDocument((e) => this.isEntry(e.document.uri) && this.schedule()),
      vscode.workspace.onDidChangeWorkspaceFolders(() => void this.detect()),
      vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('slide-ng') && void this.detect()),
      vscode.window.onDidChangeActiveTextEditor(() => this.updateCurrent()),
      vscode.window.onDidChangeTextEditorSelection(
        (e) =>
          (this.isEntry(e.textEditor.document.uri) || this.isTranslation(e.textEditor.document.uri)) &&
          this.updateCurrent(),
      ),
    );
  }

  get isDeck(): boolean {
    return this.entry !== undefined;
  }

  /** The deck's `routerMode` (headmatter or config file): how the dev server puts the slide in the address. */
  get routerMode(): RouterMode {
    return routerModeOf(this.options);
  }

  private isEntry(uri: vscode.Uri) {
    return this.entry !== undefined && uri.toString() === this.entry.toString();
  }

  /** A config file in the folder of the deck file (slide.ng reads it only there). */
  private isConfig(uri: vscode.Uri) {
    return this.entry !== undefined && dirname(uri.fsPath) === dirname(this.entry.fsPath);
  }

  private isTranslation(uri: vscode.Uri) {
    return this.translations.some((t) => t.toString() === uri.toString());
  }

  /** Finds the deck file again (workspace or settings changed) and reads it. */
  async detect(): Promise<void> {
    const found = this.find();
    this.entry = found?.uri;
    this.folder = found?.folder;
    this.problem = found?.problem;
    await vscode.commands.executeCommand('setContext', 'slide-ng.isDeck', this.isDeck);
    await this.reload();
  }

  // The folder of the active editor first, then the others. A refused setting is remembered to tell the user.
  private find(): { uri?: vscode.Uri; folder?: vscode.WorkspaceFolder; problem?: string } | undefined {
    const folders = [...(vscode.workspace.workspaceFolders ?? [])];
    const active =
      vscode.window.activeTextEditor &&
      vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
    if (active) folders.sort((a, b) => Number(b === active) - Number(a === active));
    let problem: string | undefined;
    for (const folder of folders) {
      if (folder.uri.scheme !== 'file') continue; // the CLI needs a real folder
      const result = resolveEntry(folder.uri.fsPath, settings.entry(folder.uri), existsSync);
      if (result.path) return { uri: vscode.Uri.file(result.path), folder };
      problem ??= result.problem;
    }
    return problem ? { problem } : undefined;
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.reload(), 250);
  }

  async reload(): Promise<void> {
    if (!this.entry) {
      this.slides = [];
      this.items = [];
      this.options = {};
      this.translations = [];
      this.error = undefined;
    } else {
      try {
        const doc = await vscode.workspace.openTextDocument(this.entry);
        this.slides = await parseSlides(doc.getText(), doc.fileName);
        this.items = buildOutline(this.slides);
        this.options = deckOptions(this.slides[0]?.frontmatter, this.entry.fsPath, existsSync, (p) =>
          readFileSync(p, 'utf8'),
        );
        this.translations = translationFiles(this.options, this.entry.fsPath).map((p) => vscode.Uri.file(p));
        this.error = undefined;
      } catch (e) {
        // Keep the last good outline; say what went wrong.
        this.error = e instanceof Error ? e.message : String(e);
      }
    }
    this.changed.fire();
    this.updateCurrent();
  }

  /**
   * The slide under the cursor, when the deck file or one of its translations is the active editor; otherwise the last
   * one. A translation's slide n is the deck's slide n.
   */
  private updateCurrent() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !this.slides.length) return;
    const doc = editor.document;
    const line = editor.selection.active.line;
    if (this.isEntry(doc.uri)) return this.setCurrent(slideAtLine(this.slides, line));
    if (!this.isTranslation(doc.uri)) return;
    void this.translationSlides(doc).then((slides) => {
      if (slides.length && vscode.window.activeTextEditor?.document === doc)
        this.setCurrent(Math.min(slideAtLine(slides, line), this.slides.length));
    });
  }

  /** The slides of a translation file, read again when its text changed. A file that cannot be read has none. */
  private async translationSlides(doc: vscode.TextDocument): Promise<SlideSource[]> {
    const uri = doc.uri.toString();
    if (this.translated?.uri === uri && this.translated.version === doc.version) return this.translated.slides;
    let slides: SlideSource[] = [];
    try {
      slides = await parseSlides(doc.getText(), doc.fileName);
    } catch {
      // The CLI reports what is wrong with the file.
    }
    this.translated = { uri, version: doc.version, slides };
    return slides;
  }

  private setCurrent(now: number) {
    if (now !== this.current) {
      this.current = now;
      this.currentChanged.fire(now);
    }
  }

  dispose() {
    clearTimeout(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }
}
