import { useEffect, useRef, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { TabsRow, type TabOption } from "./tabs-row";

interface TabModule {
  tabs: TabOption[];
  activeTab: string;
  setActiveTab: (active: TabOption) => void;
}

interface Props {
  children?: React.ReactNode;
  className?: string;
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
  section?: React.ReactNode;
  tabModule?: TabModule;
}

export interface TabAction {
  actionButtonText: string;
  action: () => void;
}

export function TitlePage({
  children,
  className,
  title,
  description,
  actionButton,
  section,
  tabModule,
}: Props) {
  const [showTitleInHeader, setShowTitleInHeader] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When less than half of the title is visible, show it in the header
        if (entry) {
          setShowTitleInHeader(entry.intersectionRatio < 0.7);
        }
      },
      {
        threshold: [0, 0.6, 0.7, 1], // Trigger at 0%, 50%, and 100% visibility
        rootMargin: "-48px 0px 0px 0px", // Account for the header height
      },
    );

    if (titleRef.current) {
      observer.observe(titleRef.current);
    }

    return () => {
      if (titleRef.current) {
        observer.unobserve(titleRef.current);
      }
    };
  }, []);

  return (
    <>
      <header className="bg-background sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <div
          className={cn(
            "flex items-center gap-3 overflow-hidden transition-all duration-200",
            showTitleInHeader
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <Separator orientation="vertical" className="h-6" />
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
      </header>

      <div className="container mx-auto flex w-full flex-col px-4 xl:px-16">
        <div className="mb-7 flex w-full max-w-full flex-col gap-3">
          <div className="flex w-full justify-between gap-5">
            <div className="flex w-full flex-col gap-2">
              <h1 ref={titleRef} className="text-3xl font-bold">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground max-w-3xl text-base">
                  {description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-4 pt-1">
              {actionButton}
            </div>
          </div>
        </div>

        <div className="flex">
          {tabModule && (
            <TabsRow
              tabs={tabModule.tabs}
              active={tabModule.activeTab}
              setActive={tabModule.setActiveTab}
            />
          )}
          <div className="ml-auto flex">{section}</div>
        </div>
      </div>

      <div className="sticky top-12 w-full border-b" />

      <div
        className={cn(
          "container mx-auto flex w-full flex-1 flex-col px-4 py-5 xl:px-16",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
