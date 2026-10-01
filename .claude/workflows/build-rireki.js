export const meta = {
  name: 'build-rireki',
  description: 'Build the Rireki app from the design package: scaffold, foundation (db/ui/extractor), feature lanes, integration + QA, multi-lens review and fixes',
  whenToUse: 'Run from the rireki repo after the design package and skills are in place. Pass args {phases: [...]} to run a subset: scaffold, foundation, features, integration, review.',
  phases: [
    { title: 'Scaffold', detail: 'monorepo, Next.js, Prisma, worker, extractor skeleton, CI' },
    { title: 'Foundation', detail: 'DB schema + seed · global CSS, shell, i18n, static pages · extractor service' },
    { title: 'Features', detail: 'tenant-app · client-side · media lanes, each implement → review → fix' },
    { title: 'Integration & QA', detail: 'wire, build, run, e2e; fix loop' },
    { title: 'Review', detail: 'four review lenses, adversarial verify, fixes, final check' },
  ],
}

// ---------- helpers ----------
const PHASES = new Set((args && args.phases) || ['scaffold', 'foundation', 'features', 'integration', 'review'])
const REPO = '/home/user/rireki'
const RULE = `Repository: ${REPO} (branch main). Run every command from there (cd ${REPO} && ...); every relative path in this prompt is relative to it. Read ${REPO}/CLAUDE.md first.
Rule for every decision: choose the simpler option with less code; use an existing library before writing code. Follow CLAUDE.md and the skill files you are told to read.
Environment: this container has no Docker daemon — never run docker compose here; use the local services already running, listed in .claude/skills/run-and-verify/SKILL.md under "Cloud container (no Docker)".
Git: other agents work in this same checkout at the same time. Never run git commit, add, stash, checkout, reset or clean — the orchestrator commits after each phase. Prefer the dependencies the scaffold already installed; if you must add one, use pnpm add --filter <workspace> <pkg> and retry if the store is locked. While other agents work (feature phase) do not run next build or prisma migrate: verify with pnpm typecheck, vitest and, if needed, a dev server on a free port 3001-3010 that you stop afterwards.`
const ROLE = name => `Act as the "${name}" agent defined in ${REPO}/.claude/agents/${name}.md: read that file first and follow its working method and report format.`
const run = (prompt, opts) => { const { agentType, ...rest } = opts || {}; return agent(agentType ? `${ROLE(agentType)}\n\n${prompt}` : prompt, rest) }

const REPORT = {
  type: 'object',
  properties: {
    done: { type: 'boolean' },
    summary: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    verified: { type: 'string', description: 'commands run and their results' },
    openIssues: { type: 'array', items: { type: 'string' } },
    integrationNotes: { type: 'array', items: { type: 'string' }, description: 'nav links, env vars, migrations the integrator must wire' },
  },
  required: ['done', 'summary', 'files', 'verified', 'openIssues', 'integrationNotes'],
}
const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      file: { type: 'string' }, line: { type: 'integer' }, severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
      problem: { type: 'string' }, fix: { type: 'string' } }, required: ['file', 'severity', 'problem', 'fix'] } },
  },
  required: ['findings'],
}
const VERDICT = { type: 'object', properties: { real: { type: 'boolean' }, reason: { type: 'string' } }, required: ['real', 'reason'] }
const QA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    checks: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, ok: { type: 'boolean' }, detail: { type: 'string' } }, required: ['name', 'ok', 'detail'] } },
    failures: { type: 'array', items: { type: 'object', properties: { flow: { type: 'string' }, steps: { type: 'string' }, expected: { type: 'string' }, actual: { type: 'string' }, suspectFile: { type: 'string' } }, required: ['flow', 'steps', 'expected', 'actual'] } },
  },
  required: ['passed', 'checks', 'failures'],
}

const key = f => `${f.file}:${f.line || 0}:${f.problem.slice(0, 60)}`

// ---------- Phase 1: scaffold ----------
if (PHASES.has('scaffold')) {
  phase('Scaffold')
  const spec = await run(`Write the implementation spec for the SCAFFOLD step of Rireki: pnpm monorepo (apps/web Next.js 15 App Router TS without Tailwind, apps/worker, apps/extractor skeleton, packages/db Prisma, packages/shared), root scripts, .env.example aligned with deploy/.env.example, GitHub Actions CI, and how deploy/docker-compose.yml is reused (web+worker+extractor images, no separate api service). Pin: Next.js 15 (create-next-app@15, TypeScript, App Router, no Tailwind, no src dir), Prisma 7 with the prisma-client generator + @prisma/adapter-pg (no Rust engines), @playwright/test 1.56.1 (matches the preinstalled browsers), Vitest, Python >= 3.11 for the extractor. Pre-install the dependencies every later lane needs so lanes rarely run pnpm add: better-auth, next-intl, zod, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, bullmq, ioredis, nodemailer, sharp, hls.js, @anthropic-ai/sdk, pg. Read CLAUDE.md, docs/tech-stack.md, .claude/skills/rireki-conventions/SKILL.md and .claude/skills/run-and-verify/SKILL.md. ${RULE}`, { label: 'spec:scaffold', agentType: 'planner' })
  const r = await run(`Scaffold the Rireki monorepo exactly per this spec. Use create-next-app / prisma init / official generators rather than hand-writing boilerplate. Finish only when pnpm install, pnpm typecheck and pnpm build pass.\n\nSPEC:\n${spec}\n\n${RULE}`, { label: 'scaffold', agentType: 'devops', schema: REPORT })
  log(`Scaffold: ${r && r.done ? 'done' : 'INCOMPLETE'} — ${r && r.summary}`)
}

// ---------- Phase 2: foundation (three disjoint lanes, then integrate) ----------
if (PHASES.has('foundation')) {
  phase('Foundation')
  const lanes = [
    { key: 'db', agentType: 'fullstack-dev', prompt: 'FOUNDATION lane DB: implement packages/db — better-auth generated models + the Rireki models from .claude/skills/rirekisho-schema/SKILL.md, migrations, and the idempotent seed described in .claude/skills/run-and-verify/SKILL.md (tenant saoviet, two users, 8 candidates with CV bodies taken from the mockups, 3 share links with events). Also packages/shared: cv.ts zod schema, shareLink.ts, constants, and a script that converts assets/i18n.js into nested messages/{en,ja,vi,id,my}.json. Own only packages/**.' },
    { key: 'ui', agentType: 'fullstack-dev', prompt: 'FOUNDATION lane UI: in apps/web set up next-intl with the generated message files (import path from packages/shared), copy assets/style.css to globals.css, Google Fonts in the root layout, IconSprite + Icon components from assets/app.js ICONS, the app shell (Sidebar, Topbar with LangSwitch, ThemeToggle) ported from the mockup, and STATIC versions (no data yet, sample props) of every mockup page at the routes listed in .claude/skills/mockup-to-nextjs/SKILL.md, including the public landing/signup and viewer pages. Do not implement auth or DB access in this lane; leave TODO hooks. Own only apps/web/**.' },
    { key: 'extractor', agentType: 'extractor-dev', prompt: 'FOUNDATION lane EXTRACTOR: build apps/extractor completely per .claude/skills/cv-extraction/SKILL.md (FastAPI, Docling, Tesseract, OpenCV/YuNet, template matcher for the company 履歴書 labels, boto3 S3 I/O, tests with synthetic DOCX/PDF, Dockerfile in deploy/dockerfiles/extractor.Dockerfile). Offline constraints here: huggingface.co and GitHub downloads are unreachable, so Docling models and the YuNet ONNX file cannot be fetched — implement the basic engine first (pdfplumber + python-docx + pytesseract/Tesseract CLI + pdftoppm, face crop with the Haar cascade bundled in opencv-python-headless) and make Docling/YuNet optional extras that load only when their model files exist; tests must pass without them. Own only apps/extractor/** and that Dockerfile.' },
  ]
  const results = await parallel(lanes.map(l => () => run(`${l.prompt}\n\nRead the skills named above first. Stay inside your owned paths; shared files are off limits in this phase.\n\n${RULE}`, { label: `foundation:${l.key}`, agentType: l.agentType, phase: 'Foundation', schema: REPORT })))
  const notes = results.filter(Boolean).flatMap(r => r.integrationNotes || [])
  const integ = await run(`Integrate the three foundation lanes: wire packages/shared messages into apps/web, run migrations + seed against the local Postgres, make pnpm typecheck && pnpm lint && pnpm test && pnpm build pass, start the app and confirm the static pages render at http://saoviet.localhost:3000. Notes from the lanes:\n- ${notes.join('\n- ')}\n\nFix small integration breakage yourself; report anything larger.\n\n${RULE}`, { label: 'integrate:foundation', agentType: 'devops', phase: 'Foundation', schema: REPORT })
  log(`Foundation integrated: ${integ && integ.done ? 'ok' : 'issues: ' + (integ && integ.openIssues.join('; '))}`)
}

// ---------- Phase 3: feature lanes (pipeline: spec → implement → review → fix) ----------
if (PHASES.has('features')) {
  phase('Features')
  const FEATURES = [
    { key: 'auth-tenant', agentType: 'fullstack-dev', skills: ['tenant-auth'], scope: 'better-auth setup, subdomain middleware, getTenant/requireRole helpers, signup (root domain → organization + TenantSettings), login, invitations, members page (settings-members.html), company settings + code format + branding + usage tabs (settings-company.html), audit log. Paths: apps/web/lib/{auth,tenant}*, app/(tenant)/login, app/(public)/signup, app/(tenant)/settings/**, app/api/auth/**, app/api/internal/**.' },
    { key: 'candidates', agentType: 'fullstack-dev', skills: ['rirekisho-schema', 'mockup-to-nextjs'], scope: 'candidates list with filters/bulk bar (candidates.html), add-candidate chooser, the 7-step form with autosave drafts and the AZ123456 code (candidate-form.html), candidate detail with tabs incl. the Japanese <Rirekisho> component, videos tab, documents tab, notes, activity (candidate-detail.html), dashboard KPIs (dashboard.html). Paths: lane tenant-app in CLAUDE.md plus app/(tenant)/dashboard and components/rirekisho/**.' },
    { key: 'share-viewer', agentType: 'fullstack-dev', skills: ['share-links-protection', 'mockup-to-nextjs'], scope: 'share links list, 3-step wizard, share detail with tracking aggregates and viewer log (shares.html, share-new.html, share-detail.html); client viewer gate/list/detail/expired under app/s/[token] with protections, feedback and tracking events API. Paths: lane client-side in CLAUDE.md.' },
    { key: 'media', agentType: 'worker-dev', skills: ['media-pipeline', 'storage-minio'], scope: 'presigned upload routes (photo, documents, video incl. multipart), worker jobs media.transcode (ffmpeg HLS + poster + watermark), render.pages (Playwright on the print route), mail.send, the print route, HLS manifest signing route and the watermarked CV page route used by the viewer, worker Dockerfile. Paths: lane media in CLAUDE.md plus app/api/s/[token]/{stream,cv}/**.' },
    { key: 'import', agentType: 'fullstack-dev', skills: ['cv-extraction', 'rirekisho-schema'], scope: 'import flow: upload CV file → ImportJob → worker job extract.cv (calls the extractor, template mapping in TypeScript with Vitest fixtures, Claude structured-output fallback via @anthropic-ai/sdk with claude-opus-5-5 only when template_match is false) → review page (candidate-import.html) → save candidate with photo. Paths: lane extractor in CLAUDE.md plus apps/worker/src/jobs/extract.ts.' },
  ]
  const outcomes = await pipeline(FEATURES,
    f => run(`Write the implementation spec for feature "${f.key}": ${f.scope} Read the mockups it names, CLAUDE.md and the skills: ${f.skills.map(s => `.claude/skills/${s}/SKILL.md`).join(', ')}. ${RULE}`, { label: `spec:${f.key}`, agentType: 'planner', phase: 'Features' }),
    (spec, f) => run(`Implement feature "${f.key}" per this spec. Read the skills first: ${f.skills.map(s => `.claude/skills/${s}/SKILL.md`).join(', ')}. Stay inside the paths listed; do not edit other lanes' files.\n\nSPEC:\n${spec}\n\n${RULE}`, { label: `build:${f.key}`, agentType: f.agentType, phase: 'Features', schema: REPORT }),
    (report, f) => parallel(['tenant isolation & auth', 'simplicity & library reuse', 'mockup & i18n parity'].map(lens => () =>
      run(`Review feature "${f.key}" (files: ${(report && report.files || []).join(', ')}) through the lens "${lens}" using .claude/skills/review-checklist/SKILL.md. Findings only.`, { label: `review:${f.key}:${lens.split(' ')[0]}`, agentType: 'reviewer', phase: 'Features', schema: FINDINGS })))
      .then(rs => ({ report, findings: rs.filter(Boolean).flatMap(r => r.findings).filter(x => x.severity !== 'minor') })),
    (r, f) => r.findings.length === 0 ? r : run(`Fix these review findings in feature "${f.key}" with the smallest change, run pnpm typecheck && pnpm test:\n${r.findings.map(x => `- [${x.severity}] ${x.file}:${x.line || ''} ${x.problem} → ${x.fix}`).join('\n')}\n\n${RULE}`, { label: `fix:${f.key}`, agentType: f.agentType, phase: 'Features', schema: REPORT }).then(fix => ({ ...r, fix })),
  )
  const incomplete = FEATURES.filter((f, i) => !outcomes[i] || !(outcomes[i].report && outcomes[i].report.done))
  log(`Features: ${FEATURES.length - incomplete.length}/${FEATURES.length} done${incomplete.length ? ' — incomplete: ' + incomplete.map(f => f.key).join(', ') : ''}`)
}

// ---------- Phase 4: integration + QA loop ----------
if (PHASES.has('integration')) {
  phase('Integration & QA')
  let qa = null
  for (let round = 1; round <= 3; round++) {
    const integ = await run(`Integration round ${round}: pull every lane together — nav links, env, migrations, seed, pnpm typecheck && pnpm lint && pnpm test && pnpm build, start web + worker + extractor in the background (logs to files) against the local services, smoke-test dashboard, candidates, candidate form, shares, share-new, a viewer link. Fix integration breakage; report what remains. Read .claude/skills/run-and-verify/SKILL.md.${qa ? `\n\nPrevious QA failures to address first:\n${qa.failures.map(x => `- ${x.flow}: ${x.actual} (expected ${x.expected}) suspect ${x.suspectFile || '?'}`).join('\n')}` : ''}\n\n${RULE}`, { label: `integrate:${round}`, agentType: 'devops', phase: 'Integration & QA', schema: REPORT })
    qa = await run(`QA round ${round}: run the checks and the four Playwright flows from .claude/skills/run-and-verify/SKILL.md (write missing e2e tests), the 5-language check and the 400px check. Report pass/fail with exact reproduction steps. Integrator notes: ${integ && integ.summary}`, { label: `qa:${round}`, agentType: 'qa', phase: 'Integration & QA', schema: QA })
    log(`QA round ${round}: ${qa && qa.passed ? 'PASSED' : (qa ? qa.failures.length + ' failures' : 'no result')}`)
    if (!qa || qa.passed) break
    if (qa.failures.length) {
      await parallel(qa.failures.slice(0, 6).map((fail, i) => () => run(`Fix this QA failure with the smallest change and add/adjust a test: flow ${fail.flow}; steps ${fail.steps}; expected ${fail.expected}; actual ${fail.actual}; suspect ${fail.suspectFile || 'unknown'}. Run pnpm typecheck && pnpm test.\n\n${RULE}`, { label: `fix:qa${round}.${i + 1}`, agentType: 'fullstack-dev', phase: 'Integration & QA', schema: REPORT })))
    }
  }
}

// ---------- Phase 5: whole-repo review with adversarial verification ----------
if (PHASES.has('review')) {
  phase('Review')
  const LENSES = ['tenant isolation & auth', 'simplicity & library reuse', 'mockup & i18n parity', 'protection & privacy']
  const raw = (await parallel(LENSES.map(lens => () => run(`Review the whole Rireki repo (git log, apps/**, packages/**) through the lens "${lens}" per .claude/skills/review-checklist/SKILL.md. Findings only, blockers and majors first.`, { label: `review:${lens.split(' ')[0]}`, agentType: 'reviewer', phase: 'Review', schema: FINDINGS })))).filter(Boolean).flatMap(r => r.findings)
  const seen = new Set()
  const unique = raw.filter(f => { const k = key(f); if (seen.has(k)) return false; seen.add(k); return true })
  const verified = await pipeline(unique.filter(f => f.severity !== 'minor'),
    f => parallel([0, 1].map(i => () => run(`Try to REFUTE this review finding by reading the code (${f.file}:${f.line || ''}): "${f.problem}". Default to real=false only if you can show it is wrong or already handled.`, { label: `verify:${i + 1}:${f.file.split('/').pop()}`, agentType: 'reviewer', phase: 'Review', effort: 'high', schema: VERDICT }))).then(v => ({ ...f, real: v.filter(Boolean).filter(x => x.real).length >= 1 })),
  )
  const confirmed = verified.filter(Boolean).filter(f => f.real)
  log(`Review: ${raw.length} raw → ${unique.length} unique → ${confirmed.length} confirmed (blockers/majors)`)
  if (confirmed.length) {
    await run(`Fix these confirmed findings with the smallest changes, run pnpm typecheck && pnpm lint && pnpm test && pnpm build:\n${confirmed.map(x => `- [${x.severity}] ${x.file}:${x.line || ''} ${x.problem} → ${x.fix}`).join('\n')}\n\n${RULE}`, { label: 'fix:review', agentType: 'fullstack-dev', phase: 'Review', schema: REPORT })
    const final = await run(`Final check after review fixes: run pnpm typecheck && pnpm lint && pnpm test && pnpm build and the Playwright flows; report pass/fail.`, { label: 'qa:final', agentType: 'qa', phase: 'Review', schema: QA })
    log(`Final QA: ${final && final.passed ? 'PASSED' : 'FAILED'}`)
    return { confirmedFindings: confirmed, finalQa: final }
  }
  return { confirmedFindings: [], finalQa: 'no blockers/majors found' }
}
return 'done'
