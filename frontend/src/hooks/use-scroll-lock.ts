import { useEffect, useRef } from "react";

/**
 * Hook to lock/unlock body scroll when a modal is open.
 * Supports nested modals - only unlocks when all modals are closed.
 */
export function useScrollLock(isLocked: boolean) {
  const originalOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLocked) {
      return;
    }

    // Store the original overflow value on first lock
    if (originalOverflowRef.current === null) {
      originalOverflowRef.current = document.body.style.overflow || "";
    }

    // Lock scroll
    document.body.style.overflow = "hidden";

    // Cleanup: restore original overflow
    return () => {
      if (originalOverflowRef.current !== null) {
        document.body.style.overflow = originalOverflowRef.current;
        originalOverflowRef.current = null;
      }
    };
  }, [isLocked]);
}
