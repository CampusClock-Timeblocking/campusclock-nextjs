import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type ReactNode } from "react";
import { Input } from "../../ui/input";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  setTitle: (input: string) => void;
  initFocusTitle?: boolean;
  mainContent: ReactNode;
  sideContent: ReactNode;
  titlePlaceholderText: string;
  titleError?: string;
  badgeSlot?: ReactNode;
}

export const DialogContentLayout: React.FC<Props> = ({
  title,
  setTitle,
  initFocusTitle,
  mainContent,
  sideContent,
  titlePlaceholderText,
  titleError,
  badgeSlot,
}) => {
  return (
    <DialogContent
      className="flex h-[715px] max-h-[calc(100vh-100px)] w-5xl !max-w-[calc(100vw-100px)] flex-col gap-0 overflow-hidden p-0"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <DialogHeader className="">
        <DialogTitle className="sr-only">{titlePlaceholderText}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 space-y-6 overflow-y-auto px-7 py-6">
          <div className="flex justify-between gap-5">
            <div className="flex w-full flex-col">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={titlePlaceholderText}
                className={cn(
                  "w-full rounded-none border-none px-0 !text-3xl font-semibold shadow-none focus-visible:border-0 focus-visible:ring-0",
                  titleError && "placeholder:text-destructive/50",
                )}
                autoFocus={initFocusTitle}
              />
              {titleError && (
                <p className="mt-1 text-sm text-red-500">{titleError}</p>
              )}
            </div>
            {badgeSlot}
          </div>
          {mainContent}
        </div>

        <div className="bg-muted/30 flex h-full w-[300px] flex-col space-y-6 overflow-y-auto border-l p-6">
          {sideContent}
        </div>
      </div>
    </DialogContent>
  );
};
