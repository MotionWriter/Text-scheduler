"use client"

import React, { useMemo, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, Clock } from "lucide-react"
import { DatePickerPopover } from "./ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

interface ListViewProps {
  studyBookId: Id<"studyBooks">
  studyBookTitle: string
  hasGroupSelected: boolean
}

interface ScheduleEditData {
  date: string
  time: string
}

export function ListView({ studyBookId, studyBookTitle, hasGroupSelected }: ListViewProps) {
  const lessons = useQuery(api.lessons.listByStudyBook, { studyBookId }) || []
  const messages = useQuery(api.allMessagesForStudyBook.listByStudyBook, { studyBookId }) || []
  const selections = useQuery(api.userSelectedMessages.getForStudyBook, { studyBookId }) || []

  const selectPredefined = useMutation(api.userSelectedMessages.selectPredefined)
  const selectCustom = useMutation(api.userSelectedMessages.selectCustom)
  const removeSelected = useMutation(api.userSelectedMessages.remove)
  const updateScheduling = useMutation(api.userSelectedMessages.updateScheduling)

  // State for lesson expansion
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  
  // State for message expansion
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  
  // State for inline editing
  const [editingStates, setEditingStates] = useState<Record<string, boolean>>({})
  const [editData, setEditData] = useState<Record<string, ScheduleEditData>>({})

  // Filters
  const [lessonFilter, setLessonFilter] = useState<string>('all')
  const [showFilter, setShowFilter] = useState<'all'|'available'|'scheduled'>('all')
  const [query, setQuery] = useState<string>("")

  // Helper maps
  const lessonById = useMemo(() => {
    const m: Record<string, any> = {}
    lessons.forEach((l: any) => { m[l._id] = l })
    return m
  }, [lessons])

  const typeByMessageId = useMemo(() => {
    const map: Record<string, string> = {}
    messages.forEach((m: any) => { map[m._id] = m.messageType })
    return map
  }, [messages])

  // Restore persisted filters
  React.useEffect(() => {
    try {
      const lf = localStorage.getItem('list_lesson_filter')
      const sf = localStorage.getItem('list_show_filter') as 'all'|'available'|'scheduled'|null
      const q = localStorage.getItem('list_search')
      const expanded = localStorage.getItem('list_expanded_lessons')
      const expandedMsgs = localStorage.getItem('list_expanded_messages')
      if (lf) setLessonFilter(lf)
      if (sf && (sf === 'all' || sf === 'available' || sf === 'scheduled')) setShowFilter(sf)
      if (q !== null) setQuery(q)
      if (expanded) {
        try {
          setExpandedLessons(new Set(JSON.parse(expanded)))
        } catch {}
      }
      if (expandedMsgs) {
        try {
          setExpandedMessages(new Set(JSON.parse(expandedMsgs)))
        } catch {}
      }
    } catch {}
  }, [])

  // Persist filters
  React.useEffect(() => { try { localStorage.setItem('list_lesson_filter', lessonFilter) } catch {} }, [lessonFilter])
  React.useEffect(() => { try { localStorage.setItem('list_show_filter', showFilter) } catch {} }, [showFilter])
  React.useEffect(() => { try { localStorage.setItem('list_search', query) } catch {} }, [query])
  React.useEffect(() => { 
    try { 
      localStorage.setItem('list_expanded_lessons', JSON.stringify(Array.from(expandedLessons))) 
    } catch {} 
  }, [expandedLessons])
  React.useEffect(() => { 
    try { 
      localStorage.setItem('list_expanded_messages', JSON.stringify(Array.from(expandedMessages))) 
    } catch {} 
  }, [expandedMessages])

  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
  }

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }

  // Utility functions
  const combineLocalTs = (dateStr: string, timeStr: string) => {
    return new Date(`${dateStr}T${timeStr}`).getTime()
  }

  const defaultScheduleForLesson = (lesson: any) => {
    const time = lesson?.defaultSendTime || "06:30"
    const base = lesson?.activeWeekStart ? new Date(lesson.activeWeekStart) : new Date()
    const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
    const dateStr = local.toISOString().slice(0, 10)
    return combineLocalTs(dateStr, time)
  }

  const msInDay = 24 * 60 * 60 * 1000
  const getDateRangeForLesson = (lesson: any) => {
    if (!lesson?.activeWeekStart) return { min: undefined, max: undefined }
    return {
      min: lesson.activeWeekStart - 4 * msInDay,
      max: lesson.activeWeekStart + 6 * msInDay
    }
  }

  const formatScheduledTime = (timestamp?: number) => {
    if (!timestamp) return ""
    const date = new Date(timestamp)
    const monthDay = date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit' 
    })
    const time = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
    return `${monthDay} ${time} CST`
  }

  // Schedule/Unschedule handlers
  const handleSchedule = async (messageId: string, source: 'predefined' | 'custom') => {
    if (!hasGroupSelected) {
      alert('Please select a group before scheduling messages.')
      return
    }
    
    const message = messages.find((m: any) => m._id === messageId)
    if (!message) return

    const lesson = message.lesson // The lesson is already the full object from the query
    const ts = defaultScheduleForLesson(lesson)

    // If already selected (even if not scheduled), just mark scheduled
    const existing = selectionByMessageId[messageId]

    try {
      if (existing) {
        await updateScheduling({ id: existing._id as Id<'userSelectedMessages'>, isScheduled: true, scheduledAt: ts })
        return
      }

      if (source === 'predefined') {
        await selectPredefined({ predefinedMessageId: messageId as Id<'predefinedMessages'>, scheduledAt: ts })
      } else if (source === 'custom') {
        await selectCustom({ customMessageId: messageId as Id<'userCustomMessages'>, scheduledAt: ts })
      }
    } catch (e) {
      console.error('Error scheduling message:', e)
    }
  }

  const handleUnschedule = async (selectionId: string) => {
    try {
      await updateScheduling({ 
        id: selectionId as Id<'userSelectedMessages'>, 
        isScheduled: false 
      })
    } catch (e) {
      console.error('Error unscheduling message:', e)
    }
  }

  // Edit handlers
  const handleStartEdit = (selectionId: string, scheduledAt?: number, lessonId?: string) => {
    const lesson = lessonById[lessonId]
    let dateStr: string
    
    if (scheduledAt) {
      const d = new Date(scheduledAt)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      dateStr = local.toISOString().slice(0, 10)
    } else {
      const ts = defaultScheduleForLesson(lesson)
      const d = new Date(ts)
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      dateStr = local.toISOString().slice(0, 10)
    }
    
    setEditData(prev => ({
      ...prev,
      [selectionId]: { date: dateStr, time: lesson?.defaultSendTime || "06:30" }
    }))
    setEditingStates(prev => ({
      ...prev,
      [selectionId]: true
    }))
  }

  const handleSaveEdit = async (selectionId: string, lessonId: string) => {
    const data = editData[selectionId]
    if (!data?.date) return
    
    const lesson = lessonById[lessonId]
    const dateRange = getDateRangeForLesson(lesson)
    
    // Validate by calendar day (inclusive), not by time of day
    const selectedDayStart = new Date(`${data.date}T00:00`).getTime()
    const minDay = dateRange.min !== undefined ? new Date(dateRange.min).setHours(0, 0, 0, 0) : undefined
    const maxDay = dateRange.max !== undefined ? new Date(dateRange.max).setHours(0, 0, 0, 0) : undefined
    if ((minDay !== undefined && selectedDayStart < minDay) || (maxDay !== undefined && selectedDayStart > maxDay)) {
      toast.error('Selected date is outside the allowed range for this lesson.')
      return
    }

    // Always use lesson's default time
    const lessonTime = lesson?.defaultSendTime || "06:30"
    const ts = combineLocalTs(data.date, lessonTime)
    
    try {
      await updateScheduling({
        id: selectionId as Id<'userSelectedMessages'>,
        isScheduled: true,
        scheduledAt: ts
      })
      setEditingStates(prev => ({ ...prev, [selectionId]: false }))
      toast.success('Scheduled date updated')
    } catch (e) {
      console.error('Error saving edit:', e)
      toast.error('Failed to update scheduled date')
    }
  }

  const handleCancelEdit = (selectionId: string) => {
    setEditingStates(prev => ({ ...prev, [selectionId]: false }))
  }

  const handleUpdateEditData = (selectionId: string, data: Partial<ScheduleEditData>) => {
    setEditData(prev => ({
      ...prev,
      [selectionId]: { ...prev[selectionId], ...data }
    }))
  }


  // Get scheduled message IDs for quick lookup
  const scheduledMessageIds = useMemo(() => {
    const predefinedIds = new Set(
      selections.filter((s: any) => s.isScheduled && s.predefinedMessageId).map((s: any) => s.predefinedMessageId)
    )
    const customIds = new Set(
      selections.filter((s: any) => s.isScheduled && s.customMessageId).map((s: any) => s.customMessageId)
    )
    return { predefined: predefinedIds, custom: customIds }
  }, [selections])

  // Get selection data for scheduled messages
  const selectionByMessageId = useMemo(() => {
    const map: Record<string, any> = {}
    selections.forEach((s: any) => {
      if (s.predefinedMessageId) {
        map[s.predefinedMessageId] = s
      }
      if (s.customMessageId) {
        map[s.customMessageId] = s
      }
    })
    return map
  }, [selections])

  // Filter and group messages by lesson
  const filteredLessons = useMemo(() => {
    // Filter lessons first
    let filteredLessonList = lessons
    if (lessonFilter !== 'all') {
      filteredLessonList = lessons.filter((l: any) => l._id === lessonFilter)
    }

    return filteredLessonList.map((lesson: any) => {
      const lessonMessages = messages.filter((m: any) => {
        if (m.lesson._id !== lesson._id) return false
        
        // Apply text search filter
        if (query.trim() && !m.content.toLowerCase().includes(query.toLowerCase())) {
          return false
        }

        // Apply show filter
        const isScheduled = scheduledMessageIds[m.source as keyof typeof scheduledMessageIds]?.has(m._id)
        if (showFilter === 'available' && isScheduled) return false
        if (showFilter === 'scheduled' && !isScheduled) return false

        return true
      })

      return {
        ...lesson,
        messages: lessonMessages
      }
    }).filter(lesson => lesson.messages.length > 0)
  }, [lessons, messages, lessonFilter, query, showFilter, scheduledMessageIds])

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 justify-start">
          <span className="hidden sm:inline text-sm text-gray-600">Lesson</span>
          <Select value={lessonFilter} onValueChange={(v) => setLessonFilter(v)}>
            <SelectTrigger className="w-[240px] bg-white">
              <SelectValue placeholder="All lessons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lessons</SelectItem>
              {lessons.map((l: any) => (
                <SelectItem key={l._id} value={l._id}>{`Lesson ${l.lessonNumber}: ${l.title}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 justify-start">
          <span className="hidden sm:inline text-sm text-gray-600">Show</span>
          <Select value={showFilter} onValueChange={(v: 'all'|'available'|'scheduled') => setShowFilter(v)}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available only</SelectItem>
              <SelectItem value="scheduled">Scheduled only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[240px]">
          <Input
            className="bg-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
          />
        </div>
        <div>
          <Button
            variant="outline"
            className="bg-white"
            onClick={() => { setLessonFilter('all'); setShowFilter('all'); setQuery(''); }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        {filteredLessons.map((lesson: any) => {
          const isExpanded = expandedLessons.has(lesson._id)
          const start = typeof lesson.activeWeekStart === 'number' ? new Date(lesson.activeWeekStart) : null
          const end = start ? new Date(lesson.activeWeekStart + 6*24*60*60*1000) : null
          const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

          return (
            <div key={lesson._id} className="border border-gray-200 rounded-lg">
              {/* Lesson Header */}
              <button
                onClick={() => toggleLessonExpansion(lesson._id)}
                className={`w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left ${
                  isExpanded ? 'rounded-t-lg' : 'rounded-lg'
                }`}
              >
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Lesson {lesson.lessonNumber}: {lesson.title}
                  </h3>
                  {start && end && (
                    <div className="text-sm text-gray-600 mt-1">
                      Active week: {fmt(start)} - {fmt(end)} • Default time: {lesson.defaultSendTime || "06:30"}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    {lesson.messages.length} message{lesson.messages.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {isExpanded ? 'Collapse' : 'Expand'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Messages List */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 rounded-b-lg">
                  {lesson.messages.map((message: any, index: number) => {
                    const isScheduled = scheduledMessageIds[message.source as keyof typeof scheduledMessageIds]?.has(message._id)
                    const selection = selectionByMessageId[message._id]
                    const isEditing = editingStates[selection?._id]
                    const isLastMessage = index === lesson.messages.length - 1

                    return (
                      <div key={message._id} className={`p-4 bg-white hover:bg-gray-50 transition-colors ${
                        isLastMessage ? 'rounded-b-lg' : ''
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const isExpanded = expandedMessages.has(message._id)
                              const isLongMessage = message.content.length > 200
                              const shouldTruncate = !isExpanded && isLongMessage
                              
                              return (
                                <div className="mb-2">
                                  <div className={`relative ${
                                    shouldTruncate ? 'max-h-20 overflow-hidden' : ''
                                  }`}>
                                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                                      {shouldTruncate ? message.content.substring(0, 200) + '...' : message.content}
                                    </div>
                                    {shouldTruncate && (
                                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                    )}
                                  </div>
                                  {isLongMessage && (
                                    <button
                                      onClick={() => toggleMessageExpansion(message._id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-1"
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              )
                            })()
                            }
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                                {message.messageType}
                              </span>
                              <span>{studyBookTitle}</span>
                            </div>

                            {isScheduled && selection && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {!isEditing ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-800 font-medium">{formatScheduledTime(selection.scheduledAt)}</span>
                                    <span className="text-gray-400">•</span>
                                    <button
                                      className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors"
                                      onClick={() => handleStartEdit(selection._id, selection.scheduledAt, lesson._id)}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                      <DatePickerPopover
                                        value={editData[selection._id]?.date || ""}
                                        onChange={(val) => handleUpdateEditData(selection._id, { date: val })}
                                        minDate={getDateRangeForLesson(lesson).min}
                                        maxDate={getDateRangeForLesson(lesson).max}
                                      />
                                      <span className="text-sm text-gray-600">
                                        at {lesson.defaultSendTime || "06:30"}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveEdit(selection._id, lesson._id)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCancelEdit(selection._id)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {!isScheduled ? (
                              <button
                                onClick={() => handleSchedule(message._id, message.source)}
                                disabled={!hasGroupSelected}
                                className={`font-medium text-sm transition-colors ${
                                  hasGroupSelected 
                                    ? "text-green-700 hover:text-green-900 cursor-pointer" 
                                    : "text-gray-400 cursor-not-allowed"
                                }`}
                                title={!hasGroupSelected ? "Please select a group first" : ""}
                              >
                                Schedule
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnschedule(selection._id)}
                                className="text-red-700 hover:text-red-900 font-medium text-sm transition-colors"
                              >
                                Unschedule
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filteredLessons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No messages found matching the current filters.
          </div>
        )}
      </div>
    </div>
  )
}
