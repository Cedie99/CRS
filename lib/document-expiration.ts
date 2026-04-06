import {
  getExpirationRequirementErrorMessage,
  hasAtLeastOneValidFile,
  type FileEntry,
} from "@/lib/doc-types";

type ExpirationCheckSubmission = {
  docMayorsPermit: unknown;
};

export function validateSubmissionDocumentExpirations(submission: ExpirationCheckSubmission) {
  const errors: string[] = [];

  const permits = (submission.docMayorsPermit as FileEntry[] | null) ?? [];
  if (!hasAtLeastOneValidFile(permits)) {
    errors.push(getExpirationRequirementErrorMessage("docMayorsPermit"));
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
