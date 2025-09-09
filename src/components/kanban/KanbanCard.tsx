import React, { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { KanbanCard as KanbanCardType, ScheduleEditData, DateRange } from "../../types/kanban"
import { DatePickerPopover } from "../ui/date-picker"
import { Check, RotateCcw } from "lucide-react"

interface KanbanCardProps {
  card: KanbanCardType
  studyBookTitle: string
  lessonTitle: string
  lessonDefaultTime: string
  dateRange: DateRange
  isEditing: boolean
  editData?: ScheduleEditData
  onStartEdit: (card: KanbanCardType) => void
  onSaveEdit: (card: KanbanCardType) => void
  onCancelEdit: (card: KanbanCardType) => void
  onUpdateEditData: (selectionId: string, data: Partial<ScheduleEditData>) => void
  messageType?: string
  onQuickSchedule?: (card: KanbanCardType) => void
  onUndoSchedule?: (card: KanbanCardType) => void
}

export function KanbanCard({
  card,
  studyBookTitle,
  lessonTitle,
  lessonDefaultTime,
  dateRange,
  isEditing,
  editData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditData,
  messageType,
  onQuickSchedule,
  onUndoSchedule,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const generateTimeOptions = () => {
    return Array.from({ length: 96 }).map((_, idx) => {
      const h = String(Math.floor(idx / 4)).padStart(2, '0')
      const m = String((idx % 4) * 15).padStart(2, '0')
      const val = `${h}:${m}`
      return <option key={val} value={val}>{val}</option>
    })
  }

  const formatScheduledTime = (timestamp?: number) => {
    if (!timestamp) return ""
    return new Date(timestamp).toLocaleString()
  }

  const [expanded, setExpanded] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative bg-white rounded border p-3 shadow-sm cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? "rotate-3 scale-105" : ""
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Top-right action */}
      {card.type === 'available' && onQuickSchedule && (
        <button
          className="absolute top-2 right-2 p-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
          onClick={(e) => { e.stopPropagation(); onQuickSchedule(card) }}
          title="Schedule"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      {card.type === 'scheduled' && card.selectionId && onUndoSchedule && (
        <button
          className="absolute top-2 right-2 p-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          onClick={(e) => { e.stopPropagation(); onUndoSchedule(card) }}
          title="Undo schedule"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}

      <div className={`${expanded ? '' : 'line-clamp-3'} text-sm text-gray-900 mb-2 whitespace-pre-wrap`}>
        {card.content}
      </div>
      {!expanded && (
        <div className="text-[11px] text-gray-400">Click to expand</div>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <div>{studyBookTitle} • {lessonTitle}</div>
        {messageType && (
          <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
            {messageType}
          </span>
        )}
      </div>

      {card.type === 'scheduled' && card.selectionId && (
        <div className="pt-2 border-t border-gray-100">
          {!isEditing ? (
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                {formatScheduledTime(card.scheduledAt)}
              </div>
              <button
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartEdit(card)
                }}
              >
                Edit
              </button>
            </div>
          ) : (
            <div 
              className="space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <DatePickerPopover
                  value={editData?.date || ""}
                  onChange={(val) => onUpdateEditData(card.selectionId as string, { date: val })}
                  minDate={dateRange.min}
                  maxDate={dateRange.max}
                />
                <select
                  value={editData?.time || lessonDefaultTime}
                  onChange={(e) => onUpdateEditData(card.selectionId as string, { time: e.target.value })}
                  className="px-2 py-1 border rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {generateTimeOptions()}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSaveEdit(card)
                  }}
                >
                  Save
                </button>
                <button
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelEdit(card)
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}