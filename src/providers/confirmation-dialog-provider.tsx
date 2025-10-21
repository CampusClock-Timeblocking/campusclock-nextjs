"use client";

import { createContext, useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Union type that requires either description or content, but not both
type ConfirmationDialogOptions = {
  title: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
} & (
  | { description: string; content?: never }
  | { content: React.ReactNode; description?: never }
);

type ConfirmationDialogProviderProps = {
  children: React.ReactNode;
};

export const ConfirmationDialogContext = createContext<{
  confirm: (options: ConfirmationDialogOptions) => Promise<boolean>;
}>({
  confirm: () => Promise.resolve(false),
});

export function ConfirmationDialogProvider({
  children,
}: ConfirmationDialogProviderProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationDialogOptions | null>(
    null,
  );
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const [resolve, setResolve] = useState<(value: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmationDialogOptions) => {
    setOptions(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolve(() => resolve);
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    resolve(false);
  }, [resolve]);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolve(true);
  }, [resolve]);

  return (
    <ConfirmationDialogContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{options.title}</AlertDialogTitle>
              {options.description ? (
                <AlertDialogDescription>
                  {options.description}
                </AlertDialogDescription>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {options.content}
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-row space-x-2">
              <AlertDialogCancel
                onClick={handleClose}
                className="w-full flex-1"
              >
                {options.cancelText ?? "Cancel"}
              </AlertDialogCancel>
              <AlertDialogAction
                className={`mt-2 w-full flex-1 sm:mt-0 ${
                  options.variant === "destructive"
                    ? "bg-destructive text-background hover:bg-destructive/90"
                    : ""
                }`}
                onClick={handleConfirm}
              >
                {options.confirmText ?? "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ConfirmationDialogContext.Provider>
  );
}
