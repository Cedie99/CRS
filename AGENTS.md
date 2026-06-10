<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# CIS System — Codebase Reference

This document is the authoritative reference for the CIS (Customer Information Sheet) codebase. Keep this updated when roles, workflows, or logic change.

---

## Roles

Nine roles exist in `roleEnum` (`lib/db/schema.ts`):

| Role                             | Dashboard Path | Description                                                                                                                     |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `sales_agent`                    | `/agent`       | Submits CIS forms for customers                                                                                                 |
| `rsr`                            | `/agent`       | Regional Sales Rep — same capabilities as sales_agent                                                                           |
| `sales_manager`                  | `/manager`     | Supervises agents; **read-only** on form details                                                                                |
| `rsr_manager`                    | `/manager`     | Supervises RSR agents; **read-only** on form details                                                                            |
| `finance_reviewer`               | `/finance`     | Reviews documents, sets credit evaluation, forwards to senior approver or returns to agent. Receives non-dealer customer types. |
| `legal_approver`                 | `/legal`       | Identical workflow and features to finance_reviewer. Receives dealer customer types only.                                       |
| `senior_approver`                | `/approver`    | Final decision — approve or deny                                                                                                |
| `sales_support`                  | `/support`     | Fills out account/price/VAT details after approval                                                                              |
| `project_development_specialist` | `/specialist`  | Marks customer as encoded in ERP                                                                                                |
| `admin`                          | `/admin`       | System-wide visibility, user management, can ERP-encode, cannot take workflow actions                                           |

### Important: Manager Role

**Managers are read-only on form details.** They can view CIS forms submitted by their agents but have no approve/endorse/return actions. The `components/actions/manager-actions.tsx` file exists but is **not rendered anywhere** — it is unused.

### `isTopManager` flag

Users with `isTopManager = true` (on the `users` table) can see all agents' submissions regardless of the `managerId` relationship.

---

## CIS Status Enum

All possible statuses in `cisStatusEnum`:

```
draft
submitted
pending_legal_review
pending_finance_review
pending_approval
approved
pending_erp_encoding
erp_encoded         ← terminal (complete)
denied              ← terminal (rejected)
returned            ← agent can resubmit
```

Note: `pending_endorsement` exists in the enum but is **not actively used** in the current workflow. All submissions go directly from `submitted` to `pending_legal_review` or `pending_finance_review` when the agent fills out their section.

---

## Workflow

### Review Stage — Finance vs Legal

Finance and Legal have **identical workflow, features, and UI**. The only difference is which customer types they receive:

- `legal_approver` receives: `dealer`
- `finance_reviewer` receives: all other types (`distributor`, `private_label`, `toll_blend`, `end_user`)

Both roles can: review and approve/reject individual documents, forward to Senior Approver, or return to agent.

### Standard Flow (non-dealer)

```
draft
  → submitted               (customer signs form)
  → pending_finance_review  (agent fills out agent section)
  → pending_approval        (finance_reviewer forwards)
  → approved                (senior approver approves)
  → pending_erp_encoding    (sales support fills out)
  → erp_encoded             (specialist/admin encodes)
```

### Dealer Flow

```
draft
  → submitted              (customer signs form)
  → pending_legal_review   (agent fills out agent section, customer type = dealer)
  → pending_approval       (legal_approver forwards)
  → approved               (senior approver approves)
  → pending_erp_encoding   (sales support fills out)
  → erp_encoded            (specialist/admin encodes)
```

### Return / Resubmit

Finance, Legal, or Senior Approver can return a form to the agent:

```
pending_finance_review → returned  (finance_reviewer returns)
pending_legal_review   → returned  (legal_approver returns)
pending_approval       → returned  (senior_approver denies — returns to agent)
```

Agent resubmits after uploading replacement docs for any rejected documents, or after making requested corrections:

```
returned → pending_finance_review  (non-dealer customer types)
returned → pending_legal_review    (dealer customer type)
```

Resubmission always routes back to finance or legal for re-review — based on customer type, not who returned it. Senior approver returns follow the same path so finance/legal can review again before the form reaches final approval.

### Denial (terminal)

The `denied` status remains in the enum for legacy/hard-reject flows (e.g. finance/legal document reject), but **Senior Approver "Deny" returns the form to the agent** — same as finance/legal return — not a terminal denial.

---

## Step-by-Step Workflow Actions

### 1. Customer submits form

- **Route:** Public form at `/form/[publicToken]`
- **Status:** `draft` → `submitted`
- **Workflow action:** `submitted`
- **Notifications:** Customer (confirmation), Agent (action needed)

### 2. Agent fills out agent section

- **Route:** `PATCH /api/cis/[id]/agent-submit`
- **Role:** `sales_agent` or `rsr`
- **Fields:** Account Specialist (first/last), Sales Specialist, TPC (optional), customer type selection
- **Routing:**
  - `dealer` → `pending_legal_review`
  - all others → `pending_finance_review`
- **Workflow action:** `agent_submitted`
- **Notifications:** Manager (informational), Finance or Legal (action needed)

### 3. Reviewer stage (Finance or Legal — identical flow)

Finance and Legal are the same stage, split only by which customer types they handle. Everything below applies equally to both roles.

**Legal Approver (dealer):**

- **Route:** `PATCH /api/cis/[id]/legal-forward` or `PATCH /api/cis/[id]/legal-deny`
- **Role:** `legal_approver`
- **Active when status:** `pending_legal_review`

**Finance Reviewer (all non-dealer types):**

- **Route:** `PATCH /api/cis/[id]/finance-forward` or `PATCH /api/cis/[id]/finance-deny`
- **Role:** `finance_reviewer`
- **Active when status:** `pending_finance_review`

**Both roles share:**

- **Actions:**
  - Forward → `pending_approval`, workflow action `forwarded_to_approver`
  - Return → `returned`, workflow action `returned`
- **Features:** Document review (approve/reject per document with reason), credit evaluation fields, CFO-signed CIS upload
- **Prerequisite to forward:** `docSirRestySigned` (CFO-signed CIS) must be uploaded
- **Fields set:** `financeEu`, `financeDl`, `financeDr`, `financePlTs`, `financePossiblePoints`, `financeApprovedPoints`, `financeCreditTerms`, `financeCreditLimit`, `financeMetricPoints`
- **Notifications:** Senior Approver (if forwarded), Agent (if returned)

### 5. Senior Approver decision

- **Route:** `PATCH /api/cis/[id]/approve` or `PATCH /api/cis/[id]/deny`
- **Role:** `senior_approver`
- **Actions:**
  - Approve → `approved`, workflow action `approved`
  - Deny → `returned`, workflow action `returned` (returns to agent for corrections, same as finance/legal return)
- **Notifications:**
  - Approve: Agent, Sales Support, Admin
  - Deny (return): Agent (revisions needed)

### 6. Sales Support fill-out

- **Route:** `PATCH /api/cis/[id]/sales-support-submit`
- **Role:** `sales_support`
- **Status:** `approved` → `pending_erp_encoding`
- **Fields:** `salesSupportAccountType`, `salesSupportPriceList1/2`, `salesSupportSalesType`, `salesSupportVatCode`, `salesSupportOtherRemarks`
- **Notifications:** Project Development Specialist

### 7. ERP Encoding

- **Route:** `PATCH /api/cis/[id]/erp-encode`
- **Role:** `project_development_specialist` or `admin`
- **Status:** `pending_erp_encoding` → `erp_encoded`
- **Notifications:** Agent (onboarding complete)

### Agent Resubmission

- **Route:** `PATCH /api/cis/[id]/agent-resubmit`
- **Role:** `sales_agent` or `rsr`
- **Status:** `returned` → `pending_finance_review` or `pending_legal_review`
- **Validation:** At least one rejected document must have a replacement uploaded after the return timestamp

---

## API Routes

### CIS Workflow

| Route                                | Method | Role               | Purpose                   |
| ------------------------------------ | ------ | ------------------ | ------------------------- |
| `/api/cis/[id]/agent-submit`         | PATCH  | agent/rsr          | Submit agent section      |
| `/api/cis/[id]/agent-resubmit`       | PATCH  | agent/rsr          | Resubmit after return     |
| `/api/cis/[id]/legal-forward`        | PATCH  | legal_approver     | Forward to finance        |
| `/api/cis/[id]/legal-deny`           | PATCH  | legal_approver     | Return to agent           |
| `/api/cis/[id]/finance-forward`      | PATCH  | finance_reviewer   | Forward to approver       |
| `/api/cis/[id]/finance-deny`         | PATCH  | finance_reviewer   | Return to agent           |
| `/api/cis/[id]/approve`              | PATCH  | senior_approver    | Final approval            |
| `/api/cis/[id]/deny`                 | PATCH  | senior_approver    | Final denial              |
| `/api/cis/[id]/sales-support-submit` | PATCH  | sales_support      | Submit sales support info |
| `/api/cis/[id]/erp-encode`           | PATCH  | specialist / admin | Mark ERP encoded          |

### Documents & Data

| Route                        | Method | Purpose                                              |
| ---------------------------- | ------ | ---------------------------------------------------- |
| `/api/cis/[id]/doc-review`   | PATCH  | Approve or reject individual documents               |
| `/api/cis/[id]/finance-save` | PATCH  | Save finance evaluation data (credit points, limits) |
| `/api/cis/[id]/archive`      | PATCH  | Agent archives denied/returned form                  |

### Admin

| Route                        | Method         | Purpose                 |
| ---------------------------- | -------------- | ----------------------- |
| `/api/admin/users`           | GET / POST     | List or create users    |
| `/api/admin/users/[id]`      | PATCH / DELETE | Update or delete a user |
| `/api/admin/cis/[id]/delete` | DELETE         | Delete a CIS record     |

### Auth

| Route                       | Method | Purpose               |
| --------------------------- | ------ | --------------------- |
| `/api/auth/register`        | POST   | Register (admin flow) |
| `/api/auth/change-password` | POST   | Force password change |

---

## Pages

### Public

- `/form/[publicToken]` — Customer fills and signs CIS form (no login required)

### Agent (`sales_agent`, `rsr`)

- `/agent` — Dashboard (drafts, active, completed, denied)
- `/agent/new` — Create new CIS / send link to customer
- `/agent/[id]` — CIS detail; shows fill-out form if `status = submitted`
- `/agent/fill/[id]` — Agent fill-out action page
- `/agent/drafts` — Draft submissions
- `/agent/agent-completion` — Completion tracking
- `/agent/customer-type/[customerType]` — Filtered list

### Manager (`sales_manager`, `rsr_manager`)

- `/manager` — Dashboard (team submissions)
- `/manager/[id]` — CIS detail (**read-only**, no actions)
- `/manager/agents` — View assigned agents
- `/manager/team` — Team management
- `/manager/customer-type/[customerType]` — Filtered list

### Finance (`finance_reviewer`) and Legal (`legal_approver`)

These two roles have **identical pages and features**. The only difference is the customer types they receive and the URL prefix.

|                | Finance                                 | Legal                                 |
| -------------- | --------------------------------------- | ------------------------------------- |
| Dashboard      | `/finance`                              | `/legal`                              |
| Detail         | `/finance/[id]`                         | `/legal/[id]`                         |
| Filtered list  | `/finance/customer-type/[customerType]` | `/legal/customer-type/[customerType]` |
| Customer types | all non-dealer types                    | `dealer` only                         |
| Active status  | `pending_finance_review`                | `pending_legal_review`                |

Both detail pages include: doc review (approve/reject per document), credit evaluation fields, CFO-signed CIS upload, forward to Senior Approver, and return to agent.

### Senior Approver (`senior_approver`)

- `/approver` — Dashboard
- `/approver/[id]` — CIS detail + approve/deny actions

### Sales Support (`sales_support`)

- `/support` — Dashboard (approved, awaiting fill-out)
- Fill-out action embedded in detail page

### Specialist (`project_development_specialist`)

- `/specialist` — Dashboard (pending ERP encoding)
- ERP encode action embedded in detail page

### Admin (`admin`)

- `/admin` — Dashboard (all submissions)
- `/admin/[id]` — CIS detail + ERP encode action + delete zone
- `/admin/users` — User management table
- `/admin/users/new` — Create new user

---

## Action Components

Located in `components/actions/`. Each component is only rendered when the CIS is in the relevant status for that role.

| Component                   | Rendered by role   | Active when status       | Actions                                                              |
| --------------------------- | ------------------ | ------------------------ | -------------------------------------------------------------------- |
| `agent-fill-out-form.tsx`   | agent/rsr          | `submitted`              | Fill agent section → submit                                          |
| `agent-resubmit-form.tsx`   | agent/rsr          | `returned`               | Upload replacements → resubmit                                       |
| `finance-actions.tsx`       | finance_reviewer   | `pending_finance_review` | Forward to approver / Return to agent (identical to legal-actions)   |
| `legal-actions.tsx`         | legal_approver     | `pending_legal_review`   | Forward to approver / Return to agent (identical to finance-actions) |
| `approver-actions.tsx`      | senior_approver    | `pending_approval`       | Approve / Deny                                                       |
| `sales-support-actions.tsx` | sales_support      | `approved`               | Fill out and submit sales support section                            |
| `erp-encode-actions.tsx`    | specialist / admin | `pending_erp_encoding`   | Mark as ERP encoded                                                  |
| `manager-actions.tsx`       | _(unused)_         | —                        | Not rendered anywhere; do not use                                    |

---

## Database Schema (Key Tables)

### `users`

```
id                    UUID PK
fullName              varchar
email                 varchar unique
passwordHash          varchar
role                  roleEnum
agentCode             varchar (nullable)
agentType             enum (sales_agent | rsr)
managerId             UUID FK → users (nullable)
isActive              boolean
mustChangePassword    boolean
isTopManager          boolean
avatarUrl             varchar
createdAt             timestamp
```

### `cisSubmissions`

```
id                    UUID PK
publicToken           UUID unique (public form link)
agentId               UUID FK → users
agentCode             varchar
agentType             enum
customerType          customerTypeEnum
status                cisStatusEnum
isArchived            boolean (agent can archive denied/returned)
directFill            boolean (agent filling on behalf of customer)

-- Customer info (filled by customer via public form)
tradeName, contactPerson, contactNumber, emailAddress
businessAddress, cityMunicipality, businessType, tinNumber
additionalNotes, corporateName, dateOfBusinessReg
numberOfEmployees, website, telephoneNumber, landmarks
deliveryAddress, deliveryMobile, deliveryTelephone
lineOfBusiness, businessActivity
owners: jsonb, officers: jsonb
paymentTerms, salesChannel
businessLife, howLongAtAddress, numberOfBranches
govCertifications, tradeReferences: jsonb, bankReferences: jsonb
achievements, otherMerits

-- Document uploads (customer)
docValidId, docMayorsPermit, docSecDti, docBirCertificate
docLocationMap, docFinancialStatement, docBankStatement
docProofOfBilling, docLeaseContract, docProofOfOwnership
docStorePhoto, docSupplierInvoice, docSocialMedia
docIsoCertification, docHalalCertificate
docCertifications, docGovCertifications, docOther

-- Document uploads (staff)
docAgentOtherRequirements    (uploaded by agent)
docSirRestySigned            (CFO-signed CIS, uploaded by finance — required before forwarding)
docSalesSupportOther         (uploaded by sales support)

-- Agent fill-out
agentAccountSpecialistFirst, agentAccountSpecialistLast
agentSalesSpecialist, agentSalesManager
agentTpcFirst, agentTpcLast

-- Finance evaluation
financeEu, financeDl, financeDr, financePlTs
financePossiblePoints, financeApprovedPoints
annualSalesAmount, netIncomeAmount, bankBalanceAmount (decimal)
financeCreditTerms, financeCreditLimit
financeMetricPoints: jsonb

-- Sales support fill-out
salesSupportAccountType
salesSupportPriceList1, salesSupportPriceList2
salesSupportSalesType, salesSupportVatCode
salesSupportOtherRemarks, salesSupportNotes

-- Signatures
customerSignature, customerSignedAt, customerSignatureSeal
approverSignature, approverSignedAt, approverSignatureSeal

-- Review
docReviewStatuses: jsonb  (per-document: approved | rejected + reason)

createdAt, updatedAt
```

### `workflowEvents` (audit trail)

```
id        UUID PK
cisId     UUID FK → cisSubmissions
actorId   UUID FK → users
action    workflowActionEnum
note      text (nullable)
createdAt timestamp
```

### `notifications`

```
id           UUID PK
cisId        UUID FK
recipientId  UUID FK → users
type         enum (email | in_app)
message      text
isRead       boolean
status       enum (pending | sent | failed)
sentAt       timestamp
```

---

## Customer Types

```
standard
fs_petroleum
special
dealer
distributor
private_label
toll_blend
end_user
```

`dealer` is the only type routed to `legal_approver`. All other types go to `finance_reviewer`. Both roles have identical capabilities — the split is purely based on customer type.

---

## Key Lib Files

| File                    | Purpose                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `lib/db/schema.ts`      | Drizzle ORM schema — all tables, enums, type exports                                                                                |
| `lib/auth.ts`           | NextAuth config, JWT/session callbacks, role routing, middleware                                                                    |
| `lib/workflow.ts`       | `transitionCis()` — core status transition + audit event; `notifyParties()` — determines who gets notified and sends email + in-app |
| `lib/cached-queries.ts` | Dashboard stat queries with short-lived cache (10–30s)                                                                              |
| `lib/doc-types.ts`      | Document slot definitions, scoring doc list, file entry type                                                                        |
| `lib/email.ts`          | HTML email builder, Gmail sender via Nodemailer, deduplication                                                                      |
| `lib/agent-codes.ts`    | Agent code lookup/validation                                                                                                        |

---

## Auth & Access Control

- **Provider:** NextAuth.js, Credentials strategy (email + password)
- **Session:** JWT stored in HttpOnly cookie (`cis.session-token`)
- **Password change gate:** Users with `mustChangePassword = true` are redirected to `/change-password` on every page until resolved
- **Role routing on login:** Each role redirects to its own dashboard path (see Roles table)
- **API authorization:** Every route checks `session.user.role` and returns 403 if wrong role; also verifies CIS ownership where applicable (e.g., agent can only act on their own forms, manager only sees their agents' forms unless `isTopManager`)

---

## Notifications & Email

- **Transport:** Gmail via Nodemailer (`GMAIL_USER`, `GMAIL_APP_PASSWORD` env vars)
- Both **in-app** and **email** notifications are created for each workflow event
- Emails are deduplicated by `to + subject` within a single workflow transition call

| Trigger                  | Recipients                                                |
| ------------------------ | --------------------------------------------------------- |
| Customer submits form    | Customer (confirmation), Agent (action needed)            |
| Agent submits section    | Manager (informational), Finance or Legal (action needed) |
| Legal forwards           | Finance (action needed)                                   |
| Finance forwards         | Senior Approver (action needed)                           |
| Senior Approver approves | Agent, Sales Support, Admin                               |
| Senior Approver returns (deny) | Agent (revisions needed)                          |
| Any reviewer returns     | Agent (revisions needed)                                  |
| Sales Support submits    | Specialist (ERP encoding needed)                          |
| Specialist encodes       | Agent (onboarding complete)                               |

---

## Unused / Dead Code

- `components/actions/manager-actions.tsx` — Manager action component (endorse/return). Not rendered on any page. Manager role is read-only.
- `pending_endorsement` — Status enum value that exists but is not used in the active workflow.
