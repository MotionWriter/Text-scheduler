import React from "react";
import { MoreHorizontal } from "lucide-react";
import { ScheduledMessage } from "./message-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDateTime(ts: number) {
  const d = new Date(ts);
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function StatusBadge({ status }: { status: ScheduledMessage["status"] }) {
  const classMap: Record<ScheduledMessage["status"], string> = {
    pending: "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border-transparent",
    sent: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border-transparent",
    failed: "bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))] border-transparent",
  };
  return <Badge className={classMap[status]}>{status}</Badge>;
}

export function MessagesMobileList({
  data,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  data: ScheduledMessage[];
  onEdit: (m: ScheduledMessage) => void;
  onDelete: (m: ScheduledMessage) => void;
  onDuplicate?: (m: ScheduledMessage) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-6">
        No scheduled messages found.
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {data.map((m) => {
        const { date, time } = formatDateTime(m.scheduledFor);
        const recipientName = m.group?.name || m.contact?.name || "Unknown";
        const subline = m.group
          ? `${m.group.memberCount ?? ""} members`.
              toString()
          : m.contact?.phoneNumber || "";
        return (
          <div key={String(m._id)} className="mobile-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {m.group ? (
                    <span
                      aria-hidden
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: m.group.color || "#3B82F6" }}
                    />
                  ) : null}
                  <div className="font-medium truncate">
                    {recipientName}
                    {m.aggregated && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border">
                        Group
                      </span>
                    )}
                  </div>
                </div>
                {subline && (
                  <div className="text-xs text-muted-foreground truncate mt-1">{subline}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(m)}>Edit</DropdownMenuItem>
                    {onDuplicate && (
                      <DropdownMenuItem onClick={() => onDuplicate(m)}>Duplicate</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(m)} className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mt-3 text-sm text-foreground">
              <div className="line-clamp-3 whitespace-pre-wrap break-words">{m.message}</div>
              {m.template && (
                <div className="mt-1 text-xs text-muted-foreground">Template: {m.template.name}</div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Scheduled:</span> {date} • {time}
              </div>
              {m.notes && <div className="truncate max-w-[40%]">{m.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
