"use client"

import React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Edit, Trash2, Copy, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import { Id } from "../../convex/_generated/dataModel"

export type ScheduledMessage = {
  _id: string | Id<"scheduledMessages"> | Id<"userSelectedMessages">
  contact?: {
    name: string
    phoneNumber: string
  }
  group?: {
    name: string
    color?: string
    memberCount?: number
  }
  message: string
  scheduledFor: number
  status: "pending" | "sent" | "failed"
  notes?: string
  template?: {
    name: string
  }
  sentAt?: number
  source: "manual" | "study"
  messageSource?: string
  lesson?: any
  studyBook?: any
  aggregated?: boolean
  messageIds?: string[]
  customMessageId?: Id<"userCustomMessages">
}

interface MessageColumnsProps {
  onEdit: (message: ScheduledMessage) => void
  onDelete: (message: ScheduledMessage) => void
  onDuplicate?: (message: ScheduledMessage) => void
}


function classNames(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ")
}

function formatLocalDateInput(ts: number) {
  const d = new Date(ts)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatLocalTimeInput(ts: number) {
  const d = new Date(ts)
  const hrs = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  return `${hrs}:${mins}`
}

function buildTimestampLocal(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null
  // Construct as local time
  const dt = new Date(`${dateStr}T${timeStr}`)
  if (isNaN(dt.getTime())) return null
  return dt.getTime()
}

const timeOptions: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      const label = new Date(0, 0, 1, h, m).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      opts.push({ value: `${hh}:${mm}`, label })
    }
  }
  return opts
})()

function ExpandableText({
  text,
  maxLength = 100,
}: {
  text: string
  maxLength?: number
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  if (text.length <= maxLength) {
    return <div className="whitespace-pre-wrap break-words">{text}</div>
  }
  
  return (
    <div className="space-y-2">
      <div className="whitespace-pre-wrap break-words">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Show more
          </>
        )}
      </Button>
    </div>
  )
}

function EditableTextCell({
  value,
  onSave,
  disabled,
  multiline = false,
  expandable = false,
}: {
  value: string
  onSave: (next: string) => Promise<void>
  disabled?: boolean
  multiline?: boolean
  expandable?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  React.useEffect(() => setDraft(value), [value])

  const commit = async () => {
    await onSave(draft)
    setEditing(false)
  }

  if (!editing || disabled) {
    return (
      <div
        className={classNames(
          "group/textcell text-sm flex items-start gap-1",
          !disabled && "cursor-text hover:bg-muted/40 rounded px-1 border-b border-dashed border-transparent hover:border-muted-foreground/40 transition-colors",
          disabled && "opacity-60"
        )}
        onClick={() => { if (!disabled) setEditing(true) }}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        title={disabled ? undefined : "Click to edit • Shift+Enter to save • Esc to cancel"}
      >
        <div className="flex-1">
          {expandable ? (
            <ExpandableText text={value} />
          ) : multiline ? (
            <div className="whitespace-pre-wrap break-words max-w-xs">{value}</div>
          ) : (
            <div className="truncate max-w-xs">{value}</div>
          )}
        </div>
        {!disabled && (
          <Pencil className="h-3 w-3 opacity-60 text-muted-foreground mt-0.5" />
        )}
      </div>
    )
  }

  const commonProps = {
    autoFocus: true,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onBlur: () => {
      // Clicking out should NOT save. Revert and exit edit mode.
      setDraft(value)
      setEditing(false)
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.shiftKey)) {
        // Save only with Cmd+Enter (mac) or Shift+Enter
        e.preventDefault()
        e.stopPropagation()
        void commit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setDraft(value)
        setEditing(false)
      }
      // Plain Enter inserts newline in textarea and does nothing in input
      // Cmd/Ctrl+S no longer triggers save per request
    },
    className: "w-full text-sm",
  }

  return multiline ? (
    <Textarea rows={3} {...commonProps} />
  ) : (
    <Input {...commonProps} />
  )
}

function EditableDateTimeCell({
  ts,
  onSave,
  disabled,
}: {
  ts: number
  onSave: (nextTs: number) => Promise<void>
  disabled?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [dateStr, setDateStr] = React.useState(formatLocalDateInput(ts))
  const [timeStr, setTimeStr] = React.useState(formatLocalTimeInput(ts))

  React.useEffect(() => {
    setDateStr(formatLocalDateInput(ts))
    setTimeStr(formatLocalTimeInput(ts))
  }, [ts])

  const commit = async () => {
    const next = buildTimestampLocal(dateStr, timeStr)
    if (next && next !== ts) {
      await onSave(next)
    }
    setEditing(false)
  }

  if (!editing || disabled) {
    const d = new Date(ts)
    return (
      <div
        className={classNames(
          "group/dt text-sm flex items-center gap-2",
          !disabled && "hover:bg-muted/40 rounded px-1 border-b border-dashed border-transparent hover:border-muted-foreground/40 transition-colors",
          disabled && "opacity-60"
        )}
        onClick={() => { if (!disabled) setEditing(true) }}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        title={disabled ? undefined : "Click to edit • Shift+Enter to save • Esc to cancel"}
      >
        <div>
          <div>{d.toLocaleDateString()}</div>
          <div className="text-muted-foreground">
            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {!disabled && (
          <Pencil className="h-3 w-3 opacity-0 group-hover/dt:opacity-60 text-muted-foreground transition-opacity" />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        onBlur={commit}
        className="w-[9.5rem]"
      />
      <Select value={timeStr} onValueChange={(v) => { setTimeStr(v); }}>
        <SelectTrigger className="w-[8rem]" onBlur={commit}>
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {timeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


function normalizeUsDigits(value: string) {
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

function formatPhone(value: string | undefined | null) {
  if (!value) return "";
  let digits = normalizeUsDigits(String(value));
  digits = digits.slice(0, 10);
  const len = digits.length;
  if (len <= 3) return digits;
  if (len <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const createMessageColumns = ({
  onEdit,
  onDelete,
  onDuplicate,
  onUpdate,
  isAdmin,
  showActions = true,
}: MessageColumnsProps & { isAdmin?: boolean; showActions?: boolean }): ColumnDef<ScheduledMessage>[] => [
  {
    accessorKey: "recipient",
    accessorFn: (row) => {
      if (row.group) {
        return row.group.name
      }
      return row.contact?.name || "Unknown Contact"
    },
    cell: ({ row }) => {
      const message = row.original
      return (
        <div className="flex items-center gap-2">
          {message.group ? (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: message.group.color || "#3B82F6" }}
              />
              <span className="font-medium">Group: {message.group.name}</span>
            </>
          ) : message.contact ? (
            <>
              <div
                className="w-3 h-3 rounded-full bg-gray-400"
              />
              <span className="font-medium">Contact: {message.contact.name}</span>
            </>
          ) : (
            <>
              <div
                className="w-3 h-3 rounded-full bg-gray-400"
              />
              <span className="font-medium">Unknown Recipient</span>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => {
      const message = row.original
      return (
        <div className="flex items-center gap-2">
          {message.source === 'study' && message.messageSource === 'custom' ? (
            <>
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="font-medium">
                <div>Custom</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {message.studyBook && message.lesson
                    ? `${message.studyBook.title} - Lesson ${message.lesson.lessonNumber}`
                    : 'Study Message'}
                </div>
              </div>
            </>
          ) : message.source === 'study' ? (
            <>
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="font-medium">
                {message.studyBook && message.lesson
                  ? `${message.studyBook.title} - Lesson ${message.lesson.lessonNumber}`
                  : 'Study Message'}
              </span>
            </>
          ) : message.source === 'manual' ? (
            <>
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="font-medium">
                <div>Custom</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {message.studyBook && message.lesson
                    ? `${message.studyBook.title} - Lesson ${message.lesson.lessonNumber}`
                    : 'Manual Message'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="font-medium">Unknown</span>
            </>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const m = row.original
      // Edit only for custom pending messages (manual or study-based custom)
      const canEdit = m.status === "pending" && (m.source === "manual" || (m.source === "study" && m.messageSource === "custom"))
      return (
        <div className="space-y-1 max-w-sm">
          <EditableTextCell
            value={m.message}
            multiline
            expandable
            disabled={!canEdit}
            onSave={async (next) => onUpdate(m, { message: next })}
          />
          {m.template && (
            <div className="text-xs text-blue-600">Template: {m.template.name}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "scheduledFor",
    header: "Scheduled For",
    cell: ({ row }) => {
      const d = new Date(row.original.scheduledFor)
      return (
        <div>
          <div>{d.toLocaleDateString()}</div>
          <div className="text-muted-foreground text-sm">
            {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "groupName",
    header: "Group",
    accessorFn: (row) => row.group?.name || "—",
    cell: ({ row }) => {
      const m = row.original
      return (
        <div className="flex items-center gap-2 text-sm">
          {m.group ? (
            <>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: m.group.color || "#3B82F6" }}
              />
              <span>{m.group.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const message = row.original
      
      const getStatusColor = (status: string) => {
        // Use semantic theme tokens for consistent theming
        switch (status) {
          case "pending":
            return "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] border border-[hsl(var(--border))]"
          case "sent":
            return "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] border border-[hsl(var(--border))]"
          case "failed":
            return "bg-[hsl(var(--error))] text-[hsl(var(--error-foreground))] border border-[hsl(var(--border))]"
          case "cancelled":
            return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]"
          case "unprocessed":
            return "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] border border-[hsl(var(--border))]"
          default:
            return "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]"
        }
      }

      return (
        <div className="space-y-1">
          <Badge className={`${getStatusColor(status)}`}>
            {status}
          </Badge>
          {message.sentAt && (
            <div className="text-xs text-muted-foreground">
              Sent: {new Date(message.sentAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
  },
  ...(
    showActions
      ? [{
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const message = row.original

      const canEdit = message.status === "pending" && !message.aggregated
      const canDelete = message.status === "pending" || message.status === "failed"
      const canDuplicate = !!onDuplicate && !message.aggregated && message.status !== "sent"

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(message)}>
                  <Edit className="h-4 w-4" />
                  <span className="leading-none">Edit</span>
                </DropdownMenuItem>
                {(canDelete || canDuplicate) && <DropdownMenuSeparator />}
              </>
            )}

            {canDelete && (
              <>
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => onDelete(message)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="leading-none">Delete</span>
                </DropdownMenuItem>
                {canDuplicate && <DropdownMenuSeparator />}
              </>
            )}

            {canDuplicate && (
              <DropdownMenuItem className="flex items-center gap-2" onClick={() => onDuplicate!(message)}>
                <Copy className="h-4 w-4" />
                <span className="leading-none">Duplicate</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }]
      : []
  ),
]
