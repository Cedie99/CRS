interface EmptyStateLogoProps {
  className?: string;
}

export function EmptyStateLogo({ className }: EmptyStateLogoProps) {
  const rootClass = className ?? "h-14 w-14";

  return (
    <div className="rounded-full bg-zinc-100 p-4">
      <svg
        viewBox="0 0 96 96"
        className={rootClass}
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="48" cy="79" rx="21" ry="5" fill="#000" opacity="0.11" />

        <rect x="28" y="26" width="34" height="44" rx="7" fill="#d4d4d4" />
        <rect x="32" y="30" width="26" height="36" rx="4" fill="#e9e9e9" />

        <path d="M52 30 L58 36 L52 36 Z" fill="#d0d0d0" />
        <path d="M52 30 L58 36 L52 36" fill="none" stroke="#bebebe" strokeWidth="1.1" />

        <rect x="36" y="41" width="18" height="2.6" rx="1.3" fill="#cccccc" />
        <rect x="36" y="47" width="14" height="2.6" rx="1.3" fill="#c7c7c7" />
        <rect x="36" y="53" width="11" height="2.6" rx="1.3" fill="#c1c1c1" />

        <circle cx="66" cy="33" r="6.5" fill="#ededed" />
        <path d="M66 28.8 L67.4 31.6 L70.2 33 L67.4 34.4 L66 37.2 L64.6 34.4 L61.8 33 L64.6 31.6 Z" fill="#b8b8b8" />
      </svg>
    </div>
  );
}
