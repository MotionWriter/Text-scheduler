import React from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2", className)}>
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

