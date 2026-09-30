# Rireki — 履歴書 cloud for sending organizations

UI/UX design package (sitemap + 19 interactive HTML mockups) for a SaaS that lets
sending organizations in Vietnam, Myanmar, Bangladesh and Indonesia manage the
履歴書 (rirekisho), self-introduction videos and profile of each trainee, and send
password-protected, view-only links to clients in Japan with view tracking.

## Open the mockups

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/
```

`index.html` is the entry point: sitemap, roles, main flows, data model,
content-protection strategy, tracking, i18n notes, design system and links to
every screen.

## Structure

| Path | Contents |
|---|---|
| `index.html` | Sitemap and design documentation (Vietnamese) |
| `public/` | Landing page, tenant sign-up (subdomain) |
| `app/` | Tenant app on `{company}.rireki.app`: login, dashboard, candidates, CV import review, 7-step form, candidate detail, share links, link wizard, tracking, members & roles, company settings |
| `viewer/` | Client pages on `{company}.rireki.app/s/{token}`: password gate, candidate list, view-only detail with watermark, expired link |
| `assets/style.css` | Design tokens (light/dark), app shell, components |
| `assets/i18n.js` | 635 UI strings × EN / JA / VI / MY / ID |
| `assets/app.js` | Language & theme switch, tabs, stepper, charts, watermark, view-only protection |

Every page has a language switcher (English, 日本語, Tiếng Việt, မြန်မာ, Bahasa
Indonesia) and a light/dark toggle. Sample data belongs to a fictional sending
organization, *Sao Việt Manpower* (`saoviet.rireki.app`); no real people.
