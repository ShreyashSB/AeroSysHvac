# Aerosys HVAC — Project & Operations Management (Phase 1 prototype)

A functional web prototype of Aerosys HVAC's internal system for **projects, site engineers, assignments,
expenses, instruments, costs, progress, profitability and dashboards**.

It runs entirely in the browser. Data is seeded with realistic sample records on first load and persisted
to `localStorage`, so everything you create or change survives a page refresh. No backend is required.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

To restore the original sample data, go to **Settings → Reset demo data**.

## Demo walkthrough (about 5 minutes)

1. **Sign in** as *Management* (Rajesh Kulkarni). The dashboard KPIs (contract value, cost, profit,
   margin, average completion) are all calculated from the project records. None are hardcoded.
2. **Projects → Create project.** Submit the empty form to see validation, then fill it in and pick a
   project manager. The project appears in the list, the dashboard totals update, and it can now take
   engineer assignments and expenses.
3. **Open the project → Team → Assign engineer.** Pick an engineer (the list shows how much of each
   engineer's time is already allocated) and an allocation %. Labour cost starts accruing from the start date.
4. **Expenses tab → Add expense** for that engineer, attaching a receipt (the upload is simulated locally).
   The expense goes in as **Pending** and the project manager and accounts are notified.
5. **Approve** the expense. The *Cost to date*, *Estimated profit* and *Costs* tab update straight away,
   and so do the dashboard totals.
6. **Progress tab** → click 25% / 50% / … or use the slider. The dashboard's average completion updates.
   Setting 100% completes the project and closes its assignments.
7. Use the **Demo role** switcher in the top bar and pick *Site Engineer* (Vikram Patil). The navigation
   shrinks to *My Projects / My Expenses / My Instruments*. Financials are hidden and the engineer
   dashboard shows the new assignment.
8. Switch to *Project Manager* or *Accounts* to see the scoped views. A PM only sees and approves
   expenses for their own projects. Accounts sees finance and reports but cannot approve.
9. **Reports** has project performance, the expense report, engineer utilisation and profitability, each
   with filters and **Export CSV** (the file opens in Excel).

## Roles

| Role | Can see / do |
| --- | --- |
| Management | Everything: all projects, costs, profit, employees, salaries, reports, approvals, settings |
| Project Manager | Own projects, engineer assignment, expense approval for own projects, instruments, progress, project costs |
| Site Engineer | Assigned projects (no financials), progress updates, own expenses, own instruments |
| Accounts | All projects' costs and profitability, all expenses (view), employees and salaries, financial reports |

Permissions live in `src/auth/permissions.ts`. The UI reads capability flags such as `can("expense.approve")`,
and project rows are scoped per user by `scopeProjects()`.

## Costing rules

Implemented as pure functions in `src/domain/costing.ts`:

```
Total Cost       = Labour + Material + Engineer Expenses + Travel/Accommodation + Instrument/Equipment + Other
Estimated Profit = Contract Value − Total Cost
Profit Margin    = Estimated Profit ÷ Contract Value × 100
Forecast cost    = Total Cost + Budget × (1 − completion)      (estimate at completion)
```

- **Labour**: each engineer's monthly salary × allocation % × days assigned (up to today), plus sub-contract labour entries.
- **Material / Other**: direct project cost entries (Project → Costs → *Add cost*).
- **Engineer expenses / Travel & accommodation**: only **approved** expenses count. Pending ones are shown separately.
- **Instruments**: purchase value × monthly usage rate (Settings, default 3%) for each day the instrument is deployed on the project.

## Architecture

```
src/
  types/models.ts        Domain model: User, Employee, Project, ProjectAssignment, Expense,
                         Instrument, ProjectInstrument, ProjectCost, AppNotification, AppSettings
  api/
    seed.ts              Realistic, internally consistent sample data (dates relative to today)
    mockDb.ts            localStorage "database" + simulated network latency
    http.ts              Stub HTTP client for the future REST backend
  services/              Data-access layer, one module per resource (REST-shaped, async)
  domain/costing.ts      Pure cost / profit / portfolio calculations
  auth/                  Session, demo role switching, permissions & row-level scoping
  hooks/
    queries.ts           TanStack Query hooks per resource
    mutations.ts         Mutations with cache invalidation + error toasts
    useAppData.ts        Joins resources and derives financials for the UI
  components/
    ui/                  Button, Input/Select, Dialog/Drawer, Tabs, Dropdown, Badge, Card…
    common/              DataTable (sort + paging), filters, empty/error states, confirm dialog…
    layout/              App shell, collapsible sidebar, top bar, global search, notification center
  features/              Forms and widgets per module (projects, expenses, instruments, employees, dashboard)
  pages/                 Route-level pages (code-split)
```

**Tech:** React 19, TypeScript, Vite, Tailwind CSS v4, Radix UI primitives (shadcn-style components),
TanStack Query, React Router, Recharts, Sonner toasts, lucide icons.

### Connecting a real backend

Components never touch storage directly. They go through `src/services/*`, whose methods already match REST endpoints:

| Service method | Endpoint |
| --- | --- |
| `projectService.list / get / create / update / remove` | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| `projectService.updateProgress` | `PATCH /api/projects/:id/progress` |
| `assignmentService.assign / release` | `POST /api/projects/:id/assignments`, `DELETE /api/assignments/:id` |
| `expenseService.create / approve / reject` | `POST /api/expenses`, `POST /api/expenses/:id/approve`, `…/reject` |
| `instrumentService.assign / returnInstrument / setStatus` | `POST /api/instruments/:id/assign`, `…/return`, `PATCH …/status` |

To connect a backend, replace each method body with a call through `src/api/http.ts`. For example,
`list: () => http.get<Project[]>("/api/projects")`. Pages, forms and hooks stay as they are.
Business side effects that currently run in the mock services, such as notifications and closing
assignments when a project completes, would move to the server.

## Out of scope for Phase 1

Payroll, GST/tax, full accounting, procurement/inventory ERP, CRM, advanced HR, native mobile apps and AI features.
