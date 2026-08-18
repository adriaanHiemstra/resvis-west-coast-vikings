import type { ReactNode } from "react";

interface PanelProps {
  kicker?: string;
  title?: string;
  titleClassName?: string;
  headerClassName?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ kicker, title, titleClassName = "", headerClassName = "", headerExtra, children, className = "" }: PanelProps) {
  return (
    <section className={`border border-line bg-warm shadow-panel ${className}`}>
      {(kicker || title || headerExtra) && (
        <div className={`flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between ${headerClassName}`}>
          <div>
            {kicker && <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#517063]">{kicker}</p>}
            {title && <h2 className={`mt-1 text-xl font-bold text-ink ${titleClassName}`}>{title}</h2>}
          </div>
          {headerExtra}
        </div>
      )}
      {children}
    </section>
  );
}
