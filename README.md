# WeRead Auto Scroll

Read at your own pace. A small Chrome extension that smoothly scrolls [WeChat Reading](https://weread.qq.com/) with **20 speed levels**, keyboard shortcuts, and a movable control panel.

**Version 1.2.0 · No account · No analytics · No external dependencies**

## Install in Chrome

1. Download the ZIP from this repository's **Releases**, or choose **Code → Download ZIP**.
2. Unzip it and keep the folder somewhere permanent.
3. Type `chrome://extensions` in Chrome's address bar and enable **Developer mode**.
4. Click **Load unpacked**. Open the extracted folder and select its **extension** subfolder.
5. Check that **WeRead Auto Scroll 1.2.0** appears, then refresh your WeRead book.

**Select the folder containing `manifest.json`, not the outer folder or ZIP.** If Chrome says “Manifest file is missing or unreadable,” go one level deeper into `extension`.

```text
weread-auto-scroll/
├── README.md
├── LICENSE
└── extension/          ← select THIS folder
    ├── manifest.json
    ├── content.js
    └── scroll-core.js
```

This is an unpacked extension, not a Chrome Web Store listing. It supports desktop Chrome and vertically scrolling WeRead reader pages.

## Quick start

Open a book. The **Auto Scroll** panel appears at the bottom-left and starts paused. Press **Enter** or click **Start**, then choose a comfortable speed. The panel's **How to use** section explains the controls without leaving your book.

| Control | What it does |
| --- | --- |
| **Enter / Return** | Start or pause |
| **1–9** | Choose that speed after a half-second wait |
| **1**, then **5** quickly | Choose speed **15** |
| **2**, then **0** quickly | Choose speed **20** |
| **1**, then **0** quickly | Choose speed **10** |
| **0** alone | Also choose speed **10** |
| **Escape** | Pause and cancel a pending number |
| Slider | Instantly choose any speed from 1–20 |
| Dotted title | Drag the panel |
| **−** / compact speed button | Collapse / expand controls |

### Typing a two-digit speed

Press both digits **within 500 milliseconds**. The panel shows your pending number while waiting. A valid pair applies immediately, without first applying its first digit. If you wait longer, the digits become separate speed choices.

Numbers outside 1–20, such as **25** or **99**, show a hint and keep your existing speed. Changing speed never starts scrolling by itself. Pressing Enter while a digit is pending applies that number, then starts or pauses. Holding a key does not repeat the action.

Shortcuts are inactive in text fields, notes, search inputs, or during input-method composition. Command, Control, Option/Alt, and Shift combinations are untouched. Enter retains its normal action on focused links, sliders, and buttons other than the extension's Start/Pause button. **Click a blank book margin to return keyboard focus to reading.**

## Comfortable reading

- Twenty progressively increasing speeds, from **5 px/second** at level 1 to **200 px/second** at level 20. Default: level 5, about 11 px/second.
- Manual scrolling, clicking outside the panel, selecting text, and leaving the tab/window pause scrolling. Resume explicitly when ready.
- At the chapter bottom, scrolling stops with **Chapter finished.** Open the next chapter yourself.
- Speed and dragged position are saved locally. Reloads and chapter changes always start paused.
- The panel adapts to light/dark page backgrounds; it does not reformat the book.

## Update or remove

Replace the files in the **same folder Chrome originally loaded**, then click **↻ Reload** on this extension at `chrome://extensions` and refresh the book.

If the version stays old, Chrome may be pointing to a different extracted copy. Remove the old extension, load the updated `extension` folder, and refresh the book. Removal may reset saved preferences. Keep the loaded folder on your computer while using the extension.

## Privacy and permissions

The only declared permission is **storage**, for local preferences. The content script is restricted to `https://weread.qq.com/web/reader/*`. It inspects page layout and the chapter header to control scrolling. It does not collect or transmit book text, browsing history, account data, or analytics. There is no backend or external code download.

This is an independent project, not affiliated with Tencent or WeChat Reading. It does not unlock books or bypass access restrictions.

## Troubleshooting

- **No panel:** open a book directly and refresh. Loading the bookshelf alone does not inject the extension.
- **Keyboard does nothing:** verify version 1.2.0, refresh the book, and click a blank margin outside text inputs or controls.
- **Two digits become separate speeds:** type the second digit within half a second.
- **Scrolling paused:** page interaction and tab/window changes intentionally pause it.
- WeRead layout changes or another extension may affect behavior. Include Chrome version, extension version, and reproduction steps in an issue; avoid posting private account information or book text.

## Development and testing

No build step or dependencies are required. With Node.js 18+:

```sh
node --test tests/core.test.cjs
node --check extension/content.js
```

For a local preview, use Python 3:

```sh
python3 tests/serve.py
```

Visit `http://127.0.0.1:8769/web/reader/preview`. The preview uses the delivered scripts with a local-storage stand-in. It does not verify extension installation or live WeRead integration. Stop the server with Ctrl+C.

Tests cover all twenty numeric entries, timeout/cancellation/invalid input, keyboard guards, fractional motion, and scoped permissions. GitHub Actions runs the tests on pushes and pull requests.

## License

MIT. See [LICENSE](LICENSE).
