# Dompet Keluarga — Family Finance Management

A web app for couples to manage household finances together: track combined income, expenses,
and per-category budgets so money decisions happen *before* spending, not after the fact.

Built as a portfolio project: clean architecture, end-to-end type safety, and clear documentation.

---

## Problem it solves

Most people only find out where their money went *after* the month ends. This app moves control
to the front: every category has a budget limit, and the remaining budget is visible in real time
before the next purchase.

Household finance has one specific pain point: partners often hold *different versions* of the
same numbers. The solution is a shared ledger — two accounts, one source of truth.

---

## Tech Stack

| Layer        | Technology                         | Why                                                              |
|--------------|------------------------------------|------------------------------------------------------------------|
| Framework    | Next.js 14 (App Router)            | Industry standard, SSR/SEO, one codebase for frontend + backend |
| Language     | TypeScript (strict)                | End-to-end type safety; strong signal in a portfolio             |
| Database     | PostgreSQL                         | Relational; well-suited to transactional financial data         |
| ORM          | Prisma                             | Migrations + type safety + query builder; de-facto standard      |
| Auth         | NextAuth.js (Auth.js)              | Login + sessions + invites; self-hosted, free                    |
| Validation   | Zod                                | Single source of truth for API + form input validation           |
| Data fetching| TanStack Query (React Query)       | Caching and revalidation of server state                         |
| UI           | Tailwind CSS + shadcn/ui           | Fast, polished UI with ready-made components                     |
| Charts       | Recharts                           | Pie/bar charts for reports                                       |
| Testing      | Vitest + Testing Library + Playwright | Unit, integration, and E2E coverage                            |
| CI/CD        | GitHub Actions                     | Lint + typecheck + test on every push                            |
| Deploy       | Vercel + Neon (Postgres)           | Free tier, auto-deploy from GitHub                               |

### Lighter alternative (to start faster)

- Frontend: React + Vite + TypeScript (no SSR)
- Backend: Express/Fastify + Prisma (separate REST API)
- Easier for beginners, but full-stack Next.js carries more portfolio weight because it
  demonstrates mastery of one modern framework end to end.

---

## Architecture (high level)

```
[Browser]  →  [Next.js App Router]
                 ├── /api/*  (Route Handlers = REST API)
                 │      ↓  (Zod validation)
                 ├── services/  (domain logic: budgeting, health score, reports)
                 │      ↓  (Prisma Client)
                 └── [PostgreSQL]
```

Separation of concerns:
- `app/api/*` → receives requests, validates input, returns responses. No business logic.
- `services/*` → all financial rules (remaining budget, savings rate, health score). Pure,
  testable functions.
- `prisma/` → database schema + migrations.

Why separate: isolated business logic is easy to test and easy to explain in an interview
("I keep domain logic out of the transport layer so it's testable").

---

## Project Structure (planned)

```
dompet-keluarga/
├── prisma/
│   └── schema.prisma          # data models + migrations
├── src/
│   ├── app/                   # routes (pages + API route handlers)
│   │   ├── (auth)/login
│   │   ├── (auth)/register
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── budget/
│   │   ├── reports/
│   │   ├── goals/
│   │   ├── settings/
│   │   └── api/v1/            # REST endpoints
│   ├── components/            # UI components (shadcn/ui)
│   ├── services/              # domain logic (testable)
│   ├── lib/                   # prisma client, auth, helpers
│   └── types/
├── tests/
│   ├── unit/                  # Vitest
│   ├── integration/           # API + DB
│   └── e2e/                   # Playwright
├── docs/
│   └── SPEC.md                # full specification (see this file)
├── .github/workflows/ci.yml
└── README.md
```

---

## Roadmap

- **MVP** — two-user login + one family, income/expense tracking, categories, per-category
  budgets, dashboard, monthly reports.
- **v1** — recurring transactions, savings goals, budget alerts, search & filters.
- **v2** — receipt scanning (OCR), WhatsApp/email input, health score & savings rate,
  multi-family support.

---

## Documentation

Full specification (requirements, data model, API, business rules, testing, security):
see [docs/SPEC.md](docs/SPEC.md).
