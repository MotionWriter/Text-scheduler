"use client"

import React, { useMemo, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { KanbanColumn } from "./kanban/KanbanColumn"
import { KanbanCard } from "./kanban/KanbanCard"
import { KanbanCard as KanbanCardType, ColumnId, ScheduleEditData, DateRange } from "../types/kanban"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface KanbanBoardProps {
  studyBookId: Id<"studyBooks">
  studyBookTitle: string
  hasGroupSelected: boolean
}

export function KanbanBoard({ studyBookId, studyBookTitle, hasGroupSelected }: KanbanBoardProps) {
  const lessons = useQuery(api.lessons.listByStudyBook, { studyBookId }) || []
  const messages = useQuery(api.allMessagesForStudyBook.listByStudyBook, { studyBookId }) || []
  const selections = useQuery(api.userSelectedMessages.getForStudyBook, { studyBookId }) || []

  const selectPredefined = useMutation(api.userSelectedMessages.selectPredefined)
  const selectCustom = useMutation(api.userSelectedMessages.selectCustom)
  const removeSelected = useMutation(api.userSelectedMessages.remove)
  const updateScheduling = useMutation(api.userSelectedMessages.updateScheduling)

  // State for drag and drop
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)
  
  // State for inline editing
  const [editingStates, setEditingStates] = useState<Record<string, boolean>>({})
  const [editData, setEditData] = useState<Record<string, ScheduleEditData>>({})

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Helper maps
  const lessonById = useMemo(() => {
    const m: Record<string, any> = {}
    lessons.forEach((l: any) => { m[l._id] = l })
    return m
  }, [lessons])

  // Build columns data
  const typeByMessageId = useMemo(() => {
    const map: Record<string, string> = {}
    messages.forEach((m: any) => { map[m._id] = m.messageType })
    return map
  }, [messages])

  // Filters
  const [lessonFilter, setLessonFilter] = useState<string>('all')
  const [showFilter, setShowFilter] = useState<'all'|'available'|'scheduled'>('all')
  const [query, setQuery] = useState<string>("")

  // Restore persisted filters
  React.useEffect(() => {
    try {
      const lf = localStorage.getItem('kanban_lesson_filter')
      const sf = localStorage.getItem('kanban_show_filter') as 'all'|'available'|'scheduled'|null
      const q = localStorage.getItem('kanban_search')
      if (lf) setLessonFilter(lf)
      if (sf && (sf === 'all' || sf === 'available' || sf === 'scheduled')) setShowFilter(sf)
      if (q !== null) setQuery(q)
    } catch {}
  }, [])
  // Persist filters
  React.useEffect(() => { try { localStorage.setItem('kanban_lesson_filter', lessonFilter) } catch {} }, [lessonFilter])
  React.useEffect(() => { try { localStorage.setItem('kanban_show_filter', showFilter) } catch {} }, [showFilter])
  React.useEffect(() => { try { localStorage.setItem('kanban_search', query) } catch {} }, [query])

  const availableCardsAll: KanbanCardType[] = useMemo(() => {
    // Exclude messages that are already scheduled
    const scheduledPredefinedIds = new Set(
      selections.filter((s: any) => s.isScheduled && s.predefinedMessageId).map((s: any) => s.predefinedMessageId)
    )
    const scheduledCustomIds = new Set(
      selections.filter((s: any) => s.isScheduled && s.customMessageId).map((s: any) => s.customMessageId)
    )
    
    return messages
      .filter((m: any) => {
        if (m.source === 'predefined') {
          return !scheduledPredefinedIds.has(m._id)
        } else if (m.source === 'custom') {
          return !scheduledCustomIds.has(m._id)
        }
        return false
      })
      .map((m: any) => ({
        type: 'available' as ColumnId,
        id: `avail-${m._id}-${m.source}`,
        content: m.content,
        lessonId: m.lesson._id,
        messageId: m._id,
        source: m.source,
        // @ts-ignore enrich for badge
        messageType: m.messageType,
      }))
  }, [messages, selections])

  // Two-column board: no separate 'selected' column
  const selectedCards: KanbanCardType[] = useMemo(() => [], [])

  const scheduledCardsAll: KanbanCardType[] = useMemo(() => {
    return selections
      .filter((s: any) => s.isScheduled)
      .map((s: any) => ({
        type: 'scheduled' as ColumnId,
        id: `sch-${s._id}`,
        content: s.messageContent || '',
        lessonId: s.lessonId,
        selectionId: s._id,
        scheduledAt: s.scheduledAt,
        messageId: s.predefinedMessageId,
        // @ts-ignore enrich for badge
        messageType: s.predefinedMessageId ? typeByMessageId[s.predefinedMessageId] : 'custom',
      }))
  }, [selections, typeByMessageId])

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
  const getDateRangeForLesson = (lesson: any): DateRange => {
    if (!lesson?.activeWeekStart) return { min: undefined, max: undefined }
    return {
      min: lesson.activeWeekStart - 4 * msInDay,
      max: lesson.activeWeekStart + 6 * msInDay
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const cardId = active.id as string
    
    // Find the active card
    const allCards = [...availableCards, ...scheduledCards]
    const card = allCards.find(c => c.id === cardId)
    
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over || !activeCard) return

    const targetColumn = over.id as ColumnId
    const sourceColumn = activeCard.type

    // If dropped on the same column, do nothing
    if (targetColumn === sourceColumn) return

    try {
      if (targetColumn === 'available') {
        // Only valid drop from scheduled -> available (remove selection)
        if (sourceColumn === 'scheduled') {
          await removeSelected({ id: activeCard.selectionId as Id<'userSelectedMessages'> })
        }
      } else if (targetColumn === 'scheduled') {
        if (sourceColumn === 'available') {
          if (!hasGroupSelected) {
            alert('Please select a group before scheduling messages.')
            return
          }
          
          // Select and schedule at default time
          const lesson = lessonById[activeCard.lessonId]
          const ts = defaultScheduleForLesson(lesson)
          
          // Check if it's a predefined or custom message
          if ((activeCard as any).source === 'predefined') {
            await selectPredefined({ predefinedMessageId: activeCard.messageId as Id<'predefinedMessages'>, scheduledAt: ts })
          } else if ((activeCard as any).source === 'custom') {
            await selectCustom({ customMessageId: activeCard.messageId as Id<'userCustomMessages'>, scheduledAt: ts })
          }
        }
      }
    } catch (e) {
      console.error('Error handling drop:', e)
    }
  }

  // Edit handlers
  const handleStartEdit = (card: KanbanCardType) => {
    if (!card.selectionId) return
    
    const lesson = lessonById[card.lessonId]
    let dateStr: string
    
    if (card.scheduledAt) {
      const d = new Date(card.scheduledAt)
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
      [card.selectionId as string]: { date: dateStr, time: lesson?.defaultSendTime || "06:30" }
    }))
    setEditingStates(prev => ({
      ...prev,
      [card.selectionId as string]: true
    }))
  }

  const handleSaveEdit = async (card: KanbanCardType) => {
    if (!card.selectionId) return
    
    const data = editData[card.selectionId]
    if (!data?.date) return
    
    const lesson = lessonById[card.lessonId]
    const dateRange = getDateRangeForLesson(lesson)
    // Always use lesson's default time
    const lessonTime = lesson?.defaultSendTime || "06:30"
    const ts = combineLocalTs(data.date, lessonTime)
    
    if ((dateRange.min && ts < dateRange.min) || (dateRange.max && ts > dateRange.max)) {
      // Out of range; show error or do nothing for now
      setEditingStates(prev => ({ ...prev, [card.selectionId as string]: false }))
      return
    }
    
    try {
      await updateScheduling({
        id: card.selectionId as Id<'userSelectedMessages'>,
        isScheduled: true,
        scheduledAt: ts
      })
      setEditingStates(prev => ({ ...prev, [card.selectionId as string]: false }))
    } catch (e) {
      console.error('Error saving edit:', e)
    }
  }

  const handleCancelEdit = (card: KanbanCardType) => {
    if (!card.selectionId) return
    setEditingStates(prev => ({ ...prev, [card.selectionId as string]: false }))
  }

  const handleUpdateEditData = (selectionId: string, data: Partial<ScheduleEditData>) => {
    setEditData(prev => ({
      ...prev,
      [selectionId]: { ...prev[selectionId], ...data }
    }))
  }

  // Apply filters
  const filterByLesson = (c: KanbanCardType) => lessonFilter === 'all' || (c.lessonId as any) === lessonFilter
  const filterByQuery = (c: KanbanCardType) => !query.trim() || c.content.toLowerCase().includes(query.toLowerCase())
  const availableCards = availableCardsAll.filter(filterByLesson).filter(filterByQuery)
  const scheduledCards = scheduledCardsAll.filter(filterByLesson).filter(filterByQuery)

  const columns = [
    { id: 'available' as ColumnId, title: 'Available Messages', cards: showFilter !== 'scheduled' ? availableCards : [] },
    { id: 'scheduled' as ColumnId, title: 'Scheduled Messages', cards: showFilter !== 'available' ? scheduledCards : [] },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="How to use"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-semibold bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] border-[hsl(var(--accent))] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring"
              title="How to use"
            >
              i
            </button>
          </PopoverTrigger>
          <PopoverContent className="max-w-lg text-sm">
            <div className="text-foreground">
              <p>
                <strong>How to use:</strong> Drag messages from <strong>Available</strong> directly into <strong>Scheduled</strong> to schedule at the lesson's default time. Drag back to <strong>Available</strong> to remove.
              </p>
              <p className="mt-2">
                Click <strong>Edit</strong> on a scheduled message to change the date. The time always stays at the lesson's default time.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Lesson heading */}
      <div className="mt-2">
        {lessonFilter !== 'all' ? (
          (() => {
            const l = lessonById[lessonFilter]
            if (!l) return null
            const start = typeof l.activeWeekStart === 'number' ? new Date(l.activeWeekStart) : null
            const end = start ? new Date(l.activeWeekStart + 6*24*60*60*1000) : null
            const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            return (
              <h2 className="text-lg font-semibold text-gray-900">
                {`Lesson ${l.lessonNumber}: ${l.title}`}
                {start && end && (
                  <span className="ml-2 text-gray-600 text-sm">{`• Active week: ${fmt(start)} - ${fmt(end)}`}</span>
                )}
              </h2>
            )
          })()
        ) : (
          <h2 className="text-lg font-semibold text-gray-900">All Lessons</h2>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Lesson</span>
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

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
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
          <Input className="bg-white"
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
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              cards={column.cards}
              studyBookTitle={studyBookTitle}
              lessonsById={lessonById}
              editingStates={editingStates}
              editData={editData}
              hasGroupSelected={hasGroupSelected}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onUpdateEditData={handleUpdateEditData}
              getDateRangeForLesson={getDateRangeForLesson}
              onQuickSchedule={async (card) => {
                if (!hasGroupSelected) {
                  alert('Please select a group before scheduling messages.')
                  return
                }
                
                const lesson = lessonById[card.lessonId]
                const ts = defaultScheduleForLesson(lesson)
                
                if ((card as any).source === 'predefined') {
                  // Check for existing unscheduled selection
                  const existing = selections.find((s: any) => s.predefinedMessageId === card.messageId)
                  if (existing) {
                    await updateScheduling({ id: existing._id as Id<'userSelectedMessages'>, isScheduled: true, scheduledAt: ts })
                  } else {
                    await selectPredefined({ predefinedMessageId: card.messageId as Id<'predefinedMessages'>, scheduledAt: ts })
                  }
                } else if ((card as any).source === 'custom') {
                  // Check for existing unscheduled selection
                  const existing = selections.find((s: any) => s.customMessageId === card.messageId)
                  if (existing) {
                    await updateScheduling({ id: existing._id as Id<'userSelectedMessages'>, isScheduled: true, scheduledAt: ts })
                  } else {
                    await selectCustom({ customMessageId: card.messageId as Id<'userCustomMessages'>, scheduledAt: ts })
                  }
                }
              }}
              onUndoSchedule={async (card) => {
                if (!card.selectionId) return
                await updateScheduling({ id: card.selectionId as Id<'userSelectedMessages'>, isScheduled: false })
              }}
            />
          ))}
        </div>
        
        <DragOverlay>
          {activeCard ? (
            <div className="transform rotate-3 scale-105">
              <KanbanCard
                card={activeCard}
                studyBookTitle={studyBookTitle}
                lessonTitle={(() => {
                  const lesson = lessonById[activeCard.lessonId]
                  return lesson?.title 
                    ? `Lesson ${lesson.lessonNumber}: ${lesson.title}` 
                    : `Lesson ${lesson?.lessonNumber ?? ''}`
                })()}
                lessonDefaultTime={lessonById[activeCard.lessonId]?.defaultSendTime || "06:30"}
                dateRange={getDateRangeForLesson(lessonById[activeCard.lessonId])}
                isEditing={false}
                onStartEdit={() => {}}
                onSaveEdit={() => {}}
                onCancelEdit={() => {}}
                onUpdateEditData={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}