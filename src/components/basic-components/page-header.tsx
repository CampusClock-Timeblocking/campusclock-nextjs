import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-12 flex items-center gap-6">
      <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-lg">{description}</p>
      </div>
    </div>
  );
}

