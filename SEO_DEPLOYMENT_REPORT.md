# SEO Deployment Report — RentProof

Date: 2026-11-22 (UTC) / Asia/Yekaterinburg  
Production: https://rentproof2.onrender.com  
GitHub: SWAGA-GORDEY/rentproof  
PR #3: https://github.com/SWAGA-GORDEY/rentproof/pull/3  
Branch: `cursor/seo-google-yandex-f2a8`

## 1. Status of PR #3

- Was open, mergeable, clean.
- Included sitemap/robots/canonical/OG, categories, legal pages, then favicon + OG image + reports.
- CI: no required checks configured on the branch (`statusCheckRollup` empty).

## 2. Merge status

- **Merged** into `master` at **2026-11-22T13:30:28Z** (UTC) = **2026-11-22 18:30 Asia/Yekaterinburg**
- Merge commit: `534e97194ca61046bb89cfa1e8b468f5baf11ce6`
- Follow-up doc PR #4 also merged (`d96d0d2` lineage).

## 3. Render redeploy

- No Render API access from this agent (cannot open dashboard or set secrets).
- **Observed auto-redeploy after merge:** production began serving the new SEO build within ~2 minutes.
- Dockerfile ARG default and `render.yaml` both set `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com`.
- Owner should still confirm the env var is set on **rentproof2** for future rebuilds (build-time bake for Next public env).

## 4. NEXT_PUBLIC_SITE_URL

| Location | Value / result |
|----------|----------------|
| Dockerfile ARG default | `https://rentproof2.onrender.com` |
| render.yaml | `https://rentproof2.onrender.com` |
| Production robots Host | `rentproof2.onrender.com` |
| Production sitemap / canonical / og:url | `https://rentproof2.onrender.com` — **no localhost** |

## 5. robots.txt (production after deploy)

Checked: `https://rentproof2.onrender.com/robots.txt`

| Check | Result |
|-------|--------|
| HTTP | **200** |
| localhost | **absent** |
| Host | `rentproof2.onrender.com` |
| Sitemap | `https://rentproof2.onrender.com/sitemap.xml` |
| Disallow | `/account`, `/admin`, `/login`, `/register`, `/api/`, `/listings/`, `/ai-assessment`, `/media/` |
| Brand assets | Not under `/media/` → **allowed** (`/favicon*`, `/og-image.png`) |

## 6. sitemap.xml (production after deploy)

Checked: `https://rentproof2.onrender.com/sitemap.xml`

| Check | Result |
|-------|--------|
| HTTP | **200** |
| localhost | **absent** |
| Host count | 26 × `rentproof2.onrender.com` |
| Includes | home, catalog, categories, published listings, privacy/terms/support, etc. |
| Excludes | login/register/account/admin/API (not listed) |

## 7. Canonical & Open Graph (production)

Homepage `https://rentproof2.onrender.com/`:

| Tag | Value |
|-----|--------|
| title | RentProof — аренда оборудования и техники |
| description | Каталог аренды оборудования… |
| canonical | `https://rentproof2.onrender.com` |
| og:title / og:description / og:type / og:url | present, type=`website` |
| og:image | `https://rentproof2.onrender.com/og-image.png` (1200×630) |
| twitter:card | `summary_large_image` |

Category example `/categories/tools`: canonical + og:url correct.  
Listing example `/catalog/demo-tent`: Product JSON-LD present.

Favicon / OG HTTPS 200:

| URL | Status |
|-----|--------|
| https://rentproof2.onrender.com/favicon.ico | **200** |
| https://rentproof2.onrender.com/favicon.svg | **200** |
| https://rentproof2.onrender.com/og-image.png | **200** |
| https://rentproof2.onrender.com/apple-touch-icon.png | **200** |
| https://rentproof2.onrender.com/privacy | **200** |
| https://rentproof2.onrender.com/terms | **200** |
| https://rentproof2.onrender.com/support | **200** |

Open Graph is for messenger/social previews. **Not** a guarantee of large images in Yandex SERP.

## 8. JSON-LD (production)

- Organization + WebSite on all pages (layout).
- Product + Offer on `/catalog/demo-tent` verified live.
- No fabricated aggregateRating when reviews are empty.

## 9. Google Search Console

- **Not available** in this agent environment (no Google login).
- Owner must: add property → verify (`GOOGLE_SITE_VERIFICATION` on Render) → submit sitemap.
- **Indexing not claimed.**

## 10. Yandex Webmaster

- **Not available** in this agent environment.
- Owner must: add site → verify (`YANDEX_VERIFICATION`) → submit sitemap.
- If only a manual meta/HTML code is issued, paste it here or set the env var.

## 11. Sitemap submission

- **Not submitted** (consoles unavailable).
- Ready URL: `https://rentproof2.onrender.com/sitemap.xml`

## 12. Errors found and fixed

| Issue | Fix |
|-------|-----|
| Production robots/sitemap used `localhost:3000` | Dynamic robots/sitemap + SITE_URL bake; **verified fixed on live** |
| Missing branded favicon / OG card | `public/favicon*` + `og-image.png`; wired in layout; **live 200** |
| Weak default OG path | `DEFAULT_OG_IMAGE=/og-image.png` |
| Duplicate titles `… \| RentProof \| RentProof` on categories/listings | Titles no longer hardcode brand; template applies once |
| Login/register/account canonical pointed at `/` | Self-canonical + `noindex` on auth/account/AI/listing-manage pages |

### Re-audit (2026-11-22 ~13:36 UTC / 18:36 Asia/Yekaterinburg)

| Check | Result |
|-------|--------|
| Sitemap URLs | 26 public, **0** localhost, **0** login/register/account/admin/api |
| Home / category / listing | 200, index,follow, viewport, OG, Twitter |
| Login / register / account | 200, **noindex,nofollow** |
| Favicon.ico / og-image.png HEAD | **200** |
| Listing Product JSON-LD | Present on `/catalog/demo-tent` |

## 13. Actions requiring owner (Michael)

1. Confirm Render env `NEXT_PUBLIC_SITE_URL=https://rentproof2.onrender.com` on **rentproof2**.
2. Google Search Console: verify + submit sitemap.
3. Yandex Webmaster: verify + submit sitemap.
4. Optionally set `GOOGLE_SITE_VERIFICATION` / `YANDEX_VERIFICATION`.

## 14. Remaining before full indexing

- Console verification + sitemap acceptance.
- Crawl/coverage over time (not claimed here).
- Optional custom domain (not purchased by agent).

## Deferred megaprojects (not in this SEO work)

Postgres OWNER admin panel, full email-auth stack, and live YooKassa production payments remain **out of scope** for this merge (separate, confirmation-gated work).

## Related files

- `/workspace/SEO_PREVIEW_REPORT.md` — local favicon/OG HTTP 200 checklist
- `/workspace/SEO_AUDIT.md` — earlier SEO audit notes
- Assets: `/workspace/public/favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-120x120.png`, `apple-touch-icon.png`, `og-image.png`
