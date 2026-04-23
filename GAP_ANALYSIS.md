# CIS Codebase vs. Requirements — Gap Analysis

> Based on transcript: `New Recording 10.txt` and business requirements discussion.
> Date analyzed: 2026-04-19

---

## ✅ Already Correctly Implemented

| Requirement                                                                            | Status                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Agent selects customer type (Dealer, Distributor, Private Label, Toll Blend, End-User) | ✅ Done in `agent-submit` route                             |
| TIN defaults to `0000000` when blank                                                   | ✅ Done in `POST /api/form/[token]`                         |
| Valid ID required when payment terms = with terms                                      | ✅ Done in form submission API                              |
| Dealer → Maam Cha (legal_approver), Others → Maam Nida (finance_reviewer)              | ✅ Done in `agent-submit` route (line 128–129)              |
| Manager is notification-only — detail page has NO action buttons                       | ✅ `/manager/[id]/page.tsx` renders no `<ManagerActions />` |
| Manager notified AFTER agent fills (not when customer submits)                         | ✅ `workflow.ts` action `agent_submitted` notifies manager  |
| Finance (Maam Cha & Maam Nida) can deny → agent notified                               | ✅ `action === "denied"` notifies agent                     |
| Sir Ed (senior_approver) has Approve & Deny buttons                                    | ✅ `approver-actions.tsx`                                   |
| Sales Support fills out → routes to Specialist                                         | ✅ `sales-support-fill-out-actions.tsx` → `specialist`      |
| Specialist marks ERP encoded → agent notified                                          | ✅ `erp-encode-actions.tsx` + `workflow.ts`                 |
| Audit trail for every action                                                           | ✅ `workflow_events` table                                  |
| Print components exist                                                                 | ✅ `pdf-print-renderer.tsx`, `print-button.tsx`             |
| QR/link for customer form                                                              | ✅ via `publicToken`                                        |

---

## ❌ Gaps / Mismatches That Need Work

### 1. Maam Cha (legal_approver) is missing the credit evaluation form

- **Requirement:** "Finance fill out" applies to BOTH Maam Cha (dealers) and Maam Nida (others). Both should fill EU, DL, DR, PL/TS, Credit Terms, Approved Points.
- **Current:** `LegalActions` only has a note field. `FinanceActions` (with all evaluation fields) is only used for Maam Nida's finance queue. The `/legal/[id]` page does NOT render `<FinanceActions>`.
- **Note:** The `legal-forward` API already accepts these fields via `financeForwardSchema` — the backend is ready, but the UI doesn't expose them.
- **Fix:** Render `<FinanceActions>` (or equivalent) in the legal approver's detail page, wiring it to `legal-forward` endpoint.

### 2. Legal actions button label is wrong

- **Current:** `legal-actions.tsx` button says **"Forward to Finance"**
- **Actual behavior:** The API transitions to `pending_approval` (Sir Ed directly), NOT to finance.
- **Fix:** Rename button label to "Forward to Sr. Approver" (or similar).

### 3. Business permit expiration date not removed

- **Requirement:** "Remove the business permit expiration date picker."
- **Current:** `docMayorsPermit` JSONB stores `expirationDate`; the upload UI likely shows an expiration date input for this document.
- **Fix:** Strip the expiration date field from the document upload slot specifically for Mayor's/Business Permit.

### 4. Business permit one-time upload / append-only history

- **Requirement:** "One-time upload. If really asked, that's where business permits will be re-uploaded. Can also see the past permits uploaded for back-tracking purposes."
- **Current:** No enforcement of append-only. Users can likely delete/replace uploaded permit docs.
- **Fix:** Make Mayor's Permit doc slot append-only (add new, no delete of existing). Show all historical uploads with timestamps for backtracking.

### 5. Dead code from the old manager-endorsement step

- **Files affected:**
  - `components/actions/manager-actions.tsx` — has Endorse & Return buttons, but is not rendered anywhere
  - `app/api/cis/[id]/endorse/route.ts` — dead API route
  - `app/api/cis/[id]/return/route.ts` — dead API route
  - `pending_endorsement` status in DB enum — never entered since `agent-submit` now routes directly to legal/finance
- **Fix:** Remove `manager-actions.tsx`, the two dead API routes, and clean up any `pending_endorsement` references in filters, status badges, and workflow steppers.

### 6. Chief Finance Officer signed document — no upload field in finance

- **Requirement:** Finance prints the form → Chief Finance Officer physically signs it → Finance uploads the signed document as an attachment.
- **Current:** Finance fill-out has evaluation fields (EU, DL, DR, etc.) but no dedicated slot to upload the CFO-signed physical copy.
- **Fix:** Add a document upload slot in the Finance/Legal fill-out section labeled "CFO Signed Copy" or "Signed Approval Sheet."

### 7. Old customer type values still in DB enum

- **Current:** `standard`, `fs_petroleum`, `special` still exist in `customerTypeEnum` alongside the new 5 types.
- **Agent-submit schema** correctly only allows the 5 new types (dealer, distributor, private_label, toll_blend, end_user), so no new bad data is created.
- **Fix:** DB migration to remove old enum values. Update any dashboard filters or status displays that reference them.

### 8. `pending_endorsement` status may still appear in UI

- Some dashboard filters, status badge maps, or workflow steppers may still reference `pending_endorsement`.
- **Fix:** Audit and remove all UI references to this dead status.

---

## Minor / Optional Items

| Item                                                                    | Notes                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Printable blank form (for physical customer fill-out before digitizing) | Print components exist but only for filled forms. A blank/template print view is not yet implemented. |
| Compact form layout (less paper when printed)                           | Needs visual review — the customer form is multi-step and may still be verbose for print.             |
| Credit assessment sheet (bank statement) when "with terms"              | Valid ID is enforced; bank statement as a separate gated requirement isn't explicitly implemented.    |

---

## Priority Order for Fixes

| Priority  | Item                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| 🔴 High   | Add credit evaluation fields to Maam Cha's (`legal_approver`) UI                                       |
| 🔴 High   | Fix "Forward to Finance" label in `legal-actions.tsx`                                                  |
| 🔴 High   | Remove business permit expiration date picker                                                          |
| 🟡 Medium | Make business permit append-only with history view                                                     |
| 🟡 Medium | Add CFO-signed document upload field to finance/legal fill-out                                         |
| 🟢 Low    | Clean up dead code: `manager-actions.tsx`, endorse/return API routes, `pending_endorsement` references |
| 🟢 Low    | DB migration to remove `standard`/`fs_petroleum`/`special` from customer type enum                     |

---

## Workflow Summary (as designed)

```
Customer fills up form (public link/QR)
  ↓
Agent fills agent section (selects customer type)
  ↓ (notify manager — informational only, no action)
  ├─ Dealer → Maam Cha (legal_approver) — pending_legal_review
  └─ Distributor / Private Label / Toll Blend / End-User → Maam Nida (finance_reviewer) — pending_finance_review
          ↓
  Finance fill-out (EU, DL, DR, PL/TS, credit terms, approved points)
  Finance attaches CFO-signed physical document
          ↓ approve                    ↓ deny
  Sir Ed (senior_approver)        Agent notified — denied
  — pending_approval
          ↓ approve                    ↓ deny
  Sales Support fill-out          Agent notified — denied
  — pending_erp_encoding
          ↓
  Project Development Specialist
  — marks as erp_encoded
          ↓
  Agent notified — onboarding complete
```
