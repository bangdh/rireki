---
name: mockup-to-nextjs
description: How to port a Rireki mockup page (app/*.html, public/*.html, viewer/*.html) into Next.js with the least code — reuse style.css, keep the markup, swap data-i18n for next-intl, icons via one sprite component, charts/watermark/protection ported from assets/app.js. Load before building any page.
---
# Porting a mockup page to Next.js

The mockups are the spec and the styling. Do not redesign. One mockup page → one route.

| Mockup | Route | Notes |
|---|---|---|
| `public/landing.html` | `app/(public)/page.tsx` | marketing, root domain only |
| `public/signup.html` | `app/(public)/signup/page.tsx` | creates organization + first admin via better-auth |
| `app/login.html` | `app/(tenant)/login/page.tsx` | per-subdomain |
| `app/dashboard.html` | `app/(tenant)/dashboard/page.tsx` | KPIs via Prisma aggregates |
| `app/candidates.html` | `app/(tenant)/candidates/page.tsx` | server-side filters from searchParams |
| `app/candidate-new.html` | `app/(tenant)/candidates/new/page.tsx` | |
| `app/candidate-form.html` | `app/(tenant)/candidates/new/form/page.tsx` and `…/[id]/edit/page.tsx` | one client component, 7 steps, autosave draft via Server Action |
| `app/candidate-import.html` | `app/(tenant)/candidates/import/[jobId]/page.tsx` | |
| `app/candidate-detail.html` | `app/(tenant)/candidates/[id]/page.tsx` | tabs = searchParam `tab` |
| `app/shares.html`, `share-new.html`, `share-detail.html` | `app/(tenant)/shares/…` | |
| `app/settings-company.html`, `settings-members.html` | `app/(tenant)/settings/…` | |
| `viewer/gate.html`, `list.html`, `detail.html`, `expired.html` | `app/s/[token]/…` | no tenant session; link token + viewer cookie |

## Steps

1. **Global CSS**: copy `assets/style.css` → `apps/web/app/globals.css` once (foundation step). Load the Google
   Fonts link in `app/layout.tsx`. Keep `html[data-lang]` and `data-theme` behaviour: set `lang` from the locale.
2. **Shell**: port the sidebar/topbar once into `components/shell/{Sidebar,Topbar}.tsx` (server components with the
   active link computed from `usePathname` in a tiny client child). Tenant name, counts and the user come from
   props.
3. **Markup**: paste the mockup HTML, convert to JSX (`class`→`className`, `for`→`htmlFor`, self-close `<input>`,
   `style="a:b"`→`style={{a:'b'}}`, `<!-- -->`→`{/* */}`). Delete the sample data and map over real data.
4. **Strings**: every `<span data-i18n="x.y">Text</span>` becomes `{t('x.y')}` with `const t = useTranslations()`
   (server) / `useTranslations()` (client). Keys are flat in `assets/i18n.js`; the message files are generated nested
   (`nav.dashboard` → `{ nav: { dashboard } }`), so `t('nav.dashboard')` works unchanged.
5. **Icons**: one `components/Icon.tsx` that renders `<svg className="ic"><use href={'#i-'+name}/></svg>` and one
   `components/IconSprite.tsx` rendered in the root layout with the symbols copied from `ICONS` in `assets/app.js`.
6. **Behaviour from app.js**: port only what the page needs, as small client components — `LangSwitch`,
   `ThemeToggle`, `Tabs`, `Stepper`, `CopyButton` (+ `Toast`), `BarChart` (SVG, from `renderBarChart`),
   `Watermark` (from `renderWatermarks`), `ProtectedPage` (from `initProtection`, viewer only). No jQuery-style
   DOM code in React.
7. **Forms**: Server Actions + zod; show `error-text` under fields using the same classes as the mockup.
8. **Data**: server components fetch with Prisma through `lib/db.ts` and `getTenant()`; client components receive
   plain props. No client-side fetching for initial render.
9. **Check**: open the page next to the mockup; same sections, same classes, same labels in 5 languages; 400px wide.

## Don'ts

No Tailwind, no new CSS files per page (add a few rules to `globals.css` only if a state the mockup lacks appears),
no icon packages, no UI kits, no date libraries beyond `date-fns`, no state libraries.
