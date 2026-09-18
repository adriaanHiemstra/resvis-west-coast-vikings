/* Drives the shared Toast component: shows a message for 3s, then clears it -
   each call resets the timer, so a new toast doesn't get cut short by an old one. */
import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  return { toastMessage: message, showToast };
}
