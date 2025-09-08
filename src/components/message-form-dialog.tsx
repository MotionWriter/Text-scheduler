"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScheduledMessage } from "./message-columns"

interface MessageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message?: ScheduledMessage | null
  onSubmit: (data: MessageFormData) => Promise<void>
  isSubmitting?: boolean
}

export interface MessageFormData {
  contactId?: string
  groupId?: string
  templateId?: string
  message: string
  scheduledFor: string
  notes?: string
  category?: string
  messageType: "individual" | "group"
}

const categories = [
  "Birthdays",
  "Work Reminders", 
  "Follow-ups",
  "Appointments",
  "Events",
  "Personal",
  "Marketing",
  "Other"
]

export function MessageFormDialog({
  open,
  onOpenChange,
  message,
  onSubmit,
  isSubmitting = false,
}: MessageFormDialogProps) {
  const contacts = useQuery(api.contacts.list) || []
  const groups = useQuery(api.groups.list) || []
  const templates = useQuery(api.messageTemplates.list) || []
  
  const [messageType, setMessageType] = useState<"individual" | "group">("individual")
  const [formData, setFormData] = useState<MessageFormData>({
    contactId: "",
    groupId: "",
    templateId: "none",
    message: "",
    scheduledFor: "",
    notes: "",
    category: "none",
    messageType: "individual",
  })

  // Reset form when dialog opens/closes or message changes
  useEffect(() => {
    if (open && message) {
      // Editing existing message
      const date = new Date(message.scheduledFor)
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      
      setFormData({
        contactId: message.contact ? message.contact.name : "",
        groupId: message.group?.name || "",
        templateId: message.template?._id || "none",
        message: message.message,
        scheduledFor: localDateTime,
        notes: message.notes || "",
        category: message.category || "none",
        messageType: message.group ? "group" : "individual",
      })
      setMessageType(message.group ? "group" : "individual")
    } else if (open && !message) {
      // Creating new message
      setFormData({
        contactId: "",
        groupId: "",
        templateId: "none",
        message: "",
        scheduledFor: "",
        notes: "",
        category: "none",
        messageType: "individual",
      })
      setMessageType("individual")
    }
  }, [open, message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      messageType,
    })
  }

  const handleTemplateChange = (templateId: string) => {
    setFormData(prev => ({ ...prev, templateId }))
    if (templateId && templateId !== "none") {
      const template = templates.find(t => t._id === templateId)
      if (template) {
        setFormData(prev => ({ ...prev, message: template.content }))
      }
    }
  }

  const isEditing = !!message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Scheduled Message" : "Schedule New Message"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the details of your scheduled message."
              : "Create a new scheduled message to be sent at a specific time."
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label>Message Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="individual"
                    checked={messageType === "individual"}
                    onChange={(e) => setMessageType(e.target.value as "individual" | "group")}
                  />
                  <span>Individual Contact</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="group"
                    checked={messageType === "group"}
                    onChange={(e) => setMessageType(e.target.value as "individual" | "group")}
                  />
                  <span>Group Message</span>
                </label>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEditing && (
              <>
                {messageType === "individual" ? (
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact *</Label>
                    <Select
                      value={formData.contactId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contactId: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact._id} value={contact._id}>
                            {contact.name} ({contact.phoneNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="group">Group *</Label>
                    <Select
                      value={formData.groupId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group._id} value={group._id}>
                            {group.name} ({group.memberCount} members)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="template">Template (Optional)</Label>
              <Select
                value={formData.templateId}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Scheduled For *</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your message..."
              required
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? "Saving..." 
                : isEditing 
                  ? "Update Message" 
                  : `Schedule ${messageType === "group" ? "Group Messages" : "Message"}`
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}