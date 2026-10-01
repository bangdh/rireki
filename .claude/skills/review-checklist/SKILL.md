---
name: review-checklist
description: Review lenses and the checklist for Rireki code reviews — tenant isolation & auth, simplicity & library reuse, mockup/i18n parity, protection & privacy — with the exact things to grep for. Load before reviewing a diff.
---
# Review checklist

Return findings only (file:line, problem, why, smallest fix, severity). One lens per review pass.

## Lens 1 — tenant isolation & auth (blockers)
- Every Prisma query on tenant-owned models includes `tenantId` from `getTenant()`; grep `prisma.` calls without
  `tenantId` in `where`/`data`.
- Every Route Handler / Server Action under `(tenant)` calls `requireMember`; admin-only ones call
  `requireRole("admin")` (members, settings, exports, revoke others' links, archive others' candidates).
- IDs from the URL are always re-checked against the tenant (`findFirst({ where: { id, tenantId } })`).
- Viewer routes check link status, expiry, maxViews, password/identity cookie on every request, not only at the gate.
- No secret or internal URL reaches the client bundle (`NEXT_PUBLIC_` only for public values).

## Lens 2 — simplicity & library reuse
- Hand-written code that a listed library already provides (auth, validation, uploads, queues, dates, QR, HLS).
- Duplicate helpers across lanes; dead code; two ways to do one thing; abstractions used once.
- Files > 300 lines or components doing both data fetching and heavy UI: split only if it removes code.
- Could a `Json` column + zod replace new tables? Could a Server Action replace a Route Handler + fetch?

## Lens 3 — mockup & i18n parity
- Page sections, labels and states match the mockup; nothing invented, nothing missing.
- Every visible string goes through `t()`; keys exist in all 5 message files; no raw `a.b` on screen.
- The 履歴書 render stays Japanese; numbers use `tabular-nums` classes from the CSS; 400px width works.

## Lens 4 — protection & privacy
- View-only: no original file URL, no PDF endpoint, `Cache-Control: no-store` on watermarked pages, HLS segment
  URLs ≤ 60 s, client protections mounted, print hidden.
- Download allowed: TTL ≤ 5 min, `download` event logged with viewer.
- Personal data: no CV text or photos in logs; extractor and Claude receive only what the job needs; audit log
  entries for exports, link creation/revocation, member changes.
- Rate limits on the gate and on login; argon2 for passwords; tokens from `nanoid(22)`.
