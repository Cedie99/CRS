export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white px-4 py-3">
        <p className="text-sm font-semibold text-zinc-900">Oracle Petroleum — Customer Request System</p>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
