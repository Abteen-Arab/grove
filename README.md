# Grove

A phone-first wellness prototype where movement grows woodland, rest fills a meadow, and screen balance brings life to a pond. A varied habitat welcomes wildlife. Grove uses original SVG artwork, runs in a browser, and has no third-party runtime dependencies.

[Open Grove](https://abteen-arab.github.io/grove/) · [Design schematic](https://abteen-arab.github.io/grove/schematic.html)

## Try it

- **Grove** shows three habits and their shared habitat. Watch trees, flowers, fish, and animals appear as the landscape changes.
- **Demo device sync** runs a 30-second sample day. Simulated wearable and screen feeds update automatically; the final stage meets all three goals. Replay it from Sources.
- **Track** times a walk, rest, or focus session. Start, pause, resume, and finish. The app measures elapsed time; it does not estimate steps or detect sleep.
- **Data sources** switches between the simulated day and your timed sessions. Each mode keeps its own values and goals.
- **Wildlife** explains what each species needs. Discovered species stay in the guide; visitors in the landscape reflect the current habitat.
- **Trends** shows each habit separately. In Demo sync, a friendly challenge compares improvement against personal goals using sample peers.
- **Settings** changes goals, counted demo apps, or source mode. Reset restores the prototype after confirmation.

There are no forms for entering habit amounts. The demo feed supplies sample values; timed sessions supply actual elapsed minutes. Goal settings remain editable.

## What is tracked

| Source | Movement | Rest | Screen balance |
| --- | --- | --- | --- |
| Demo sources | Simulated steps | Simulated sleep minutes | Simulated app usage, with productive apps excluded |
| Timed sessions | Walk minutes | Rest minutes | Focus minutes |

Session minutes are activity timers, not verified exercise, sleep, or phone-wide usage. The browser does not connect to a wearable, read other apps, or block them. The source label stays visible so sample data and elapsed time remain distinct. No health data is sent to a server.

## Habitat and discoveries

Movement supports woodland plants. Rest supports meadow flowers and small animals. Screen balance supports the pond, lilies, and fish. Fox, deer, heron, and otter need a mix of habitats. The biodiversity score follows the least-developed habitat, encouraging all three habits to grow together.

The landscape responds to current progress. The wildlife guide remembers every discovery. Discoveries survive source changes and later days; a visitor can return when its habitat conditions are met again.

## Run locally

Double-click **Open Grove.command**, or run this from the project folder:

```sh
python3 start.py
```

Open **http://localhost:5173**. The app fills a phone viewport and uses a phone-sized preview on desktop. Open **http://localhost:5173/schematic.html** for the screen map. Stop the server with Ctrl+C. To use another port: `python3 start.py --port 5174`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes changes to `main`. It packages only the web app, illustrations, and schematic. Local launchers, tests, and project notes stay outside the deployed site.

To inspect the deployment package locally:

```sh
python3 scripts/build_site.py
python3 -m http.server 5174 --bind 127.0.0.1 --directory _site
```

In GitHub, choose **Settings → Pages → Source → GitHub Actions**. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Implementation

Browser localStorage (`grove-local-v1`) stores source preferences, goals, sessions, discoveries, and challenge participation. The version 2 model migrates the earlier prototype state. A session uses timestamps and persisted pause state to recover across reloads. Its countdown target is fixed when it starts; later daily-goal edits apply without shortening that timer. Elapsed minutes remain separate from simulated steps, sleep, and app usage. See [design notes](docs/design.md) for the model and screen flow.

The optional developer tests use QuickJS:

```sh
python3 -m pip install quickjs
python3 -m unittest discover -s tests -v
```

The 31 model checks cover habitat rules, source separation, migration, overnight sessions, pause/resume, and duplicate protection. A headless browser check also covers the automatic demo, wildlife controls, real session timing, goal edits, background completion, and narrow/desktop layouts:

```sh
python3 -m pip install playwright
python3 tests/browser_check.py http://localhost:5173
```

This optional check uses an isolated headless Chrome profile and does not read your personal browser data.

## Design reference

Classic Forest's matte green canvas, circular tree stage, large timer, and clear planting action informed Grove. The visually inspected reference screens are dated September 2022, supported by a walkthrough tracking Forest through November 2023. These are an adaptation reference, not a claim of exact 2023 reproduction. Sources: [dated screenshot critique](https://ixd.prattsi.org/2022/09/design-critique-forest-ios-app/), [Forest walkthrough research](https://www.tandfonline.com/doi/full/10.1080/10447318.2024.2431364), [current official Forest site](https://www.forestapp.cc/).

The prototype follows the project notes; the reference slide deck was not available during implementation.
