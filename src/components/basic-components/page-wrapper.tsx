import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-5xl px-6 py-8", className)}>
      {children}
    </div>
  );
}

