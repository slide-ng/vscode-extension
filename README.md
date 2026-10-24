<picture>
  <source media="(prefers-color-scheme: dark)" srcset="res/readme-banner-dark.png">
  <img alt="slide.ng" src="res/readme-banner-light.png" width="800">
</picture>

# slide.ng for VS Code

Editor support for [slide.ng](https://github.com/slide-ng/slide.ng) decks: slides written in `slides.md` with Angular template syntax.

**Status: first version, not released.** The parts that do not need an editor are tested by `npm test`. Running inside a real VS Code was not checked (the `@vscode/test-electron` download is blocked in the build environment), so activation, the views, the preview webview and terminal behaviour on Windows and macOS are unverified.

## Features

- **Syntax highlighting** for `slides.md` and translations named like `slides.tr.md` (language `slide-ng`): slide separators, per-slide frontmatter, code fence options, Angular control flow and bindings, `::slot::` lines and `[click]` markers in notes.
- **Slides outline** in the side bar: number, title, layout and estimated click count per slide. Click a slide to jump to it.
- **Dev server** and **preview**: start and stop `slide-ng dev` in a terminal, and preview in a side panel that follows the cursor, or in your browser. The preview follows the deck's `routerMode` (`history`, `hash` or `memory`).
- **Edit slides**: move up or down, new slide below, duplicate.
- **Export** through `slide-ng export`, and a **status bar** item showing the current slide and server state.
- **Language**: the `slide-ng.lang` setting runs the dev server and the export in another language (`--lang`, slide.ng 2.0). For a deck with `languages` (slide.ng 2.1), it picks the language a page starts in and the one Export exports, and the preview also follows the cursor in a translation file: its slide 3 is the deck's slide 3.
- **Config file**: the `routerMode` and `languages` of a deck's `slide-ng.config.yaml` (slide.ng 2.2), next to the deck file, count as in the headmatter; the headmatter wins when a key is in both.

The extension activates when the workspace has a `slides.md`, or when `slide-ng.entry` points to a deck file. It has no copy of the CLI: it runs your project's own `slide-ng` (by default `npx --no-install slide-ng`), so install slide.ng in your project first.

## Install and develop

There is no marketplace release yet. Build a `.vsix` and install it:

```sh
npm ci
npm run package
code --install-extension vscode-extension.vsix
```

Other scripts: `npm run build`, `npm test`, `npm run typecheck`, `npm run format:check`. All commands are in the command palette under `Slide:`; settings are under `slide-ng.*` (entry file, CLI command, dev port, language, preview, outline, export). Both are listed in `package.json`.

## Known limits

- The `slide-ng` language mode replaces Markdown for the deck file, so Markdown-only features (such as the built-in Markdown preview) are not active in it.
- The click count is an estimate from the slide text, and `src:` imports are not followed.
- The preview reads `routerMode` and `languages` from the deck's headmatter and its `slide-ng.config.yaml` (slide.ng 2.2) only; a theme or addon that sets them is not seen.
- With `languages`, the outline and the slide edits work on the entry file only. The preview shows the language chosen in the deck's own language menu, not the file the cursor is in.
- Preview in remote windows (SSH, containers, Codespaces) is not checked.

For the full syntax and the CLI, see the documentation at [slide-ng.dev](https://slide-ng.dev).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Changes follow the [Code of Conduct](CODE_OF_CONDUCT.md); security reports go through [SECURITY.md](SECURITY.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Maintainers

<!-- prettier-ignore-start -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/erkamyaman"><img src="https://avatars.githubusercontent.com/u/88717125?v=4&s=100" width="100px;" alt="Erkam Yaman"/><br /><sub><b>Erkam Yaman</b></sub></a><br /><sub>Maintainer</sub></td>
    </tr>
  </tbody>
</table>
<!-- prettier-ignore-end -->

## Contributors

Thanks to everyone who has helped. This project follows the [all-contributors](https://allcontributors.org) specification. Contributions of any kind welcome!

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/erkamyaman"><img src="https://avatars.githubusercontent.com/u/88717125?v=4?s=100" width="100px;" alt="Erkam Yaman"/><br /><sub><b>Erkam Yaman</b></sub></a><br /><a href="https://github.com/slide-ng/vscode-extension/commits?author=erkamyaman" title="Code">💻</a> <a href="https://github.com/slide-ng/vscode-extension/commits?author=erkamyaman" title="Documentation">📖</a> <a href="#maintenance-erkamyaman" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Sponsors

The slide.ng extension is free and open source. If it helps your work, please consider sponsoring it. Your support keeps development going.

<p>
  <a href="https://github.com/sponsors/erkamyaman"><img src="https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white" alt="Sponsor on GitHub" /></a>
</p>

## License

MIT License © 2026 [Erkam Yaman](https://github.com/erkamyaman) ([LICENSE](LICENSE)). The ideas for the grammar and the outline came from looking at other editor extensions for presentation tools; no code was copied.

## Credits and disclaimer

The extension reads decks with [`@slidev/parser`](https://github.com/slidevjs/slidev) (MIT, Anthony Fu and Slidev contributors); see [NOTICE](NOTICE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for the licence texts of everything bundled.

slide.ng is an independent open-source project. It is not affiliated with or endorsed by the Angular team or Google, or by Slidev. Angular is a trademark of Google LLC. Slidev is a project of its own maintainers; the names are used here only to describe what slide.ng works with. This is a plain notice, not legal advice.
