# Grove

A phone-first, Forest-inspired wellness prototype for movement, sleep, and screen time. Built from the supplied project notes. The app runs in your browser, with original SVG artwork and no third-party runtime dependencies. It supports local preview and GitHub Pages hosting.

## Run

Double-click **Open Grove.command** in this folder to start the server and open the app. Keep its Terminal window open while using Grove.

Or run:

```sh
cd grove
python3 start.py
```

Open **http://localhost:5173**. The app fills a phone viewport and uses a phone-sized preview on desktop. Open **http://localhost:5173/schematic.html** for the screen map and design rationale. Stop the server with Ctrl+C. To use another port: `python3 start.py --port 5174`.

## GitHub Pages

The Pages workflow in `.github/workflows/pages.yml` publishes the app whenever `main` changes. It packages only the web app, illustrations, and design schematic. Local launchers, tests, and project notes are excluded from the deployed site.

To preview that exact deployment package locally:

```sh
python3 scripts/build_site.py
python3 -m http.server 5174 --bind 127.0.0.1 --directory _site
```

In a GitHub repository, select **Settings → Pages → Source → GitHub Actions**. The workflow then provides the published URL. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Try it

- Tap a habit to log movement or sleep, and edit your personal goal.
- Tap **Demo** to edit sample app usage, steps, and sleep. Turn on **Finish today** to evaluate the screen limit. Meeting all three habits welcomes a visitor.
- Open **Focus**, choose a duration, and plant a tree. Pause/resume and reload recovery work. Completing a session earns one tree. Ending early keeps previous rewards.
- For a short walkthrough, enable **Settings → Quick demo timer**, then choose 5 minutes: it completes in 5 seconds.
- **Counted apps** changes the screen-time total. Productive apps start excluded.
- **Trends** shows seven-day habit data. **Friends** lets you join a sample improvement challenge.
- **Settings → Reset demo** restores the sample state after an in-app confirmation.

## Local behavior

Progress, goals, app preferences, rewards, and the active timer use browser localStorage (`grove-local-v1`). Sample peers are not real accounts. The starting forest includes eight illustrative trees and two visitors; future rewards update the counters and reward log. The island scene is representative artwork rather than a literal tree inventory. The tree picker changes the sapling appearance and selected species.

A browser cannot read phone-wide screen time, block other apps, or access wearable health records without native integrations. This prototype uses editable demo data; it does not request sensor access or send health data. LocalStorage is not production health-data storage. See [design notes](docs/design.md) for native implementation boundaries and scoring details.

## Verification

Model checks cover screen-time arithmetic, capped scores, reward deduplication, timer deadlines, and recovery. JavaScript render checks cover all four screens, nine sheets, form labels and valid defaults, demo form submission, quick timer completion, and pending challenge history. HTTP and CSS syntax checks passed. Live browser layout and interaction inspection was unavailable because the desktop automation connection could not start; these checks do not replace that visual pass.

To run the 13 model tests (optional developer dependency):

```sh
python3 -m pip install quickjs
python3 -m unittest discover -s tests -v
```

## Design reference

Classic Forest's matte green canvas, circular tree stage, large timer, and one primary planting action informed the visual design. The inspected screenshots are dated September 2022, used as the closest verified classic reference to the requested 2023 style; they are not claimed to be an exact 2023 capture. Sources: [Forest screenshot critique](https://ixd.prattsi.org/2022/09/design-critique-forest-ios-app/), [Forest walkthrough study covering updates through November 2023](https://www.tandfonline.com/doi/full/10.1080/10447318.2024.2431364), [official Forest site](https://www.forestapp.cc/).

The prototype follows the project notes; the reference slide deck was not available during implementation.
