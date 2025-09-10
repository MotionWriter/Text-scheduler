import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "./KanbanCard"
import { KanbanCard as KanbanCardType, ColumnId, ScheduleEditData, DateRange } from "../../types/kanban"

interface KanbanColumnProps {
  id: ColumnId
  title: string
  cards: KanbanCardType[]
  studyBookTitle: string
  lessonsById: Record<string, any>
  editingStates: Record<string, boolean>
  editData: Record<string, ScheduleEditData>
  hasGroupSelected: boolean
  onStartEdit: (card: KanbanCardType) => void
  onSaveEdit: (card: KanbanCardType) => void
  onCancelEdit: (card: KanbanCardType) => void
  onUpdateEditData: (selectionId: string, data: Partial<ScheduleEditData>) => void
  getDateRangeForLesson: (lesson: any) => DateRange
  onQuickSchedule?: (card: KanbanCardType) => void
  onUndoSchedule?: (card: KanbanCardType) => void
}

const columnStyles = {
  available: "bg-blue-50 border-blue-200",
  scheduled: "bg-green-50 border-green-200"
} as const

const columnTitleStyles = {
  available: "text-blue-700",
  scheduled: "text-green-700"
} as const

export function KanbanColumn({
  id,
  title,
  cards,
  studyBookTitle,
  lessonsById,
  editingStates,
  editData,
  hasGroupSelected,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditData,
  getDateRangeForLesson,
  onQuickSchedule,
  onUndoSchedule,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="w-[360px] flex-shrink-0">
      <div className={`px-3 py-2 font-semibold text-sm ${columnTitleStyles[id]} flex items-center justify-between`}>
        <span>{`${title} (${cards.length})`}</span>
      </div>
      
      <div
        ref={setNodeRef}
        className={`min-h-[400px] rounded-lg border-2 border-dashed p-3 space-y-3 transition-colors ${
          columnStyles[id]
        } ${isOver ? "border-blue-400 bg-blue-100" : ""}`}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {id === 'available' && "Available messages"}
              {id === 'scheduled' && "Drop messages here to schedule them"}
            </div>
          ) : (
            cards.map((card) => {
              const lesson = lessonsById[card.lessonId]
              const lessonTitle = lesson?.title 
                ? `Lesson ${lesson.lessonNumber}: ${lesson.title}` 
                : `Lesson ${lesson?.lessonNumber ?? ''}`
              const lessonDefaultTime = lesson?.defaultSendTime || "06:30"

              const messageType = (card as any).messageType as string | undefined
              return (
                <KanbanCard
                  key={card.id}
                  card={card}
                  studyBookTitle={studyBookTitle}
                  lessonTitle={lessonTitle}
                  lessonDefaultTime={lessonDefaultTime}
                  dateRange={getDateRangeForLesson(lesson)}
                  isEditing={card.selectionId ? editingStates[card.selectionId] || false : false}
                  editData={card.selectionId ? editData[card.selectionId] : undefined}
                  hasGroupSelected={hasGroupSelected}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onUpdateEditData={onUpdateEditData}
                  messageType={messageType}
                  onQuickSchedule={id === 'available' ? onQuickSchedule : undefined}
                  onUndoSchedule={id === 'scheduled' ? onUndoSchedule : undefined}
                />
              )
            })
          )}
        </SortableContext>
      </div>
    </div>
  )
}