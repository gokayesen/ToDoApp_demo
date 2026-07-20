import { useEffect, useState } from 'react';

// Story 7.2: delays reacting to a fast-changing value (search-as-you-type)
// so a query isn't fired on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
