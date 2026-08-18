interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 max-w-[min(25rem,calc(100%-2.5rem))] border border-[#9ab4a5] bg-forest px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 ${
        message ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[130%] opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}