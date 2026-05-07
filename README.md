# CIS — Customer Information Sheet System

Internal customer onboarding platform for **Oracle Petroleum**. Replaces the manual Jotform-based workflow with a structured, role-based web system where sales agents submit customer information sheets on behalf of prospective customers, and internal stakeholders review and approve those submissions through a traceable approval chain.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (@base-ui/react) |
| Auth | NextAuth v5 (JWT sessions) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon, via `postgres` npm package) |
| File Storage | Vercel Blob |
| Validation | Zod v4 |
| Email | Nodemailer + Gmail |
| Animations | Framer Motion |

---

## Roles

| Role | Dashboard | Description |
|------|-----------|-------------|
| `sales_agent` / `rsr` | `/agent` | Submits CIS forms; fills agent section after customer completes the form |
| `sales_manager` / `rsr_manager` | `/manager` | Views team submissions — **read-only, no workflow actions** |
| `finance_reviewer` | `/finance` | Reviews documents, sets credit evaluation, forwards to approver or returns to agent |
| `legal_approver` | `/legal` | Reviews dealer accounts for legal compliance; forwards to finance or returns to agent |
| `senior_approver` | `/approver` | Final decision — approve or deny |
| `sales_support` | `/support` | Fills account type, price lists, VAT details after approval |
| `project_development_specialist` | `/specialist` | Marks customer as encoded in ERP |
| `admin` | `/admin` | Full visibility; user management; can ERP-encode |

---

## Workflow

### Standard (non-dealer)

```
Customer fills form
       ↓
Agent fills agent section
       ↓
Finance Reviewer (forward / return)
       ↓
Senior Approver (approve / deny)
       ↓
Sales Support fills out account details
       ↓
Specialist encodes in ERP
```

### Dealer

```
Customer fills form
       ↓
Agent fills agent section
       ↓
Legal Approver (forward / return)
       ↓
Finance Reviewer (forward / return)
       ↓
Senior Approver (approve / deny)
       ↓
Sales Support fills out account details
       ↓
Specialist encodes in ERP
```

### Return / Resubmit

Finance or Legal can return a form to the agent. The agent uploads replacement documents for rejected items and resubmits. The form routes back to the same reviewer.

### Denial

Only the Senior Approver can deny. Denial is terminal — no resubmission allowed.

### Status Lifecycle

```
draft
  → submitted
  → pending_legal_review (dealer)  ─┐
  → pending_finance_review          ├→ pending_approval → approved → pending_erp_encoding → erp_encoded
                                   ─┘
                                        ↘ denied (terminal)
  → returned (agent resubmits)
```

---

## Project Structure

```
app/
├── (auth)/              # Login, register, change-password pages
├── (customer)/          # Public customer-facing form (no auth required)
├── (staff)/             # Role-based dashboards
│   ├── agent/
│   ├── manager/         # Read-only view of team submissions
│   ├── finance/
│   ├── legal/
│   ├── approver/
│   ├── support/
│   ├── specialist/
│   └── admin/
└── api/
    ├── auth/            # NextAuth + register + change-password
    ├── cis/[id]/        # Workflow actions, doc review, finance save, archive
    └── admin/           # User management, CIS delete

components/
├── actions/             # Per-role action forms (fill-out, forward, return, approve, deny, encode)
├── admin/               # User management table, create user form
├── ui/                  # shadcn/base-ui primitives
├── app-sidebar.tsx      # Collapsible sidebar with role info and navigation
├── staff-shell.tsx      # Shared layout shell for all staff dashboards
├── cis-card.tsx         # Submission list card with status badge
├── cis-info-card.tsx    # Full CIS detail view
├── audit-timeline.tsx   # Workflow event history with actor avatars
├── workflow-stepper.tsx # Approval-chain progress indicator
├── workflow-handoff.tsx # "Currently with / Will forward to" role pills
├── doc-upload-slot.tsx  # Per-document upload slot
├── agent-doc-section.tsx # Document section with review/rejection interface
├── points-breakdown-panel.tsx # Finance credit scoring breakdown
├── rejected-docs-summary.tsx  # Shows rejected documents on returned forms
└── customer-form.tsx    # Multi-section customer-facing form

lib/
├── auth.ts              # NextAuth config, role routing, middleware
├── db/schema.ts         # Drizzle schema — all tables and enums
├── workflow.ts          # transitionCis() — status transitions + notifications
├── cached-queries.ts    # Dashboard stat queries (10–30s cache)
├── doc-types.ts         # Document slot definitions and scoring doc list
├── email.ts             # HTML email builder and Gmail sender
└── agent-codes.ts       # Agent code utilities

drizzle/                 # SQL migration files
scripts/
├── seed-demo.ts         # Seeds demo users and submissions
├── migrate-account-management.ts
└── reset-data.ts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Vercel Blob store (for file uploads)
- Gmail account with an App Password (for email notifications)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the root:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# NextAuth
AUTH_SECRET=your-nextauth-secret
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Signature verification
SIGNATURE_HMAC_SECRET=your-hmac-secret

# File storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Email (Gmail + App Password)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

### 3. Run database migrations

```bash
npx drizzle-kit migrate
```

### 4. Seed demo data

```bash
npm run seed:demo           # seed demo users and submissions
npm run seed:demo:reset     # reset and re-seed
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Design Decisions

- **Customer type drives routing** — `dealer` routes through Legal first; all others go directly to Finance
- **Manager role is read-only** — managers can view their team's submissions but have no workflow actions
- **Agent code auto-stamping** — the agent's code is pulled from their profile and permanently stamped on each CIS record at creation
- **Finance requires CFO-signed upload** — `docSirRestySigned` must be uploaded before finance can forward to the Senior Approver
- **Returned forms allow resubmission** — agents must upload replacement docs for any rejected documents before resubmitting; the form routes back to the same reviewer
- **Denial is terminal** — only the Senior Approver can deny; no resubmission path exists after denial
- **Audit trail on every action** — every status transition is logged in `workflowEvents` with actor, action, note, and timestamp
- **Both email and in-app notifications** — every workflow event triggers notifications to relevant parties via Gmail (Nodemailer) and the in-app notification system
- **Vercel Blob for file storage** — all document uploads go to Vercel Blob; the DB stores the full blob URLs as JSONB arrays
- **`isTopManager` flag** — managers with this flag can see all agents' submissions, not just their assigned agents
- **`mustChangePassword` gate** — admin-created accounts require a password change on first login before accessing any page

---

## Database Tables

| Table | Description |
|-------|-------------|
| `users` | All platform users — role, agent code, manager assignment, active status |
| `cisSubmissions` | CIS form data, status, all document URLs (JSONB), finance evaluation, sales support fields |
| `workflowEvents` | Full audit log of every action on every form |
| `notifications` | In-app and email notification records per recipient |

---

## Deployment

Deployed on Vercel. Required environment variables (Settings → Environment Variables):

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` (set to your production URL)
- `AUTH_TRUST_HOST=true`
- `SIGNATURE_HMAC_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

---

## Further Documentation

See [`AGENTS.md`](./AGENTS.md) for the full technical reference including complete workflow steps, all API routes, database schema details, action components per role, and auth/notification details.

---

## License

Private — Oracle Petroleum Corporation. All rights reserved.
