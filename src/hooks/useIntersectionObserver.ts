import { useEffect, useRef, useState, useMemo } from 'react';

/**
 * Custom hook that uses IntersectionObserver to detect when an element is visible in the viewport
 * @param options IntersectionObserver options
 * @returns [ref, isIntersecting] - ref to attach to element, boolean indicating visibility
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  // Start with true so initial fetch happens, observer will correct if not visible
  const [isIntersecting, setIsIntersecting] = useState(true);
  const ref = useRef<T | null>(null);

  // Memoize the merged options to prevent unnecessary observer recreation.
  // This ensures that passing inline objects from parent components doesn't
  // cause the observer to be recreated on every render.
  const observerOptions = useMemo(
    () => ({
      threshold: 0.1, // Consider visible if at least 10% is in viewport
      rootMargin: '50px', // Start observing 50px before entering viewport
      ...options,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      options?.threshold,
      options?.rootMargin,
      options?.root,
      // Intentionally tracking individual properties to avoid recreating observer
      // when options object reference changes but values remain the same
    ]
  );

  // Sync with IntersectionObserver (browser API) to track element visibility.
  // This enables lazy loading and performance optimization by only fetching/rendering
  // data when widgets are actually visible in the viewport.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [observerOptions]); // Re-create observer only when memoized options change

  return [ref, isIntersecting] as const;
}
