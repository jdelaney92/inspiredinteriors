# Inspired Interiors

Static marketing site for **Inspired Interiors**, a remodeling business in Town Creek, Alabama. Built on the same pattern as [florenceftw](https://github.com/jdelaney92/florenceftw) (ftwgamestore.com): single-page HTML, JSON-driven content, and automated Facebook photo sync.

## Facebook

Project photos are synced from:

https://www.facebook.com/profile.php?id=61590368201826

## Local preview

```bash
npm start
```

Open http://localhost:8080

## Gallery sync

Requires Chrome/Chromium locally (or Playwright in CI):

```bash
npm install
npm run sync:gallery
```

Optional: set `FACEBOOK_PAGE_ACCESS_TOKEN` for more reliable Graph API sync.

## Deploy

Push to `main` or `develop` to deploy via GitHub Pages. Enable Pages in repo settings and point your custom domain if desired.

GitHub Actions also runs gallery sync twice daily when `FACEBOOK_PAGE_ACCESS_TOKEN` is configured as a repository secret.

## Customize

- **Copy & contact info** — edit `index.html` (`#contact`, hero)
- **Services** — edit `data/services.json`
- **Gallery** — run sync or drop images in `assets/images/gallery/`
