# SEO Preview Report — RentProof (favicon & Open Graph)

Date checked: 2026-11-22 (UTC) / 2026-11-22 18:28 Asia/Yekaterinburg  
Branch: `cursor/seo-google-yandex-f2a8`  
Local production build: `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com`, `PORT=3230`

## Brand assets (public root)

| File | Absolute path in repo | Size | Notes |
|------|----------------------|------|--------|
| Favicon SVG | `/workspace/public/favicon.svg` | 453 B | Brand mark (shield / RP), not third-party logos |
| Favicon ICO | `/workspace/public/favicon.ico` | 909 B | Multi-size ICO |
| Favicon PNG 16×16 | `/workspace/public/favicon-16x16.png` | 178 B | |
| Favicon PNG 32×32 | `/workspace/public/favicon-32x32.png` | 280 B | |
| Favicon PNG 120×120 | `/workspace/public/favicon-120x120.png` | 919 B | |
| Apple Touch Icon | `/workspace/public/apple-touch-icon.png` | 1363 B | Wired as 180×180 |
| Apple Touch 120×120 | `/workspace/public/apple-touch-icon-120x120.png` | 919 B | Extra size copy |
| Open Graph image | `/workspace/public/og-image.png` | 23809 B | **1200×630** RGB; title «RentProof», slogan «Аренда без риска» |

Public URL paths (same on production after deploy):

- `https://rentproof2.onrender.com/favicon.ico`
- `https://rentproof2.onrender.com/favicon.svg`
- `https://rentproof2.onrender.com/favicon-16x16.png`
- `https://rentproof2.onrender.com/favicon-32x32.png`
- `https://rentproof2.onrender.com/favicon-120x120.png`
- `https://rentproof2.onrender.com/apple-touch-icon.png`
- `https://rentproof2.onrender.com/og-image.png`

## HTML head (local standalone, HTTP 200)

Verified on `http://127.0.0.1:3230/`:

| Check | Result |
|-------|--------|
| `<link rel="icon" … favicon.ico/svg/png sizes>` | Present |
| `apple-touch-icon` → `/apple-touch-icon.png` | Present |
| `og:title` | RentProof — аренда оборудования и техники |
| `og:description` | Каталог аренды оборудования… |
| `og:image` | `https://rentproof2.onrender.com/og-image.png` |
| `og:type` | website |
| `og:url` | `https://rentproof2.onrender.com` |
| Twitter Card | `summary_large_image` + title/description/image |
| Canonical | `https://rentproof2.onrender.com` |
| `<title>` | RentProof — аренда оборудования и техники |
| meta description | Matches homepage copy |

## Direct asset HTTP status (local)

All returned **200** with expected content types:

| Path | Status | Content-Type |
|------|--------|--------------|
| `/favicon.ico` | 200 | image/x-icon |
| `/favicon.svg` | 200 | image/svg+xml |
| `/favicon-16x16.png` | 200 | image/png |
| `/favicon-32x32.png` | 200 | image/png |
| `/favicon-120x120.png` | 200 | image/png |
| `/apple-touch-icon.png` | 200 | image/png |
| `/og-image.png` | 200 | image/png |
| `/robots.txt` | 200 | text/plain |
| `/sitemap.xml` | 200 | application/xml |

## robots.txt vs brand assets

- Brand files live at **site root** (`/favicon*`, `/og-image.png`), not under `/media/`.
- `Disallow: /media/` applies only to user uploads; **does not block** favicon or OG image.
- Local robots/sitemap contain **no** `localhost`; sitemap URLs use `https://rentproof2.onrender.com`.

## Production (after PR #3 merge + redeploy)

Verified live (2026-11-22 ~13:32 UTC / 18:32 Asia/Yekaterinburg):

| URL | Status |
|-----|--------|
| https://rentproof2.onrender.com/favicon.ico | 200 |
| https://rentproof2.onrender.com/favicon.svg | 200 |
| https://rentproof2.onrender.com/og-image.png | 200 |
| https://rentproof2.onrender.com/apple-touch-icon.png | 200 |
| https://rentproof2.onrender.com/robots.txt | 200, no localhost |
| https://rentproof2.onrender.com/sitemap.xml | 200, rentproof2 host |

Open Graph is for messenger/social link previews. This report does **not** claim Yandex will show a large image in SERP.

## Scope note

Auth, payments, and site visual design were not changed for this work.
