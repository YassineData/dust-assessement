# Dust · AI Maturity Assessment

**Deploy with data, not guesswork.**
An 8-minute survey sent to a client before (or during) a Dust rollout. It tells the deployment team where each team stands with AI, who can build, who will drive adoption, and what to roll out first. A second pass a few months later measures progress.

Live: **https://dust-assessment.com**

## What it does

| For | What they get |
|---|---|
| **Respondents** (client employees) | A short survey (EN / FR): a few context questions, 35 statements across 9 dimensions, optional open questions. No account. They get their own AI profile at the end. |
| **Dust team** (Deployment, CS, Sales) | A console per campaign: readiness index vs benchmark, results by team, builders / champions / trainers / sponsors, a rollout plan per profile, comparisons with past rollouts and sectors, exports. |
| **Client contact** | A private results link to follow answers live, and a one-pager to forward the survey to their teams. |

Results read in three blocks: **starting point** (where the account stands) → **people** (who to rely on) → **rollout plan** (what to do, with whom).

## Main routes

| Route | What |
|---|---|
| `/` | Landing page (pitch, video, ROI calculator) |
| `/assessment?code=XXXX` | The survey. Add `&for=sales` or `&for=cs` for the Sales / Customer Success versions |
| `/exemple`, `/exemple/sales`, `/exemple/cs` | Preview of the survey, nothing is saved |
| `/dashboard` | Console. "Try the platform" opens it with sample data |
| `/create-campaign` | Create a campaign link (Dust team) |
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

## Status

Prototype, in test with the Dust deployment team. Before sending to real clients, the data access is being moved to a dedicated Supabase project with row level security (branch `secure-database`): respondents only write their own answers, the Dust team uses an admin key, and each client only sees its own campaign through a private link.
