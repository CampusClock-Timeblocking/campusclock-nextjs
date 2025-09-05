import { useEffect, useCallback } from "react";

export function useDocumentEventListener<K extends keyof DocumentEventMap>(
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

export function useWindowEventListener<K extends keyof WindowEventMap>(
  type: K,
  callback: (event: WindowEventMap[K]) => void,
) {
  useEffect(() => {
    window.addEventListener(type, callback);

    return () => {
      window.removeEventListener(type, callback);
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

  useDocumentEventListener("keydown", handleKeyDown);
}

export function useOptionKey(code: string, action?: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.altKey && event.code === code) {
        event.preventDefault();
        action?.();
      }
    },
    [code, action],
  );
  useDocumentEventListener("keydown", handleKeyDown);
}
