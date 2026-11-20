# local-assets (not committed)

Put your own artwork here to make the TV overlay match the real broadcast exactly.
Everything in this folder except this README is git-ignored, so official logos and fonts never end up
in the public repository. The overlay picks the files up automatically (reload the overlay or toggle 📺 TV).

| File | Used for |
|---|---|
| `logo.svg` / `logo.png` / `logo.webp` | tower header logo (replaces the built-in mark) |
| `fonts/*.woff2` / `*.woff` / `*.ttf` / `*.otf` | overlay font. Weight is read from the file name: `…Regular…` 400, `…Bold…` 700, `…Wide…` 800, `…Black…` 900; `…Italic…` = italic |
| `teams/<team>.svg` / `.png` / `.webp` | team mark in the tower. `<team>` = `mercedes`, `ferrari`, `redbull`, `williams`, `astonmartin`, `alpine`, `racingbulls`, `haas`, `mclaren`, `sauber`, `audi`, `cadillac` |

Use only files you are allowed to use (personal use). Without them the overlay falls back to the
built-in marks and the open **Saira** font (Google Fonts, SIL OFL) at 118 % width — the closest free match to the broadcast type.
