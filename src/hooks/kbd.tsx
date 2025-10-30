import { useEffect, useCallback } from "react";

export function useShiftEnter(action: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === "Enter") {
        event.preventDefault();
        action();
      }
    },
    [action],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function useCommandN(action: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Use metaKey for Command on Mac, ctrlKey for Windows/Linux
      if ((event.metaKey || event.ctrlKey) && event.key === "n") {
        event.preventDefault();
        action();
      }
    },
    [action],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
