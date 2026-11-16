# Let’s Fix Tracks website

A dependency-free static site. Node.js builds plain HTML and copies the stylesheet, homepage carousel script and official artwork into `dist/`. The first gameplay preview remains visible if scripting is unavailable. This folder is the root of the website source intended for [the separate GitHub repository](https://github.com/hexnomaddev-dev/lets-fix-tracks-site).

## Build and preview

From this folder, use Node.js 24.

```sh
node build.mjs
node check.mjs
node preview.mjs
```

Open [the local preview](http://127.0.0.1:8000/). The preview serves `/`, `/about/`, `/privacy/`, `/terms/`, and `/support/`, and serves the custom page with HTTP 404 for unknown paths. Set the same `SITE_URL` for the build and preview to test a GitHub Pages project path locally. Set `PORT` to override port 8000.

To review the GitHub Pages build locally in PowerShell:

```powershell
$env:SITE_URL = 'https://hexnomaddev-dev.github.io/lets-fix-tracks-site/'
node build.mjs
node check.mjs
node preview.mjs
```

Open [the project-path preview](http://127.0.0.1:8000/lets-fix-tracks-site/).

## Prepare the release

- Add the verified Google Play listing URL to `release.playUrl` in `content.mjs` when it is available. The download link appears once the URL is set.
- If the release introduces app account creation, implement the real in-app and public deletion flow and add the deletion URL to Play Console. The current Android project documents no app account creation. [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)

## Deploy on GitHub Pages

1. Put the contents of this folder at the root of the website repository. Keep the Android workspace and generated `dist/` out of the commit.
2. In the website repository, select **Settings → Pages → Source → GitHub Actions**. [GitHub Pages configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
3. After release review, run the **GitHub Pages** workflow from **Actions** on the default branch. It runs `node build.mjs --release` and checks the artifact before uploading it. The release build requires a public HTTPS `SITE_URL` and rejects pages with development-only text. Pull requests run the review build and link checks.
4. Enable **Enforce HTTPS** when available. Open the Privacy Policy and Terms links directly on the deployed site and test a missing URL. Use the verified privacy URL in the app and Play Console.

The workflow obtains the site URL from GitHub Pages. To use another static host, set `SITE_URL` to the final HTTPS URL (including any project path), run `node build.mjs --release` and `node check.mjs`, and publish `dist/` after both commands pass. Configure directory indexes and map HTTP 404 responses to `404.html`. The build uses `SITE_URL` for canonical URLs, sharing metadata, the sitemap and links that work on nested pages.

## Files and assets

- `content.mjs` contains page copy and release details.
- `legal/privacy.html` and `legal/terms.html` contain the approved legal wording, dated 16 November 2026.
- `build.mjs` contains the shared HTML structure and generates deployment files.
- `check.mjs` verifies generated internal links and assets.
- `preview.mjs` serves the built site locally, including its custom 404.
- `assets/carousel.js` adds the homepage showcase controls and autoplay.
- `assets/style.css` contains the responsive layout and game palette.
- `assets/` contains gameplay captures sourced from the Android project’s `docs/screenshots/`, the Android app icon, and its DM Sans font. The hero crops the puzzle boards, hint and daily difficulty menu from `game-flow-light-2.png`, `game-flow-dark-2.png`, `hint.png` and `daily-difficulty.png`. The gallery uses the full gameplay and hint captures. The font licence ships with the site.
