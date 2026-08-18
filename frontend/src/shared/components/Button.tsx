import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "border-2 border-forest bg-lime text-forest font-bold shadow-brand-sm hover:-translate-y-0.5",
  secondary:
    "border border-[#8fa397] bg-[#e7ece3] text-[#234438] font-bold hover:-translate-y-0.5",
  ghost: "border border-forest bg-warm text-forest font-bold hover:-translate-y-0.5 hover:bg-lime",
  danger: "border border-[#8f3025] bg-danger text-white font-bold hover:-translate-y-0.5",
};

export function Button({ variant = "secondary", icon, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm transition-transform duration-150 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  className = "",
  ...rest
}: { label: string; icon: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 flex-none place-items-center border border-[#9fb0a5] bg-warm text-forest transition-colors duration-150 hover:bg-lime disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
