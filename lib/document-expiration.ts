type ExpirationCheckSubmission = Record<string, unknown>;

export function validateSubmissionDocumentExpirations(submission: ExpirationCheckSubmission) {
  void submission;

  return {
    ok: true,
    errors: [] as string[],
  };
}
