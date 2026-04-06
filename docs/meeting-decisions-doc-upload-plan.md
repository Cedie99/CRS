# Meeting Analysis & Next Steps Plan

## Context

A stakeholder meeting was held at Araneta Center-Cubao. The transcript reveals key business decisions
that impact the current CRS system. Two concrete gaps exist between meeting decisions and the
current codebase that need to be addressed.

---

## Meeting Decisions (Summary)

| Decision | Detail |
|---|---|
| No required documents | Removed the requirement to upload any document before submitting. It's up to the agent/finance to assess. |
| No file deletion | All uploaded documents — even expired ones — stay in the system. New uploads are additive, not replacements. |
| Agent handles post-submission uploads | After customer submits, the customer link is dead. If more docs are needed, the **agent** uploads them from their staff dashboard. |
| No expiration enforcement | Documents do not expire in the system. No auto-expire logic needed. |
| Print must show all documents | Senior approvers want physical paper — the printed CRS must show all attached document labels/images. |
| Agent cannot edit form fields | Agent may only upload additional documents to an existing submission — they cannot edit text fields. |

---

## Codebase Gap Analysis

### Gap 1 — Documents are still required on customer form ❌
**File:** `components/customer-form.tsx`

`DOC_SLOTS` has 4 entries with `required: true`:
- `docValidId`, `docMayorsPermit`, `docSecDti`, `docBirCertificate`

Both `validateStep()` (step 5) and `handleSubmit()` check for missing required docs and block
submission. The meeting explicitly decided: *"If it's required, it won't proceed if there's no upload.
So, let's remove that feature."*

**Fix:** Remove `required: true` from all DOC_SLOTS entries. Remove both validation blocks that
check for missing required docs.

---

### Gap 2 — No agent-side document upload after submission ❌
**Files affected:**
- New API route: `app/api/cis/[id]/docs/route.ts` (POST + DELETE)
- `components/cis-info-card.tsx` — add doc management UI section
- Staff detail pages: `app/(staff)/agent/[id]/page.tsx`

Currently, after a customer submits the form, the public token link is dead and the agent has no
way to attach additional documents. The meeting said: *"the agent will be the one to move the next
procedures"* — meaning the agent can upload documents on behalf of the customer post-submission.

This must be **role-gated**: only agents (and possibly managers/admin) can upload docs on a CRS
they own. Reviewers are read-only.

**Fix:**
1. Create `POST /api/cis/[id]/docs` — authenticated, role-checked upload endpoint
   - Accepts `file` + `docType` form data (same pattern as `/api/form/[token]/upload`)
   - Checks that session user is the owning agent (or admin)
   - CIS must not be in `denied`/`returned`/`erp_encoded` status
   - Appends to the `doc*` JSONB column in DB
2. Create `DELETE /api/cis/[id]/docs` — remove a doc entry
   - Same auth/ownership rules
   - Only allowed while not yet `approved`/`erp_encoded`
3. Add `PATCH /api/cis/[id]/docs` — rename a doc entry (display name only)
4. Add `<AgentDocSection>` component to `cis-info-card.tsx` that conditionally renders
   the upload UI when `canUpload` prop is true
5. Pass `canUpload={true}` only from the agent detail page (`app/(staff)/agent/[id]/page.tsx`)
   when the CIS belongs to the session user and status is not terminal

---

## Implementation Plan

### Step 1 — Remove required document validation (small, safe)

**File:** `components/customer-form.tsx`

1. In `DOC_SLOTS`, remove `required: true` from all 4 entries (leave the `required` key absent)
2. In `validateStep()` — delete the `if (step === 5)` block entirely
3. In `handleSubmit()` — delete the `missingRequiredDocs` check block
4. In the `DocUploadSlot` label — remove the `(required)` span rendering (since `required` will
   never be set)

---

### Step 2 — Staff-side document upload API

**New file:** `app/api/cis/[id]/docs/route.ts`

```
POST — upload doc
  auth: session required, role must be sales_agent/rsr OR admin
  ownership: session.user.id === cis.agentId OR role === admin
  status gate: not in [denied, returned, erp_encoded]
  body: FormData { file, docType }
  logic: same as /api/form/[token]/upload POST handler
  returns: FileEntry

DELETE — remove doc
  auth + ownership same as above
  status gate: not in [approved, erp_encoded]
  body: JSON { docType, url }
  logic: same as /api/form/[token]/upload DELETE handler

PATCH — rename doc
  auth + ownership same as above
  body: JSON { docType, url, newName }
  logic: same as /api/form/[token]/upload PATCH handler
```

Reuse the `DOC_COLUMN_MAP`, `DOC_TYPES`, and `FileEntry` type — extract them to a shared
location (`lib/doc-types.ts`) to avoid duplication.

---

### Step 3 — Agent doc upload UI in CIS detail

**File:** `components/cis-info-card.tsx`

Add a new prop `agentUpload?: { token?: never; cisId: string }` to `CisInfoCardProps`.

When `agentUpload` is present, render the same `DocUploadSlot` components used in
`customer-form.tsx` inside the Supporting Documents section, but wired to
`/api/cis/{cisId}/docs` instead of `/api/form/{token}/upload`.

Extract a shared `<DocUploadSlot>` into its own file (`components/doc-upload-slot.tsx`) and
parameterise the API base URL so both customer form and staff form can reuse it.

---

### Step 4 — Wire up in agent detail page

**File:** `app/(staff)/agent/[id]/page.tsx`

Pass `agentUpload={{ cisId: cis.id }}` to `<CisInfoCard>` only when:
```ts
session.user.id === cis.agentId &&
!["denied", "returned", "erp_encoded"].includes(cis.status)
```

---

## Files to Modify

| File | Change |
|---|---|
| `components/customer-form.tsx` | Remove required doc validation (Step 1) |
| `components/cis-info-card.tsx` | Add agent upload section (Step 3) |
| `app/(staff)/agent/[id]/page.tsx` | Pass canUpload prop (Step 4) |

## Files to Create

| File | Purpose |
|---|---|
| `app/api/cis/[id]/docs/route.ts` | Staff-side doc upload/delete/rename API |
| `lib/doc-types.ts` | Shared DOC_COLUMN_MAP, DOC_TYPES, FileEntry type |
| `components/doc-upload-slot.tsx` | Extracted reusable doc slot component |

---

## Verification

1. Open a draft CRS as customer → all doc slots are optional → form submits without uploading anything
2. Log in as the owning agent → open the submitted CRS detail page → see upload buttons in each doc slot
3. Upload a doc as agent → verify it appears in the doc list and is saved to DB
4. Log in as manager/finance/approver → open the same CRS → doc slots are read-only (no upload buttons)
5. Print the CRS detail page → all document names/images appear in the printout
