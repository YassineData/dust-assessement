# Dust · AI Maturity Assessment

**Deploy with data, not guesswork.**
A survey of less than 5 minutes sent to a client before (or during) a Dust rollout. It tells the deployment team where each team stands with AI, who can build, who will drive adoption, and what to roll out first. A second pass a few months later measures progress.

Live: **https://dust-assessment.com**

## What it does

| For | What they get |
|---|---|
| **Respondents** (client employees) | A short survey (EN / FR): about them, a few open questions, then 26 statements across 9 dimensions. No account. They get their own AI profile at the end. |
| **Dust team** (Deployment, CS, Sales) | A console per campaign: readiness index vs benchmark, results by team, builders / champions / trainers / sponsors, a rollout plan per profile, comparisons with past rollouts and sectors, exports. |
| **Client manager** | A private results link (`/results?key=…`): all results of their campaign only, live, without the Dust team's settings. Plus a one-pager to forward the survey to their teams. |

Results read in three blocks: **starting point** (where the account stands) → **people** (who to rely on) → **rollout plan** (what to do, with whom).

## Main routes

| Route | What |
|---|---|
| `/` | Landing page (pitch, video, ROI calculator) |
| `/assessment?code=XXXX` | The survey. Add `&for=sales` or `&for=cs` for the Sales / Customer Success versions |
| `/exemple`, `/exemple/sales`, `/exemple/cs` | Preview of the survey, nothing is saved |
| `/dashboard` | Console for the Dust team (admin key). "Try the platform" opens it with sample data |
| `/results?key=…` | Client manager view of one campaign (private link from the Share page) |
| `/create-campaign` | Create a campaign link (Dust team only) |
| `/kit?code=XXXX&company=…&variant=deployment\|sales` | One-pager for the client champion (prints to PDF) |
| `/film/index.html` | The 2 min 30 pitch and demo video |

## Where things live

- `src/lib/assessment-v2.ts`: the questionnaire (statements, dimensions, context and open questions), scoring, roles and result classes, survey headers per team
- `src/pages/Assessment.tsx`: the survey flow
- `src/pages/Dashboard.tsx` and `src/components/console/`: the console
- `src/pages/Index.tsx`: the landing page
- `src/pages/ChampionKit.tsx`: the one-pagers
- `src/demo/demo-data.ts`: sample data for the demo mode (fictional companies)
- `public/film/`: the pitch video (HTML canvas, voice-over in `vo/`)

## Run it locally

Requires Node.js 18+.

```sh
npm install
npm run dev      # http://localhost:8080
npm run build    # production build in dist/
```

Environment variables (`.env` locally, Vercel settings in production):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Without them, the landing page and the demo mode still work.

## Stack and hosting

Vite, React, TypeScript, Tailwind CSS, shadcn/ui. Data in Supabase (Postgres). Hosted on Vercel: every push to `main` deploys to production.

## Data and access

Data lives in a dedicated Supabase project secured with row level security (`supabase/dust-secure-setup.sql`):

- nothing is publicly readable; respondents only write their own answers (per-browser token);
- the Dust team signs in with an admin key, stored hashed in the database;
- each client manager only sees their own campaign through a private results link.

Email login for `@dust.tt` addresses is built but off (`supabase/002-dust-email-login.sql`, `VITE_EMAIL_LOGIN=true`): it needs an email service (e.g. Resend) and the Supabase auth hook.

## Status

Prototype, in test with the Dust deployment team.
