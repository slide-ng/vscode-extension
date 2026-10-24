# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the extension aims to follow [Semantic Versioning](https://semver.org/) once it is published.

## [Unreleased]

## [0.4.0] - unreleased

Support for slide.ng 2.2. Nothing is published yet.

### Added

- The deck's config file, `slide-ng.config.yaml` (or `.yml`, `.json`) next to the deck file (slide.ng 2.2): its `routerMode` and `languages` count for the preview and the translation files, under the headmatter key by key, as slide.ng reads them. Saving, adding or removing the file reloads the deck.

## [0.3.0] - unreleased

Support for slide.ng 2.1. Nothing is published yet.

### Added

- Translation files of a deck with `languages` in its headmatter (slide.ng 2.1): the cursor in a listed file, such as `slides.tr.md`, moves the preview, the outline and the status bar to the slide with the same number, as the deck pairs them by number.
- Highlighting for files named `slides.*.md` (such as `slides.tr.md`), the name the slide.ng docs give translations.

### Changed

- The `slide-ng.lang` description says what `--lang` does with `languages`: it picks the language a page starts in and the one Export exports.

## [0.2.0] - unreleased

Support for slide.ng 2.0. Nothing is published yet.

### Added

- The `slide-ng.lang` setting: the dev server and the Export command run with `--lang <tag>` (slide.ng 2.0), so one deck can be shown in several languages. Only a language tag such as `tr` or `pt-BR` reaches the command line, and the setting is off in an untrusted workspace.
- Highlighting for slide.ng 2.0 code titles and snippets: an icon in a title (`[npm ~i-carbon:terminal~]`) and the language after a `<<<` path (`<<< ./a.py python [a.py] {2}`).

### Changed

- The preview and Open Preview in Browser follow the headmatter's `routerMode`: `/#/3` for `hash`, and for `memory` (new in slide.ng 2.0) an address the deck reads when it loads. Before, a `hash` deck always showed slide 1 in the preview.
- The click estimate follows slide.ng 2.0: `slide-ng-click-hide="3"` hides at click 3, `slide-ng-click="2" slide-ng-click-hide="3"` takes 3 clicks, `.hide` and the click animation presets (`slide-ng-click.fade.right`, `[slide-ng-click.up]`) count like the plain attribute, `slide-ng-click="[2, 4]"` is a range, and an absolute click (`"3"`) no longer moves the counter that bare and `+n` clicks count from.
- The repository is now `slide-ng/vscode-extension` (it was `slide-ng/slide.ng-vscode`); links point to the new name.
- The click estimate follows slide.ng's `<slide-ng-clicks>` rule: each item of a single list, each body row of a single table, otherwise each block, and a fractional `every` (`every="0.5"` gives each item two clicks).

### Fixed

- The `slide-ng.cli.command` description names the CLI's real path, `node node_modules/@slide-ng/core/bin/slide-ng.mjs`.
- Code options right after the line ranges, with no space (`{2}{lines:true}`), no longer colour the rest of the slide as options.

## [0.1.0] - unreleased

The first version. Nothing is published yet.

### Added

- Language `slide-ng` for `slides.md`: slide separators, per-slide frontmatter (YAML), code fence options (`{monaco}`, `{2,3|5|all}`, `[title.ts]`, `{lines:true}`), `<<<` snippet imports, `::slot::` lines, Angular `@if` / `@for` / `@switch` / `@let` lines, `{{ }}`, bindings, events, `#refs`, `*directives`, `slide-ng-click` family, `[click]` markers in notes.
- Slides outline: number, title, layout, estimated clicks, read with `@slidev/parser`.
- Commands: start and stop the dev server in a terminal, open the preview in a side panel or the browser, go to slide, move up and down, new slide below, duplicate, export.
- Status bar item with the current slide and the server state.
- Settings for the entry file, CLI command, port, preview behaviour and export.
- Repository files for open source hosting: contribution guide, code of conduct, security policy, issue and pull request templates, a commit message check, git hooks and a CI workflow.

[Unreleased]: https://github.com/slide-ng/vscode-extension/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/slide-ng/vscode-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/slide-ng/vscode-extension/commits/main
