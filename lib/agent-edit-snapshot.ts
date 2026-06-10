/** CIS fields the agent can edit on a returned form — keys match cisSubmissions columns. */
export const AGENT_EDIT_SNAPSHOT_FIELDS = [
  "tradeName",
  "corporateName",
  "dateOfBusinessReg",
  "numberOfEmployees",
  "contactPerson",
  "contactNumber",
  "emailAddress",
  "telephoneNumber",
  "website",
  "businessAddress",
  "cityMunicipality",
  "postalCode",
  "landmarks",
  "deliverySameAsOffice",
  "deliveryAddress",
  "deliveryLandmarks",
  "deliveryMobile",
  "deliveryTelephone",
  "businessType",
  "tinNumber",
  "lineOfBusiness",
  "lineOfBusinessOther",
  "businessActivity",
  "businessActivityOther",
  "customerType",
  "paymentTerms",
  "salesChannel",
  "bankReferences",
  "businessLife",
  "howLongAtAddress",
  "numberOfBranches",
  "govCertifications",
  "achievements",
  "otherMerits",
  "additionalNotes",
] as const;

export type AgentEditSnapshotField = (typeof AGENT_EDIT_SNAPSHOT_FIELDS)[number];

export function mergeAgentEditBeforeSnapshot(
  existing: Record<string, unknown> | null | undefined,
  cisRecord: Record<string, unknown>,
  changedKeys: string[],
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };

  for (const key of changedKeys) {
    if (key in next) continue;
    if (!(key in cisRecord) && !AGENT_EDIT_SNAPSHOT_FIELDS.includes(key as AgentEditSnapshotField)) {
      continue;
    }
    next[key] = cisRecord[key] ?? null;
  }

  if (changedKeys.includes("customerType") && !("salesChannel" in next)) {
    next.salesChannel = cisRecord.salesChannel ?? null;
  }

  return next;
}
