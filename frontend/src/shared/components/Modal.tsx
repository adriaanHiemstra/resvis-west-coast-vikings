import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  kicker?: string;
  title: string;
  tone?: "default" | "danger";
  children: ReactNode;
}

export function Modal({ open, onClose, kicker, title, tone = "default", children }: ModalProps) {
  if (!open) return null;

  const headerClasses = tone === "danger" ? "border-b border-[#ead0c9] bg-danger-soft" : "border-b border-line bg-[#edf0e8]";
  const kickerClasses = tone === "danger" ? "text-[#9b382d]" : "text-[#517063]";
  const titleClasses = tone === "danger" ? "text-[#7f2f25]" : "text-ink";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(17,37,29,0.52)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg animate-modalIn overflow-y-auto border border-[#aebcb1] bg-warm shadow-modal">
        <div className={`flex items-start justify-between p-5 ${headerClasses}`}>
          <div>
            {kicker && <p className={`text-xs font-bold uppercase tracking-[0.16em] ${kickerClasses}`}>{kicker}</p>}
            <h2 id="modal-heading" className={`mt-1 text-xl font-bold ${titleClasses}`}>
              {title}
            </h2>
          </div>
          <IconButton label="Close dialog" icon={<X size={17} />} onClick={onClose} />
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
