import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, className = "", ...rest }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        className={`w-full border border-[#b7c7bb] bg-[#fbfaf5] p-3 text-sm outline-none focus:border-forest focus:shadow-[inset_0_0_0_1px_#154a3b] ${className}`}
        {...rest}
      />
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  help?: string;
}

export function TextAreaField({ label, id, help, className = "", ...rest }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <textarea id={id} className={`w-full resize-y border border-[#b7c7bb] bg-[#fbfaf5] p-3 text-sm leading-relaxed outline-none focus:border-forest focus:shadow-[inset_0_0_0_1px_#154a3b] ${className}`} {...rest} />
      {help && <p className="mt-3 text-sm leading-relaxed text-muted">{help}</p>}
    </div>
  );
}
