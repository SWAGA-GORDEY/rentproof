# SEO Deployment Report — RentProof

Date: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Production: https://rentproof2.onrender.com  
GitHub: SWAGA-GORDEY/rentproof  
PR: https://github.com/SWAGA-GORDEY/rentproof/pull/3  
Branch: `cursor/seo-google-yandex-f2a8`

## 1. Status of PR #3

- State at start of this pass: **open**, `mergeable: true`, `mergeable_state: clean`
- Title: «Google + Yandex SEO: sitemap, robots, categories, legal pages»
- Base: `master` ← head: `cursor/seo-google-yandex-f2a8`
- Follow-up commit on this pass: branded favicon/ICO/PNG, OG 1200×630, layout icon/OG/Twitter links, `SEO_PREVIEW_REPORT.md`

## 2. Merge status

- **Merged** into `master` at 2026-11-22T13:30:28Z (UTC) / 2026-11-22 18:30 Asia/Yekaterinburg
- Merge commit: `534e97194ca61046bb89cfa1e8b468f5baf11ce6`
- PR URL: https://github.com/SWAGA-GORDEY/rentproof/pull/3

## 3. Render redeploy

- This agent has **no Render dashboard/API credentials**.
- Cannot set env vars or click Redeploy from here.
- `Dockerfile` already defaults `ARG NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com`.
- `render.yaml` already declares `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com`.
- Owner must confirm the same variable on the **rentproof2** service (build + runtime) and trigger redeploy after merge if auto-deploy does not run.

## 4. NEXT_PUBLIC_SITE_URL

| Location | Value |
|----------|--------|
| Dockerfile build ARG default | `https://rentproof2.onrender.com` |
| render.yaml | `https://rentproof2.onrender.com` |
| Local verify build | baked correctly into canonical/OG/sitemap |
| Live production (pre-redeploy) | still emitting `localhost:3000` in robots/sitemap → **needs merge + rebuild** |

## 5. robots.txt (local post-fix vs production pre-deploy)

| Check | Local (PORT 3230, SITE_URL set) | Production pre-deploy |
|-------|----------------------------------|------------------------|
| HTTP | 200 | 200 |
| localhost | absent | **present** (`Sitemap: http://localhost:3000/sitemap.xml`) |
| Production host | rentproof2.onrender.com | missing |
| Private paths Disallow | account, admin, login, register, api, listings/, ai-assessment, media/ | older shorter list |

## 6. sitemap.xml

| Check | Local | Production pre-deploy |
|-------|-------|------------------------|
| HTTP | 200 | 200 |
| localhost | absent | **present** on every `<loc>` |
| rentproof2 URLs | yes (~26) | no |
| XML structure | valid urlset | valid urlset with wrong host |

## 7. Canonical & Open Graph

Local homepage:

- canonical → `https://rentproof2.onrender.com`
- og:title / og:description / og:image / og:type / og:url present
- og:image → `https://rentproof2.onrender.com/og-image.png` (1200×630)
- Twitter: `summary_large_image` + matching title/description/image

Production: OG image and new favicons **not** live until deploy of this branch.

## 8. JSON-LD

- Organization + WebSite JSON-LD in root layout.
- Product JSON-LD on `/catalog/[id]` via `listingJsonLd`.
- No fake aggregate ratings when reviewCount is 0.

## 9. Google Search Console

- **Not connected from this environment** (no Google OAuth / GSC API session).
- Cannot add property, verify, or submit sitemap automatically.
- Owner steps:
  1. Add URL-prefix property `https://rentproof2.onrender.com`
  2. Prefer HTML tag verification → set `GOOGLE_SITE_VERIFICATION` on Render → redeploy
  3. After verification, submit `https://rentproof2.onrender.com/sitemap.xml`
- Do not claim indexing until GSC confirms coverage.

## 10. Yandex Webmaster

- **Not connected from this environment**.
- Owner steps:
  1. Add site in Webmaster
  2. Meta-tag / HTML-file verification → set `YANDEX_VERIFICATION` on Render → redeploy
  3. Submit the same sitemap URL
- Stop and request the verification code if only manual paste is available.

## 11. Sitemap submission

- **Not submitted** by this agent (consoles unavailable).
- Ready URL after correct deploy: `https://rentproof2.onrender.com/sitemap.xml`

## 12. Errors found and fixed (this stream)

| Issue | Fix |
|-------|-----|
| Static robots/sitemap with localhost on Render | Dynamic `robots.ts` / `sitemap.ts` + `siteOrigin()` + Dockerfile ARG |
| Missing brand favicon / OG card image | Generated SVG/PNG/ICO + `/og-image.png`; wired in `layout.tsx` |
| OG default pointed at weak asset | `DEFAULT_OG_IMAGE = "/og-image.png"` |
| robots `Disallow: /media/` vs brand assets | Brand assets at public root; documented as allowed |

## 13. Actions requiring owner (Michael)

1. Confirm Render service **rentproof2** has `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com` (build-time for Next public env).
2. Redeploy after merge if Render does not auto-deploy from `master`.
3. Google Search Console: verify + submit sitemap.
4. Yandex Webmaster: verify + submit sitemap.
5. Optionally set `GOOGLE_SITE_VERIFICATION` / `YANDEX_VERIFICATION` secrets (no secrets in git).

## 14. Remaining before “full indexing”

- Successful production redeploy with correct SITE_URL (robots/sitemap without localhost).
- Console verification for Google and Yandex.
- Sitemap accepted in both consoles.
- Crawl/index coverage reports (days–weeks; not claimed here).
- Optional: custom domain (not purchased by agent).

## Deferred (explicitly out of this SEO merge)

Full Postgres OWNER admin, complete auth/email stack, and live YooKassa production payments are **separate** megaprojects and were **not** implemented in this PR to avoid unsafe parallel systems and unpaid actions.

## Post-merge production checklist (run after redeploy)

```bash
curl -sI https://rentproof2.onrender.com/robots.txt
curl -s https://rentproof2.onrender.com/robots.txt | head
curl -s https://rentproof2.onrender.com/sitemap.xml | head
curl -sI https://rentproof2.onrender.com/favicon.ico
curl -sI https://rentproof2.onrender.com/og-image.png
curl -s https://rentproof2.onrender.com/ | tr '>' '>\n' | rg -i 'og:image|canonical|favicon'
```

Expect HTTP 200, `rentproof2.onrender.com` everywhere, **zero** `localhost`.
