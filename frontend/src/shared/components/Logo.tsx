interface LogoProps {
  withWordmark?: boolean;
  className?: string;
}

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid h-11 w-11 flex-none place-items-center border-2 border-forest bg-lime text-forest shadow-brand-sm ${className}`}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="5" cy="5" r="2.6" fill="currentColor" />
        <circle cx="5" cy="19" r="2.6" fill="currentColor" />
        <circle cx="19" cy="12" r="2.6" fill="currentColor" />
        <path d="M7.3 6.1L16.8 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7.3 17.9L16.8 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ withWordmark = true, className = "" }: LogoProps) {
  return (
    <span className={`flex items-center gap-3 text-left ${className}`}>
      <LogoMark />
      {withWordmark && (
        <span>
          <strong className="block text-xl font-bold leading-none text-ink">ResViz</strong>
          <span className="mt-1 block text-xs text-muted">Logic resolution studio</span>
        </span>
      )}
    </span>
  );
}
