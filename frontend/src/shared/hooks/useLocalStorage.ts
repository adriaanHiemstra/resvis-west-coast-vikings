import { useEffect, useState } from "react";

/**
 * Drop-in replacement for useState that mirrors its value to
 * window.localStorage under `key`, so it survives reloads. Generic over T
 * so callers get back a properly-typed value/setter pair, same as useState.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    /* Passing a function (not a value) here is React's "lazy initializer" -
       it only ever runs once, on mount, instead of on every render. Without
       it, localStorage.getItem would be read on every render even though
       only the very first result is ever used. */
    try {
      const stored = window.localStorage.getItem(key);
      /* `stored` is null if nothing's been saved yet under this key. */
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      /* Corrupted JSON, or storage blocked entirely (some private-browsing
         modes throw on any access) - fall back to the default instead of
         crashing on load. */
      return initialValue;
    }
  });

  useEffect(() => {
    /* Re-run (and re-save) every time `value` changes - `key` is included
       too since it's a dependency, but in practice callers never change it
       after mount. */
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage unavailable (e.g. private browsing quota) — fail silently, in-memory state still works. */
    }
  }, [key, value]);

  /* `as const` locks this down to a fixed-length tuple (not a generic
     array), so destructuring `const [x, setX] = useLocalStorage(...)` gets
     each slot's specific type - same shape useState itself returns. */
  return [value, setValue] as const;
}
