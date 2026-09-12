# Specification — Dompet Keluarga (Family Finance)

Version: 1.0
Status: Draft for MVP implementation

---

## 1. Product Overview

A web app for couples to manage household finances in one place:

- Combine all household income (husband's + wife's salary + other sources) into a single figure.
- Record expenses with categories.
- Set per-category budgets and see the remaining budget in real time.
- View cash-flow and spending-distribution reports per period.

Core goal: **control before spending**, not merely an archive of past spending.

### Non-goals (MVP)
- No bank-account linking / automatic transaction import (manual entry first).
- No investment/portfolio tracking.
- No multi-currency (Rupiah only).

---

## 2. User Roles

| Role    | Permissions                                                              |
|---------|--------------------------------------------------------------------------|
| OWNER   | Full access: manage members, categories, budgets, delete transactions, invite members |
| MEMBER  | Create & edit own transactions, view all data, manage budgets & goals    |
| VIEWER  | Read-only — suitable for children / additional members                   |

MVP needs only OWNER + MEMBER. VIEWER can be added later.

---

## 3. Business Rules (Core Logic)

All calculations run server-side (services layer), never in the frontend.

### 3.1 Currency & precision
- All amounts are stored as **integer Rupiah** (never float). Example: Rp 1,500,000 = `1500000`.
- Hard rule: no float/double types for money (avoids rounding errors).

### 3.2 Cash flow
```
total_income   = Σ INCOME transactions in period
total_expense  = Σ EXPENSE transactions in period
cash_flow      = total_income − total_expense
```
- Positive `cash_flow` = surplus, negative = deficit.

### 3.3 Budget usage
```
category_usage (%) = (Σ EXPENSE in category within period ÷ budget limit) × 100
```
- 0–79%  : safe
- 80–99% : warning ("almost depleted")
- ≥100%  : over budget

### 3.4 Savings rate
```
savings_rate (%) = (total_savings ÷ total_income) × 100
```
`total_savings` is computed from transactions in the `SAVINGS` category group. For MVP, use the
category group `SAVINGS`.

### 3.5 Health score (v2, optional)
A 0–100 score combining: savings rate, debt-to-income ratio, budget adherence, and emergency-fund
readiness. Final formula defined at v2 implementation.

### 3.6 Default allocation (50/30/20)
- 50% needs, 30% wants, 20% savings.
- Provided as a template when the user first sets up budgets; users may override the numbers.

---

## 4. Data Model (Database Schema)

Notation follows Prisma style (directly translatable to `schema.prisma`).

### 4.1 User
```
User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String
  createdAt     DateTime @default(now())
}
```

### 4.2 Family (one shared "room" for the couple)
```
Family {
  id        String   @id @default(cuid())
  name      String
  ownerId   String               // → User.id
  createdAt DateTime @default(now())
}
```

### 4.3 FamilyMember (membership of a user in a family)
```
FamilyMember {
  id        String   @id @default(cuid())
  familyId  String               // → Family.id
  userId    String               // → User.id
  role      Role                 // OWNER | MEMBER | VIEWER
  joinedAt  DateTime @default(now())
  @@unique([familyId, userId])
}
```
This design supports multi-family in the future without a large migration.

### 4.4 Category
```
Category {
  id        String   @id @default(cuid())
  familyId  String   @nullable          // null = system (default) category
  name      String
  type      CatType                    // INCOME | EXPENSE
  group     CatGroup                   // NEEDS | WANTS | SAVINGS | INCOME
  parentId  String?                     // for sub-categories
  icon      String?                     // icon name
  color     String?                     // hex for charts
  isSystem  Boolean  @default(false)
}
```
Default EXPENSE system categories: Groceries, Food & Drinks, Transport, Utilities, Installments,
Health, Entertainment. INCOME: Husband's Salary, Wife's Salary, Bonus, Side Business.

### 4.5 Transaction
```
Transaction {
  id          String   @id @default(cuid())
  familyId    String               // → Family.id (required: every query is family-scoped)
  userId      String               // → User.id (who entered it)
  categoryId  String               // → Category.id
  type        CatType              // INCOME | EXPENSE
  amount      Int                  // integer Rupiah, ALWAYS positive
  date        DateTime             // transaction date
  note        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
Required indexes: `(familyId, date)`, `(familyId, categoryId, date)` for reports & filters.

### 4.6 Budget
```
Budget {
  id          String   @id @default(cuid())
  familyId    String               // → Family.id
  categoryId  String               // → Category.id
  limitAmount Int                  // integer Rupiah
  month       String               // "YYYY-MM" (e.g. "2026-09")
  @@unique([familyId, categoryId, month])
}
```

### 4.7 Goal (savings target)
```
Goal {
  id           String    @id @default(cuid())
  familyId     String
  name         String
  targetAmount Int
  deadline     DateTime?
  createdAt    DateTime  @default(now())
}
```
`currentAmount` is not stored — computed from Σ savings transactions linked to the goal (via a
`GoalContribution` table, or a `goalId` column on transactions in the SAVINGS category).

### 4.8 RecurringTransaction (v1)
```
RecurringTransaction {
  id           String   @id @default(cuid())
  familyId     String
  categoryId   String
  name         String
  amount       Int
  interval     Interval          // MONTHLY | WEEKLY
  nextDueDate  DateTime
  isActive     Boolean @default(true)
}
```

### 4.9 Invitation
```
Invitation {
  id        String   @id @default(cuid())
  familyId  String
  email     String
  token     String   @unique         // hashed, sent via link/email
  role      Role     @default(MEMBER)
  status    InvStatus               // PENDING | ACCEPTED | EXPIRED
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 5. API Endpoints (REST, prefix `/api/v1`)

Conventions: JSON request/response, Zod validation, every endpoint scoped to `familyId`
(ownership check required — users must never access another family's data).

### Auth
```
POST /auth/register        body: { email, name, password } → creates user + family
POST /auth/login           body: { email, password } → session
POST /auth/logout
GET  /auth/me              → user + active family
```

### Family
```
GET    /family/me                 → family details + my role
POST   /family                    → create a family (if user has none)
POST   /family/invite             body: { email } → send invitation
POST   /family/join               body: { token } → accept invitation
GET    /family/members            → member list
PATCH  /family/members/:id        body: { role } (OWNER only)
DELETE /family/members/:id        (OWNER only)
```

### Categories
```
GET    /categories                → all categories (system + custom)
POST   /categories                body: { name, type, group, parentId?, icon?, color? }
PATCH  /categories/:id            body: partial
DELETE /categories/:id            → rejected if still used by transactions
```

### Transactions
```
GET    /transactions              query: month, categoryId, type, page, limit
POST   /transactions              body: { categoryId, type, amount, date, note? }
PATCH  /transactions/:id
DELETE /transactions/:id
```
List responses are paginated: `{ data: [...], total, page, limit }`.

### Budgets
```
GET    /budgets?month=2026-09     → budget per category + usage (%)
POST   /budgets                   body: { categoryId, month, limitAmount }
PATCH  /budgets/:id               body: { limitAmount }
```

### Goals
```
GET    /goals                     → goals + progress (target, saved, %)
POST   /goals                     body: { name, targetAmount, deadline? }
PATCH  /goals/:id
POST   /goals/:id/contribute      body: { amount } → records savings transaction to goal
```

### Reports
```
GET /reports/summary?month=       → { total_income, total_expense, cash_flow, savings_rate }
GET /reports/by-category?month=   → [{ categoryId, name, total, percent }]
GET /reports/trend?months=12      → [{ month, income, expense }] for 12-month chart
```

### Recurring (v1)
```
GET/POST/PATCH/DELETE  /recurring-transactions
```

---

## 6. Pages (Frontend)

| Route           | Content                                                             |
|-----------------|---------------------------------------------------------------------|
| `/login`        | Login form                                                          |
| `/register`     | Sign-up; automatically creates the first family                     |
| `/dashboard`    | Current balance, this month's remaining budget, top spending, chart |
| `/transactions` | List + filters (month/category) + add/edit/delete modal             |
| `/budget`       | Per-category progress bars, set/edit limit form                     |
| `/reports`      | Per-category pie chart + 12-month trend                             |
| `/goals`        | Target list + progress                                              |
| `/settings`     | Profile, family members, invite partner, manage categories          |

---

## 7. Non-Functional Requirements

- **Performance**: monthly reports must respond < 300 ms for 10,000 transactions (use indexes +
  SQL aggregation).
- **Security**: passwords hashed (bcrypt), session via httpOnly cookie, every query scoped by
  `familyId`.
- **Timezone**: month boundaries use local time (Asia/Jakarta), not UTC.
- **Validation**: all API input validated with Zod; the frontend is never the only validation layer.
- **Responsive**: mobile-first layout (partners will use phones).

---

## 8. Testing Strategy

- **Unit (Vitest)**: domain logic — cash-flow, budget %, savings rate, integer rounding.
- **Integration**: API + a real test database (Postgres) — CRUD, ownership isolation between families.
- **E2E (Playwright)**: happy paths — register → invite partner → record → set budget → view report.

Coverage targets: 100% domain logic, > 80% core API endpoints.

---

## 9. Roadmap Phases

**MVP (focus):** two-user auth + invite, family, categories, transaction CRUD, per-category
budget, dashboard, summary + by-category reports.

**v1:** recurring transactions, savings goals, budget notifications, transaction search/filter.

**v2:** receipt OCR scanning, WhatsApp/email input, health score & savings rate, multi-family,
CSV/PDF export.
