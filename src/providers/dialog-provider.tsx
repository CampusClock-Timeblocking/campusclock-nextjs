// contexts/DialogContext.tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";

interface DialogContextType {
  showDialog: (content: ReactNode) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<ReactNode>(null);

  const showDialog = (content: ReactNode) => {
    setDialogContent(content);
    setIsOpen(true);
  };

  const hideDialog = () => {
    setIsOpen(false);
    setDialogContent(null);
  };

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen} key={crypto.randomUUID()}>
        {dialogContent}
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}
