import { useEffect, useCallback } from "react";

export function useEventListener<K extends keyof DocumentEventMap>(
  type: K,
  callback: (event: DocumentEventMap[K]) => void,
) {
  useEffect(() => {
    document.addEventListener(type, callback);

    return () => {
      document.removeEventListener(type, callback);
    };
  }, [type, callback]);
}

export function useShiftEnter(action?: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        action?.();
      }
    },
    [action],
  );

  useEventListener("keydown", handleKeyDown);
}

export function useOptionSpace(action?: () => void) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && event.code === "Space") {
      event.preventDefault();
      action?.();
    }
  };

  useEventListener("keydown", handleKeyDown);
}
