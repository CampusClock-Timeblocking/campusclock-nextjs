import { useContext } from "react";
import { ConfirmationDialogContext } from "@/providers/confirmation-dialog-provider";

export const useConfirmationDialog = () => {
  const context = useContext(ConfirmationDialogContext);

  if (!context) {
    throw new Error(
      "useConfirmationDialog must be used within ConfirmationDialogProvider",
    );
  }

  return context;
};
