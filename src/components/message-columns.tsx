"use client"

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
import { MoreHorizontal, Edit, Trash2, Copy } from "lucide-react"
import { Id } from "../../convex/_generated/dataModel"

export type ScheduledMessage = {
  _id: Id<"scheduledMessages">
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
  category?: string
  notes?: string
  template?: {
    name: string
  }
  sentAt?: number
}

interface MessageColumnsProps {
  onEdit: (message: ScheduledMessage) => void
  onDelete: (id: Id<"scheduledMessages">) => void
  onDuplicate?: (message: ScheduledMessage) => void
}

export const createMessageColumns = ({
  onEdit,
  onDelete,
  onDuplicate,
}: MessageColumnsProps): ColumnDef<ScheduledMessage>[] => [
  {
    accessorKey: "recipient",
    header: "Recipient",
    cell: ({ row }) => {
      const message = row.original
      return (
        <div className="space-y-1">
          <div className="font-medium">
            {message.contact?.name || "Unknown Contact"}
          </div>
          <div className="text-sm text-muted-foreground">
            {message.contact?.phoneNumber}
          </div>
          {message.group && (
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: message.group.color || "#3B82F6" }}
              />
              <span className="text-xs text-blue-600">
                {message.group.name}
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => {
      const message = row.original
      return (
        <div className="space-y-1 max-w-xs">
          <div className="truncate text-sm">
            {message.message}
          </div>
          {message.template && (
            <div className="text-xs text-blue-600">
              Template: {message.template.name}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "scheduledFor",
    header: "Scheduled For",
    cell: ({ row }) => {
      const scheduledFor = row.getValue("scheduledFor") as number
      const date = new Date(scheduledFor)
      return (
        <div className="text-sm">
          <div>{date.toLocaleDateString()}</div>
          <div className="text-muted-foreground">
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      if (!category) return null
      return (
        <Badge variant="secondary" className="text-xs">
          {category}
        </Badge>
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
        switch (status) {
          case "pending":
            return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
          case "sent":
            return "bg-green-100 text-green-800 hover:bg-green-200"
          case "failed":
            return "bg-red-100 text-red-800 hover:bg-red-200"
          default:
            return "bg-gray-100 text-gray-800 hover:bg-gray-200"
        }
      }

      return (
        <div className="space-y-1">
          <Badge className={`${getStatusColor(status)} border-0`}>
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
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const message = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {message.status === "pending" && (
              <>
                <DropdownMenuItem onClick={() => onEdit(message)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(message._id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onDuplicate && (
              <DropdownMenuItem onClick={() => onDuplicate(message)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]