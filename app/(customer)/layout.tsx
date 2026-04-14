import { PageTransition } from "@/components/page-transition";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-4 py-3">
        <p className="text-sm font-semibold leading-snug text-zinc-900 sm:text-base">Oracle Petroleum - Customer Request System</p>
      </header>
      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
