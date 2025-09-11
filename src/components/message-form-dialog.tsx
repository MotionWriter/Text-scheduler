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
import { DatePickerPopover } from "@/components/ui/date-picker"
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
  studyBookId?: string
  lessonId?: string
  message: string
  scheduledFor: string
  notes?: string
  messageType: "individual" | "group" | "custom"
  sendMode?: "individual" | "group"
}


export function MessageFormDialog({
  open,
  onOpenChange,
  message,
  onSubmit,
  isSubmitting = false,
}: MessageFormDialogProps) {
  const contacts = useQuery(api.contacts.list) || []
  const groups = useQuery(api.groups.list) || []
  const studyBooks = useQuery(api.studyBooks.list) || []
  const user = useQuery(api.auth.loggedInUser)
  const isAdmin = user?.isAdmin || false
  
  const [messageType, setMessageType] = useState<"individual" | "group" | "custom">("custom")
  const [scheduledDate, setScheduledDate] = useState<string>("")
  const [scheduledTime, setScheduledTime] = useState<string>("")
  const [formData, setFormData] = useState<MessageFormData>({
    contactId: "",
    groupId: "",
    studyBookId: "",
    lessonId: "",
    message: "",
    scheduledFor: "",
    notes: "",
    messageType: "custom",
    sendMode: "group",
  })
  
  const lessons = useQuery(
    api.lessons.listByStudyBook,
    formData.studyBookId ? { studyBookId: formData.studyBookId as Id<"studyBooks"> } : "skip",
  ) || []

  const customMessageQuota = useQuery(
    api.userCustomMessages.getCountForLesson,
    formData.lessonId ? { lessonId: formData.lessonId as Id<"lessons"> } : "skip",
  )
  
  // Derive selected lesson and allowed date range (Thu prior -> Sun of active week)
  const selectedLesson = lessons.find((l: any) => l._id === (formData.lessonId as any))
  const msInDay = 24 * 60 * 60 * 1000
  const minDate = selectedLesson?.activeWeekStart ? selectedLesson.activeWeekStart - 4 * msInDay : undefined
  const maxDate = selectedLesson?.activeWeekStart ? selectedLesson.activeWeekStart + 6 * msInDay : undefined
  const DEFAULT_FIXED_TIME = "06:30"
  const defaultTimeForLesson = isAdmin
    ? ((selectedLesson?.defaultSendTime as string) || DEFAULT_FIXED_TIME)
    : DEFAULT_FIXED_TIME

  // If creating a custom message and a lesson is chosen, initialize date/time to the lesson defaults
  useEffect(() => {
    if (messageType === "custom" && selectedLesson) {
      if (!scheduledDate || !scheduledTime) {
        const base = selectedLesson.activeWeekStart ? new Date(selectedLesson.activeWeekStart) : new Date()
        const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
        const dateStr = local.toISOString().slice(0, 10)
        setScheduledDate(dateStr)
        setScheduledTime(defaultTimeForLesson)
        const combined = `${dateStr}T${defaultTimeForLesson}`
        setFormData(prev => ({ ...prev, scheduledFor: combined }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageType, formData.lessonId])

  // Reset form when dialog opens/closes or message changes
  useEffect(() => {
    if (open && message) {
      // Editing existing message
      const date = new Date(message.scheduledFor)
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      const localDate = local.toISOString().slice(0, 10)
      const localTime = local.toISOString().slice(11, 16)
      
      setScheduledDate(localDate)
      setScheduledTime(localTime)
      setFormData({
        contactId: message.contact ? message.contact.name : "",
        groupId: message.group?.name || "",
        studyBookId: "",
        lessonId: "",
        message: message.message,
        scheduledFor: `${localDate}T${localTime}`,
        notes: message.notes || "",
        messageType: message.group ? "group" : "individual",
      })
      setMessageType(message.group ? "group" : "individual")
    } else if (open && !message) {
      // Creating new message
      setScheduledDate("")
      setScheduledTime("")
      const autoStudyBookId = studyBooks.length === 1 ? studyBooks[0]._id : ""
      setFormData({
        contactId: "",
        groupId: "",
        studyBookId: autoStudyBookId,
        lessonId: "",
        message: "",
        scheduledFor: "",
        notes: "",
        messageType: "custom",
        sendMode: "group",
      })
      setMessageType("custom")
    }
  }, [open, message])

  // Auto-select the only available group when creating a new message
  useEffect(() => {
    if (!open || !!message) return
    if (groups.length === 1 && !formData.groupId) {
      setFormData(prev => ({ ...prev, groupId: groups[0]._id as any }))
    }
  }, [open, message, groups, formData.groupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      ...formData,
      messageType,
    })
  }


  const isEditing = !!message

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto md:overflow-visible">
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
              <div className="text-lg font-medium">Custom Study Message</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isEditing && (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="studyBook">Study Book *</Label>
                  {studyBooks.length === 1 ? (
                    <div className="alert-info">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{studyBooks[0].title}</span>
                            <span className="text-sm text-muted-foreground">({studyBooks[0].description})</span>
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.studyBookId}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, studyBookId: value, lessonId: "" }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a study book" />
                          </SelectTrigger>
                          <SelectContent>
                            {studyBooks.map((book) => (
                              <SelectItem key={book._id} value={book._id}>
                                {book.title} - {book.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {formData.studyBookId && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="lesson">Lesson *</Label>
                        <Select
                          value={formData.lessonId}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, lessonId: value }))}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a lesson" />
                          </SelectTrigger>
                          <SelectContent>
                            {lessons.map((lesson) => (
                              <SelectItem key={lesson._id} value={lesson._id}>
                                Lesson {lesson.lessonNumber}: {lesson.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Send To selection removed for now; defaulting to group mode */}

                    {/* Group selection - always required for delivery context */}
                    {formData.lessonId && (
                      <div className="space-y-2 md:col-span-2">
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

                    {formData.lessonId && (
                      <div className={customMessageQuota?.canCreate !== false ? "alert-info" : "alert-warning"}>
                        <div className="font-medium text-sm">Custom Message Quota</div>
                        <div className="text-sm mt-1">
                          {customMessageQuota === undefined ? (
                            "Loading quota information..."
                          ) : customMessageQuota.canCreate ? (
                            `You can create ${customMessageQuota.remaining} more custom message${customMessageQuota.remaining !== 1 ? 's' : ''} for this lesson.`
                          ) : (
                            `You've reached the limit of 2 custom messages for this lesson.`
                          )}
                        </div>
                      </div>
                    )}
              </>
            )}
            
            
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Scheduled For *</Label>
              <div className="flex gap-2 items-center">
                {messageType === "custom" && selectedLesson ? (
                  <DatePickerPopover
                    value={scheduledDate}
                    onChange={(d) => {
                      setScheduledDate(d)
                      const combined = d && scheduledTime ? `${d}T${scheduledTime}` : ""
                      setFormData(prev => ({ ...prev, scheduledFor: combined }))
                    }}
                    minDate={minDate}
                    maxDate={maxDate}
                    buttonClassName="w-[12rem] px-3 py-2 border rounded-md bg-white text-left"
                  />
                ) : (
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      const d = e.target.value
                      setScheduledDate(d)
                      const combined = d && scheduledTime ? `${d}T${scheduledTime}` : ""
                      setFormData(prev => ({ ...prev, scheduledFor: combined }))
                    }}
                    required={messageType !== "custom" || !!selectedLesson}
                    disabled={messageType === "custom" && !selectedLesson}
                    placeholder={messageType === "custom" && !selectedLesson ? "Select a lesson first" : undefined}
                  />
                )}
                <Select
                  disabled={!isAdmin || (messageType === "custom" && !selectedLesson)}
                  value={scheduledTime || (messageType === "custom" ? defaultTimeForLesson : scheduledTime)}
                  onValueChange={(v) => {
                    setScheduledTime(v)
                    const combined = scheduledDate && v ? `${scheduledDate}T${v}` : ""
                    setFormData(prev => ({ ...prev, scheduledFor: combined }))
                  }}
                >
                  <SelectTrigger className="w-[8rem]">
                    <SelectValue placeholder={messageType === "custom" && !selectedLesson ? "Select lesson first" : "Time"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {Array.from({ length: 96 }).map((_, idx) => {
                      const h = Math.floor(idx / 4)
                      const m = (idx % 4) * 15
                      const hh = String(h).padStart(2, '0')
                      const mm = String(m).padStart(2, '0')
                      const val = `${hh}:${mm}`
                      const label = new Date(0, 0, 1, h, m).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      return (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="message">Message *</Label>
              {messageType === "custom" && (
                <div className={`text-sm ${
                  formData.message.length > 280 ? "text-red-600" : "text-gray-500"
                }`}>
                  {formData.message.length}/280
                </div>
              )}
            </div>
            <Textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder={messageType === "custom" 
                ? "Enter your custom message content (280 characters max)..." 
                : "Enter your message..."
              }
              required
              disabled={messageType === "custom" && customMessageQuota && !customMessageQuota.canCreate}
              className={`${
                messageType === "custom" && formData.message.length > 280 
                  ? "border-red-300 focus:border-red-500" 
                  : ""
              }`}
            />
            {messageType === "custom" && formData.message.length > 280 && (
              <div className="text-sm text-red-600">
                Message exceeds 280 character limit
              </div>
            )}
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
            <Button 
              type="submit" 
              disabled={isSubmitting || 
                (messageType === "custom" && (
                  !formData.studyBookId ||
                  !formData.lessonId ||
                  !formData.groupId ||
                  !formData.scheduledFor ||
                  !customMessageQuota?.canCreate || 
                  formData.message.length > 280 ||
                  formData.message.trim().length === 0
                ))
              }
            >
              {isSubmitting 
                ? "Saving..." 
                : isEditing 
                  ? "Update Message" 
                  : messageType === "custom"
                    ? "Create Custom Message"
                    : `Schedule ${messageType === "group" ? "Group Messages" : "Message"}`
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}