---
name: share-links-protection
description: Share links end-to-end — creating links (candidates, password, identity, view-only vs download, expiry, sections), the client gate and viewer session, enforcement of view-only, tracking events and aggregates, notifications, revoke/extend. Load before touching app/(tenant)/shares or app/s/[token].
---
# Share links & protection

## Create (wizard = `app/share-new.html`, 3 steps)

- Server Action `createShareLink(input)` validated by `ShareLinkInput` (zod in `packages/shared/src/shareLink.ts`):
  candidates (1..200, all in tenant), name, client fields, `password?` (plain, hashed with better-auth's
  `hashPassword` or `@node-rs/argon2`), `requireIdentity`, `allowedDomains[]`, `downloadAllowed`, `expiresAt?`,
  `maxViews?`, `sections {photo, contact, family, health, videos, documents, feedback}`, `viewerLang`, notifications.
- `token = nanoid(22)`; URL `https://{slug}.{domain}/s/{token}`. Tenant defaults from `TenantSettings.linkDefaults`
  with `locked` flags enforced server-side.
- Step 3 shows link, password, QR (`qrcode` npm, data URL), email draft (mailto text), "Preview as client".

## Viewer flow (`app/s/[token]/…`)

1. `layout.tsx` loads the link by token (no tenant session). Status/expiry/maxViews checked on every request:
   expired or revoked → `expired` page (mockup `viewer/expired.html`).
2. **Gate** (`viewer/gate.html`): password (if set) + name/email (if `requireIdentity`; domain check against
   `allowedDomains`). On success create `Viewer` (upsert by link+email), set cookie `rv_{token}` = signed viewer id
   (HttpOnly, SameSite=Lax, Path=`/s/{token}`, 12 h), log `unlock`. Rate limit: 5 failures / 15 min per ip+token
   (Redis `INCR` + `EXPIRE`); log `failed_password`.
3. **List** (`viewer/list.html`): candidates in link order with the fields allowed by `sections`; log `open_list`.
   A single-candidate link redirects straight to the detail.
4. **Detail** (`viewer/detail.html`): 履歴書 rendered as watermarked PNG pages from the API (view-only) or the
   React component with a "Download PDF" button (download allowed); videos via signed HLS; documents only when
   `sections.documents`; contact block hidden unless `sections.contact`. Feedback form if `sections.feedback`
   → `Feedback` row + `interest` event + email to the creator when `notifyInterest`.
5. **Client protections** (view-only only): port `initProtection` and `renderWatermarks` from `assets/app.js`
   into `ProtectedPage` / `Watermark` client components; `@media print` hides content; `user-select: none`.
   Say in the UI that OS screenshots cannot be prevented (copy already in the mockup).

## Tracking

- Insert `ViewEvent` for: unlock, open_list, open_cv (with candidateId), play_video, video_progress (25/50/75/100
  via `POST /api/s/{token}/events`), download, interest, blocked_action, failed_password. Include `viewerId`,
  ip (`x-forwarded-for`), user agent, country from `CF-IPCountry`/`x-geo` if present (no GeoIP library in phase 1).
- Duration: client sends a heartbeat every 30 s while a CV page is open; `durationSec` accumulates on the open_cv
  event row.
- Aggregates for `share-detail.html`: total views = count(open_cv), unique viewers = count(distinct viewerId),
  avg time, video plays, interested count, views per day (SQL `date_trunc`), per candidate, viewer log with
  pagination. One Prisma `$queryRaw` per aggregate; no analytics library.
- Dashboard: last 14 days across links, recent views (last 20 events joined with viewer/link/candidate).

## Notifications

`mail.send` jobs: first view of a link (`notifyFirstView`, once per link), interest marked, invitation, password
reset. Templates are plain text + minimal HTML in the viewer language; strings from the message files.

## Revoke / extend / resend

Server Actions with `requireRole("admin")` or creator check; revoke sets `status=revoked` (keep events); extend
updates `expiresAt`; resend re-sends the email draft. Audit each.
