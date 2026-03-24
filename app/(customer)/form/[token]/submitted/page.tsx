import { CheckCircle } from "lucide-react";

export default function SubmittedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CheckCircle className="h-14 w-14 text-green-500" />
      <h1 className="mt-4 text-xl font-semibold text-zinc-900">Form submitted successfully</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Thank you! Your information has been received and is now under review.
        Your agent will keep you updated on the progress.
      </p>
    </div>
  );
}
