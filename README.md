# CRS — Customer Registration System

Internal customer onboarding platform for the **Oracle Petroleum Toll Blend Division**. Replaces the manual Jotform-based workflow with a structured, role-based web system where sales agents submit customer registration forms on behalf of prospective customers, and internal stakeholders review, endorse, and approve or deny those submissions through a traceable approval chain.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (@base-ui/react) |
| Auth | NextAuth v5 (JWT sessions) |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon, via `postgres` npm package) |
| File Storage | Vercel Blob |
| Validation | Zod v4 |
| Notifications | Sonner (toast) |
| Font | DM Sans |

---

## Roles

| Role | Dashboard | Description |
|---|---|---|
| `sales_agent` / `rsr` | `/agent` | Initiates CRS forms and shares the customer link |
| `sales_manager` / `rsr_manager` | `/manager` | Endorses or returns submissions from their agents |
| `finance_reviewer` | `/finance` | Reviews customer credit and business standing |
| `legal_approver` | `/legal` | Handles FS Petroleum and special customer types |
| `senior_approver` | `/approver` | Final approval authority |
| `sales_support` | `/support` | Notified on denial; assists agents |
| `admin` | `/admin` | Full visibility; manages users, roles, and assignments |

---

## Workflow

```
Agent initiates CRS → customer receives shareable link
         ↓
Customer fills out and submits the form
         ↓
    customer_type?
   /              \
Standard        FS Petroleum / Special
   ↓                    ↓
Manager             Legal Approver
(endorse/return)   (forward/deny)
   ↓                    ↓
        Finance Reviewer
        (forward/deny)
              ↓
        Senior Approver
        (approve/deny)
        ↙           ↘
  ERP Encode      Sales Support
  (notify all)    (notifies agent)
```

### Status Lifecycle

```
draft → submitted → pending_endorsement → pending_finance_review → pending_approval → approved → erp_encoded
                 → pending_legal_review ↗                                          ↘ denied
                                                                                   ↘ returned
```

---

## Project Structure

```
app/
├── (auth)/              # Login and register pages
├── (customer)/          # Public customer-facing form (no auth required)
├── (staff)/             # Role-based dashboards
│   ├── agent/
│   ├── manager/
│   ├── finance/
│   ├── legal/
│   ├── approver/
│   ├── support/
│   ├── admin/
│   └── profile/         # Avatar upload and account info page
└── api/
    ├── auth/            # NextAuth + register
    ├── cis/             # CRS CRUD, workflow actions, export, per-submission docs
    ├── form/            # Public token-based form submission + document upload
    ├── notifications/   # In-app notification system
    └── profile/         # Avatar upload/removal, profile edit, password change

components/
├── actions/             # Per-role action buttons (endorse, approve, deny, etc.)
├── admin/               # User management table
├── ui/                  # shadcn/base-ui components
├── navbar.tsx           # Sticky nav with notification bell and avatar
├── app-sidebar.tsx      # Collapsible sidebar with role info and navigation
├── staff-shell.tsx      # Shared layout shell for all staff dashboards
├── cis-card.tsx         # Submission list card
├── cis-card-skeleton.tsx # Animated skeleton placeholder for loading states
├── cis-info-card.tsx    # Full CRS detail view
├── audit-timeline.tsx   # Workflow event history with actor avatars
├── dashboard-filters.tsx # URL-param search + status filter bar
├── dashboard-pagination.tsx # Pagination controls for list views
├── status-badge.tsx     # Status pill with animated dot indicator
├── workflow-stepper.tsx  # Horizontal approval-chain progress indicator
├── workflow-handoff.tsx  # "Currently with / Will forward to" role pills
├── signature-pad.tsx    # Canvas-based signature capture component
├── doc-upload-slot.tsx  # Per-document upload slot with drag-and-drop
├── agent-doc-section.tsx # Document section for agent-side submissions
└── customer-form.tsx    # Multi-section customer-facing form

lib/
├── auth.ts              # NextAuth config
├── db/                  # Drizzle client + schema
├── validations/         # Zod schemas (cis, profile)
├── workflow.ts          # transitionCis() — status transitions + notifications
├── doc-types.ts         # Document type definitions, column map, expiration rules
├── document-expiration.ts # Expiration date helpers
├── scoring.ts           # Finance credit scoring logic
├── signature-integrity.ts # Signature hash/verification utilities
├── button-variants.ts   # buttonVariants helper for server components
└── utils.ts             # cn(), formatDistanceToNow()

scripts/
├── seed-admin.ts        # Seeds the first admin account
├── migrate-cis-form-fields.ts
└── migrate-customer-type-fields.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Vercel Blob store (for file uploads)

### 1. Clone the repository

```bash
git clone https://github.com/Cedie99/CRS.git
cd CRS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the root:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3001
SIGNATURE_HMAC_SECRET=your-hmac-secret
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

- `DATABASE_URL` — Neon (or any PostgreSQL) connection string
- `AUTH_SECRET` — random string for NextAuth session signing
- `NEXTAUTH_URL` — base URL of the app (use port 3001 locally)
- `SIGNATURE_HMAC_SECRET` — secret for signature integrity hashing
- `BLOB_READ_WRITE_TOKEN` — from Vercel dashboard → Storage → your Blob store → `.env.local` tab

### 4. Push the database schema

```bash
npx drizzle-kit push
```

### 5. Seed the admin account

```bash
npx tsx scripts/seed-admin.ts
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

---

## Key Design Decisions

- **Self-registration with admin activation** — new users register but start inactive; an admin must assign their role, agent code, and manager before they can log in
- **Agent code auto-stamping** — when an agent creates a CRS, their agent code is pulled from their profile and permanently stamped on the record
- **Customer type drives routing** — `standard` goes to the manager first; `fs_petroleum` and `special` go to the legal approver first
- **Returned forms are archived** — agents cannot edit a returned form; they must create a new submission
- **Audit trail is non-negotiable** — every action (submit, endorse, return, forward, approve, deny, encode) is logged with actor and timestamp
- **Vercel Blob for file storage** — all document and avatar uploads go to Vercel Blob; the DB stores full `https://...blob.vercel-storage.com` URLs, not local paths
- **Avatar in JWT** — user avatars are stored in the JWT token after login so no extra DB query is made on every page load; the token is refreshed client-side after upload via NextAuth's `update()` trigger
- **URL-param filtering** — dashboard search and status filters use URL search params (server-side, RSC-compatible, shareable links)
- **Skeleton loading** — every dashboard has a `loading.tsx` that renders animated skeleton placeholders while data loads
- **Confirmation dialogs** — approve/deny/forward actions open a modal dialog before submitting to prevent accidental submissions
- **In-app profile editing** — users can update their name, email, and password directly from the profile page without admin intervention
- **SQL-level role filtering** — role-based status filtering is pushed to the DB via `WHERE status IN (...)` instead of post-query JS filtering

---

## Database Schema

| Table | Description |
|---|---|
| `users` | All platform users with role, agent code, manager assignment, and avatar URL |
| `cis_submissions` | CRS form data, status, document URLs (JSONB), and routing metadata |
| `workflow_events` | Full audit log of every action on every form |
| `notifications` | In-app notification records per recipient |

### Indexes

| Index | Columns |
|---|---|
| `cis_agent_id_created_at_idx` | `agent_id, created_at DESC` |
| `cis_agent_id_status_created_at_idx` | `agent_id, status, created_at DESC` |
| `cis_status_updated_at_idx` | `status, updated_at DESC` |
| `users_manager_id_idx` | `manager_id` |
| `notifications_recipient_id_sent_at_idx` | `recipient_id, sent_at DESC` |
| `workflow_events_cis_id_created_at_idx` | `cis_id, created_at` |

---

## Deployment

Deployed on Vercel. Required environment variables in Vercel dashboard (Settings → Environment Variables):

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL` (set to your production URL)
- `SIGNATURE_HMAC_SECRET`
- `BLOB_READ_WRITE_TOKEN`

---

## Out of Scope (v1)

- Customer portal (customers have no accounts)
- ERP system integration (encoding is manual, notified via app)
- Email notifications
- Mobile app
- Advanced reporting and analytics

---

## License

Private — Oracle Petroleum Corporation. All rights reserved.
